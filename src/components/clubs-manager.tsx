"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  crearClub,
  actualizarClub,
  borrarClub,
  type ResultadoAccion,
} from "@/actions/tiradas";
import { Aviso, Card, estiloCampo } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

type Club = { id: string; name: string; abbr: string; usos: number };

const inicial: ResultadoAccion = { ok: false };

export function ClubsManager({ clubs }: { clubs: Club[] }) {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(
    async (prev: ResultadoAccion, fd: FormData) => {
      const r = await crearClub(prev, fd);
      if (r.ok) router.refresh();
      return r;
    },
    inicial,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Card>
        <form
          action={accion}
          style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
        >
          <strong style={{ fontSize: "0.95rem" }}>Añadir club</strong>
          <input
            name="name"
            placeholder="Nombre del club"
            required
            maxLength={60}
            style={estiloCampo}
          />
          <input
            name="abbr"
            placeholder="Sigla (p. ej. JATEAM)"
            required
            maxLength={12}
            style={estiloCampo}
          />
          <button type="submit" className="btn btn-primario" disabled={enviando}>
            {enviando ? "Añadiendo…" : "Añadir club"}
          </button>
          {estado.mensaje && (
            <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
          )}
        </form>
      </Card>

      {clubs.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>Aún no hay clubs.</p>
      ) : (
        clubs.map((c) => <ClubRow key={c.id} club={c} />)
      )}
    </div>
  );
}

function ClubRow({ club }: { club: Club }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Card>
        <form
          action={actualizarClub}
          onSubmit={() => setEditando(false)}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <input type="hidden" name="id" value={club.id} />
          <input
            name="name"
            defaultValue={club.name}
            required
            maxLength={60}
            style={estiloCampo}
          />
          <input
            name="abbr"
            defaultValue={club.abbr}
            required
            maxLength={12}
            style={estiloCampo}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primario" style={{ flex: 1 }}>
              Guardar
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setEditando(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.6rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{club.name}</div>
          <div style={{ color: "var(--texto-suave)", fontSize: "0.82rem" }}>
            {club.abbr} ·{" "}
            {club.usos > 0
              ? `${club.usos} tirada${club.usos === 1 ? "" : "s"}`
              : "sin tiradas"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.85rem" }}
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          {club.usos === 0 ? (
            <form action={borrarClub}>
              <input type="hidden" name="id" value={club.id} />
              <ConfirmButton
                message={`¿Borrar el club «${club.name}»?`}
                className="btn"
                style={{ fontSize: "0.85rem", color: "var(--rojo)" }}
              >
                Borrar
              </ConfirmButton>
            </form>
          ) : (
            <span
              title="No se puede borrar: hay tiradas que lo usan"
              style={{ color: "var(--texto-suave)", fontSize: "0.78rem", alignSelf: "center" }}
            >
              en uso
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
