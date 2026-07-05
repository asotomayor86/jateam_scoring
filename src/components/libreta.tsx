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
import { Card } from "@/components/ui";
import { AjusteFinalField } from "@/components/ajuste-final";
import { SeriesTimer } from "@/components/series-timer";
import { faseSerie, planTimer } from "@/lib/fases";

type SerieInicial = {
  idx: number;
  shots: number[] | null;
  shotCount: number;
  subtotal: number;
  inner: number;
};

type Modalidad = {
  totalShots: number;
  seriesCount: number;
  defaultSeriesSize: number;
  allowsDecimals: boolean;
  maxPerShot: number;
};

type ModoFila = "tiros" | "total";
type EstadoGuardado = "" | "guardando" | "guardado" | "error";

type Fila = {
  idx: number;
  modo: ModoFila;
  // En modo "tiros": una celda por tiro (texto, admite "X").
  celdas: string[];
  // En modo "total": el total escrito a mano + dieces opcionales.
  totalStr: string;
  innerStr: string;
  estado: EstadoGuardado;
};

/** Construye las filas iniciales a partir de las series guardadas. */
function filasIniciales(
  series: SerieInicial[],
  mod: Modalidad,
  preferTotal: boolean,
): Fila[] {
  const porIdx = new Map(series.map((s) => [s.idx, s]));
  return Array.from({ length: mod.seriesCount }, (_, i) => {
    const idx = i + 1;
    const s = porIdx.get(idx);
    if (s && s.shots) {
      const celdas = Array.from({ length: mod.defaultSeriesSize }, (_, j) =>
        s.shots && j < s.shots.length ? formatPunt(s.shots[j], mod.allowsDecimals) : "",
      );
      return { idx, modo: "tiros" as const, celdas, totalStr: "", innerStr: "", estado: "" as const };
    }
    if (s) {
      return {
        idx,
        modo: "total" as const,
        celdas: Array(mod.defaultSeriesSize).fill(""),
        totalStr: formatPunt(s.subtotal, mod.allowsDecimals),
        innerStr: s.inner ? String(s.inner) : "",
        estado: "" as const,
      };
    }
    return {
      idx,
      modo: (preferTotal ? "total" : "tiros") as ModoFila,
      celdas: Array(mod.defaultSeriesSize).fill(""),
      totalStr: "",
      innerStr: "",
      estado: "" as const,
    };
  });
}

/** Calcula subtotal, dieces y array de tiros de una fila según su modo. */
function calcula(fila: Fila, mod: Modalidad) {
  if (fila.modo === "tiros") {
    const shots: number[] = [];
    let inner = 0;
    for (const c of fila.celdas) {
      const p = parseTiro(c, mod.maxPerShot, mod.allowsDecimals);
      if (p) {
        shots.push(p.value);
        if (p.inner) inner++;
      }
    }
    return {
      shots: shots.length ? shots : null,
      subtotal: redondea1(shots.reduce((a, b) => a + b, 0)),
      inner,
      vacio: shots.length === 0,
    };
  }
  const t = fila.totalStr.trim().replace(",", ".");
  const n = Number(t);
  const valido = t !== "" && Number.isFinite(n) && n >= 0;
  const inner = Number(fila.innerStr) || 0;
  return {
    shots: null,
    subtotal: valido ? redondea1(n) : 0,
    inner,
    vacio: !valido,
  };
}

