"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  guardarDianaSerie,
  borrarSerie,
  finalizarHoja,
  reabrirHoja,
} from "@/actions/scorecards";
import { formatPunt } from "@/lib/scoring";
import type { Impacto } from "@/lib/diana";
import { Card } from "@/components/ui";
import { DianaCanvas, DIANA_NOMBRE } from "@/components/diana-canvas";

type SerieInicial = { idx: number; impacts: Impacto[] };
type EstadoGuardado = "" | "guardando" | "guardado" | "error";

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
        Modo <strong>Diana</strong> ({DIANA_NOMBRE}): <strong>mantén pulsado</strong>{" "}
        para añadir un impacto y luego <strong>arrastra en cualquier punto</strong>{" "}
        para moverlo. La puntuación sale del anillo; puedes corregirla con −/+.
        {finalizada ? " Hoja finalizada (solo lectura)." : ""}
      </p>

      {filas.map((fila) => {
        const subtotal = fila.impacts.reduce((a, i) => a + i.s, 0);
        return (
          <Card key={fila.idx}>
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
                Serie {fila.idx}
                <span style={{ color: "var(--texto-suave)", fontWeight: 400 }}>
                  {" "}
                  · {fila.impacts.length} tiro{fila.impacts.length === 1 ? "" : "s"} ·{" "}
                  {formatPunt(subtotal)}
                </span>
              </strong>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <EstadoChip estado={estado[fila.idx] ?? ""} />
                {!finalizada && (
                  <button
                    type="button"
                    onClick={() => borrarFila(fila.idx)}
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

            <DianaCanvas
              impacts={fila.impacts}
              finalizada={finalizada}
              onChange={(next, commit) => {
                setImpactos(fila.idx, next);
                if (commit) guardar(fila.idx, next);
              }}
            />
          </Card>
        );
      })}

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

function EstadoChip({ estado }: { estado: EstadoGuardado }) {
  if (estado === "guardando")
    return <span style={{ fontSize: "0.75rem", color: "var(--texto-suave)" }}>guardando…</span>;
  if (estado === "guardado")
    return <span style={{ fontSize: "0.75rem", color: "var(--verde, #2b8a3e)" }}>✓</span>;
  if (estado === "error")
    return <span style={{ fontSize: "0.75rem", color: "var(--rojo)" }}>error</span>;
  return null;
}
