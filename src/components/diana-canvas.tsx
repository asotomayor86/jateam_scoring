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
const HIT_MM = 16; // radio (mm) para "agarrar" un impacto existente al pinchar
const DOT_MM = 6; // radio del punto de impacto

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
  const drag = useRef<{ i: number } | null>(null);
  const [sel, setSel] = useState<number | null>(null);

  const stats = estadisticas(impacts);

  function toModel(e: RPtr<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const x = clamp(-R + fx * VIEW, -R, R);
    const y = clamp(R - fy * VIEW, -R, R); // eje modelo hacia arriba
    return { x, y };
  }

  function nearest(p: { x: number; y: number }): number {
    let best = -1;
    let bestD = HIT_MM;
    impacts.forEach((im, i) => {
      const d = Math.hypot(im.x - p.x, im.y - p.y);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function onPointerDown(e: RPtr<SVGSVGElement>) {
    if (finalizada) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = toModel(e);
    const hit = nearest(p);
    if (hit >= 0) {
      setSel(hit);
      drag.current = { i: hit };
    } else {
      const nuevo: Impacto = { x: p.x, y: p.y, s: puntuacionDeImpacto(SPEC, p.x, p.y) };
      const next = [...impacts, nuevo];
      onChange(next, false);
      setSel(next.length - 1);
      drag.current = { i: next.length - 1 };
    }
  }

  function onPointerMove(e: RPtr<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    const p = toModel(e);
    const next = impacts.map((im, k) =>
      k === d.i ? { x: p.x, y: p.y, s: puntuacionDeImpacto(SPEC, p.x, p.y) } : im,
    );
    onChange(next, false);
  }

  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    onChange(impacts, true); // persiste el estado actual
  }

  function corregir(delta: number) {
    if (sel == null) return;
    const next = impacts.map((im, k) =>
      k === sel ? { ...im, s: clamp(im.s + delta, 0, SPEC.maxScore) } : im,
    );
    onChange(next, true);
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
          <g stroke={MPI_COLOR} strokeWidth={2.4} opacity={0.9}>
            <line x1={stats.mpiX - 10} y1={-stats.mpiY} x2={stats.mpiX + 10} y2={-stats.mpiY} />
            <line x1={stats.mpiX} y1={-stats.mpiY - 10} x2={stats.mpiX} y2={-stats.mpiY + 10} />
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
          <span style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
            Impacto seleccionado:
          </span>
          <button type="button" className="btn" style={corrBtn} onClick={() => corregir(-1)}>
            −
          </button>
          <strong style={{ minWidth: 22, textAlign: "center", fontSize: "1.05rem" }}>
            {impacts[sel].s}
          </strong>
          <button type="button" className="btn" style={corrBtn} onClick={() => corregir(1)}>
            +
          </button>
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
