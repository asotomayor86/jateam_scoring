"use client";

import { useActionState, useState } from "react";
import { crearHilo, type ResultadoAccion } from "@/actions/chat";
import { Aviso, Card, estiloCampo } from "@/components/ui";
import {
  MentionableTextarea,
  type MiembroMencion,
} from "@/components/mentionable-textarea";

const inicial: ResultadoAccion = { ok: false };

/** Caja para abrir un hilo nuevo (plegable, para no ocupar sitio). */
export function NuevoHiloForm({ members }: { members: MiembroMencion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(crearHilo, inicial);

  if (!abierto) {
    return (
      <button className="btn btn-primario" onClick={() => setAbierto(true)}>
        + Nuevo hilo
      </button>
    );
  }

  return (
    <Card>
      <form action={accion} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <strong style={{ fontSize: "0.95rem" }}>Nuevo hilo</strong>
        <input
          name="title"
          placeholder="Título del hilo"
          required
          maxLength={120}
          autoFocus
          style={estiloCampo}
        />
        <MentionableTextarea
          name="body"
          members={members}
          placeholder="Primer mensaje (opcional, @ para mencionar)"
          rows={3}
        />
        {estado.mensaje ? <Aviso tipo="error">{estado.mensaje}</Aviso> : null}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primario" disabled={enviando}>
            {enviando ? "Creando…" : "Crear hilo"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setAbierto(false)}
            disabled={enviando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}
