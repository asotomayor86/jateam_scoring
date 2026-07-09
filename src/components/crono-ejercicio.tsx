"use client";

import { useMemo, useState } from "react";
import { SeriesTimer } from "@/components/series-timer";
import { cronoDeEjercicio } from "@/lib/crono-ejercicios";

/**
 * Cronómetro específico de un ejercicio de la biblioteca. Colapsable. Si el
 * ejercicio expone parámetros, se ajustan aquí (solo en memoria, no se guardan)
 * y el temporizador se reconstruye al cambiarlos.
 */
export function CronoEjercicio({ code }: { code: string }) {
  const spec = useMemo(() => cronoDeEjercicio(code), [code]);
  const [abierto, setAbierto] = useState(false);
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries((spec?.params ?? []).map((p) => [p.key, p.def])),
  );

  if (!spec) return null;

  const plan = spec.construir(vals);

  return (
    <div style={{ marginTop: "0.6rem" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{
          background: "none",
          border: "1px solid var(--borde)",
          borderRadius: 8,
          padding: "0.3rem 0.6rem",
          cursor: "pointer",
          color: "var(--texto)",
          fontSize: "0.82rem",
          fontWeight: 600,
        }}
      >
        ⏱ Cronómetro {abierto ? "▲" : "▼"}
      </button>

      {abierto && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem",
            border: "1px solid var(--borde)",
            borderRadius: 10,
            background: "var(--superficie-2)",
          }}
        >
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "var(--texto-suave)" }}>
            {spec.descripcion}
          </p>

          {spec.params.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.3rem" }}>
              {spec.params.map((p) => (
                <label
                  key={p.key}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", color: "var(--texto-suave)" }}
                >
                  {p.label}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={p.min}
                    max={p.max}
                    step={p.paso ?? 1}
                    value={vals[p.key]}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) {
                        setVals((prev) => ({ ...prev, [p.key]: Math.max(p.min, Math.min(p.max, n)) }));
                      }
                    }}
                    style={{
                      width: 62,
                      padding: "0.25rem 0.4rem",
                      borderRadius: 6,
                      border: "1px solid var(--borde)",
                      background: "var(--superficie)",
                      color: "var(--texto)",
                      fontSize: "0.9rem",
                      textAlign: "right",
                    }}
                  />
                  {p.unidad}
                </label>
              ))}
            </div>
          )}

          {/* La key reinicia el temporizador cuando cambian los parámetros. */}
          <SeriesTimer key={JSON.stringify(vals)} plan={plan} />
        </div>
      )}
    </div>
  );
}
