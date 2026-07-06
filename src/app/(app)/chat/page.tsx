import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { listThreads } from "@/db/queries/chat";
import { NuevoHiloForm } from "@/components/nuevo-hilo-form";
import { ChatRefresh } from "@/components/chat-refresh";
import { Card, SeccionTitulo } from "@/components/ui";
import { haceCuanto } from "@/lib/tiempo";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  await requireUser();
  const hilos = await listThreads();

  return (
    <>
      <SeccionTitulo grande extra={<ChatRefresh />}>
        Chat del grupo
      </SeccionTitulo>

      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: "0 0 0.8rem" }}>
        Hilos del grupo. Los mensajes de más de 3 meses se borran automáticamente.
      </p>

      <div style={{ marginBottom: "0.9rem" }}>
        <NuevoHiloForm />
      </div>

      {hilos.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>
          Aún no hay hilos. Abre el primero con «Nuevo hilo».
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {hilos.map((h) => (
            <Link
              key={h.id}
              href={`/chat/${h.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card>
                <strong style={{ fontSize: "1rem" }}>{h.title}</strong>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--texto-suave)" }}>
                  {h.autorApodo || h.autorNombre || "Alguien"} · {h.mensajes} mensaje
                  {h.mensajes === 1 ? "" : "s"} · {haceCuanto(h.lastActivityAt)}
                </p>
                {h.ultimoMensaje ? (
                  <p
                    style={{
                      margin: "0.4rem 0 0",
                      fontSize: "0.85rem",
                      color: "var(--texto)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.ultimoMensaje}
                  </p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
