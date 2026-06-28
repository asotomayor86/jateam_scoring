"use client";

import { useState } from "react";

/**
 * Imagen de portada. Si el archivo no existe todavía (public/portada.jpg) se
 * oculta sola en vez de mostrar un icono roto.
 */
export function Portada() {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/portada.jpg"
      alt="JA Team"
      onError={() => setOk(false)}
      style={{
        width: "100%",
        borderRadius: 14,
        display: "block",
        marginTop: "0.7rem",
        boxShadow: "0 6px 22px rgba(0,0,0,0.3)",
      }}
    />
  );
}
