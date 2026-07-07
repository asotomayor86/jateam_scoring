"use client";

import { useEffect, useRef, useState, type PointerEvent as RPtr } from "react";
import { calcularHomografia, aplicarHomografia, type Punto } from "@/lib/homografia";
import { DIANA_25M, type Impacto, puntuacionDeImpacto, radioExterior } from "@/lib/diana";
import { DianaCanvas } from "@/components/diana-canvas";
import { Card } from "@/components/ui";
import { formatPunt } from "@/lib/scoring";

type Fase = "inicio" | "calibrando" | "listo";
type Color = "rojo" | "verde";

// Esquinas de destino en mm de la diana (y hacia arriba). Orden de marcado:
// superior-izq, superior-dcha, inferior-dcha, inferior-izq. El cuadrado de la
// diana reducida circunscribe el anillo 1 (radio 250 mm).
const R = radioExterior(DIANA_25M); // 250 mm
const DST: Punto[] = [
  { x: -R, y: R },
  { x: R, y: R },
  { x: R, y: -R },
  { x: -R, y: -R },
];
const ETIQUETAS = ["arriba-izquierda", "arriba-derecha", "abajo-derecha", "abajo-izquierda"];
const PROC_W = 480;

export function LaserTrainer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const procRef = useRef<HTMLCanvasElement | null>(null);
  const puntoRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [fase, setFase] = useState<Fase>("inicio");
  const [esquinas, setEsquinas] = useState<Punto[]>([]);
  const [impactos, setImpactos] = useState<Impacto[]>([]);
  const [escuchando, setEscuchando] = useState(false);
  const [color, setColor] = useState<Color>("rojo");
  const [sensibilidad, setSensibilidad] = useState(70);
  const [error, setError] = useState<string | null>(null);

  // Refs espejo para el bucle de detección (evita closures obsoletas).
  const faseR = useRef(fase);
  const homoR = useRef<number[] | null>(null);
  const escuchandoR = useRef(escuchando);
  const colorR = useRef(color);
  const umbralR = useRef(130 - sensibilidad);
  const activoR = useRef(false);
  const ultimoR = useRef(0);

  faseR.current = fase;
  escuchandoR.current = escuchando;
  colorR.current = color;
  umbralR.current = 130 - sensibilidad;

  useEffect(() => {
    return () => detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciar() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setEsquinas([]);
      homoR.current = null;
      setFase("calibrando");
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(procesar);
    } catch (e) {
      console.error(e);
      setError(
        "No se pudo abrir la cámara. Da permiso y, en iPhone, abre la app instalada en la pantalla de inicio.",
      );
    }
  }

  function detener() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEscuchando(false);
    setFase("inicio");
  }

  function registrarDisparo(nx: number, ny: number) {
    const H = homoR.current;
    if (!H) return;
    const p = aplicarHomografia(H, nx, ny);
    if (Math.hypot(p.x, p.y) > R + 60) return; // fuera de la diana: descarta
    const s = puntuacionDeImpacto(DIANA_25M, p.x, p.y);
    setImpactos((prev) => [...prev, { x: p.x, y: p.y, s }]);
  }

  function procesar() {
    const v = videoRef.current;
    const canvas = procRef.current;
    if (v && canvas && v.videoWidth) {
      const procH = Math.max(1, Math.round((PROC_W * v.videoHeight) / v.videoWidth));
      if (canvas.width !== PROC_W || canvas.height !== procH) {
        canvas.width = PROC_W;
        canvas.height = procH;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(v, 0, 0, PROC_W, procH);
        const data = ctx.getImageData(0, 0, PROC_W, procH).data;
        const verde = colorR.current === "verde";
        const umbral = umbralR.current;
        let sumX = 0, sumY = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const canal = verde ? g : r;
          const otros = verde ? (r + b) / 2 : (g + b) / 2;
          if (canal > 110 && canal - otros > umbral) {
            const idx = i / 4;
            sumX += idx % PROC_W;
            sumY += Math.floor(idx / PROC_W);
            count++;
          }
        }
        if (count >= 3) {
          const nx = sumX / count / PROC_W;
          const ny = sumY / count / procH;
          pintarPunto({ x: nx, y: ny });
          if (escuchandoR.current && faseR.current === "listo" && homoR.current) {
            const ahora = performance.now();
            if (!activoR.current && ahora - ultimoR.current > 250) {
              registrarDisparo(nx, ny);
              activoR.current = true;
              ultimoR.current = ahora;
            }
          }
        } else {
          pintarPunto(null);
          activoR.current = false;
        }
      }
    }
    rafRef.current = requestAnimationFrame(procesar);
  }

  // Pinta el punto detectado en vivo moviendo un div (sin re-render de React).
  function pintarPunto(p: { x: number; y: number } | null) {
    const el = puntoRef.current;
    if (!el) return;
    if (!p) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = `${p.x * 100}%`;
    el.style.top = `${p.y * 100}%`;
  }

  function tocarVideo(e: RPtr<HTMLDivElement>) {
    if (fase !== "calibrando") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const nuevas = [...esquinas, { x: nx, y: ny }];
    setEsquinas(nuevas);
    if (nuevas.length === 4) {
      const H = calcularHomografia(nuevas, DST);
      homoR.current = H;
      if (H) setFase("listo");
      else {
        setError("Calibración no válida, marca las 4 esquinas bien separadas.");
        setEsquinas([]);
      }
    }
  }

  function recalibrar() {
    setEscuchando(false);
    setEsquinas([]);
    homoR.current = null;
    setFase("calibrando");
  }

  const subtotal = impactos.reduce((a, i) => a + i.s, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
        <strong>Prueba conceptual.</strong> Pon el móvil fijo apuntando a tu diana
        reducida (mejor en penumbra), calíbrala marcando sus 4 esquinas y dispara
        con un láser de entrenamiento. El sistema marca cada impacto en la diana.
      </p>

      {error ? (
        <p style={{ color: "var(--rojo)", fontSize: "0.85rem", margin: 0 }}>{error}</p>
      ) : null}

      {fase === "inicio" ? (
        <button type="button" className="btn btn-primario btn-bloque" onClick={iniciar}>
          📷 Iniciar cámara
        </button>
      ) : null}

      {/* Vídeo + overlay de calibración y punto en vivo. */}
      <div
        onPointerDown={tocarVideo}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--borde)",
          display: fase === "inicio" ? "none" : "block",
          touchAction: "none",
          cursor: fase === "calibrando" ? "crosshair" : "default",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", display: "block" }}
        />
        {/* Esquinas marcadas. */}
        {esquinas.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: 14,
              height: 14,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: "var(--acento-fuerte)",
              border: "2px solid #fff",
              pointerEvents: "none",
            }}
          />
        ))}
        {/* Punto láser detectado en vivo. */}
        <div
          ref={puntoRef}
          style={{
            position: "absolute",
            display: "none",
            width: 16,
            height: 16,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid #22d3ee",
            boxShadow: "0 0 8px #22d3ee",
            pointerEvents: "none",
          }}
        />
      </div>

      {fase === "calibrando" ? (
        <p style={{ fontSize: "0.85rem", margin: 0 }}>
          Toca la esquina <strong>{ETIQUETAS[esquinas.length] ?? ""}</strong> de la
          diana ({esquinas.length}/4).
        </p>
      ) : null}

      {fase === "listo" ? (
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className={escuchando ? "btn" : "btn btn-primario"}
              onClick={() => setEscuchando((e) => !e)}
            >
              {escuchando ? "⏸ Parar escucha" : "🎯 Escuchar disparos"}
            </button>
            <button type="button" className="btn" onClick={recalibrar}>
              Recalibrar
            </button>
            <button type="button" className="btn" onClick={() => setImpactos([])}>
              Limpiar
            </button>
            <button type="button" className="btn" onClick={detener} style={{ color: "var(--rojo)" }}>
              Detener cámara
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>Láser:</span>
            {(["rojo", "verde"] as Color[]).map((c) => (
              <button
                key={c}
                type="button"
                className="btn"
                onClick={() => setColor(c)}
                style={{
                  borderColor: color === c ? "var(--acento-fuerte)" : "var(--borde)",
                  borderWidth: color === c ? 2 : 1,
                }}
              >
                {c === "rojo" ? "🔴 Rojo" : "🟢 Verde"}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--texto-suave)" }}>
            Sensibilidad: {sensibilidad}
            <input
              type="range"
              min={10}
              max={120}
              value={sensibilidad}
              onChange={(e) => setSensibilidad(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--texto-suave)" }}>
            El círculo azul es el punto que detecta. Si parpadea con la luz
            ambiente, baja la sensibilidad o apaga luces.
          </p>
        </Card>
      ) : null}

      {/* Diana con los impactos detectados. */}
      {fase !== "inicio" ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: "0.9rem",
            }}
          >
            <span style={{ color: "var(--texto-suave)" }}>
              {impactos.length} disparo{impactos.length === 1 ? "" : "s"}
            </span>
            <strong style={{ fontSize: "1.3rem" }}>{formatPunt(subtotal)}</strong>
          </div>
          <DianaCanvas impacts={impactos} finalizada onChange={() => {}} />
        </>
      ) : null}

      <canvas ref={procRef} style={{ display: "none" }} />
    </div>
  );
}
