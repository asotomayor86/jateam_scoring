"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcion, borrarSuscripcion } from "@/actions/push";
import { Card } from "@/components/ui";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Estado = "cargando" | "no-soportado" | "inactivo" | "activo" | "denegado" | "error";

function esIOSNoInstalado(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iOS && !standalone;
}

export function ActivarNotificaciones() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !VAPID
      ) {
        setEstado("no-soportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("denegado");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setEstado(sub ? "activo" : "inactivo");
      } catch {
        setEstado("inactivo");
      }
    })();
  }, []);

  async function activar() {
    setTrabajando(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setEstado(perm === "denied" ? "denegado" : "inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      });
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await guardarSuscripcion({
        endpoint: j.endpoint,
        p256dh: j.keys.p256dh,
        auth: j.keys.auth,
      });
      setEstado(r.ok ? "activo" : "error");
    } catch (e) {
      console.error("activar notificaciones:", e);
      setEstado("error");
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setTrabajando(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await borrarSuscripcion(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } catch {
      setEstado("error");
    } finally {
      setTrabajando(false);
    }
  }

  const nota = (t: string) => (
    <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--texto-suave)" }}>{t}</p>
  );

  return (
    <Card>
      <strong style={{ fontSize: "0.95rem" }}>🔔 Notificaciones en este dispositivo</strong>
      {estado === "cargando" ? (
        nota("Comprobando…")
      ) : estado === "no-soportado" ? (
        esIOSNoInstalado() ? (
          nota(
            "En iPhone, primero instala la app en la pantalla de inicio (Compartir → Añadir a inicio) y ábrela desde ahí; luego podrás activar las notificaciones.",
          )
        ) : (
          nota("Este navegador no admite notificaciones push.")
        )
      ) : estado === "denegado" ? (
        nota(
          "Has bloqueado las notificaciones. Actívalas para esta web en los ajustes del navegador/sistema.",
        )
      ) : estado === "activo" ? (
        <>
          {nota("Activadas ✓. Te avisaremos cuando te mencionen o haya una tirada/entreno nuevo.")}
          <button
            type="button"
            className="btn"
            onClick={desactivar}
            disabled={trabajando}
            style={{ marginTop: "0.5rem" }}
          >
            {trabajando ? "…" : "Desactivar en este dispositivo"}
          </button>
        </>
      ) : (
        <>
          {nota("Recibe un aviso al móvil cuando te mencionen (@) o haya una tirada/entreno nuevo.")}
          <button
            type="button"
            className="btn btn-primario"
            onClick={activar}
            disabled={trabajando}
            style={{ marginTop: "0.5rem" }}
          >
            {trabajando ? "Activando…" : "Activar notificaciones"}
          </button>
          {estado === "error"
            ? nota("No se pudo activar. Si es un iPhone, instala antes la app en la pantalla de inicio.")
            : null}
        </>
      )}
    </Card>
  );
}
