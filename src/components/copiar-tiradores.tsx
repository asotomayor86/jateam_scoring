"use client";

import { useState } from "react";

type Tirador = {
  displayName: string;
  dni: string | null;
  licenseNumber: string | null;
  category: string | null;
};

/**
 * Botón (solo encargado) que copia al portapapeles la relación de tiradores en
 * formato multilínea:
 *   1.Nombre
 *      - DNI: ...
 *      - LIC: ...
 *      - CAT: ...   (solo si tiene categoría)
 */
export function CopiarTiradores({ tiradores }: { tiradores: Tirador[] }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const bloques = tiradores.map((t, i) => {
      const lineas = [
        `${i + 1}.${t.displayName}`,
        `   - DNI: ${t.dni ?? ""}`,
        `   - LIC: ${t.licenseNumber ?? ""}`,
      ];
      if (t.category) lineas.push(`   - CAT: ${t.category}`);
      return lineas.join("\n");
    });
    const texto = bloques.join("\n");

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
