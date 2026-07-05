"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  guardarSerie,
  guardarSerieAsistida,
  guardarEjercicioSerie,
  borrarSerie,
  finalizarHoja,
  reabrirHoja,
} from "@/actions/scorecards";
import {
  parseTiro,
  redondea1,
  formatPunt,
  ASISTIDO_VALORES,
  puntosDeRecuento,
  tirosDeRecuento,
  restaRecuentos,
} from "@/lib/scoring";
import { MODULOS, getModulo, moduloPlan } from "@/lib/fases";
import { Card } from "@/components/ui";
import { SeriesTimer } from "@/components/series-timer";
import { RatingFace } from "@/components/rating-face";

type Ejercicio = { id: string; code: string; title: string; tipologia: string };

type SerieInicial = {
  idx: number;
  moduleType: string | null;
  shots: number[] | null;
  subtotal: number;
  buckets: number[] | null;
  blancoNuevo: boolean;
  exerciseId: string | null;
  rating: string | null;
};

type Modo = "tiros" | "total" | "asistido";
type EstadoGuardado = "" | "guardando" | "guardado" | "error";

type Fila = {
  idx: number;
  kind: "modulo" | "ejercicio";
  moduleType: string;
  celdas: string[];
  totalStr: string;
  counts: string[];
  blancoNuevo: boolean;
  exerciseId: string;
  rating: string | null;
  estado: EstadoGuardado;
};

const MAX_PER_SHOT = 10;
const CALIFICACIONES = [
  { valor: "verde" as const, label: "Bien" },
  { valor: "amarillo" as const, label: "Regular" },
  { valor: "rojo" as const, label: "Mal" },
];

function modoDeGranularidad(g: string): Modo {
  if (g === "asistido") return "asistido";
  if (g === "tiro") return "tiros";
  return "total";
}

function filaVacia(): Omit<Fila, "idx" | "kind" | "estado"> {
  return {
    moduleType: "",
    celdas: [],
    totalStr: "",
    counts: ASISTIDO_VALORES.map(() => ""),
    blancoNuevo: false,
    exerciseId: "",
    rating: null,
  };
}

function filasIniciales(series: SerieInicial[], modo: Modo): Fila[] {
  return series
    .filter((s) => s.exerciseId || (s.moduleType && getModulo(s.moduleType)))
    .sort((a, b) => a.idx - b.idx)
    .map((s) => {
      if (s.exerciseId) {
        return {
          idx: s.idx,
          kind: "ejercicio" as const,
          ...filaVacia(),
          exerciseId: s.exerciseId,
          rating: s.rating,
          estado: "" as const,
        };
      }
      const mod = getModulo(s.moduleType as string)!;
      return {
        idx: s.idx,
        kind: "modulo" as const,
        ...filaVacia(),
        moduleType: s.moduleType as string,
        celdas: Array.from({ length: mod.shots }, (_, j) =>
          modo === "tiros" && s.shots && j < s.shots.length
            ? formatPunt(s.shots[j])
            : "",
        ),
        totalStr: modo === "total" && s.subtotal ? formatPunt(s.subtotal) : "",
        counts: ASISTIDO_VALORES.map((_, j) =>
          modo === "asistido" && s.buckets ? String(s.buckets[j] ?? 0) : "",
        ),
        blancoNuevo: s.blancoNuevo,
        estado: "" as const,
      };
    });
}

