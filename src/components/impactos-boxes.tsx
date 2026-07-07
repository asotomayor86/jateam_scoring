"use client";

import type { Impacto } from "@/lib/diana";

/** Cajetines de los disparos de una serie: se rellenan con la puntuación. */
export function ImpactosBoxes({ impacts, n = 5 }: { impacts: Impacto[]; n?: number }) {
  const total = Math.max(n, impacts.length);
  return (
    <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
      {Array.from({ length: total }, (_, i) => {
        const im = impacts[i];
        return (
          <div
            key={i}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--borde)",
              background: im ? "var(--superficie-2)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.95rem",
              fontVariantNumeric: "tabular-nums",
              color: im ? "var(--texto)" : "var(--texto-suave)",
            }}
          >
            {im ? im.s : "·"}
          </div>
        );
      })}
    </div>
  );
}
