"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  crearRestaurante,
  actualizarRestaurante,
  borrarRestaurante,
  type ResultadoAccion,
} from "@/actions/restaurantes";
import { Aviso, Card, estiloCampo } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

type Restaurante = {
  id: string;
  name: string;
  abbr: string;
  mapsUrl: string | null;
  usos: number;
};

const inicial: ResultadoAccion = { ok: false };

export function RestaurantsManager({
  restaurantes,
}: {
  restaurantes: Restaurante[];
}) {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(
    async (prev: ResultadoAccion, fd: FormData) => {
      const r = await crearRestaurante(prev, fd);
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
          <strong style={{ fontSize: "0.95rem" }}>Añadir restaurante</strong>
          <input
            name="name"
            placeholder="Nombre del restaurante"
            required
            maxLength={60}
            style={estiloCampo}
          />
          <input
            name="abbr"
            placeholder="Sigla (p. ej. CASA)"
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
            {enviando ? "Añadiendo…" : "Añadir restaurante"}
          </button>
          {estado.mensaje && (
            <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
          )}
        </form>
      </Card>

      {restaurantes.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>Aún no hay restaurantes.</p>
      ) : (
        restaurantes.map((r) => <RestauranteRow key={r.id} restaurante={r} />)
      )}
    </div>
  );
}

function RestauranteRow({ restaurante }: { restaurante: Restaurante }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Card>
        <form
          action={actualizarRestaurante}
          onSubmit={() => setEditando(false)}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <input type="hidden" name="id" value={restaurante.id} />
          <input
            name="name"
            defaultValue={restaurante.name}
            required
            maxLength={60}
            style={estiloCampo}
          />
          <input
            name="abbr"
            defaultValue={restaurante.abbr}
            required
            maxLength={12}
            style={estiloCampo}
          />
          <input
            name="mapsUrl"
            type="url"
            defaultValue={restaurante.mapsUrl ?? ""}
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
          <div style={{ fontWeight: 600 }}>{restaurante.name}</div>
          <div style={{ color: "var(--texto-suave)", fontSize: "0.82rem" }}>
            {restaurante.abbr} ·{" "}
            {restaurante.usos > 0
              ? `${restaurante.usos} comida${restaurante.usos === 1 ? "" : "s"}`
              : "sin comidas"}
          </div>
          {restaurante.mapsUrl ? (
            <a
              href={restaurante.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--acento)", fontSize: "0.85rem" }}
            >
              📍 Ver en Google Maps
            </a>
          ) : null}
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
          {restaurante.usos === 0 ? (
            <form action={borrarRestaurante}>
              <input type="hidden" name="id" value={restaurante.id} />
              <ConfirmButton
                message={`¿Borrar el restaurante «${restaurante.name}»?`}
                className="btn"
                style={{ fontSize: "0.85rem", color: "var(--rojo)" }}
              >
                Borrar
              </ConfirmButton>
            </form>
          ) : (
            <span
              title="No se puede borrar: hay comidas que lo usan"
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
