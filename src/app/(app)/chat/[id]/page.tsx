import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getThread, getMessages } from "@/db/queries/chat";
import { borrarHilo, borrarMensaje } from "@/actions/chat";
import { ResponderForm } from "@/components/responder-form";
import { ChatRefresh } from "@/components/chat-refresh";
import { TextoConEnlaces } from "@/components/texto-enlaces";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, SeccionTitulo } from "@/components/ui";
import { fechaHoraCorta } from "@/lib/tiempo";

export const dynamic = "force-dynamic";

export default async function HiloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await requireUser();
  const { id } = await params;

  const hilo = await getThread(id);
  if (!hilo) notFound();
  const mensajes = await getMessages(id);
  // Solo el encargado puede borrar hilos.
  const puedeBorrarHilo = profile.isAdmin;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <SeccionTitulo>{hilo.title}</SeccionTitulo>
        <Link href="/chat" style={{ color: "var(--acento)", fontSize: "0.9rem" }}>
          ← Chat
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
          margin: "0 0 0.8rem",
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
          Abierto por {hilo.autorApodo || hilo.autorNombre || "Alguien"}
        </span>
        <ChatRefresh />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {mensajes.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>
            Aún no hay mensajes. Escribe el primero abajo.
          </p>
        ) : (
          mensajes.map((m) => {
            const mio = m.userId === user.id;
            const puedeBorrar = mio || profile.isAdmin;
            return (
              <Card
                key={m.id}
                style={mio ? { background: "var(--superficie-2)" } : undefined}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginBottom: "0.3rem",
                  }}
                >
                  <strong style={{ fontSize: "0.85rem" }}>
                    {mio ? "Tú" : m.autorApodo || m.autorNombre || "Usuario"}
                  </strong>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <small style={{ color: "var(--texto-suave)" }}>
                      {fechaHoraCorta(m.createdAt)}
                    </small>
                    {puedeBorrar ? (
                      <form action={borrarMensaje}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="threadId" value={id} />
                        <ConfirmButton
                          message="¿Borrar este mensaje?"
                          className="btn"
                          style={{
                            padding: "0.1rem 0.4rem",
                            fontSize: "0.75rem",
                            color: "var(--rojo)",
                          }}
                        >
                          ✕
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </span>
                </div>
                <div style={{ fontSize: "0.95rem", lineHeight: 1.4 }}>
                  <TextoConEnlaces texto={m.body} />
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ResponderForm threadId={id} />

      {puedeBorrarHilo ? (
        <form action={borrarHilo} style={{ marginTop: "1rem" }}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            message="¿Borrar el hilo entero y todos sus mensajes?"
            className="btn btn-bloque"
            style={{ color: "var(--rojo)" }}
          >
            Borrar hilo
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}
