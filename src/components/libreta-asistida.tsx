"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  guardarSerieAsistida,
  finalizarHoja,
  reabrirHoja,
} from "@/actions/scorecards";
import {
  ASISTIDO_VALORES,
  puntosDeRecuento,
  tirosDeRecuento,
  restaRecuentos,
  redondea1,
  formatPunt,
} from "@/lib/scoring";
import type { Impacto } from "@/lib/diana";
import { Card } from "@/components/ui";
import { DianaCanvas } from "@/components/diana-canvas";
import { DianaToggle } from "@/components/diana-toggle";
import { LaserCamLink } from "@/components/laser-cam-link";
import { LaserTrainer } from "@/components/laser-trainer";
import { ImpactosBoxes } from "@/components/impactos-boxes";
import { AjusteFinalField } from "@/components/ajuste-final";
import { SeriesTimer } from "@/components/series-timer";
import { faseSerie, planTimer } from "@/lib/fases";

type SerieInicial = {
  idx: number;
  blancoNuevo: boolean;
  buckets: number[] | null;
  impacts: Impacto[] | null;
};

type Modalidad = {
  seriesCount: number;
  totalShots: number;
  defaultSeriesSize: number;
  maxPerShot: number;
};

type EstadoGuardado = "" | "guardando" | "guardado" | "error";

type Fila = {
  idx: number;
  blancoNuevo: boolean;
  counts: string[]; // recuento ACUMULADO escrito por valor (10..0)
  usaDiana: boolean; // si se apunta con la diana gráfica en vez de las casillas
  impacts: Impacto[];
  estado: EstadoGuardado;
};

const CEROS = () => ASISTIDO_VALORES.map(() => "");

/** Recuento por valor (10..0) a partir de los impactos de la diana. */
function histograma(impacts: Impacto[]): number[] {
  const h = ASISTIDO_VALORES.map(() => 0);
  for (const im of impacts) {
    const j = 10 - im.s; // ASISTIDO_VALORES = [10,9,…,0] ⇒ índice = 10 − valor
    if (j >= 0 && j < h.length) h[j]++;
  }
  return h;
}

function filasIniciales(series: SerieInicial[], mod: Modalidad): Fila[] {
  const porIdx = new Map(series.map((s) => [s.idx, s]));
  return Array.from({ length: mod.seriesCount }, (_, i) => {
    const idx = i + 1;
    const s = porIdx.get(idx);
    return {
      idx,
      blancoNuevo: s ? s.blancoNuevo : idx === 1,
      counts: s?.buckets
        ? ASISTIDO_VALORES.map((_, j) => String(s.buckets?.[j] ?? 0))
        : CEROS(),
      usaDiana: !!(s?.impacts && s.impacts.length > 0),
      impacts: s?.impacts ?? [],
      estado: "" as const,
    };
  });
}

