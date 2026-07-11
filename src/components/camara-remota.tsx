"use client";

import type { EstadoSesiones } from "@/actions/sesiones";

/**
 * Pantalla del dispositivo "Cámara" (sensor láser remoto). Fase 1: muestra el
 * estado y los controles de sesión. La captura en vivo (enviar los disparos al
 * Control) llega en la Fase 2.
 */
export function CamaraRemota({
  estado,
  onCerrar,
}: {
  estado: EstadoSesiones;
  onCerrar: (id: string) => void;
}) {
  const yo = estado.sesiones.find((s) => s.esEste);
  const otras = estado.sesiones.filter((s) => !s.esEste);

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
      <div style={{ fontSize: "3rem" }}>🎯📷</div>
      <h1 className="titulo-app" style={{ fontSize: "1.6rem", margin: 0 }}>
        Cámara remota
      </h1>

      {estado.bloqueada ? (
        <p style={{ color: "var(--rojo)", maxWidth: 320 }}>
          Hay <strong>más de una Cámara</strong> abierta. Deja solo una: cierra la otra
          o cámbiala a Control.
        </p>
      ) : (
        <p style={{ color: "var(--texto-suave)", maxWidth: 320 }}>
          Este dispositivo es el <strong>sensor láser</strong>. Coloca el móvil fijo
          apuntando a la diana. Cuando el dispositivo de <strong>Control</strong> active
          la captura de una serie, aquí se abrirá la cámara para calibrar y detectar los
          disparos. <em>(La captura en vivo llega en la próxima versión.)</em>
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: 300 }}>
        {yo ? (
          <button type="button" className="btn btn-bloque" onClick={() => onCerrar(yo.id)}>
            Cerrar esta sesión (Cámara)
          </button>
        ) : null}
        {otras.map((o) => (
          <button key={o.id} type="button" className="btn btn-bloque" onClick={() => onCerrar(o.id)}>
            Cerrar la otra sesión{o.role ? ` (${o.role === "camara" ? "Cámara" : "Control"})` : ""}
          </button>
        ))}
      </div>
    </main>
  );
}
