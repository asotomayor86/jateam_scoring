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

type Campo = {
  id: string;
  name: string;
  abbr: string;
  mapsUrl: string | null;
  usos: number;
};

const inicial: ResultadoAccion = { ok: false };

export function ClubsManager({
  clubs,
  puedeGestionar = false,
}: {
  clubs: Campo[];
  puedeGestionar?: boolean;
}) {
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
      {puedeGestionar ? (
      <Card>
        <form
          action={accion}
          style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
        >
          <strong style={{ fontSize: "0.95rem" }}>Añadir campo</strong>
          <input
            name="name"
            placeholder="Nombre del campo"
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
          <input
            name="mapsUrl"
            type="url"
            placeholder="Enlace de Google Maps (opcional)"
            style={estiloCampo}
          />
          <button type="submit" className="btn btn-primario" disabled={enviando}>
            {enviando ? "Añadiendo…" : "Añadir campo"}
          </button>
          {estado.mensaje && (
            <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
          )}
        </form>
      </Card>
      ) : null}

      {clubs.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>Aún no hay campos.</p>
      ) : (
        clubs.map((c) => (
          <CampoRow key={c.id} campo={c} puedeGestionar={puedeGestionar} />
        ))
      )}
    </div>
  );
}

function CampoRow({
  campo,
  puedeGestionar,
}: {
  campo: Campo;
  puedeGestionar: boolean;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Card>
        <form
          action={actualizarClub}
          onSubmit={() => setEditando(false)}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <input type="hidden" name="id" value={campo.id} />
          <input
            name="name"
            defaultValue={campo.name}
            required
            maxLength={60}
            style={estiloCampo}
          />
          <input
            name="abbr"
            defaultValue={campo.abbr}
            required
            maxLength={12}
            style={estiloCampo}
          />
          <input
            name="mapsUrl"
            type="url"
            defaultValue={campo.mapsUrl ?? ""}
            placeholder="Enlace de Google Maps (opcional)"
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{campo.name}</div>
          <div style={{ color: "var(--texto-suave)", fontSize: "0.82rem" }}>
            {campo.abbr} ·{" "}
            {campo.usos > 0
              ? `${campo.usos} tirada${campo.usos === 1 ? "" : "s"}`
              : "sin tiradas"}
          </div>
          {campo.mapsUrl ? (
            <a
              href={campo.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--acento)", fontSize: "0.85rem" }}
            >
              📍 Ver en Google Maps
            </a>
          ) : null}
        </div>
        {puedeGestionar ? (
        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.85rem" }}
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          {campo.usos === 0 ? (
            <form action={borrarClub}>
              <input type="hidden" name="id" value={campo.id} />
              <ConfirmButton
                message={`¿Borrar el campo «${campo.name}»?`}
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
        ) : null}
      </div>
    </Card>
  );
}
