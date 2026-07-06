"use client";

/** Botón-icono para conmutar una serie entre las cajas de puntos y la diana gráfica. */
export function DianaToggle({
  activo,
  onClick,
}: {
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title={activo ? "Volver a las casillas" : "Apuntar en la diana"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        cursor: "pointer",
        border: activo ? "2px solid var(--acento-fuerte)" : "1px solid var(--borde)",
        background: activo ? "var(--superficie-2)" : "transparent",
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="-10 -10 20 20" aria-hidden="true">
        <circle cx="0" cy="0" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="0" cy="0" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="0" cy="0" r="1.6" fill="var(--rojo)" />
      </svg>
    </button>
  );
}
