"use client";

import { useState } from "react";

type Tirador = {
  displayName: string;
  dni: string | null;
  licenseNumber: string | null;
};

/**
 * Botón (solo encargado) que copia al portapapeles la relación de tiradores:
 * Nº, nombre, DNI y licencia, separados por tabuladores (pega bien en Excel).
 */
export function CopiarTiradores({ tiradores }: { tiradores: Tirador[] }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const header = "Nº\tNombre\tDNI\tLicencia";
    const lineas = tiradores.map(
      (t, i) =>
        `${i + 1}\t${t.displayName}\t${t.dni ?? ""}\t${t.licenseNumber ?? ""}`,
    );
    const texto = [header, ...lineas].join("\n");

    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallback para navegadores sin Clipboard API.
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nada */
      }
      document.body.removeChild(ta);
    }

    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      className="btn"
      onClick={copiar}
      style={{ flexShrink: 0, whiteSpace: "nowrap" }}
    >
      {copiado ? "Copiado ✓" : "Copiar tiradores"}
    </button>
  );
}
