"use client";

import { useEffect, useRef, useState, type PointerEvent as RPtr } from "react";
import { calcularHomografia, aplicarHomografia, type Punto } from "@/lib/homografia";
import { DIANA_25M, type Impacto, puntuacionDeImpacto, radioExterior } from "@/lib/diana";
import { DianaCanvas } from "@/components/diana-canvas";
import { Card } from "@/components/ui";
import { formatPunt } from "@/lib/scoring";

type Fase = "inicio" | "activa";
type Color = "rojo" | "verde";

// Esquinas de destino en mm (y hacia arriba): TL, TR, BR, BL. El cuadrado de la
// diana reducida circunscribe el anillo 1 (radio 250 mm).
const R = radioExterior(DIANA_25M);
const DST: Punto[] = [
  { x: -R, y: R },
  { x: R, y: R },
  { x: R, y: -R },
  { x: -R, y: -R },
];
const ETIQUETAS = ["arriba-izquierda", "arriba-derecha", "abajo-derecha", "abajo-izquierda"];
const PROC_W = 480;
const LONG_PRESS = 320;
const MOVE_PX = 8;
const HIT_NORM = 0.07;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

type Elipse = { cx: number; cy: number; A: number; B: number; phi: number };

/**
 * Ajusta la elipse de la zona negra por momentos de imagen (JS puro, instantáneo).
 * Devuelve centro, semiejes (px) y orientación, o null si no hay negro suficiente.
 */
function fitElipseNegro(data: Uint8ClampedArray, w: number, h: number): Elipse | null {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70) {
      const idx = i / 4;
      sx += idx % w;
      sy += Math.floor(idx / w);
      n++;
    }
  }
  if (n < w * h * 0.004) return null;
  const cx1 = sx / n, cy1 = sy / n;
  const lim = Math.sqrt(n / Math.PI) * 2.2; // ventana para descartar manchas lejanas
  let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, n2 = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70) {
      const idx = i / 4;
      const px = idx % w, py = Math.floor(idx / w);
      if (Math.abs(px - cx1) > lim || Math.abs(py - cy1) > lim) continue;
      Sx += px; Sy += py; Sxx += px * px; Syy += py * py; Sxy += px * py; n2++;
    }
  }
  if (n2 < 50) return null;
  const cx = Sx / n2, cy = Sy / n2;
  const mxx = Sxx / n2 - cx * cx;
  const myy = Syy / n2 - cy * cy;
  const mxy = Sxy / n2 - cx * cy;
  const tr = mxx + myy, det = mxx * myy - mxy * mxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(tr / 2 - disc, 0);
  return {
    cx,
    cy,
    A: Math.max(2 * Math.sqrt(Math.max(l1, 0)), 1),
    B: Math.max(2 * Math.sqrt(l2), 1),
    phi: 0.5 * Math.atan2(2 * mxy, mxx - myy),
  };
}

/** De la elipse del negro deduce las 4 esquinas (normalizadas) de la diana. */
function esquinasDesdeElipse(el: Elipse, w: number, h: number): Punto[] | null {
  const c = Math.cos(el.phi), s = Math.sin(el.phi);
  const Rb = DIANA_25M.blackR;
  const sx = Rb / el.A, sy = Rb / el.B;
  const M11 = sx * c * c + sy * s * s;
  const M12 = (sx - sy) * c * s;
  const M22 = sx * s * s + sy * c * c;
  const det = M11 * M22 - M12 * M12;
  if (Math.abs(det) < 1e-9) return null;
  const iA = M22 / det, iB = -M12 / det, iC = -M12 / det, iD = M11 / det;
  const Rext = radioExterior(DIANA_25M);
  const fr = [
    { x: -Rext, y: -Rext },
    { x: Rext, y: -Rext },
    { x: Rext, y: Rext },
    { x: -Rext, y: Rext },
  ];
  const clampN = (v: number) => Math.max(0, Math.min(1, v));
  const pts = fr.map((t) => ({
    x: clampN((el.cx + (iA * t.x + iB * t.y)) / w),
    y: clampN((el.cy + (iC * t.x + iD * t.y)) / h),
  }));
  return ordenarQuad(pts);
}

