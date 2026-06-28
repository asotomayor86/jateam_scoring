"use client";

import { useCallback, useRef, useState } from "react";
import { guardarAjuste } from "@/actions/scorecards";
import { redondea1, formatPunt } from "@/lib/scoring";
import { Card } from "@/components/ui";

/**
 * Campo "Puntuación final (árbitro)": el tirador escribe el TOTAL final que dio
 * el árbitro y el sistema guarda automáticamente la diferencia respecto a su
 * conteo (bruto). Autosave.
 *
 * - bruto: suma de las series (puede cambiar en vivo).
 * - finalInicial: total final actual de la hoja (bruto + diferencia guardada).
 * - onDiff: comunica la diferencia actual al padre (para el desglose).
 * - onSaved: el padre recibe el nuevo total devuelto por el servidor.
 */
export function AjusteFinalField({
  scorecardId,
  bruto,
  finalInicial,
  finalizada,
  allowsDecimals = false,
  onDiff,
  onSaved,
}: {
  scorecardId: string;
  bruto: number;
  finalInicial: number;
  finalizada: boolean;
  allowsDecimals?: boolean;
  onDiff?: (n: number) => void;
  onSaved?: (total: number) => void;
}) {
  const [str, setStr] = useState(finalInicial ? String(finalInicial) : "");
  const [estado, setEstado] = useState<"" | "guardando" | "guardado" | "error">("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const parseFinal = (s: string): number | null => {
    const t = s.trim().replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const finalNum = parseFinal(str);
  const diff = finalNum === null ? 0 : redondea1(finalNum - bruto);

  const guardar = useCallback(
    async (n: number) => {
      setEstado("guardando");
      try {
        const r = await guardarAjuste({ scorecardId, adjustment: n });
        if (r.ok) {
          if (typeof r.total === "number") onSaved?.(r.total);
          setEstado("guardado");
        } else {
          setEstado("error");
        }
      } catch {
        setEstado("error");
      }
    },
    [scorecardId, onSaved],
  );

  function cambia(v: string) {
    setStr(v);
    const f = parseFinal(v);
    const d = f === null ? 0 : redondea1(f - bruto);
    onDiff?.(d);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => guardar(d), 700);
  }

  return (
    <Card>
      <label
        style={{
          display: "block",
          fontWeight: 600,
          fontSize: "0.95rem",
          marginBottom: "0.3rem",
        }}
      >
        Puntuación final (árbitro)
      </label>
      <p style={{ margin: "0 0 0.5rem", color: "var(--texto-suave)", fontSize: "0.82rem" }}>
        Escribe el <strong>total final</strong> que dio el árbitro. Tu conteo es{" "}
        <strong>{formatPunt(bruto, allowsDecimals)}</strong>; se guardará la
        diferencia automáticamente.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <input
          className="tiro-input"
          inputMode={allowsDecimals ? "decimal" : "numeric"}
          disabled={finalizada}
          value={str}
          placeholder={formatPunt(bruto, allowsDecimals)}
          onChange={(e) => cambia(e.target.value)}
          onBlur={() => guardar(diff)}
          style={{ width: 120, textAlign: "left", paddingLeft: "0.6rem" }}
        />
        {finalNum !== null && diff !== 0 ? (
          <span style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
            diferencia {diff > 0 ? "+" : ""}
            {formatPunt(diff, allowsDecimals)}
          </span>
        ) : null}
        <span
          style={{
            fontSize: "0.75rem",
            color: estado === "error" ? "var(--rojo)" : "var(--texto-suave)",
          }}
        >
          {estado === "guardando"
            ? "Guardando…"
            : estado === "guardado"
              ? "Guardado ✓"
              : estado === "error"
                ? "Error"
                : ""}
        </span>
      </div>
    </Card>
  );
}
