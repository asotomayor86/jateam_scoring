"use client";

import { useCallback, useRef, useState } from "react";
import { guardarAjuste } from "@/actions/scorecards";
import { Card } from "@/components/ui";

/**
 * Campo "Ajuste final de puntuación": un valor con signo que suma o resta al
 * total (p. ej. el árbitro descuenta 2 → se escribe -2). Autosave.
 *
 * - onValue: comunica el valor numérico actual al padre (para mostrar el total).
 * - onSaved: el padre recibe el nuevo total final devuelto por el servidor.
 */
export function AjusteFinalField({
  scorecardId,
  inicial,
  finalizada,
  onValue,
  onSaved,
}: {
  scorecardId: string;
  inicial: number;
  finalizada: boolean;
  onValue?: (n: number) => void;
  onSaved?: (total: number) => void;
}) {
  const [str, setStr] = useState(inicial ? String(inicial) : "");
  const [estado, setEstado] = useState<"" | "guardando" | "guardado" | "error">("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const parse = (s: string) => {
    const n = Number(s.trim().replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

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
    const n = parse(v);
    onValue?.(n);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => guardar(n), 700);
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
        Ajuste final de puntuación
      </label>
      <p style={{ margin: "0 0 0.5rem", color: "var(--texto-suave)", fontSize: "0.82rem" }}>
        Suma o resta puntos al total final (p. ej. <strong>-2</strong> si el
        árbitro descuenta 2 en el conteo).
      </p>
      <input
        className="tiro-input"
        inputMode="text"
        disabled={finalizada}
        value={str}
        placeholder="0"
        onChange={(e) => cambia(e.target.value)}
        onBlur={() => guardar(parse(str))}
        style={{ width: 120, textAlign: "left", paddingLeft: "0.6rem" }}
      />
      <span
        style={{
          marginLeft: "0.6rem",
          fontSize: "0.75rem",
          color: estado === "error" ? "var(--rojo)" : "var(--texto-suave)",
        }}
      >
        {estado === "guardando"
          ? "Guardando…"
          : estado === "guardado"
            ? "Guardado ✓"
            : estado === "error"
              ? "Error al guardar"
              : ""}
      </span>
    </Card>
  );
}
