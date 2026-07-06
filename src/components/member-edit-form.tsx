"use client";

import { useActionState } from "react";
import {
  actualizarPerfilAdmin,
  reenviarInvitacion,
  type ResultadoAccion,
} from "@/actions/admin";
import { Aviso, Card, estiloCampo } from "@/components/ui";
import type { EntryGranularity } from "@/db/schema";

type Props = {
  id: string;
  email: string | null;
  displayName: string;
  nickname: string | null;
  dni: string | null;
  licenseNumber: string | null;
  isAdmin: boolean;
  defaultGranularity: EntryGranularity;
};

const inicial: ResultadoAccion = { ok: false };

const etiqueta = { fontSize: "0.9rem" };

export function MemberEditForm(m: Props) {
  const [estado, accion, enviando] = useActionState(
    actualizarPerfilAdmin,
    inicial,
  );
  const [estadoInv, accionInv, enviandoInv] = useActionState(
    reenviarInvitacion,
    inicial,
  );

  return (
    <>
      <Card style={{ marginBottom: "1rem" }}>
        <form
          action={accion}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <input type="hidden" name="userId" value={m.id} />
          <p
            style={{ margin: 0, color: "var(--texto-suave)", fontSize: "0.85rem" }}
          >
            {m.email ?? "sin email"}
          </p>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={etiqueta}>Nombre</span>
            <input
              name="displayName"
              defaultValue={m.displayName}
              required
              maxLength={40}
              style={estiloCampo}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={etiqueta}>Apodo</span>
            <input
              name="nickname"
              defaultValue={m.nickname ?? ""}
              maxLength={24}
              style={estiloCampo}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={etiqueta}>DNI</span>
            <input
              name="dni"
              defaultValue={m.dni ?? ""}
              maxLength={20}
              style={estiloCampo}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={etiqueta}>Nº de licencia</span>
            <input
              name="licenseNumber"
              defaultValue={m.licenseNumber ?? ""}
              maxLength={30}
              style={estiloCampo}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={etiqueta}>Apunte por defecto</span>
            <select
              name="defaultGranularity"
              defaultValue={m.defaultGranularity}
              style={estiloCampo}
            >
              <option value="tiro">Tiro a tiro</option>
              <option value="bloque5">Total de bloques de 5</option>
              <option value="bloque10">Total de bloques de 10</option>
              <option value="serie">Total por serie</option>
              <option value="asistido">Asistido competición</option>
              <option value="diana">Diana (gráfico)</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              name="isAdmin"
              defaultChecked={m.isAdmin}
              style={{ width: 18, height: 18 }}
            />
            <span style={etiqueta}>Encargado (puede invitar y gestionar)</span>
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
      </Card>

      <Card>
        <form action={accionInv}>
          <input type="hidden" name="userId" value={m.id} />
          <p
            style={{ margin: "0 0 0.6rem", color: "var(--texto-suave)", fontSize: "0.9rem" }}
          >
            Reenvía el email para que fije o restablezca su contraseña.
          </p>
          <button type="submit" className="btn btn-bloque" disabled={enviandoInv}>
            {enviandoInv ? "Enviando…" : "Reenviar invitación"}
          </button>
          {estadoInv.mensaje && (
            <Aviso tipo={estadoInv.ok ? "ok" : "error"}>{estadoInv.mensaje}</Aviso>
          )}
        </form>
      </Card>
    </>
  );
}
