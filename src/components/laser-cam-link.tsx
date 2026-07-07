"use client";

import Link from "next/link";

/**
 * Icono de cámara que lleva al medidor láser. Solo se muestra a los encargados
 * (la página /laser está restringida a encargados).
 */
export function LaserCamLink({ esAdmin }: { esAdmin?: boolean }) {
  if (!esAdmin) return null;
  return (
    <Link
      href="/laser"
      title="Medir con láser (cámara)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        border: "1px solid var(--borde)",
        background: "transparent",
        color: "var(--texto-suave)",
        flexShrink: 0,
        textDecoration: "none",
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </Link>
  );
}
