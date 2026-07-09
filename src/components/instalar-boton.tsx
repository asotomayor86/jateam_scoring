"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Botón "Instalar app" para el menú. Detecta si ya está instalada (modo
 * standalone) y entonces se muestra en gris, desactivado. Si no, dispara el
 * diálogo real (Android) o muestra las instrucciones (iPhone).
 */
export function InstalarBoton() {
  const [instalada, setInstalada] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalada(estaInstalada());
    setIos(esIOS());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const mm = window.matchMedia("(display-mode: standalone)");
    const onMM = () => setInstalada(estaInstalada());
    mm.addEventListener?.("change", onMM);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mm.removeEventListener?.("change", onMM);
    };
  }, []);

  async function onClick() {
    if (instalada) return;
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalada(true);
      setDeferred(null);
      return;
    }
    if (ios) {
      alert(
        "En iPhone: pulsa el botón Compartir de Safari (el cuadrado con la flecha) y elige “Añadir a pantalla de inicio”.",
      );
      return;
    }
    alert("Usa la opción “Instalar app” del menú de tu navegador.");
  }

  return (
    <button
      type="button"
      className="nav-drawer-item"
      onClick={onClick}
      disabled={instalada}
      aria-disabled={instalada}
      title={instalada ? "La app ya está instalada" : "Instalar la app"}
    >
      {instalada ? "App instalada ✓" : "Instalar app"}
    </button>
  );
}
