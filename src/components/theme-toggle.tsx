"use client";

import { useEffect, useState } from "react";

/**
 * Botón para alternar tema claro/oscuro. Persiste la elección en localStorage
 * (clave "tema"); el script inline del layout la aplica antes de pintar.
 */
export function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark">("dark");

  // Sincroniza el estado inicial con lo que ya aplicó el script del layout.
  useEffect(() => {
    const actual =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    setTema(actual);
  }, []);

  function alternar() {
    const nuevo = tema === "light" ? "dark" : "light";
    setTema(nuevo);
    try {
      localStorage.setItem("tema", nuevo);
    } catch {
      /* almacenamiento no disponible */
    }
    if (nuevo === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={tema === "light" ? "Modo oscuro" : "Modo claro"}
      style={{
        border: "1px solid var(--borde)",
        background: "transparent",
        color: "var(--texto-suave)",
        borderRadius: 8,
        padding: "0.35rem 0.55rem",
        cursor: "pointer",
        fontSize: "1rem",
        lineHeight: 1,
      }}
    >
      {tema === "light" ? "🌙" : "☀️"}
    </button>
  );
}
