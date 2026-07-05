"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  guardarSerie,
  borrarSerie,
  finalizarHoja,
  reabrirHoja,
} from "@/actions/scorecards";
import { parseTiro, redondea1, formatPunt } from "@/lib/scoring";
import { MODULOS, getModulo } from "@/lib/fases";
import { Card } from "@/components/ui";
import { SeriesTimer } from "@/components/series-timer";

type SerieInicial = {
  idx: number;
  moduleType: string | null;
  shots: number[] | null;
};

type EstadoGuardado = "" | "guardando" | "guardado" | "error";

type Fila = {
  idx: number;
  moduleType: string;
  celdas: string[];
  estado: EstadoGuardado;
};

const MAX_PER_SHOT = 10;

function filasIniciales(series: SerieInicial[]): Fila[] {
  return series
    .filter((s) => s.moduleType && getModulo(s.moduleType))
    .sort((a, b) => a.idx - b.idx)
    .map((s) => {
      const mod = getModulo(s.moduleType as string)!;
      const celdas = Array.from({ length: mod.shots }, (_, j) =>
        s.shots && j < s.shots.length ? formatPunt(s.shots[j]) : "",
      );
      return { idx: s.idx, moduleType: s.moduleType as string, celdas, estado: "" as const };
    });
}

/** Tiros, subtotal y dieces de una fila. */
function calcula(fila: Fila) {
  const shots: number[] = [];
  let inner = 0;
  for (const c of fila.celdas) {
    const p = parseTiro(c, MAX_PER_SHOT, false);
    if (p) {
      shots.push(p.value);
      if (p.inner) inner++;
    }
  }
  return { shots, subtotal: redondea1(shots.reduce((a, b) => a + b, 0)), inner };
}

export function LibretaModular({
  scorecardId,
  seriesIniciales,
  finalizada,
}: {
  scorecardId: string;
  seriesIniciales: SerieInicial[];
  finalizada: boolean;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(() => filasIniciales(seriesIniciales));
  const [tipoNuevo, setTipoNuevo] = useState(MODULOS[0].key);
  const filasRef = useRef(filas);
  filasRef.current = filas;
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const total = useMemo(
    () => redondea1(filas.reduce((a, f) => a + calcula(f).subtotal, 0)),
    [filas],
  );

  const setEstado = useCallback((idx: number, estado: EstadoGuardado) => {
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, estado } : f)));
  }, []);

  const guardar = useCallback(
    async (idx: number) => {
      const fila = filasRef.current.find((f) => f.idx === idx);
      const mod = fila && getModulo(fila.moduleType);
      if (!fila || !mod) return;
      const c = calcula(fila);
      setEstado(idx, "guardando");
      try {
        const r = await guardarSerie({
          scorecardId,
          idx,
          shots: c.shots.length ? c.shots : null,
          shotCount: mod.shots,
          subtotal: c.subtotal,
          inner: c.inner,
          moduleType: fila.moduleType,
        });
        setEstado(idx, r.ok ? "guardado" : "error");
      } catch {
        setEstado(idx, "error");
      }
    },
    [scorecardId, setEstado],
  );

  const programar = useCallback(
    (idx: number) => {
      clearTimeout(timers.current[idx]);
      timers.current[idx] = setTimeout(() => guardar(idx), 700);
    },
    [guardar],
  );

  function cambiaCelda(idx: number, j: number, valor: string) {
    setFilas((prev) =>
      prev.map((f) =>
        f.idx === idx
          ? { ...f, celdas: f.celdas.map((c, k) => (k === j ? valor : c)) }
          : f,
      ),
    );
    programar(idx);
  }

  async function anadirModulo() {
    const mod = getModulo(tipoNuevo);
    if (!mod) return;
    const idx =
      (filasRef.current.length
        ? Math.max(...filasRef.current.map((f) => f.idx))
        : 0) + 1;
    const fila: Fila = {
      idx,
      moduleType: mod.key,
      celdas: Array(mod.shots).fill(""),
      estado: "",
    };
    setFilas((prev) => [...prev, fila]);
    await guardarSerie({
      scorecardId,
      idx,
      shots: null,
      shotCount: mod.shots,
      subtotal: 0,
      inner: 0,
      moduleType: mod.key,
    });
  }

  async function borrarModulo(idx: number) {
    setFilas((prev) => prev.filter((f) => f.idx !== idx));
    await borrarSerie({ scorecardId, idx });
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
          Total · {filas.length} módulo{filas.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: "1.7rem", fontWeight: 700 }}>
          {formatPunt(total)}
        </span>
      </div>

      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
        Entrenamiento <strong>modular</strong>: añade abajo los módulos que vas a
        hacer; cada uno trae su cronómetro.
        {finalizada ? " Hoja finalizada (solo lectura)." : ""}
      </p>

      {filas.map((fila) => {
        const mod = getModulo(fila.moduleType);
        if (!mod) return null;
        const c = calcula(fila);
        return (
          <Card key={fila.idx}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
                gap: "0.4rem",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                {fila.idx}. {mod.label}
              </strong>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700 }}>{formatPunt(c.subtotal)}</span>
                {!finalizada && (
                  <button
                    type="button"
                    onClick={() => borrarModulo(fila.idx)}
                    title="Quitar módulo"
                    style={{
                      border: "1px solid var(--borde)",
                      background: "transparent",
                      color: "var(--rojo)",
                      borderRadius: 8,
                      width: 30,
                      height: 30,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="serie-grid">
              {fila.celdas.map((valor, j) => (
                <input
                  key={j}
                  className="tiro-input"
                  inputMode="numeric"
                  maxLength={4}
                  disabled={finalizada}
                  value={valor}
                  placeholder="·"
                  onChange={(e) => cambiaCelda(fila.idx, j, e.target.value)}
                  onBlur={() => guardar(fila.idx)}
                />
              ))}
            </div>

            <div
              style={{
                marginTop: "0.35rem",
                minHeight: 16,
                fontSize: "0.75rem",
                color: fila.estado === "error" ? "var(--rojo)" : "var(--texto-suave)",
              }}
            >
              {fila.estado === "guardando"
                ? "Guardando…"
                : fila.estado === "guardado"
                  ? "Guardado ✓"
                  : fila.estado === "error"
                    ? "Error al guardar"
                    : ""}
            </div>

            {!finalizada ? <SeriesTimer plan={mod.plan} /> : null}
          </Card>
        );
      })}

      {!finalizada ? (
        <Card>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <select
              value={tipoNuevo}
              onChange={(e) => setTipoNuevo(e.target.value)}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "0.6rem 0.7rem",
                borderRadius: 8,
                border: "1px solid var(--borde)",
                background: "var(--superficie-2)",
                color: "var(--texto)",
                fontSize: "0.95rem",
              }}
            >
              {MODULOS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primario"
              onClick={anadirModulo}
            >
              + Añadir módulo
            </button>
          </div>
        </Card>
      ) : null}

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
              Finalizar entrenamiento
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
