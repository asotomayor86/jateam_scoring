"use client";

import { useEffect } from "react";

type NavBadge = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Registra el service worker y sincroniza el badge del icono con el total de
 * novedades (chat + tiradas). No pinta nada.
 */
export function SwRegister({ total }: { total: number }) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelado = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (!cancelado) reg.active?.postMessage({ type: "reset-badge", total });
      })
      .catch(() => {});

    // También directo desde la página (Chrome/Android con la app instalada).
    const nav = navigator as NavBadge;
    try {
      if (nav.setAppBadge) {
        if (total > 0) nav.setAppBadge(total);
        else nav.clearAppBadge?.();
      }
    } catch {
      /* no soportado */
    }

    return () => {
      cancelado = true;
    };
  }, [total]);

  return null;
}
