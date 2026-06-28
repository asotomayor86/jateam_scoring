"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearComida, type ResultadoAccion } from "@/actions/comidas";
import {
  crearRestaurante,
  type ResultadoAccion as ResRest,
} from "@/actions/restaurantes";
import { Aviso, Card, estiloCampo } from "@/components/ui";

type Opcion = { id: string; name: string };

const inicial: ResultadoAccion = { ok: false };

const etiqueta = {
  fontSize: "0.8rem",
  color: "var(--texto-suave)",
  marginBottom: "0.2rem",
  display: "block",
};

export function CreateComidaForm({
  restaurantes,
  hoy,
}: {
  restaurantes: Opcion[];
  hoy: string;
}) {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(crearComida, inicial);
  const [verRest, setVerRest] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <form
        action={accion}
        style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
      >
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <div style={{ flex: 1 }}>
            <label style={etiqueta}>Fecha</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={hoy}
              style={estiloCampo}
            />
          </div>
          <div style={{ width: 120 }}>
            <label style={etiqueta}>Hora</label>
            <input name="startTime" type="time" style={estiloCampo} />
          </div>
        </div>

        <div>
          <label style={etiqueta}>Restaurante</label>
          <select name="restaurantId" required style={estiloCampo} defaultValue="">
            <option value="" disabled>
              Elige restaurante…
            </option>
            {restaurantes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setVerRest((v) => !v)}
            style={{
              marginTop: "0.35rem",
              background: "none",
              border: "none",
              color: "var(--acento)",
              fontSize: "0.85rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {verRest ? "Cancelar" : "+ Añadir un restaurante nuevo"}
          </button>
        </div>

        <div>
          <label style={etiqueta}>Nombre / motivo (opcional)</label>
          <input
            name="name"
            placeholder="p. ej. Comida de fin de liga"
            maxLength={60}
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={etiqueta}>Notas (opcional)</label>
          <textarea name="notes" rows={2} maxLength={300} style={estiloCampo} />
        </div>

        <button
          type="submit"
          className="btn btn-primario btn-bloque"
          disabled={enviando}
        >
          {enviando ? "Creando…" : "Crear comida"}
        </button>
        {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      </form>

      {verRest && (
        <Card>
          <RestauranteForm onCreado={() => router.refresh()} />
        </Card>
      )}
    </div>
  );
}

const restInicial: ResRest = { ok: false };

function RestauranteForm({ onCreado }: { onCreado: () => void }) {
  const [estado, accion, enviando] = useActionState(
    async (prev: ResRest, fd: FormData) => {
      const r = await crearRestaurante(prev, fd);
      if (r.ok) onCreado();
      return r;
    },
    restInicial,
  );

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
    >
      <strong style={{ fontSize: "0.95rem" }}>Nuevo restaurante</strong>
      <input name="name" placeholder="Nombre" required maxLength={60} style={estiloCampo} />
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
      <button type="submit" className="btn" disabled={enviando}>
        {enviando ? "Añadiendo…" : "Añadir restaurante"}
      </button>
      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
