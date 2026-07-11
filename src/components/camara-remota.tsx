"use client";

import type { EstadoSesiones } from "@/actions/sesiones";
import { emitirEventoLaser } from "@/actions/laser";
import { LaserTrainer } from "@/components/laser-trainer";

/**
 * Pantalla del dispositivo "Cámara" (sensor láser remoto). Cuando el Control
 * activa la captura de una serie, se abre aquí la cámara (calibración + detección
 * igual que en modo un solo dispositivo) y cada disparo se envía al Control.
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

  const controles = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: 320, margin: "0 auto" }}>
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
  );

  // Conflicto: hay dos cámaras.
  if (estado.bloqueada) {
    return (
      <main className="contenedor" style={centrado}>
        <div style={{ fontSize: "3rem" }}>🎯📷</div>
        <h1 className="titulo-app" style={{ fontSize: "1.6rem", margin: 0 }}>Cámara remota</h1>
        <p style={{ color: "var(--rojo)", maxWidth: 320 }}>
          Hay <strong>más de una Cámara</strong> abierta. Deja solo una: cierra la otra o
          cámbiala a Control.
        </p>
        {controles}
      </main>
    );
  }

  // Captura activa: abre la cámara y transmite los disparos al Control.
  if (estado.capturaActiva) {
    return (
      <main className="contenedor" style={{ paddingBottom: "2rem" }}>
        <h1 className="titulo-app" style={{ fontSize: "1.3rem", margin: "0.5rem 0" }}>
          📷 Capturando para el Control
        </h1>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: "0 0 0.6rem" }}>
          Coloca el móvil fijo apuntando a la diana, calibra y escucha los disparos. Cada
          impacto detectado se envía al dispositivo de Control.
        </p>
        <LaserTrainer
          compacto
          onImpacto={(imp) => {
            void emitirEventoLaser({ x: imp.x, y: imp.y, s: imp.s });
          }}
        />
        <div style={{ marginTop: "1rem" }}>{controles}</div>
      </main>
    );
  }

  // En espera: el Control aún no ha activado la captura.
  return (
    <main className="contenedor" style={centrado}>
      <div style={{ fontSize: "3rem" }}>🎯📷</div>
      <h1 className="titulo-app" style={{ fontSize: "1.6rem", margin: 0 }}>Cámara remota</h1>
      <p style={{ color: "var(--texto-suave)", maxWidth: 320 }}>
        Este dispositivo es el <strong>sensor láser</strong>. Coloca el móvil fijo
        apuntando a la diana. En cuanto el dispositivo de <strong>Control</strong> active
        la captura de una serie, aquí se abrirá la cámara.
      </p>
      {controles}
    </main>
  );
}

const centrado = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: "1rem",
} as const;
