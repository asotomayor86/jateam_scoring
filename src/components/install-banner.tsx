"use client";

import { useEffect, useState } from "react";

// Evento beforeinstallprompt (solo Chromium/Android lo emite).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "jateam-install-dismissed";

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
  const iOSClasico = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSClasico || iPadOS;
}

/**
 * Banner para instalar la app (PWA). En Android dispara el diálogo real; en iOS
 * muestra las instrucciones. Se puede cerrar y no vuelve a aparecer.
 */
export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [verAyudaIOS, setVerAyudaIOS] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (estaInstalada()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const iosDispositivo = esIOS();
    setIos(iosDispositivo);
    if (iosDispositivo) {
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function cerrar() {
    setVisible(false);
    setVerAyudaIOS(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function instalar() {
    if (ios) {
      setVerAyudaIOS(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (!visible) return null;

  return (
    <div className="install-banner" role="region" aria-label="Instalar la app">
      <div className="install-banner-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" aria-hidden="true" width={28} height={28} />
        <span className="install-banner-text">
          Instala JA Team en tu pantalla de inicio para usarla como una app en la
          galería.
        </span>
        <div className="install-banner-btns">
          <button type="button" className="install-banner-cta" onClick={instalar}>
            {ios ? "Cómo instalar" : "Instalar app"}
          </button>
          <button
            type="button"
            className="install-banner-close"
            aria-label="Cerrar"
            onClick={cerrar}
          >
            ✕
          </button>
        </div>
      </div>

      {ios && verAyudaIOS && (
        <ol className="install-banner-help">
          <li>
            Pulsa el botón <strong>Compartir</strong> de Safari (el cuadrado con
            la flecha hacia arriba).
          </li>
          <li>
            Elige <strong>Añadir a pantalla de inicio</strong>.
          </li>
          <li>
            Confirma con <strong>Añadir</strong>: aparecerá como una app.
          </li>
        </ol>
      )}
    </div>
  );
}
