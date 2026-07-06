"use client";

import { useRef, useState, type PointerEvent as RPtr } from "react";
import {
  DIANA_25M,
  type Impacto,
  puntuacionDeImpacto,
  estadisticas,
  radioExterior,
  mm,
} from "@/lib/diana";

const SPEC = DIANA_25M;
// Radio del lienzo (mm): el exterior puntuable + un margen para ver impactos al borde.
const R = radioExterior(SPEC) + 22;
const VIEW = R * 2;
const HIT_MM = 18; // radio (mm) para seleccionar un impacto al tocarlo
// Radio del punto = mitad del calibre: así el BORDE del punto que se ve es justo
// el que decide la puntuación (lo que ves es lo que puntúa).
const DOT_MM = SPEC.caliberMm / 2;
const LONG_PRESS_MS = 320; // pulsación larga para crear un impacto
const MOVE_THRESHOLD_PX = 8; // desplazamiento mínimo para considerarlo arrastre

/** Estado de un gesto en curso sobre la diana. */
type Gesto = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  mode: "pending" | "creating" | "moving" | "idle";
  target: number; // índice del impacto que se crea/mueve
  arr: Impacto[]; // copia de trabajo (independiente del ciclo de render)
  pos: { x: number; y: number }; // posición acumulada del impacto activo (mm)
};

// Paleta fija de "diana" (se ve igual en claro y oscuro: una diana es una diana).
const PAPEL = "#e9e4d6";
const NEGRO = "#14110c";
const LINEA_CLARA = "rgba(255,255,255,0.55)";
const LINEA_OSCURA = "rgba(0,0,0,0.45)";
const IMPACTO = "#d1372f";
const IMPACTO_SEL = "#111";
const MPI_COLOR = "#0ea5b7";

export const DIANA_NOMBRE = SPEC.nombre;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Lienzo interactivo de la diana (controlado): pincha para marcar impactos,
 * arrastra para afinar, toca uno para corregir su valor o borrarlo. Muestra las
 * estadísticas de agrupación. No guarda: notifica los cambios con `onChange`
 * (con `commit=true` cuando conviene persistir).
 */