export function Libreta({
  scorecardId,
  modalidad,
  seriesIniciales,
  preferTotal,
  totalInicial,
  innerInicial,
  finalizada,
  permiteAjuste,
  ajusteInicial,
  modalitySlug,
  tipo,
}: {
  scorecardId: string;
  modalidad: Modalidad;
  seriesIniciales: SerieInicial[];
  preferTotal: boolean;
  totalInicial: number;
  innerInicial: number;
  finalizada: boolean;
  permiteAjuste: boolean;
  ajusteInicial: number;
  modalitySlug: string;
  tipo: string;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(() =>
    filasIniciales(seriesIniciales, modalidad, preferTotal),
  );
  const [total, setTotal] = useState(totalInicial);
  const [inner, setInner] = useState(innerInicial);
  const [ajuste, setAjuste] = useState(ajusteInicial);
  const filasRef = useRef(filas);
  filasRef.current = filas;
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const maxTotal = useMemo(
    () => modalidad.totalShots * modalidad.maxPerShot,
    [modalidad],
  );

  const setEstado = useCallback((idx: number, estado: EstadoGuardado) => {
    setFilas((prev) =>
      prev.map((f) => (f.idx === idx ? { ...f, estado } : f)),
    );
  }, []);

  /** Persiste una fila (o la borra si quedó vacía) y refresca los totales. */
  const guardar = useCallback(
    async (idx: number) => {
      const fila = filasRef.current.find((f) => f.idx === idx);
      if (!fila) return;
      const c = calcula(fila, modalidad);
      setEstado(idx, "guardando");
      try {
        const r = c.vacio
          ? await borrarSerie({ scorecardId, idx })
          : await guardarSerie({
              scorecardId,
              idx,
              shots: c.shots,
              shotCount: modalidad.defaultSeriesSize,
              subtotal: c.subtotal,
              inner: c.inner,
            });
        if (r.ok) {
          if (typeof r.total === "number") setTotal(r.total);
          if (typeof r.innerCount === "number") setInner(r.innerCount);
          setEstado(idx, "guardado");
        } else {
          setEstado(idx, "error");
        }
      } catch {
        setEstado(idx, "error");
      }
    },
    [modalidad, scorecardId, setEstado],
  );

  /** Programa un guardado con rebote (autosave mientras escribes). */
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
    setFilas((prev) =>
      prev.map((f) => (f.idx === idx ? { ...f, totalStr: valor } : f)),
    );
    programar(idx);
  }

  function cambiaInnerTotal(idx: number, valor: string) {
    setFilas((prev) =>
      prev.map((f) => (f.idx === idx ? { ...f, innerStr: valor } : f)),
    );
    programar(idx);
  }

  function cambiaModo(idx: number, modo: ModoFila) {
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, modo } : f)));
    // Guardamos el cambio (recalcula con el nuevo modo).
    programar(idx);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      {/* Marcador en vivo, pegado arriba. */}
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
            / {formatPunt(maxTotal, modalidad.allowsDecimals)}
          </span>
        </span>
        <span style={{ fontSize: "1.7rem", fontWeight: 700 }}>
          {formatPunt(total, modalidad.allowsDecimals)}
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--texto-suave)",
              fontWeight: 400,
            }}
          >
            {" "}
            · {inner} X
          </span>
        </span>
      </div>

      {permiteAjuste && ajuste !== 0 ? (
        <p style={{ margin: 0, color: "var(--texto-suave)", fontSize: "0.82rem" }}>
          Bruto {formatPunt(redondea1(total - ajuste), modalidad.allowsDecimals)} ·
          ajuste {ajuste > 0 ? "+" : ""}
          {formatPunt(ajuste, modalidad.allowsDecimals)} → final{" "}
          <strong>{formatPunt(total, modalidad.allowsDecimals)}</strong>
        </p>
      ) : null}

      {finalizada ? (
        <p
          style={{
            color: "var(--texto-suave)",
            fontSize: "0.9rem",
            margin: 0,
          }}
        >
          Hoja finalizada (solo lectura). Pulsa «Reabrir» para corregir.
        </p>
      ) : (
        <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
          Escribe tiro a tiro (la <strong>X</strong> es un diez interior) o usa
          «Total» para apuntar solo el total de la serie. Se guarda solo.
        </p>
      )}

      {filas.map((fila) => {
        const c = calcula(fila, modalidad);
        const completa =
          fila.modo === "tiros"
            ? fila.celdas.filter((x) => x.trim() !== "").length ===
              modalidad.defaultSeriesSize
            : fila.totalStr.trim() !== "";
        const fase = faseSerie(modalitySlug, fila.idx);
        const plan = planTimer(tipo, modalitySlug, fila.idx);
        return (
          <Card
            key={fila.idx}
            style={{
              opacity: finalizada ? 0.85 : 1,
              // Serie completa: tinte verde suave para ver el progreso.
              ...(completa
                ? { background: "rgba(70, 201, 139, 0.16)" }
                : null),
            }}
          >
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
                Serie {fila.idx}
                {fase ? (
                  <span
                    className="chip"
                    style={{ marginLeft: "0.4rem", fontWeight: 600 }}
                  >
                    {fase.nombre} · {fase.segundos}s
                  </span>
                ) : null}
              </strong>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  {(fila.modo === "tiros"
                    ? (c.shots?.length ?? 0)
                    : fila.totalStr.trim()
                      ? modalidad.defaultSeriesSize
                      : 0)}{" "}
                  tiros
                </span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {formatPunt(c.subtotal, modalidad.allowsDecimals)}
                </span>
                {!finalizada && (
                  <select
                    aria-label="Modo de apunte"
                    value={fila.modo}
                    onChange={(e) =>
                      cambiaModo(fila.idx, e.target.value as ModoFila)
                    }
                    style={{
                      background: "var(--superficie-2)",
                      color: "var(--texto)",
                      border: "1px solid var(--borde)",
                      borderRadius: 8,
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    <option value="tiros">Tiros</option>
                    <option value="total">Total</option>
                  </select>
                )}
              </div>
            </div>

            {fila.modo === "tiros" ? (
              <div className="serie-grid">
                {fila.celdas.map((valor, j) => (
                  <input
                    key={j}
                    className="tiro-input"
                    inputMode={modalidad.allowsDecimals ? "decimal" : "numeric"}
                    enterKeyHint="next"
                    maxLength={4}
                    disabled={finalizada}
                    value={valor}
                    placeholder="·"
                    onChange={(e) => cambiaCelda(fila.idx, j, e.target.value)}
                    onBlur={() => guardar(fila.idx)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="tiro-input"
                  inputMode={modalidad.allowsDecimals ? "decimal" : "numeric"}
                  disabled={finalizada}
                  value={fila.totalStr}
                  placeholder={`Total serie (${modalidad.defaultSeriesSize} tiros)`}
                  onChange={(e) => cambiaTotal(fila.idx, e.target.value)}
                  onBlur={() => guardar(fila.idx)}
                  style={{ flex: 1, textAlign: "left", paddingLeft: "0.6rem" }}
                />
                <input
                  className="tiro-input"
                  inputMode="numeric"
                  disabled={finalizada}
                  value={fila.innerStr}
                  placeholder="X"
                  title="Dieces interiores en la serie (opcional)"
                  onChange={(e) => cambiaInnerTotal(fila.idx, e.target.value)}
                  onBlur={() => guardar(fila.idx)}
                  style={{ width: 64 }}
                />
              </div>
            )}

            <div
              style={{
                marginTop: "0.35rem",
                minHeight: 16,
                fontSize: "0.75rem",
                color:
                  fila.estado === "error"
                    ? "var(--rojo)"
                    : "var(--texto-suave)",
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
          bruto={redondea1(total - ajuste)}
          finalInicial={totalInicial}
          finalizada={finalizada}
          allowsDecimals={modalidad.allowsDecimals}
          onDiff={setAjuste}
          onSaved={setTotal}
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
          <form
            action={finalizarHoja}
            onSubmit={() => router.refresh()}
          >
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
