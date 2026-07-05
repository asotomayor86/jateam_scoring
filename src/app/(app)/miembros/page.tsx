import Link from "next/link";
import { requireAdmin } from "@/auth/helpers";
import { getMiembros } from "@/db/queries/members";
import { InviteForm } from "@/components/invite-form";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MiembrosPage() {
  // Solo el encargado entra aquí.
  await requireAdmin();
  const miembros = await getMiembros();

  return (
    <>
      <SeccionTitulo grande>Miembros</SeccionTitulo>
      <SeccionTitulo>Invitar tirador</SeccionTitulo>
      <Card style={{ marginBottom: "1rem" }}>
        <p
          style={{
            margin: "0 0 0.7rem",
            color: "var(--texto-suave)",
            fontSize: "0.9rem",
          }}
        >
          Se crea la cuenta y se envía un email para que la persona ponga su
          contraseña.
        </p>
        <InviteForm />
      </Card>

      <SeccionTitulo>Miembros ({miembros.length})</SeccionTitulo>
      {miembros.map((m) => (
        <Card key={m.id} style={{ marginBottom: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                {m.displayName}
                {m.nickname ? (
                  <span style={{ color: "var(--texto-suave)" }}>
                    {" "}
                    · {m.nickname}
                  </span>
                ) : null}
                {m.isAdmin ? (
                  <span
                    className="chip chip-semioficial"
                    style={{ marginLeft: "0.4rem" }}
                  >
                    Encargado
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  color: "var(--texto-suave)",
                  fontSize: "0.82rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.email ?? "sin email"}
                {m.licenseNumber ? ` · Lic. ${m.licenseNumber}` : ""}
              </div>
            </div>
            <Link
              href={`/miembros/${m.id}`}
              className="btn"
              style={{ fontSize: "0.85rem", flexShrink: 0 }}
            >
              Editar
            </Link>
          </div>
        </Card>
      ))}
    </>
  );
}