function numsAsistido(fila: Fila): number[] {
  return fila.counts.map((c) => {
    const n = parseInt(c, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
}

/** Subtotales asistido con encadenado por "blanco nuevo" (salta ejercicios). */
function calcAsistido(filas: Fila[]) {
  let prev = ASISTIDO_VALORES.map(() => 0);
  let total = 0;
  const porFila = new Map<number, { subtotal: number; tiros: number }>();
  for (const f of filas) {
    if (f.kind === "ejercicio") continue;
    const acumulado = numsAsistido(f);
    if (f.blancoNuevo) prev = ASISTIDO_VALORES.map(() => 0);
    const incremental = restaRecuentos(acumulado, prev);
    prev = acumulado;
    total += puntosDeRecuento(incremental);
    porFila.set(f.idx, {
      subtotal: puntosDeRecuento(incremental),
      tiros: tirosDeRecuento(incremental),
    });
  }
  return { porFila, total: redondea1(total) };
}

/** Subtotal de un módulo en modos NO asistido. */
function subtotalDe(fila: Fila, modo: Modo): number {
  if (modo === "tiros") {
    let s = 0;
    for (const c of fila.celdas) {
      const p = parseTiro(c, MAX_PER_SHOT, false);
      if (p) s += p.value;
    }
    return redondea1(s);
  }
  const n = Number(fila.totalStr.trim().replace(",", "."));
  return fila.totalStr.trim() !== "" && Number.isFinite(n) && n >= 0
    ? redondea1(n)
    : 0;
}

export function LibretaModular({
  scorecardId,
  granularity,
  ejercicios,
  seriesIniciales,
  finalizada,
}: {
  scorecardId: string;
  granularity: string;
  ejercicios: Ejercicio[];
  seriesIniciales: SerieInicial[];
  finalizada: boolean;
}) {
  const router = useRouter();
  const modo = modoDeGranularidad(granularity);
  const catalogo = useMemo(
    () => new Map(ejercicios.map((e) => [e.id, e])),
    [ejercicios],
  );
  const [filas, setFilas] = useState<Fila[]>(() =>
    filasIniciales(seriesIniciales, modo),
  );
  const [tipoNuevo, setTipoNuevo] = useState(MODULOS[0].key);
  const [ejNuevo, setEjNuevo] = useState(ejercicios[0]?.id ?? "");
  const filasRef = useRef(filas);
  filasRef.current = filas;
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const modulos = filas.filter((f) => f.kind === "modulo");
  const numEj = filas.length - modulos.length;
  const asistido = useMemo(
    () => (modo === "asistido" ? calcAsistido(filas) : null),
    [filas, modo],
  );
  const total = asistido
    ? asistido.total
    : redondea1(
        modulos.reduce((a, f) => a + subtotalDe(f, modo), 0),
      );

  const setEstado = useCallback((idx: number, estado: EstadoGuardado) => {
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, estado } : f)));
  }, []);

  const guardar = useCallback(
    async (idx: number) => {
      const fila = filasRef.current.find((f) => f.idx === idx);
      const mod = fila && getModulo(fila.moduleType);
      if (!fila || fila.kind !== "modulo" || !mod) return;
      setEstado(idx, "guardando");
      try {
        let ok = true;
        if (modo === "asistido") {
          const r = await guardarSerieAsistida({
            scorecardId,
            idx,
            blancoNuevo: fila.blancoNuevo,
            buckets: numsAsistido(fila),
          });
          ok = r.ok;
        } else {
          const shots: number[] = [];
          let inner = 0;
          if (modo === "tiros") {
            for (const c of fila.celdas) {
              const p = parseTiro(c, MAX_PER_SHOT, false);
              if (p) {
                shots.push(p.value);
                if (p.inner) inner++;
              }
            }
          }
          const r = await guardarSerie({
            scorecardId,
            idx,
            shots: shots.length ? shots : null,
            shotCount: mod.shots,
            subtotal: subtotalDe(fila, modo),
            inner,
            moduleType: fila.moduleType,
          });
          ok = r.ok;
        }
        setEstado(idx, ok ? "guardado" : "error");
      } catch {
        setEstado(idx, "error");
      }
    },
    [modo, scorecardId, setEstado],
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
  function cambiaTotal(idx: number, valor: string) {
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, totalStr: valor } : f)));
    programar(idx);
  }
  function cambiaCount(idx: number, j: number, valor: string) {
    setFilas((prev) =>
      prev.map((f) =>
        f.idx === idx
          ? { ...f, counts: f.counts.map((c, k) => (k === j ? valor : c)) }
          : f,
      ),
    );
    programar(idx);
  }
  function alternaBlanco(idx: number) {
    setFilas((prev) =>
      prev.map((f) => (f.idx === idx ? { ...f, blancoNuevo: !f.blancoNuevo } : f)),
    );
    programar(idx);
  }

  function siguienteIdx() {
    return (
      (filasRef.current.length
        ? Math.max(...filasRef.current.map((f) => f.idx))
        : 0) + 1
    );
  }

  async function anadirModulo() {
    const mod = getModulo(tipoNuevo);
    if (!mod) return;
    const esPrimero = !filasRef.current.some((f) => f.kind === "modulo");
    const idx = siguienteIdx();
    setFilas((prev) => [
      ...prev,
      {
        idx,
        kind: "modulo",
        ...filaVacia(),
        moduleType: mod.key,
        celdas: Array(mod.shots).fill(""),
        blancoNuevo: esPrimero,
        estado: "",
      },
    ]);
    if (modo === "asistido") {
      await guardarSerieAsistida({
        scorecardId,
        idx,
        blancoNuevo: esPrimero,
        buckets: ASISTIDO_VALORES.map(() => 0),
      });
    } else {
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
  }

  async function anadirEjercicio() {
    if (!ejNuevo) return;
    const idx = siguienteIdx();
    setFilas((prev) => [
      ...prev,
      { idx, kind: "ejercicio", ...filaVacia(), exerciseId: ejNuevo, estado: "" },
    ]);
    await guardarEjercicioSerie({ scorecardId, idx, exerciseId: ejNuevo, rating: null });
  }

  async function calificar(idx: number, rating: string) {
    const fila = filasRef.current.find((f) => f.idx === idx);
    if (!fila || fila.kind !== "ejercicio") return;
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, rating } : f)));
    setEstado(idx, "guardando");
    try {
      const r = await guardarEjercicioSerie({
        scorecardId,
        idx,
        exerciseId: fila.exerciseId,
        rating: rating as "verde" | "amarillo" | "rojo",
      });
      setEstado(idx, r.ok ? "guardado" : "error");
    } catch {
      setEstado(idx, "error");
    }
  }

  async function borrarFila(idx: number) {
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
          Total · {modulos.length} módulo{modulos.length === 1 ? "" : "s"}
          {numEj > 0 ? ` · ${numEj} ejercicio${numEj === 1 ? "" : "s"}` : ""}
        </span>
        <span style={{ fontSize: "1.7rem", fontWeight: 700 }}>
          {formatPunt(total)}
        </span>
      </div>

      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
        Entrenamiento <strong>modular</strong>: añade abajo series de disparos
        (con cronómetro) o ejercicios de la biblioteca (calificados 🟢/🟡/🔴).
        {finalizada ? " Hoja finalizada (solo lectura)." : ""}
      </p>

      {filas.map((fila) => {
        if (fila.kind === "ejercicio") {
          const ej = catalogo.get(fila.exerciseId);
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
                  {fila.idx}. {ej ? ej.title : "Ejercicio"}
                  {ej ? (
                    <span className="chip" style={{ marginLeft: "0.4rem", fontWeight: 600 }}>
                      {ej.tipologia}
                    </span>
                  ) : null}
                </strong>
                {!finalizada && (
                  <button
                    type="button"
                    onClick={() => borrarFila(fila.idx)}
                    title="Quitar"
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
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {CALIFICACIONES.map((c) => (
                  <button
                    key={c.valor}
                    type="button"
                    disabled={finalizada}
                    onClick={() => calificar(fila.idx, c.valor)}
                    aria-pressed={fila.rating === c.valor}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      padding: "0.5rem",
                      borderRadius: 10,
                      border:
                        fila.rating === c.valor
                          ? "2px solid var(--acento-fuerte)"
                          : "1px solid var(--borde)",
                      background:
                        fila.rating === c.valor ? "var(--superficie-2)" : "transparent",
                      cursor: finalizada ? "default" : "pointer",
                      opacity: fila.rating && fila.rating !== c.valor ? 0.45 : 1,
                    }}
                  >
                    <RatingFace tipo={c.valor} />
                    <span style={{ fontSize: "0.75rem", color: "var(--texto-suave)" }}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
              {ej ? (
                <a
                  href={`/ejercicios/${ej.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--acento)", fontSize: "0.8rem", display: "inline-block", marginTop: "0.4rem" }}
                >
                  Ver ficha del ejercicio ↗
                </a>
              ) : null}
            </Card>
          );
        }

        const mod = getModulo(fila.moduleType);
        if (!mod) return null;
        const info = modo === "asistido" ? asistido?.porFila.get(fila.idx) : undefined;
        const sub = modo === "asistido" ? (info?.subtotal ?? 0) : subtotalDe(fila, modo);
        const nTiros =
          modo === "asistido"
            ? (info?.tiros ?? 0)
            : modo === "total"
              ? fila.totalStr.trim()
                ? mod.shots
                : 0
              : fila.celdas.reduce(
                  (n, c) => (parseTiro(c, MAX_PER_SHOT, false) ? n + 1 : n),
                  0,
                );
        return (
          <Card key={fila.idx}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
                gap: "0.4rem",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                {fila.idx}. {mod.label}
              </strong>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  {nTiros} tiros
                </span>
                <span style={{ fontWeight: 700 }}>{formatPunt(sub)}</span>
                {modo === "asistido" && !finalizada && (
                  <button
                    type="button"
                    onClick={() => alternaBlanco(fila.idx)}
                    aria-pressed={fila.blancoNuevo}
                    style={{
                      border: "1px solid var(--borde)",
                      borderRadius: 8,
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      background: fila.blancoNuevo ? "var(--acento-fuerte)" : "transparent",
                      color: fila.blancoNuevo ? "#1a1205" : "var(--texto-suave)",
                      fontWeight: 600,
                    }}
                  >
                    {fila.blancoNuevo ? "● Blanco nuevo" : "○ Blanco nuevo"}
                  </button>
                )}
                {!finalizada && (
                  <button
                    type="button"
                    onClick={() => borrarFila(fila.idx)}
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

            {modo === "tiros" ? (
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
            ) : modo === "total" ? (
              <input
                className="tiro-input"
                inputMode="numeric"
                disabled={finalizada}
                value={fila.totalStr}
                placeholder={`Total del módulo (${mod.shots} tiros)`}
                onChange={(e) => cambiaTotal(fila.idx, e.target.value)}
                onBlur={() => guardar(fila.idx)}
                style={{ textAlign: "left", paddingLeft: "0.6rem" }}
              />
            ) : (
              <div className="serie-grid">
                {ASISTIDO_VALORES.map((valor, j) => (
                  <label
                    key={valor}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                  >
                    <span style={{ fontSize: "0.7rem", color: "var(--texto-suave)" }}>
                      {valor}
                    </span>
                    <input
                      className="tiro-input"
                      inputMode="numeric"
                      maxLength={3}
                      disabled={finalizada}
                      value={fila.counts[j]}
                      placeholder="0"
                      onChange={(e) => cambiaCount(fila.idx, j, e.target.value)}
                      onBlur={() => guardar(fila.idx)}
                    />
                  </label>
                ))}
              </div>
            )}

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

            {!finalizada ? <SeriesTimer plan={moduloPlan(mod)} /> : null}
          </Card>
        );
      })}

      {!finalizada ? (
        <>
          <Card>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={tipoNuevo}
                onChange={(e) => setTipoNuevo(e.target.value)}
                style={selectStyle}
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
                style={{ width: 168, flexShrink: 0 }}
                onClick={anadirModulo}
              >
                + Añadir serie
              </button>
            </div>
          </Card>

          {ejercicios.length > 0 ? (
            <Card>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <select
                  value={ejNuevo}
                  onChange={(e) => setEjNuevo(e.target.value)}
                  style={selectStyle}
                >
                  {ejercicios.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} · {e.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  style={{ width: 168, flexShrink: 0 }}
                  onClick={anadirEjercicio}
                >
                  + Añadir ejercicio
                </button>
              </div>
            </Card>
          ) : null}
        </>
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

const selectStyle = {
  flex: 1,
  minWidth: 160,
  padding: "0.6rem 0.7rem",
  borderRadius: 8,
  border: "1px solid var(--borde)",
  background: "var(--superficie-2)",
  color: "var(--texto)",
  fontSize: "0.95rem",
} as const;
