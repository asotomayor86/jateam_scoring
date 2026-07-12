"use client";

import { useEffect, useRef, useState, type PointerEvent as RPtr } from "react";

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

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Slider de rango de fechas con dos tiradores. La zona táctil es alta (fácil de
 * agarrar con el dedo) aunque la barra se vea fina, y los tiradores siguen al
 * dedo de forma local (fluida); el recálculo de los resultados va limitado con
 * requestAnimationFrame para que no dé tirones.
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
  const raf = useRef(0);
  const pend = useRef<{ d: number; h: number } | null>(null);
  const span = max - min || 1;

  // Posición local de los tiradores (para que sigan al dedo sin esperar al
  // recálculo). Se sincroniza con las props cuando no se está arrastrando.
  const [loc, setLoc] = useState({ desde, hasta });
  useEffect(() => {
    if (!activo.current) setLoc({ desde, hasta });
  }, [desde, hasta]);

  const D = loc.desde;
  const H = loc.hasta;
  const fD = clamp((D - min) / span, 0, 1);
  const fH = clamp((H - min) / span, 0, 1);

  function tsEn(clientX: number): number {
    const r = ref.current!.getBoundingClientRect();
    const f = clamp((clientX - r.left) / r.width, 0, 1);
    return min + Math.round((f * span) / DIA) * DIA;
  }

  /** Notifica el cambio al padre como mucho una vez por frame (fluido). */
  function emitir(d: number, h: number) {
    pend.current = { d, h };
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (pend.current) onChange(pend.current.d, pend.current.h);
    });
  }

  function mover(ts: number) {
    let d = D;
    let h = H;
    if (activo.current === "desde") d = Math.min(ts, H);
    else h = Math.max(ts, D);
    setLoc({ desde: d, hasta: h });
    emitir(d, h);
  }

  function onDown(e: RPtr<HTMLDivElement>) {
    if (span <= 0) return;
    e.preventDefault();
    const ts = tsEn(e.clientX);
    activo.current = Math.abs(ts - D) <= Math.abs(ts - H) ? "desde" : "hasta";
    ref.current?.setPointerCapture(e.pointerId);
    mover(ts);
  }

  function onMove(e: RPtr<HTMLDivElement>) {
    if (!activo.current) return;
    e.preventDefault();
    mover(tsEn(e.clientX));
  }

  function onUp() {
    if (!activo.current) return;
    activo.current = null;
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
    onChange(loc.desde, loc.hasta); // valor final exacto
  }

  const desactivado = span <= 0;

  return (
    <div style={{ width: "90%", margin: "0 auto", padding: "1.7rem 0 1.8rem", userSelect: "none" }}>
      {/* Zona táctil alta (44 px) con la barra fina centrada dentro. */}
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: "relative",
          height: 44,
          touchAction: "none",
          cursor: desactivado ? "default" : "pointer",
        }}
      >
        {/* Barra */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 6,
            transform: "translateY(-50%)",
            background: "color-mix(in srgb, var(--texto) 14%, transparent)",
            borderRadius: 5,
          }}
        />
        {/* Tramo seleccionado */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            height: 6,
            transform: "translateY(-50%)",
            left: `${fD * 100}%`,
            right: `${(1 - fH) * 100}%`,
            background: "color-mix(in srgb, var(--acento) 75%, transparent)",
            borderRadius: 5,
          }}
        />
        {/* Etiquetas */}
        <Etiqueta frac={fH} arriba>
          {fmt(H)}
        </Etiqueta>
        <Etiqueta frac={fD}>{fmt(D)}</Etiqueta>
        {/* Tiradores */}
        <Tirador frac={fD} />
        <Tirador frac={fH} />
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
        width: 26,
        height: 26,
        marginTop: -13,
        marginLeft: -13,
        borderRadius: "50%",
        background: "var(--acento)",
        border: "3px solid var(--fondo)",
        boxShadow: "0 1px 5px rgba(0,0,0,0.35)",
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
        // Pegada al tirador (que está en el centro vertical de la zona táctil).
        [arriba ? "bottom" : "top"]: "50%",
        [arriba ? "marginBottom" : "marginTop"]: 17,
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