export function DianaCanvas({
  impacts,
  finalizada,
  onChange,
}: {
  impacts: Impacto[];
  finalizada: boolean;
  onChange: (next: Impacto[], commit: boolean) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const selRef = useRef<number | null>(sel);
  selRef.current = sel;
  const gesto = useRef<Gesto | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = estadisticas(impacts);

  function toModelClient(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    const x = clamp(-R + fx * VIEW, -R, R);
    const y = clamp(R - fy * VIEW, -R, R); // eje modelo hacia arriba
    return { x, y };
  }

  function nearest(p: { x: number; y: number }, arr: Impacto[]): number {
    let best = -1;
    let bestD = HIT_MM;
    arr.forEach((im, i) => {
      const d = Math.hypot(im.x - p.x, im.y - p.y);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function limpiaTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function onPointerDown(e: RPtr<SVGSVGElement>) {
    if (finalizada) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    limpiaTimer();
    const arr = impacts.map((i) => ({ ...i }));
    const target = selRef.current ?? -1;
    gesto.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      mode: "pending",
      target,
      arr,
      pos: target >= 0 && arr[target] ? { x: arr[target].x, y: arr[target].y } : { x: 0, y: 0 },
    };
    // Pulsación larga => crear un nuevo impacto donde está el dedo.
    pressTimer.current = setTimeout(() => {
      const g = gesto.current;
      if (!g || g.mode !== "pending" || g.moved) return;
      const p = toModelClient(g.startX, g.startY);
      const nuevo: Impacto = { x: p.x, y: p.y, s: puntuacionDeImpacto(SPEC, p.x, p.y) };
      g.arr = [...g.arr, nuevo];
      g.target = g.arr.length - 1;
      g.pos = { x: p.x, y: p.y };
      g.mode = "creating";
      setSel(g.target);
      onChange(
        g.arr.map((i) => ({ ...i })),
        false,
      );
    }, LONG_PRESS_MS);
  }

  function aplicaDelta(g: Gesto, dxScreen: number, dyScreen: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    g.pos.x = clamp(g.pos.x + dxScreen * (VIEW / rect.width), -R, R);
    g.pos.y = clamp(g.pos.y - dyScreen * (VIEW / rect.height), -R, R);
    const i = g.target;
    if (i < 0 || i >= g.arr.length) return;
    g.arr[i] = { x: g.pos.x, y: g.pos.y, s: puntuacionDeImpacto(SPEC, g.pos.x, g.pos.y) };
    onChange(
      g.arr.map((im) => ({ ...im })),
      false,
    );
  }

  function onPointerMove(e: RPtr<SVGSVGElement>) {
    const g = gesto.current;
    if (!g) return;
    e.preventDefault();
    const dxScreen = e.clientX - g.lastX;
    const dyScreen = e.clientY - g.lastY;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > MOVE_THRESHOLD_PX) {
      g.moved = true;
      if (g.mode === "pending") {
        limpiaTimer();
        // Arrastre corto (sin pulsación larga): mover el impacto seleccionado.
        g.mode = g.target >= 0 ? "moving" : "idle";
      }
    }
    if (g.mode === "creating" || g.mode === "moving") {
      aplicaDelta(g, dxScreen, dyScreen);
    }
  }

  function onPointerUp() {
    limpiaTimer();
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    if (g.mode === "creating" || g.mode === "moving") {
      onChange(
        g.arr.map((i) => ({ ...i })),
        true,
      );
    } else if (g.mode === "pending" && !g.moved) {
      // Toque corto: selecciona el impacto cercano (para luego moverlo).
      const hit = nearest(toModelClient(g.startX, g.startY), g.arr);
      if (hit >= 0) setSel(hit);
    }
  }

  function borrarImpacto() {
    if (sel == null) return;
    const next = impacts.filter((_, k) => k !== sel);
    setSel(null);
    onChange(next, true);
  }

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`${-R} ${-R} ${VIEW} ${VIEW}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          width: "100%",
          maxWidth: 380,
          margin: "0 auto",
          display: "block",
          touchAction: "none",
          borderRadius: 10,
          cursor: finalizada ? "default" : "crosshair",
          userSelect: "none",
        }}
      >
        <Anillos />
        {stats && (
          <g>
            {stats.covering > 1 && (
              <circle
                cx={stats.mpiX}
                cy={-stats.mpiY}
                r={stats.covering}
                fill="none"
                stroke={MPI_COLOR}
                strokeWidth={1.6}
                strokeDasharray="6 5"
                opacity={0.55}
              />
            )}
            <g stroke={MPI_COLOR} strokeWidth={2.4} opacity={0.9}>
              <line x1={stats.mpiX - 10} y1={-stats.mpiY} x2={stats.mpiX + 10} y2={-stats.mpiY} />
              <line x1={stats.mpiX} y1={-stats.mpiY - 10} x2={stats.mpiX} y2={-stats.mpiY + 10} />
            </g>
          </g>
        )}
        {impacts.map((im, i) => (
          <circle
            key={i}
            cx={im.x}
            cy={-im.y}
            r={DOT_MM}
            fill={i === sel ? IMPACTO_SEL : IMPACTO}
            stroke={i === sel ? "#fff" : "rgba(0,0,0,0.35)"}
            strokeWidth={i === sel ? 3 : 1.2}
          />
        ))}
        {/* Valor flotante del impacto seleccionado / que se está colocando. */}
        {sel != null && impacts[sel] && (
          <ValorFlotante im={impacts[sel]} />
        )}
      </svg>

      {!finalizada && (
        <p
          style={{
            margin: "0.4rem 0 0",
            fontSize: "0.75rem",
            color: "var(--texto-suave)",
            textAlign: "center",
          }}
        >
          Mantén pulsado para añadir · arrastra en cualquier punto para mover el
          seleccionado
        </p>
      )}

      {!finalizada && sel != null && impacts[sel] && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginTop: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn"
            style={{ ...corrBtn, width: "auto", padding: "0 0.6rem", color: "var(--rojo)" }}
            onClick={borrarImpacto}
          >
            Borrar impacto
          </button>
          <button
            type="button"
            className="btn"
            style={{ ...corrBtn, width: "auto", padding: "0 0.6rem" }}
            onClick={() => setSel(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {stats && (
        <div
          style={{
            display: "flex",
            gap: "0.9rem",
            flexWrap: "wrap",
            marginTop: "0.6rem",
            fontSize: "0.8rem",
            color: "var(--texto-suave)",
          }}
        >
          <Dato etiqueta="Agrupación" valor={`${mm(stats.spread)} mm`} />
          <Dato etiqueta="Dispersión" valor={`${mm(stats.dispersion)} mm`} />
          <Dato
            etiqueta="Centro"
            valor={
              stats.offset < 3
                ? "centrado"
                : `${mm(stats.offset)} mm ${rumbo(stats.mpiX, stats.mpiY)}`
            }
          />
        </div>
      )}
    </>
  );
}

/** Valor numérico del impacto, flotando a su lado (halo blanco para legibilidad). */
function ValorFlotante({ im }: { im: Impacto }) {
  // Si el impacto está pegado al borde derecho, la etiqueta va a su izquierda.
  const derecha = im.x < R - 70;
  const x = im.x + (derecha ? DOT_MM + 6 : -(DOT_MM + 6));
  const y = -im.y - (DOT_MM + 8);
  return (
    <text
      x={x}
      y={y}
      fontSize={24}
      fontWeight={800}
      textAnchor={derecha ? "start" : "end"}
      dominantBaseline="central"
      fill="#111"
      stroke="#fff"
      strokeWidth={4.5}
      paintOrder="stroke"
      style={{ pointerEvents: "none" }}
    >
      {im.s}
    </text>
  );
}

/** Dibuja los anillos, la zona negra, la cruz central y los números de referencia. */
function Anillos() {
  const rings = [];
  for (let r = 1; r <= SPEC.maxScore; r++) rings.push(r * SPEC.ringStep);
  const numeros = [];
  for (let r = 2; r <= SPEC.maxScore; r++) {
    const mid = (r - 0.5) * SPEC.ringStep;
    numeros.push({ v: SPEC.maxScore + 1 - r, y: mid });
  }
  return (
    <g>
      <rect x={-R} y={-R} width={VIEW} height={VIEW} fill={PAPEL} />
      <circle cx={0} cy={0} r={SPEC.blackR} fill={NEGRO} />
      {rings.map((rad) => (
        <circle
          key={rad}
          cx={0}
          cy={0}
          r={rad}
          fill="none"
          stroke={rad <= SPEC.blackR ? LINEA_CLARA : LINEA_OSCURA}
          strokeWidth={1.4}
        />
      ))}
      <circle
        cx={0}
        cy={0}
        r={SPEC.innerTenR}
        fill="none"
        stroke={LINEA_CLARA}
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />
      <g stroke={LINEA_CLARA} strokeWidth={1}>
        <line x1={-8} y1={0} x2={8} y2={0} />
        <line x1={0} y1={-8} x2={0} y2={8} />
      </g>
      {numeros.map(({ v, y }) => (
        <text
          key={v}
          x={0}
          y={y}
          fontSize={15}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
          fill={y <= SPEC.blackR ? LINEA_CLARA : LINEA_OSCURA}
        >
          {v}
        </text>
      ))}
    </g>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <span>
      {etiqueta}: <strong style={{ color: "var(--texto)" }}>{valor}</strong>
    </span>
  );
}

/** Dirección aproximada del centro de agrupación (para leer la desviación). */
function rumbo(x: number, y: number): string {
  const v = y > 8 ? "arriba" : y < -8 ? "abajo" : "";
  const h = x > 8 ? "derecha" : x < -8 ? "izquierda" : "";
  return [v, h].filter(Boolean).join("-") || "centrado";
}

const corrBtn = {
  width: 40,
  height: 36,
  padding: 0,
  fontSize: "1.1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;
