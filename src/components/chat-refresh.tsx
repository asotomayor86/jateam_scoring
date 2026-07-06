"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Botón "Actualizar" (y auto-refresco cada 10 s con la pestaña visible). */
export function ChatRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Auto-refresco cada 10 s, solo con la pestaña visible (el borrador se conserva).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        start(() => router.refresh());
      }
    }, 10000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
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
    </button>
  );
}
