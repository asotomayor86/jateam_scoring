"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearTirada, crearClub, type ResultadoAccion } from "@/actions/tiradas";
import { Aviso, Card, estiloCampo } from "@/components/ui";

type Opcion = { id: string; name: string };

const inicial: ResultadoAccion = { ok: false };

const etiqueta = {
  fontSize: "0.8rem",
  color: "var(--texto-suave)",
  marginBottom: "0.2rem",
  display: "block",
};

export function CreateTiradaForm({
  modalidades,
  clubs,
  hoy,
}: {
  modalidades: Opcion[];
  clubs: Opcion[];
  hoy: string;
}) {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(crearTirada, inicial);
  const [verClub, setVerClub] = useState(false);

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
            <label style={etiqueta}>Hora inicio</label>
            <input name="startTime" type="time" style={estiloCampo} />
          </div>
        </div>

        <div>
          <label style={etiqueta}>Modalidad</label>
          <select name="modalityId" required style={estiloCampo} defaultValue="">
            <option value="" disabled>
              Elige modalidad…
            </option>
            {modalidades.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={etiqueta}>Campo</label>
          <select name="clubId" required style={estiloCampo} defaultValue="">
            <option value="" disabled>
              Elige campo…
            </option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setVerClub((v) => !v)}
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
            {verClub ? "Cancelar" : "+ Añadir un campo nuevo"}
          </button>
        </div>

        <div>
          <label style={etiqueta}>Tipo de tirada</label>
          <select name="type" required style={estiloCampo} defaultValue="entrenamiento">
            <option value="entrenamiento">Entrenamiento</option>
            <option value="semioficial">Semioficial</option>
            <option value="oficial">Oficial</option>
          </select>
        </div>

        <div>
          <label style={etiqueta}>Calibre (opcional)</label>
          <input
            name="caliber"
            placeholder="p. ej. 9mm, .38, 22"
            maxLength={16}
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={etiqueta}>Nombre / nota corta (opcional)</label>
          <input
            name="name"
            placeholder="p. ej. Liga social jornada 3"
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
          {enviando ? "Creando…" : "Crear tirada"}
        </button>
        {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      </form>

      {verClub && (
        <Card>
          <ClubForm onCreado={() => router.refresh()} />
        </Card>
      )}
    </div>
  );
}

const clubInicial: ResultadoAccion = { ok: false };

/** Mini-formulario para añadir un club al catálogo sin salir de la página. */
function ClubForm({ onCreado }: { onCreado: () => void }) {
  const [estado, accion, enviando] = useActionState(
    async (prev: ResultadoAccion, fd: FormData) => {
      const r = await crearClub(prev, fd);
      if (r.ok) onCreado();
      return r;
    },
    clubInicial,
  );

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
    >
      <strong style={{ fontSize: "0.95rem" }}>Nuevo campo</strong>
      <input name="name" placeholder="Nombre del campo" required maxLength={60} style={estiloCampo} />
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
      <button type="submit" className="btn" disabled={enviando}>
        {enviando ? "Añadiendo…" : "Añadir campo"}
      </button>
      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