/** Ordena 4 puntos en TL, TR, BR, BL (por suma/resta de coordenadas). */
function ordenarQuad(pts: Punto[]): Punto[] {
  let tl = pts[0], tr = pts[0], br = pts[0], bl = pts[0];
  for (const p of pts) {
    if (p.x + p.y < tl.x + tl.y) tl = p;
    if (p.x + p.y > br.x + br.y) br = p;
    if (p.x - p.y > tr.x - tr.y) tr = p;
    if (p.x - p.y < bl.x - bl.y) bl = p;
  }
  return [tl, tr, br, bl];
}

/** ¿Está el punto (normalizado) dentro del cuadrilátero de las 4 esquinas? */
function dentroQuad(x: number, y: number, q: Punto[]): boolean {
  let pos = false, neg = false;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross > 0) pos = true;
    else if (cross < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

type Gesto = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  mode: "pending" | "creating" | "moving" | "idle";
  target: number;
  arr: Punto[];
};

export function LaserTrainer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const procRef = useRef<HTMLCanvasElement | null>(null);
  const puntoRef = useRef<HTMLDivElement | null>(null);
  const contRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [fase, setFase] = useState<Fase>("inicio");
  const [esquinas, setEsquinas] = useState<Punto[]>([]);
  const [impactos, setImpactos] = useState<Impacto[]>([]);
  const [escuchando, setEscuchando] = useState(false);
  const [color, setColor] = useState<Color>("rojo");
  const [sensibilidad, setSensibilidad] = useState(70);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const [espejo, setEspejo] = useState(true);
  const [centro, setCentro] = useState<Punto>({ x: 0, y: 0 });

  // Refs espejo para el bucle y los gestos.
  const esquinasRef = useRef(esquinas);
  esquinasRef.current = esquinas;
  const homoR = useRef<number[] | null>(null);
  const escuchandoR = useRef(escuchando);
  escuchandoR.current = escuchando;
  const colorR = useRef(color);
  colorR.current = color;
  const umbralR = useRef(130 - sensibilidad);
  umbralR.current = 130 - sensibilidad;
  const activoR = useRef(false);
  const ultimoR = useRef(0);
  const espejoR = useRef(espejo);
  espejoR.current = espejo;
  const centroR = useRef(centro);
  centroR.current = centro;
  const gestoR = useRef<Gesto | null>(null);
  const timerR = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // Recalcula homografía (para puntuar) y la superposición de la diana.
  useEffect(() => {
    if (esquinas.length !== 4) {
      homoR.current = null;
      setOverlay(null);
      return;
    }
    homoR.current = calcularHomografia(esquinas, DST);
    const cont = contRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    const S = 1000;
    const src: Punto[] = [
      { x: 0, y: 0 },
      { x: S, y: 0 },
      { x: S, y: S },
      { x: 0, y: S },
    ];
    const dst = esquinas.map((c) => ({ x: c.x * rect.width, y: c.y * rect.height }));
    const H = calcularHomografia(src, dst);
    if (!H) {
      setOverlay(null);
      return;
    }
    const [a, b, c, d, e, f, g, h] = H;
    setOverlay(`matrix3d(${a},${d},0,${g}, ${b},${e},0,${h}, 0,0,1,0, ${c},${f},0,1)`);
  }, [esquinas, resizeTick]);

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
      setFase("activa");
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
    if (timerR.current) clearTimeout(timerR.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEscuchando(false);
    setFase("inicio");
  }

  function registrarDisparo(nx: number, ny: number) {
    const H = homoR.current;
    if (!H) return;
    const p = aplicarHomografia(H, nx, ny);
    // Recentrado por el centro real de la diana (ajuste fino) y espejo horizontal.
    let x = p.x - centroR.current.x;
    const y = p.y - centroR.current.y;
    if (espejoR.current) x = -x;
    if (Math.hypot(x, y) > R + 60) return;
    const s = puntuacionDeImpacto(DIANA_25M, x, y);
    setImpactos((prev) => [...prev, { x, y, s }]);
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
        // Si está calibrado, solo se busca DENTRO de la tarjeta (ignora lo de fuera).
        const quad = esquinasRef.current.length === 4 ? esquinasRef.current : null;
        let sumX = 0, sumY = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const canal = verde ? g : r;
          const otros = verde ? (r + b) / 2 : (g + b) / 2;
          if (canal > 110 && canal - otros > umbral) {
            const idx = i / 4;
            const px = idx % PROC_W;
            const py = Math.floor(idx / PROC_W);
            if (quad && !dentroQuad(px / PROC_W, py / procH, quad)) continue;
            sumX += px;
            sumY += py;
            count++;
          }
        }
        if (count >= 3) {
          const nx = sumX / count / PROC_W;
          const ny = sumY / count / procH;
          pintarPunto({ x: nx, y: ny });
          if (escuchandoR.current && homoR.current) {
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

  // ---- Gestos de calibración (pulsación larga = crear; arrastrar = mover) ----
  function toNorm(clientX: number, clientY: number): Punto {
    const rect = contRef.current!.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }
  function cercana(p: Punto, arr: Punto[]): number {
    let best = -1, bestD = HIT_NORM;
    arr.forEach((c, i) => {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
  function limpiaTimer() {
    if (timerR.current) {
      clearTimeout(timerR.current);
      timerR.current = null;
    }
  }

  function onDown(e: RPtr<HTMLDivElement>) {
    if (fase !== "activa") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    limpiaTimer();
    const arr = esquinasRef.current.map((c) => ({ ...c }));
    const p = toNorm(e.clientX, e.clientY);
    gestoR.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      mode: "pending",
      target: cercana(p, arr),
      arr,
    };
    timerR.current = setTimeout(() => {
      const g = gestoR.current;
      if (!g || g.mode !== "pending" || g.moved || g.arr.length >= 4) return;
      const pp = toNorm(g.startX, g.startY);
      g.arr = [...g.arr, pp];
      g.target = g.arr.length - 1;
      g.mode = "creating";
      setEsquinas(g.arr.map((c) => ({ ...c })));
    }, LONG_PRESS);
  }

  function onMove(e: RPtr<HTMLDivElement>) {
    const g = gestoR.current;
    if (!g) return;
    e.preventDefault();
    const rect = contRef.current!.getBoundingClientRect();
    const ddx = (e.clientX - g.lastX) / rect.width;
    const ddy = (e.clientY - g.lastY) / rect.height;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > MOVE_PX) {
      g.moved = true;
      if (g.mode === "pending") {
        limpiaTimer();
        g.mode = g.target >= 0 ? "moving" : "idle";
      }
    }
    if (g.mode === "creating" || g.mode === "moving") {
      const i = g.target;
      if (i < 0 || i >= g.arr.length) return;
      g.arr[i] = { x: clamp(g.arr[i].x + ddx, 0, 1), y: clamp(g.arr[i].y + ddy, 0, 1) };
      setEsquinas(g.arr.map((c) => ({ ...c })));
    }
  }

  function onUp() {
    limpiaTimer();
    gestoR.current = null;
  }

  function recalibrar() {
    setEscuchando(false);
    setEsquinas([]);
    setCentro({ x: 0, y: 0 });
    homoR.current = null;
  }

  /**
   * Ajuste fino: detecta el centro real de la diana (la mancha negra) dentro de
   * la tarjeta y lo usa para recentrar el mapeo (compensa esquinas imperfectas o
   * rings descentrados). No corrige abultamientos (eso sería un modelo no plano).
   */
  function ajusteFino() {
    const canvas = procRef.current;
    const H = homoR.current;
    if (!canvas || !canvas.width || !H || esquinas.length !== 4) {
      setError("Calibra primero las 4 esquinas.");
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let sumX = 0, sumY = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70) {
        const idx = i / 4;
        const px = idx % w, py = Math.floor(idx / w);
        if (!dentroQuad(px / w, py / h, esquinas)) continue;
        sumX += px;
        sumY += py;
        count++;
      }
    }
    if (count < 100) {
      setError("No veo la zona negra para el ajuste fino (más luz / diana centrada).");
      return;
    }
    const p = aplicarHomografia(H, sumX / count / w, sumY / count / h);
    setError(null);
    setCentro({ x: p.x, y: p.y });
  }

  /**
   * Auto-calibración con OpenCV (v1): ajusta la elipse de la zona negra y, con
   * su centro/orientación/escala, coloca las 4 esquinas de la diana. Corrige el
   * centro y la inclinación suave sin marcar a mano; luego se pueden retocar.
   */
  /**
   * Detecta la diana ajustando la elipse de la zona negra (momentos de imagen,
   * JS puro, instantáneo) y de ahí coloca las 4 esquinas, corrigiendo centro e
   * inclinación suave. Si no ve la zona negra, avisa para calibrar a mano.
   */
  function autoDetectar() {
    const canvas = procRef.current;
    if (!canvas || !canvas.width) {
      setError("Aún no hay imagen; espera un segundo y reintenta.");
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    const el = fitElipseNegro(data, w, h);
    if (!el) {
      setError("No detecté la zona negra (más luz / diana centrada), o márcala a mano.");
      return;
    }
    const pts = esquinasDesdeElipse(el, w, h);
    if (!pts) {
      setError("No pude ajustar la diana; marca las 4 esquinas a mano.");
      return;
    }
    setError(null);
    setCentro({ x: 0, y: 0 });
    setEsquinas(pts);
  }

  const subtotal = impactos.reduce((a, i) => a + i.s, 0);
  const listo = esquinas.length === 4;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
        <strong>Prueba conceptual.</strong> Móvil fijo apuntando a tu diana reducida
        (mejor en penumbra). Marca las <strong>4 esquinas de la tarjeta blanca</strong>:
        <strong> mantén pulsado</strong> para crear cada punto y{" "}
        <strong>arrástralo</strong> para afinar. Con eso queda corregida la
        perspectiva (aunque la tarjeta esté algo ladeada) y verás la diana
        superpuesta para cuadrarla. Los disparos solo se detectan{" "}
        <strong>dentro de la tarjeta</strong> (ignora reflejos de fuera).
      </p>

      {error ? (
        <p style={{ color: "var(--rojo)", fontSize: "0.85rem", margin: 0 }}>{error}</p>
      ) : null}

      {fase === "inicio" ? (
        <button type="button" className="btn btn-primario btn-bloque" onClick={iniciar}>
          📷 Iniciar cámara
        </button>
      ) : null}

      <div
        ref={contRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
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
          cursor: "crosshair",
        }}
      >
        <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />

        {/* Diana superpuesta (deformada con la homografía). */}
        {listo && overlay ? (
          <svg
            width={1000}
            height={1000}
            viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformOrigin: "0 0",
              transform: overlay,
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 10 }, (_, i) => (i + 1) * DIANA_25M.ringStep).map((rad) => (
              <circle
                key={rad}
                cx={0}
                cy={0}
                r={rad}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={3}
                opacity={0.55}
              />
            ))}
            <circle cx={0} cy={0} r={DIANA_25M.innerTenR} fill="none" stroke="#22d3ee" strokeWidth={2} opacity={0.55} />
            <g stroke="#22d3ee" strokeWidth={2} opacity={0.7}>
              <line x1={-16} y1={0} x2={16} y2={0} />
              <line x1={0} y1={-16} x2={0} y2={16} />
            </g>
          </svg>
        ) : null}

        {/* Esquinas marcadas. */}
        {esquinas.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: 16,
              height: 16,
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
            border: "2px solid #f43f5e",
            boxShadow: "0 0 8px #f43f5e",
            pointerEvents: "none",
          }}
        />
      </div>

      {fase === "activa" ? (
        <button type="button" className="btn btn-primario btn-bloque" onClick={autoDetectar}>
          🎯 Detectar diana (auto)
        </button>
      ) : null}

      {fase === "activa" && !listo ? (
        <p style={{ fontSize: "0.85rem", margin: 0 }}>
          <strong>Mantén pulsado</strong> para poner la esquina{" "}
          <strong>{ETIQUETAS[esquinas.length] ?? ""}</strong> de la tarjeta ({esquinas.length}/4).
          El botón «Detectar diana» es un atajo (móvil de frente); marcar las 4
          esquinas a mano es lo más fiable y corrige la inclinación.
        </p>
      ) : null}

      {listo ? (
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className={escuchando ? "btn" : "btn btn-primario"}
              onClick={() => setEscuchando((e) => !e)}
            >
              {escuchando ? "⏸ Parar escucha" : "🎯 Escuchar disparos"}
            </button>
            <button type="button" className="btn" onClick={ajusteFino}>
              🎯 Ajuste fino
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

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.6rem",
              fontSize: "0.85rem",
            }}
          >
            <input type="checkbox" checked={espejo} onChange={(e) => setEspejo(e.target.checked)} />
            Espejo horizontal (si los disparos salen al lado contrario)
          </label>

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
            Puedes seguir moviendo las esquinas para cuadrar la diana azul con la
            real. El punto rojo es lo que detecta; baja la sensibilidad si pilla
            brillos.
          </p>
        </Card>
      ) : null}

      {fase !== "inicio" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.9rem" }}>
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
