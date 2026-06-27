"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Botón de envío que pide confirmación antes de ejecutar la acción del form.
 * Útil para borrados (borrar tirada, desapuntarse).
 */
export function ConfirmButton({
  children,
  message,
  className,
  style,
}: {
  children: ReactNode;
  message: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
