"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Botón "Actualizar" (más intuitivo que arrastrar) con "actualizado hace Xs". */
export function ChatRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [last, setLast] = useState<number>(() => Date.now());
  const [, tick] = useState(0);

  // Refresca la etiqueta "hace Xs" cada 5 s.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  function refrescar() {
    start(() => {
      router.refresh();
      setLast(Date.now());
    });
  }

  const seg = Math.floor((Date.now() - last) / 1000);
  const etiqueta = pending
    ? "actualizando…"
    : seg < 5
      ? "actualizado"
      : seg < 60
        ? `hace ${seg}s`
        : `hace ${Math.floor(seg / 60)} min`;

  return (
    <button
      type="button"
      onClick={refrescar}
      disabled={pending}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        border: "1px solid var(--borde)",
        background: "var(--superficie-2)",
        color: "var(--texto)",
        borderRadius: 8,
        padding: "0.35rem 0.7rem",
        fontSize: "0.85rem",
        cursor: pending ? "default" : "pointer",
      }}
    >
      <span className={pending ? "girando" : undefined} style={{ display: "inline-block" }}>
        ↻
      </span>
      Actualizar
      <small style={{ color: "var(--texto-suave)" }}>· {etiqueta}</small>
    </button>
  );
}
