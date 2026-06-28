"use client";

import { useActionState } from "react";
import { guardarPerfil, type ResultadoAccion } from "@/actions/profile";
import { Aviso, estiloCampo } from "@/components/ui";
import type { EntryGranularity } from "@/db/schema";

type Props = {
  displayName: string;
  nickname: string | null;
  defaultGranularity: EntryGranularity;
};

const estadoInicial: ResultadoAccion = { ok: false };

const etiqueta = { fontSize: "0.9rem" };

/** Formulario para editar nombre, apodo y preferencia de apunte. */
export function ProfileForm({
  displayName,
  nickname,
  defaultGranularity,
}: Props) {
  const [estado, accion, enviando] = useActionState(
    guardarPerfil,
    estadoInicial,
  );

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={etiqueta}>Nombre</span>
        <input
          name="displayName"
          defaultValue={displayName}
          required
          maxLength={40}
          style={estiloCampo}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={etiqueta}>
          Apodo <span style={{ color: "var(--texto-suave)" }}>(opcional)</span>
        </span>
        <input
          name="nickname"
          defaultValue={nickname ?? ""}
          maxLength={24}
          placeholder="Cómo quieres aparecer en los rankings"
          style={estiloCampo}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={etiqueta}>Cómo prefieres apuntar por defecto</span>
        <select
          name="defaultGranularity"
          defaultValue={defaultGranularity}
          style={estiloCampo}
        >
          <option value="tiro">Tiro a tiro</option>
          <option value="bloque5">Total de bloques de 5</option>
          <option value="bloque10">Total de bloques de 10</option>
          <option value="serie">Total por serie</option>
          <option value="asistido">Asistido competición</option>
        </select>
        <span style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
          Es solo el modo inicial de la libreta; siempre puedes cambiarlo en cada
          serie.
        </span>
      </label>

      <button
        type="submit"
        className="btn btn-primario btn-bloque"
        disabled={enviando}
      >
        {enviando ? "Guardando…" : "Guardar cambios"}
      </button>

      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
