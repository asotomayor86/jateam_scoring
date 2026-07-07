"use client";

/**
 * Botón de cámara (con una diana detrás y la lente roja) que abre/cierra el
 * medidor láser dentro de la propia tarjeta. Solo para encargados.
 */
export function LaserCamLink({
  esAdmin,
  activo,
  onClick,
}: {
  esAdmin?: boolean;
  activo?: boolean;
  onClick?: () => void;
}) {
  if (!esAdmin) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title="Medir con láser (cámara)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        border: activo ? "2px solid var(--acento-fuerte)" : "1px solid var(--borde)",
        background: activo ? "var(--superficie-2)" : "transparent",
        color: "var(--texto-suave)",
        flexShrink: 0,
        cursor: "pointer",
        padding: 0,
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* Diana detrás */}
        <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        {/* Cuerpo de la cámara */}
        <path
          d="M3.5 8.6h3l1.3-1.9h6.4l1.3 1.9h3a1 1 0 0 1 1 1v7.3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V9.6a1 1 0 0 1 1-1Z"
          fill="var(--superficie)"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Lente roja */}
        <circle cx="12" cy="13" r="3" fill="#e5484d" stroke="#fff" strokeWidth="0.8" />
      </svg>
    </button>
  );
}
