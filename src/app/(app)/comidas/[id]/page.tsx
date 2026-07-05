import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getComida, getAsistentes, miAsistencia } from "@/db/queries/comidas";
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

  const [asistentes, mi] = await Promise.all([
    getAsistentes(id),
    miAsistencia(id, user.id),
  ]);
  const puedeBorrar = comida.createdBy === user.id || profile.isAdmin;
  const totalPersonas = asistentes.reduce((a, x) => a + 1 + x.guests, 0);

  const estiloNum = {
    flex: 1,
    minWidth: 0,
    textAlign: "center" as const,
    padding: "0.6rem 0.2rem",
    borderRadius: 10,
    border: "1px solid var(--borde)",
    background: "var(--superficie-2)",
    color: "var(--texto)",
    fontSize: "1rem",
  };

  return (
    <>
      <SeccionTitulo grande>🍽️ {comida.name || "Comida"}</SeccionTitulo>

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

      {mi ? (
        <div style={{ marginBottom: "1rem" }}>
          <form action={apuntarmeComida} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="hidden" name="comidaId" value={id} />
            <button type="submit" className="btn btn-primario" style={{ flex: 4 }}>
              Actualizar
            </button>
            <input
              name="guests"
              type="number"
              min={0}
              max={50}
              defaultValue={mi.guests}
              aria-label="Acompañantes"
              title="Acompañantes (+N)"
              placeholder="+0"
              style={estiloNum}
            />
          </form>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--texto-suave)" }}>
            El número de la derecha son tus <strong>acompañantes</strong> (personas
            que traes además de ti).
          </p>
          <form action={desapuntarmeComida} style={{ marginTop: "0.5rem" }}>
            <input type="hidden" name="comidaId" value={id} />
            <button
              type="submit"
              className="btn"
              style={{ fontSize: "0.85rem", color: "var(--rojo)" }}
            >
              Desapuntarme
            </button>
          </form>
        </div>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          <form action={apuntarmeComida} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="hidden" name="comidaId" value={id} />
            <button type="submit" className="btn btn-primario" style={{ flex: 4 }}>
              🍽️ Apuntarme
            </button>
            <input
              name="guests"
              type="number"
              min={0}
              max={50}
              defaultValue={0}
              aria-label="Acompañantes"
              title="Acompañantes (+N)"
              placeholder="+0"
              style={estiloNum}
            />
          </form>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--texto-suave)" }}>
            El número de la derecha son tus <strong>acompañantes</strong> (personas
            que traes además de ti).
          </p>
        </div>
      )}

      <SeccionTitulo>
        Apuntados ({totalPersonas} {totalPersonas === 1 ? "persona" : "personas"})
      </SeccionTitulo>
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
                {a.guests > 0 ? (
                  <span style={{ color: "var(--texto-suave)" }}> +{a.guests}</span>
                ) : null}
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
