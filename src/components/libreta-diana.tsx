"use client";

import { useRef, useState, type PointerEvent as RPtr } from "react";
import { useRouter } from "next/navigation";
import {
  guardarDianaSerie,
  borrarSerie,
  finalizarHoja,
  reabrirHoja,
} from "@/actions/scorecards";
import { formatPunt } from "@/lib/scoring";
import {
  DIANA_25M,
  type Impacto,
  puntuacionDeImpacto,
  estadisticas,
  radioExterior,
  mm,
} from "@/lib/diana";
import { Card } from "@/components/ui";

type SerieInicial = { idx: number; impacts: Impacto[] };
type EstadoGuardado = "" | "guardando" | "guardado" | "error";

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

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function LibretaDiana({
  scorecardId,
  seriesIniciales,
  totalInicial,
  innerInicial,
  finalizada,
}: {
  scorecardId: string;
  seriesIniciales: SerieInicial[];
  totalInicial: number;
  innerInicial: number;
  finalizada: boolean;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<SerieInicial[]>(() =>
    seriesIniciales.length > 0
      ? seriesIniciales.map((s) => ({ idx: s.idx, impacts: s.impacts ?? [] }))
      : [{ idx: 1, impacts: [] }],
  );
  const [total, setTotal] = useState(totalInicial);
  const [inner, setInner] = useState(innerInicial);
  const [estado, setEstado] = useState<Record<number, EstadoGuardado>>({});

  const numTiros = filas.reduce((a, f) => a + f.impacts.length, 0);

  function setImpactos(idx: number, next: Impacto[]) {
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, impacts: next } : f)));
  }

  async function guardar(idx: number, impacts: Impacto[]) {
    setEstado((e) => ({ ...e, [idx]: "guardando" }));
    try {
      const r = await guardarDianaSerie({ scorecardId, idx, impacts });
      if (r.ok) {
        if (typeof r.total === "number") setTotal(r.total);
        if (typeof r.innerCount === "number") setInner(r.innerCount);
        setEstado((e) => ({ ...e, [idx]: "guardado" }));
      } else {
        setEstado((e) => ({ ...e, [idx]: "error" }));
      }
    } catch {
      setEstado((e) => ({ ...e, [idx]: "error" }));
    }
  }

  async function anadirSerie() {
    const idx = filas.reduce((m, f) => Math.max(m, f.idx), 0) + 1;
    setFilas((prev) => [...prev, { idx, impacts: [] }]);
    await guardar(idx, []);
  }

  async function borrarFila(idx: number) {
    setFilas((prev) => prev.filter((f) => f.idx !== idx));
    try {
      const r = await borrarSerie({ scorecardId, idx });
      if (r.ok) {
        if (typeof r.total === "number") setTotal(r.total);
        if (typeof r.innerCount === "number") setInner(r.innerCount);
      }
    } catch {
      /* la fila ya se quitó localmente */
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      <div
        className="glass"
        style={{
          position: "sticky",
          top: 56,
          zIndex: 5,
          borderRadius: 12,
          padding: "0.6rem 0.9rem",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "var(--texto-suave)", fontSize: "0.85rem" }}>
          Total · {filas.length} serie{filas.length === 1 ? "" : "s"} · {numTiros} tiro
          {numTiros === 1 ? "" : "s"}
          {inner > 0 ? ` · ${inner}X` : ""}
        </span>
        <span style={{ fontSize: "1.7rem", fontWeight: 700 }}>{formatPunt(total)}</span>
      </div>

      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
        Modo <strong>Diana</strong> ({SPEC.nombre}): pincha en la diana para marcar
        cada impacto y <strong>arrastra</strong> para afinar. La puntuación sale del
        anillo; puedes corregirla a mano tocando un impacto.
        {finalizada ? " Hoja finalizada (solo lectura)." : ""}
      </p>

      {filas.map((fila) => (
        <DianaSerie
          key={fila.idx}
          idx={fila.idx}
          impacts={fila.impacts}
          finalizada={finalizada}
          estado={estado[fila.idx] ?? ""}
          onChange={(next, commit) => {
            setImpactos(fila.idx, next);
            if (commit) guardar(fila.idx, next);
          }}
          onDelete={() => borrarFila(fila.idx)}
        />
      ))}

      {!finalizada && (
        <button
          type="button"
          className="btn btn-bloque"
          onClick={anadirSerie}
          style={{ marginTop: "0.2rem" }}
        >
          + Añadir serie
        </button>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        {finalizada ? (
          <form action={reabrirHoja}>
            <input type="hidden" name="scorecardId" value={scorecardId} />
            <button type="submit" className="btn btn-bloque">
              Reabrir para corregir
            </button>
          </form>
        ) : (
          <form action={finalizarHoja} onSubmit={() => router.refresh()}>
            <input type="hidden" name="scorecardId" value={scorecardId} />
            <button type="submit" className="btn btn-primario btn-bloque">
              Finalizar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Una serie = una diana interactiva con sus impactos y estadísticas. */
function DianaSerie({
  idx,
  impacts,
  finalizada,
  estado,
  onChange,
  onDelete,
}: {
  idx: number;
  impacts: Impacto[];
  finalizada: boolean;
  estado: EstadoGuardado;
  onChange: (next: Impacto[], commit: boolean) => void;
  onDelete: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ i: number } | null>(null);
  const [sel, setSel] = useState<number | null>(null);

  const subtotal = impacts.reduce((a, i) => a + i.s, 0);
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
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.4rem",
          marginBottom: "0.5rem",
        }}
      >
        <strong style={{ fontSize: "0.95rem" }}>
          Serie {idx}
          <span style={{ color: "var(--texto-suave)", fontWeight: 400 }}>
            {" "}
            · {impacts.length} tiro{impacts.length === 1 ? "" : "s"} · {formatPunt(subtotal)}
          </span>
        </strong>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <EstadoChip estado={estado} />
          {!finalizada && (
            <button
              type="button"
              onClick={onDelete}
              title="Quitar serie"
              style={{
                border: "1px solid var(--borde)",
                background: "transparent",
                color: "var(--rojo)",
                borderRadius: 8,
                width: 30,
                height: 30,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          )}
        </span>
      </div>

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
          // Centro de agrupación (MPI): cruz fina.
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
      </svg>

      {/* Corrección del impacto seleccionado */}
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

      {/* Estadísticas de agrupación */}
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
    </Card>
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
      {/* Diez interior (X) */}
      <circle
        cx={0}
        cy={0}
        r={SPEC.innerTenR}
        fill="none"
        stroke={LINEA_CLARA}
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />
      {/* Cruz central */}
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

function EstadoChip({ estado }: { estado: EstadoGuardado }) {
  if (estado === "guardando")
    return <span style={{ fontSize: "0.75rem", color: "var(--texto-suave)" }}>guardando…</span>;
  if (estado === "guardado")
    return <span style={{ fontSize: "0.75rem", color: "var(--verde, #2b8a3e)" }}>✓</span>;
  if (estado === "error")
    return <span style={{ fontSize: "0.75rem", color: "var(--rojo)" }}>error</span>;
  return null;
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