/** Recuento numérico de una fila (vacío = 0). */
function nums(fila: Fila): number[] {
  return fila.counts.map((c) => {
    const n = parseInt(c, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
}

/** Calcula subtotales por serie (incremental respecto al blanco) y total. */
function calculaTodo(filas: Fila[]) {
  let prev = ASISTIDO_VALORES.map(() => 0);
  let total = 0;
  let inner = 0;
  const porFila = new Map<number, { subtotal: number; tiros: number }>();
  for (const f of filas) {
    // Serie con diana: sus impactos son los PROPIOS de esa serie (los previos se
    // ven en gris). Puntúa su histograma propio, sin restar ni avanzar el
    // acumulado del blanco.
    if (f.usaDiana) {
      const own = histograma(f.impacts);
      const subtotal = puntosDeRecuento(own);
      const tiros = tirosDeRecuento(own);
      total += subtotal;
      inner += own[0] || 0;
      porFila.set(f.idx, { subtotal, tiros });
      continue;
    }
    const acumulado = nums(f);
    if (f.blancoNuevo) prev = ASISTIDO_VALORES.map(() => 0);
    const incremental = restaRecuentos(acumulado, prev);
    const subtotal = puntosDeRecuento(incremental);
    const tiros = tirosDeRecuento(incremental);
    prev = acumulado;
    total += subtotal;
    inner += incremental[0] || 0;
    porFila.set(f.idx, { subtotal, tiros });
  }
  return { porFila, total, inner };
}

/** Impactos acumulados del blanco en las series ANTERIORES a `idx` (referencia gris). */
function fondoDe(filas: Fila[], idx: number): Impacto[] {
  let inicio = 0;
  for (let i = 0; i < filas.length; i++) {
    if (filas[i].blancoNuevo) inicio = i;
    if (filas[i].idx === idx) {
      const acc: Impacto[] = [];
      for (let k = inicio; k < i; k++) acc.push(...filas[k].impacts);
      return acc;
    }
  }
  return [];
}

export function LibretaAsistida({
  scorecardId,
  modalidad,
  seriesIniciales,
  finalizada,
  permiteAjuste,
  ajusteInicial,
  modalitySlug,
  tipo,
  esAdmin,
}: {
  scorecardId: string;
  modalidad: Modalidad;
  seriesIniciales: SerieInicial[];
  finalizada: boolean;
  permiteAjuste: boolean;
  ajusteInicial: number;
  modalitySlug: string;
  tipo: string;
  esAdmin?: boolean;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(() =>
    filasIniciales(seriesIniciales, modalidad),
  );
  const [ajuste, setAjuste] = useState(ajusteInicial);
  const [laserFila, setLaserFila] = useState<number | null>(null);
  const filasRef = useRef(filas);
  filasRef.current = filas;
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function toggleLaser(idx: number) {
    if (laserFila === idx) {
      setLaserFila(null);
      return;
    }
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, usaDiana: true } : f)));
    setLaserFila(idx);
  }
  function anadirImpactoLaser(idx: number, imp: Impacto) {
    const f = filasRef.current.find((x) => x.idx === idx);
    actualizaImpactos(idx, [...(f?.impacts ?? []), imp], true);
  }

  const { porFila, total, inner } = useMemo(() => calculaTodo(filas), [filas]);
  const finalTotal = redondea1(total + ajuste);

  const setEstado = useCallback((idx: number, estado: EstadoGuardado) => {
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, estado } : f)));
  }, []);

  const guardar = useCallback(
    async (idx: number) => {
      const fila = filasRef.current.find((f) => f.idx === idx);
      if (!fila) return;
      setEstado(idx, "guardando");
      try {
        const r = await guardarSerieAsistida({
          scorecardId,
          idx,
          blancoNuevo: fila.blancoNuevo,
          buckets: nums(fila),
          impacts: fila.usaDiana ? fila.impacts : null,
        });
        setEstado(idx, r.ok ? "guardado" : "error");
      } catch {
        setEstado(idx, "error");
      }
    },
    [scorecardId, setEstado],
  );

  /** Guarda un recuento apuntado en la diana: deriva el histograma por valor. */
  const guardarDianaAsistida = useCallback(
    async (idx: number, impacts: Impacto[]) => {
      const fila = filasRef.current.find((f) => f.idx === idx);
      const blancoNuevo = fila?.blancoNuevo ?? idx === 1;
      setEstado(idx, "guardando");
      try {
        const r = await guardarSerieAsistida({
          scorecardId,
          idx,
          blancoNuevo,
          buckets: histograma(impacts),
          impacts,
        });
        setEstado(idx, r.ok ? "guardado" : "error");
      } catch {
        setEstado(idx, "error");
      }
    },
    [scorecardId, setEstado],
  );

  function actualizaImpactos(idx: number, next: Impacto[], commit: boolean) {
    const counts = histograma(next).map(String);
    setFilas((prev) =>
      prev.map((f) => (f.idx === idx ? { ...f, impacts: next, counts } : f)),
    );
    if (commit) guardarDianaAsistida(idx, next);
  }

  /** Conmuta una serie entre las casillas de recuento y la diana gráfica. */
  function toggleDiana(idx: number) {
    const era = filasRef.current.find((f) => f.idx === idx)?.usaDiana;
    setFilas((prev) =>
      prev.map((f) => (f.idx === idx ? { ...f, usaDiana: !f.usaDiana } : f)),
    );
    // Al SALIR de la diana se persiste (guarda el recuento y limpia impactos).
    if (era) programar(idx);
  }

  const programar = useCallback(
    (idx: number) => {
      clearTimeout(timers.current[idx]);
      timers.current[idx] = setTimeout(() => guardar(idx), 700);
    },
    [guardar],
  );

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
      prev.map((f) =>
        f.idx === idx ? { ...f, blancoNuevo: !f.blancoNuevo } : f,
      ),
    );
    programar(idx);
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
          Total{" "}
          <span style={{ fontSize: "0.75rem" }}>
            / {modalidad.totalShots * modalidad.maxPerShot}
          </span>
        </span>
        <span style={{ fontSize: "1.7rem", fontWeight: 700 }}>
          {formatPunt(finalTotal)}
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--texto-suave)",
              fontWeight: 400,
            }}
          >
            {" "}
            · {inner} dieces
          </span>
        </span>
      </div>

      {permiteAjuste && ajuste !== 0 ? (
        <p style={{ margin: 0, color: "var(--texto-suave)", fontSize: "0.82rem" }}>
          Bruto {formatPunt(total)} · ajuste {ajuste > 0 ? "+" : ""}
          {formatPunt(ajuste)} → final <strong>{formatPunt(finalTotal)}</strong>
        </p>
      ) : null}

      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
        Modo <strong>Asistido competición</strong>: escribe cuántos <strong>10, 9,
        8…</strong> hay <em>en total en la diana</em>. Si la serie no es{" "}
        <strong>blanco nuevo</strong>, se descuenta lo de las series anteriores
        del mismo blanco para sacar sus puntos.
        {finalizada ? " Hoja finalizada (solo lectura)." : " Se guarda solo."}
      </p>

      {filas.map((fila) => {
        const calc = porFila.get(fila.idx) ?? { subtotal: 0, tiros: 0 };
        const completa = calc.tiros === modalidad.defaultSeriesSize;
        const fase = faseSerie(modalitySlug, fila.idx);
        const plan = planTimer(tipo, modalitySlug, fila.idx);
        return (
          <Card
            key={fila.idx}
            style={{
              opacity: finalizada ? 0.85 : 1,
              ...(completa ? { background: "rgba(70, 201, 139, 0.16)" } : null),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                Serie {fila.idx}
                {fase ? (
                  <span className="chip" style={{ marginLeft: "0.4rem", fontWeight: 600 }}>
                    {fase.nombre} · {fase.segundos}s
                  </span>
                ) : null}
              </strong>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  {calc.tiros} tiros
                </span>
                <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>
                  {formatPunt(calc.subtotal)}
                </span>
                <button
                  type="button"
                  disabled={finalizada}
                  onClick={() => alternaBlanco(fila.idx)}
                  aria-pressed={fila.blancoNuevo}
                  style={{
                    border: "1px solid var(--borde)",
                    borderRadius: 8,
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.78rem",
                    cursor: finalizada ? "default" : "pointer",
                    background: fila.blancoNuevo
                      ? "var(--acento-fuerte)"
                      : "transparent",
                    color: fila.blancoNuevo ? "#1a1205" : "var(--texto-suave)",
                    fontWeight: 600,
                  }}
                >
                  {fila.blancoNuevo ? "● Blanco nuevo" : "○ Blanco nuevo"}
                </button>
                {!finalizada && (
                  <DianaToggle
                    activo={fila.usaDiana}
                    onClick={() => toggleDiana(fila.idx)}
                  />
                )}
                <LaserCamLink
                  esAdmin={esAdmin}
                  activo={laserFila === fila.idx}
                  onClick={() => toggleLaser(fila.idx)}
                />
              </div>
            </div>

            {fila.usaDiana ? (
              <>
                {laserFila === fila.idx ? (
                  <LaserTrainer
                    compacto
                    onCerrar={() => setLaserFila(null)}
                    onImpacto={(imp) => anadirImpactoLaser(fila.idx, imp)}
                  />
                ) : null}
                <DianaCanvas
                  impacts={fila.impacts}
                  background={fondoDe(filas, fila.idx)}
                  finalizada={finalizada}
                  onChange={(next, commit) => actualizaImpactos(fila.idx, next, commit)}
                />
                <ImpactosBoxes impacts={fila.impacts} />
              </>
            ) : (
              <div className="serie-grid">
                {ASISTIDO_VALORES.map((valor, j) => (
                  <label
                    key={valor}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
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

            {!finalizada ? <SeriesTimer plan={plan} /> : null}
          </Card>
        );
      })}

      {permiteAjuste ? (
        <AjusteFinalField
          scorecardId={scorecardId}
          bruto={total}
          finalInicial={finalTotal}
          finalizada={finalizada}
          onDiff={setAjuste}
        />
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
              Finalizar hoja
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
