"use client";

import { useActionState } from "react";
import { invitarUsuario, type ResultadoAccion } from "@/actions/admin";
import { Aviso, estiloCampo } from "@/components/ui";

const inicial: ResultadoAccion = { ok: false };

/** Formulario de invitación por email (solo encargado). */
export function InviteForm() {
  const [estado, accion, enviando] = useActionState(invitarUsuario, inicial);

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}
    >
      <input
        name="email"
        type="email"
        required
        placeholder="email@ejemplo.com"
        style={estiloCampo}
      />
      <input
        name="displayName"
        required
        placeholder="Nombre del tirador"
        maxLength={40}
        style={estiloCampo}
      />
      <input
        name="nickname"
        placeholder="Apodo (opcional)"
        maxLength={24}
        style={estiloCampo}
      />
      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? "Invitando…" : "Invitar"}
      </button>
      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
