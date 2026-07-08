"use client";

import { useRef, type PointerEvent as RPtr } from "react";

const DIA = 86400000;
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Timestamp (UTC, a medianoche) de una fecha ISO YYYY-MM-DD. */
export function diaTs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function fmt(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Slider de rango de fechas a todo el ancho, con dos tiradores. La etiqueta del
 * tirador inferior (desde) se muestra debajo de la barra y la del superior
 * (hasta) encima. Devuelve los timestamps (a día) al mover.
 */
export function RangoFechas({
  min,
  max,
  desde,
  hasta,
  onChange,
}: {
  min: number;
  max: number;
  desde: number;
  hasta: number;
  onChange: (desde: number, hasta: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const activo = useRef<"desde" | "hasta" | null>(null);
  const span = max - min || 1;

  const fDesde = (desde - min) / span;
  const fHasta = (hasta - min) / span;

  function tsEn(clientX: number): number {
    const r = ref.current!.getBoundingClientRect();
    let f = (clientX - r.left) / r.width;
    f = Math.max(0, Math.min(1, f));
    return min + Math.round((f * span) / DIA) * DIA;
  }

  function onDown(e: RPtr<HTMLDivElement>) {
    if (span <= 0) return;
    e.preventDefault();
    const ts = tsEn(e.clientX);
    // Elige el tirador más cercano (si empatan, el que deje mover en esa dirección).
    activo.current =
      Math.abs(ts - desde) <= Math.abs(ts - hasta) ? "desde" : "hasta";
    ref.current?.setPointerCapture(e.pointerId);
    mover(ts);
  }

  function onMove(e: RPtr<HTMLDivElement>) {
    if (!activo.current) return;
    e.preventDefault();
    mover(tsEn(e.clientX));
  }

  function mover(ts: number) {
    if (activo.current === "desde") onChange(Math.min(ts, hasta), hasta);
    else onChange(desde, Math.max(ts, desde));
  }

  function onUp() {
    activo.current = null;
  }

  const desactivado = span <= 0;

  return (
    <div style={{ width: "90%", margin: "0 auto", padding: "1.4rem 0 1.5rem", userSelect: "none" }}>
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: "relative",
          height: 5,
          background: "color-mix(in srgb, var(--texto) 12%, transparent)",
          borderRadius: 4,
          touchAction: "none",
          cursor: desactivado ? "default" : "pointer",
        }}
      >
        {/* Tramo seleccionado */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${fDesde * 100}%`,
            right: `${(1 - fHasta) * 100}%`,
            background: "color-mix(in srgb, var(--acento) 70%, transparent)",
            borderRadius: 4,
          }}
        />
        {/* Etiqueta "hasta" (arriba) */}
        <Etiqueta frac={fHasta} arriba>
          {fmt(hasta)}
        </Etiqueta>
        {/* Etiqueta "desde" (abajo) */}
        <Etiqueta frac={fDesde}>{fmt(desde)}</Etiqueta>
        {/* Tiradores */}
        <Tirador frac={fDesde} />
        <Tirador frac={fHasta} />
      </div>
    </div>
  );
}

function Tirador({ frac }: { frac: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: `${frac * 100}%`,
        width: 17,
        height: 17,
        marginTop: -8.5,
        marginLeft: -8.5,
        borderRadius: "50%",
        background: "color-mix(in srgb, var(--acento) 85%, transparent)",
        border: "2px solid var(--fondo)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        pointerEvents: "none",
      }}
    />
  );
}

function Etiqueta({
  frac,
  arriba,
  children,
}: {
  frac: number;
  arriba?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${frac * 100}%`,
        transform: "translateX(-50%)",
        [arriba ? "bottom" : "top"]: 20,
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--texto)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
