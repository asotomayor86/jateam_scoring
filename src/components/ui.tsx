import type { CSSProperties, ReactNode } from "react";

/**
 * Primitivas de UI reutilizables (sin estado), pensadas para móvil.
 */

export const estiloCampo: CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.7rem",
  borderRadius: 8,
  border: "1px solid var(--borde)",
  background: "var(--superficie-2)",
  color: "var(--texto)",
  fontSize: "0.95rem",
};

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: 14,
        padding: "0.8rem 0.95rem",
        boxShadow: "0 6px 22px rgba(0, 0, 0, 0.3)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SeccionTitulo({
  children,
  extra,
  grande = false,
}: {
  children: ReactNode;
  extra?: ReactNode;
  /** Título de página: sensiblemente más grande que los de sección. */
  grande?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
        margin: grande ? "0.5rem 0 0.6rem" : "1.1rem 0 0.5rem",
      }}
    >
      <h2
        className="seccion-titulo"
        style={{ margin: 0, fontSize: grande ? "1.7rem" : "1.1rem" }}
      >
        {children}
      </h2>
      {extra}
    </div>
  );
}

export function Aviso({
  tipo = "info",
  children,
}: {
  tipo?: "info" | "ok" | "error";
  children: ReactNode;
}) {
  const colores: Record<string, string> = {
    info: "var(--acento)",
    ok: "var(--verde)",
    error: "var(--rojo)",
  };
  return (
    <p
      role="status"
      style={{ margin: "0.5rem 0 0", color: colores[tipo], fontSize: "0.9rem" }}
    >
      {children}
    </p>
  );
}

/** Etiqueta de color según el tipo de tirada. */
export function TipoChip({ tipo }: { tipo: string }) {
  const clase =
    tipo === "oficial"
      ? "chip chip-oficial"
      : tipo === "semioficial"
        ? "chip chip-semioficial"
        : "chip chip-entrenamiento";
  const texto =
    tipo === "oficial"
      ? "Oficial"
      : tipo === "semioficial"
        ? "Semioficial"
        : "Entrenamiento";
  return <span className={clase}>{texto}</span>;
}
