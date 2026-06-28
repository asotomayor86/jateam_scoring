import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getComida, getAsistentes, estoyApuntado } from "@/db/queries/comidas";
import {
  apuntarmeComida,
  desapuntarmeComida,
  borrarComida,
} from "@/actions/comidas";
import { Card, SeccionTitulo } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

export const dynamic = "force-dynamic";

export default async function ComidaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await requireUser();
  const { id } = await params;

  const comida = await getComida(id);
  if (!comida) notFound();

  const [asistentes, apuntado] = await Promise.all([
    getAsistentes(id),
    estoyApuntado(id, user.id),
  ]);
  const puedeBorrar = comida.createdBy === user.id || profile.isAdmin;

  return (
    <>
      <SeccionTitulo>🍽️ {comida.name || "Comida"}</SeccionTitulo>

      <Card style={{ marginBottom: "1rem", background: "rgba(56, 132, 255, 0.16)" }}>
        <div style={{ fontWeight: 600 }}>{comida.restaurantName}</div>
        <div style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
          {comida.date}
          {comida.startTime ? ` · ${comida.startTime}` : ""}
        </div>
        {comida.restaurantMapsUrl ? (
          <a
            href={comida.restaurantMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--acento)",
              fontSize: "0.85rem",
              display: "inline-block",
              marginTop: "0.3rem",
            }}
          >
            📍 Ver restaurante en Google Maps
          </a>
        ) : null}
        {comida.notes ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>{comida.notes}</p>
        ) : null}
      </Card>

      {apuntado ? (
        <form action={desapuntarmeComida} style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="comidaId" value={id} />
          <button type="submit" className="btn btn-bloque">
            Estás apuntado · Desapuntarme
          </button>
        </form>
      ) : (
        <form action={apuntarmeComida} style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="comidaId" value={id} />
          <button type="submit" className="btn btn-primario btn-bloque">
            🍽️ Apuntarme a la comida
          </button>
        </form>
      )}

      <SeccionTitulo>Apuntados ({asistentes.length})</SeccionTitulo>
      <Card>
        {asistentes.length === 0 ? (
          <p style={{ color: "var(--texto-suave)", margin: 0 }}>
            Nadie apuntado todavía.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {asistentes.map((a) => (
              <li key={a.userId} style={{ padding: "0.15rem 0" }}>
                {a.nickname || a.displayName}
                {a.userId === user.id ? " (tú)" : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {puedeBorrar ? (
        <form action={borrarComida} style={{ marginTop: "1.5rem" }}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            message="¿Borrar la comida? Se eliminará junto con los apuntados."
            className="btn"
            style={{ color: "var(--rojo)", width: "100%" }}
          >
            Borrar comida
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}
