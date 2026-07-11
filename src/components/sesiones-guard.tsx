"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  registrarDispositivo,
  estadoSesiones,
  elegirRol,
  cerrarSesion,
  type EstadoSesiones,
} from "@/actions/sesiones";
import { LaserBloqueadoContext } from "@/components/laser-contexto";
import { CamaraRemota } from "@/components/camara-remota";

const TOKEN_KEY = "jateam-device-token";

function getToken(): string {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = (crypto.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now()).toString();
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

/**
 * Coordina el modo "dos dispositivos" del mismo usuario. Con una sola sesión, no
 * cambia nada. Con dos, pide el rol (Control/Cámara), bloquea el láser en Control
 * y muestra la pantalla de Cámara en el sensor. Sondea el estado cada ~2,5 s.
 */
export function SesionesGuard({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesiones | null>(null);
  const tokenRef = useRef<string>("");

  useEffect(() => {
    tokenRef.current = getToken();
    let vivo = true;
    (async () => {
      try {
        const e = await registrarDispositivo(tokenRef.current);
        if (vivo) setEstado(e);
      } catch {
        /* sin conexión: se reintenta en el siguiente latido */
      }
    })();
    const id = setInterval(async () => {
      try {
        const e = await estadoSesiones(tokenRef.current);
        if (vivo) setEstado(e);
      } catch {
        /* ignora */
      }
    }, 2500);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  const elegir = useCallback(async (rol: "control" | "camara") => {
    setEstado(await elegirRol(tokenRef.current, rol));
  }, []);

  const cerrar = useCallback(async (id: string) => {
    await cerrarSesion(id);
    setEstado(await estadoSesiones(tokenRef.current));
  }, []);

  const reabrir = useCallback(async () => {
    setEstado(await registrarDispositivo(tokenRef.current));
  }, []);

  // Esta sesión fue cerrada desde el otro dispositivo.
  if (estado?.cerrada) {
    return <Cerrada onReabrir={reabrir} />;
  }

  // Dispositivo de Cámara: pantalla mínima (sensor). Solo si sigue habiendo 2+
  // sesiones (si te quedas solo, vuelve al modo normal).
  if (estado && estado.total >= 2 && estado.miRol === "camara") {
    return <CamaraRemota estado={estado} onCerrar={cerrar} />;
  }

  const laserBloqueado = estado?.laserBloqueado ?? false;

  return (
    <LaserBloqueadoContext.Provider value={laserBloqueado}>
      {estado && estado.total >= 2 ? <BarraSesiones estado={estado} onCerrar={cerrar} /> : null}
      {nav}
      {children}
      {estado?.necesitaRol ? <ModalRol onElegir={elegir} /> : null}
    </LaserBloqueadoContext.Provider>
  );
}

function BarraSesiones({
  estado,
  onCerrar,
}: {
  estado: EstadoSesiones;
  onCerrar: (id: string) => void;
}) {
  const yo = estado.sesiones.find((s) => s.esEste);
  const otras = estado.sesiones.filter((s) => !s.esEste);
  const etiqueta = (r: string | null) => (r === "camara" ? "Cámara" : r === "control" ? "Control" : "sin rol");
  const hayCamara = estado.sesiones.some((s) => s.role === "camara");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.4rem 0.6rem",
        fontSize: "0.8rem",
        background: "var(--superficie-2)",
        borderBottom: "1px solid var(--borde)",
      }}
    >
      <span style={{ color: "var(--texto-suave)" }}>
        📱 {estado.total} dispositivos · este: <strong>{etiqueta(yo?.role ?? null)}</strong>
      </span>
      {yo?.role === "control" && hayCamara ? (
        <span
          style={{
            fontWeight: 700,
            color: estado.capturaActiva ? "var(--verde)" : "var(--texto-suave)",
          }}
        >
          {estado.capturaActiva ? "📷 capturando" : "📷 cámara conectada"}
        </span>
      ) : null}
      {yo ? (
        <button type="button" className="btn" style={miniBtn} onClick={() => onCerrar(yo.id)}>
          Cerrar esta
        </button>
      ) : null}
      {otras.map((o) => (
        <button key={o.id} type="button" className="btn" style={miniBtn} onClick={() => onCerrar(o.id)}>
          Cerrar {etiqueta(o.role)}
        </button>
      ))}
    </div>
  );
}

function ModalRol({ onElegir }: { onElegir: (rol: "control" | "camara") => void }) {
  return (
    <div style={overlay}>
      <div style={caja}>
        <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.2rem" }}>Ya tienes una sesión abierta</h2>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem", margin: "0 0 1rem" }}>
          Elige qué es este dispositivo:
        </p>
        <button type="button" className="btn btn-primario btn-bloque" onClick={() => onElegir("control")}>
          🕹️ Control (todo, menos el láser)
        </button>
        <div style={{ height: 8 }} />
        <button type="button" className="btn btn-bloque" onClick={() => onElegir("camara")}>
          📷 Cámara (sensor láser)
        </button>
      </div>
    </div>
  );
}

function Cerrada({ onReabrir }: { onReabrir: () => void }) {
  return (
    <main
      className="contenedor"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <div style={{ fontSize: "2.5rem" }}>🔌</div>
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Sesión cerrada</h1>
      <p style={{ color: "var(--texto-suave)", maxWidth: 300 }}>
        Esta sesión se cerró desde el otro dispositivo.
      </p>
      <button type="button" className="btn btn-primario" onClick={onReabrir}>
        Reabrir aquí
      </button>
    </main>
  );
}

const miniBtn = {
  padding: "0.2rem 0.5rem",
  fontSize: "0.75rem",
  borderRadius: 8,
} as const;

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
} as const;

const caja = {
  width: "100%",
  maxWidth: 340,
  background: "var(--menu-fondo)",
  border: "1px solid var(--borde)",
  borderRadius: 14,
  padding: "1.2rem",
  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
} as const;
