"use client";

import { useEffect, useRef, useState, type PointerEvent as RPtr } from "react";
import {
  DIANA_25M,
  type DianaSpec,
  type Impacto,
  puntuacionDeImpacto,
  estadisticas,
  radioExterior,
  radioDiez,
  puntMin,
  mm,
} from "@/lib/diana";

const HIT_MM = 18; // radio (mm) para seleccionar un impacto al tocarlo
const LONG_PRESS_MS = 320; // pulsación larga para crear un impacto
const MOVE_THRESHOLD_PX = 8; // desplazamiento mínimo para considerarlo arrastre

/** Nombre por defecto (diana de precisión) para textos de ayuda. */
export const DIANA_NOMBRE = DIANA_25M.nombre;

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
const FONDO_IMPACTO = "rgba(140,146,153,0.65)"; // impactos acumulados (gris)
const MPI_COLOR = "#0ea5b7";
const MPI_FILL = "rgba(14,165,183,0.18)"; // azul semitransparente del círculo de agrupación

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
  background = [],
  finalizada,
  onChange,
  spec = DIANA_25M,
}: {
  impacts: Impacto[];
  /** Impactos de referencia (grises, no editables): p. ej. lo acumulado del blanco. */
  background?: Impacto[];
  finalizada: boolean;
  onChange: (next: Impacto[], commit: boolean) => void;
  /** Geometría de la diana (precisión por defecto; duelo para fuego rápido). */
  spec?: DianaSpec;
}) {
  const SPEC = spec;
  // Radio del lienzo (mm): el exterior puntuable + margen para ver impactos al borde.
  const R = radioExterior(SPEC) + 22;
  const VIEW = R * 2;
  const DOT_MM = SPEC.caliberMm / 2;
  const MIN_VIEW = VIEW / 4; // zoom máximo (×4)
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const selRef = useRef<number | null>(sel);
  selRef.current = sel;
  const gesto = useRef<Gesto | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zoom/pan: viewBox actual (en coordenadas SVG). Por defecto, la diana entera.
  const [view, setView] = useState({ x: -R, y: -R, w: VIEW, h: VIEW });
  // Si cambia el blanco (precisión ↔ duelo), reajusta el viewBox a su tamaño.
  useEffect(() => {
    setView({ x: -R, y: -R, w: VIEW, h: VIEW });
  }, [R, VIEW]);
  const punteros = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ startDist: number; startW: number; anchorX: number; anchorY: number } | null>(null);

  const stats = estadisticas(impacts);

  function toModelClient(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    const x = clamp(view.x + fx * view.w, -R, R);
    const y = clamp(-(view.y + fy * view.h), -R, R); // eje modelo hacia arriba
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

  /** Empieza un pinch de zoom/pan con los dos punteros activos. */
  function iniciarPinch() {
    const pts = [...punteros.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const rect = svgRef.current!.getBoundingClientRect();
    const fx = (mid.x - rect.left) / rect.width;
    const fy = (mid.y - rect.top) / rect.height;
    pinch.current = {
      startDist: dist || 1,
      startW: view.w,
      anchorX: view.x + fx * view.w,
      anchorY: view.y + fy * view.h,
    };
  }

  function onPointerDown(e: RPtr<SVGSVGElement>) {
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Dos dedos: modo zoom/pan (funciona también con la hoja finalizada).
    if (punteros.current.size >= 2) {
      limpiaTimer();
      gesto.current = null;
      iniciarPinch();
      return;
    }
    if (finalizada) return;
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
    g.pos.x = clamp(g.pos.x + dxScreen * (view.w / rect.width), -R, R);
    g.pos.y = clamp(g.pos.y - dyScreen * (view.h / rect.height), -R, R);
    const i = g.target;
    if (i < 0 || i >= g.arr.length) return;
    g.arr[i] = { x: g.pos.x, y: g.pos.y, s: puntuacionDeImpacto(SPEC, g.pos.x, g.pos.y) };
    onChange(
      g.arr.map((im) => ({ ...im })),
      false,
    );
  }

  function onPointerMove(e: RPtr<SVGSVGElement>) {
    if (punteros.current.has(e.pointerId)) {
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // Pinch: zoom (por la separación) y pan (por el punto medio).
    if (pinch.current && punteros.current.size >= 2) {
      e.preventDefault();
      const pts = [...punteros.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const rect = svgRef.current!.getBoundingClientRect();
      const w = clamp(pinch.current.startW * (pinch.current.startDist / dist), MIN_VIEW, VIEW);
      const fx = (mid.x - rect.left) / rect.width;
      const fy = (mid.y - rect.top) / rect.height;
      const x = clamp(pinch.current.anchorX - fx * w, -R, R - w);
      const y = clamp(pinch.current.anchorY - fy * w, -R, R - w);
      setView({ x, y, w, h: w });
      return;
    }
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

  function onPointerUp(e?: RPtr<SVGSVGElement>) {
    if (e && typeof e.pointerId === "number") punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinch.current = null;
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

  /** Zoom con los botones, centrado en el centro del viewBox actual. */
  function zoomCentro(factor: number) {
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    const w = clamp(view.w * factor, MIN_VIEW, VIEW);
    setView({ x: clamp(cx - w / 2, -R, R - w), y: clamp(cy - w / 2, -R, R - w), w, h: w });
  }
  function reajustar() {
    setView({ x: -R, y: -R, w: VIEW, h: VIEW });
  }
  const zoomNivel = VIEW / view.w;

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
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
        <Anillos spec={SPEC} R={R} VIEW={VIEW} />
        {/* Impactos acumulados de series anteriores (referencia, no editables). */}
        {background.map((im, i) => (
          <circle
            key={`bg-${i}`}
            cx={im.x}
            cy={-im.y}
            r={DOT_MM}
            fill={FONDO_IMPACTO}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1}
            style={{ pointerEvents: "none" }}
          />
        ))}
        {stats && (
          <g>
            {stats.covering > 1 && (
              <circle
                cx={stats.mpiX}
                cy={-stats.mpiY}
                r={stats.covering}
                fill={MPI_FILL}
                stroke={MPI_COLOR}
                strokeWidth={1.6}
                strokeDasharray="6 5"
                strokeOpacity={0.7}
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
          <ValorFlotante im={impacts[sel]} R={R} DOT={DOT_MM} />
        )}
      </svg>

      {/* Blanco en uso (precisión / duelo). */}
      <p
        style={{
          margin: "0.3rem 0 0",
          textAlign: "center",
          fontSize: "0.78rem",
          color: "var(--texto-suave)",
        }}
      >
        Blanco: <strong style={{ color: "var(--texto)" }}>{SPEC.nombre}</strong>
      </p>

      {/* Controles de zoom (además del pellizco con dos dedos). */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginTop: "0.4rem",
        }}
      >
        <button type="button" aria-label="Alejar" style={zoomBtn} onClick={() => zoomCentro(1 / 0.7)}>
          −
        </button>
        <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)", minWidth: 40, textAlign: "center" }}>
          {zoomNivel.toFixed(1)}×
        </span>
        <button type="button" aria-label="Acercar" style={zoomBtn} onClick={() => zoomCentro(0.7)}>
          +
        </button>
        {zoomNivel > 1.02 && (
          <button
            type="button"
            style={{ ...zoomBtn, width: "auto", padding: "0 0.6rem", fontSize: "0.8rem" }}
            onClick={reajustar}
          >
            Reajustar
          </button>
        )}
      </div>

      {!finalizada && (
        <p
          style={{
            margin: "0.4rem 0 0",
            fontSize: "0.75rem",
            color: "var(--texto-suave)",
            textAlign: "center",
          }}
        >
          Mantén pulsado para añadir · arrastra para mover el seleccionado ·{" "}
          <strong>pellizca con dos dedos</strong> para hacer zoom
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
function ValorFlotante({ im, R, DOT }: { im: Impacto; R: number; DOT: number }) {
  // Si el impacto está pegado al borde derecho, la etiqueta va a su izquierda.
  const derecha = im.x < R - 70;
  const x = im.x + (derecha ? DOT + 6 : -(DOT + 6));
  const y = -im.y - (DOT + 8);
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
function Anillos({ spec, R, VIEW }: { spec: DianaSpec; R: number; VIEW: number }) {
  const tenR = radioDiez(spec);
  const vMin = puntMin(spec);
  const rings: number[] = [];
  for (let i = 0; i <= spec.maxScore - vMin; i++) rings.push(tenR + i * spec.ringStep);
  const numeros: { v: number; y: number }[] = [];
  for (let v = spec.maxScore - 1; v >= vMin; v--) {
    const y = tenR + (spec.maxScore - v - 0.5) * spec.ringStep;
    numeros.push({ v, y });
  }
  return (
    <g>
      <rect x={-R} y={-R} width={VIEW} height={VIEW} fill={PAPEL} />
      <circle cx={0} cy={0} r={spec.blackR} fill={NEGRO} />
      {rings.map((rad) => (
        <circle
          key={rad}
          cx={0}
          cy={0}
          r={rad}
          fill="none"
          stroke={rad <= spec.blackR ? LINEA_CLARA : LINEA_OSCURA}
          strokeWidth={1.4}
        />
      ))}
      <circle
        cx={0}
        cy={0}
        r={spec.innerTenR}
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
          fill={y <= spec.blackR ? LINEA_CLARA : LINEA_OSCURA}
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

const zoomBtn = {
  width: 40,
  height: 36,
  padding: 0,
  fontSize: "1.3rem",
  fontWeight: 700,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid var(--borde)",
  background: "var(--superficie-2)",
  color: "var(--texto)",
  cursor: "pointer",
} as const;
