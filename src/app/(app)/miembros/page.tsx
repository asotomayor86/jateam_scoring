import { asc } from "drizzle-orm";
import { requireAdmin } from "@/auth/helpers";
import { db, profiles } from "@/db";
import { InviteForm } from "@/components/invite-form";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MiembrosPage() {
  // Solo el encargado entra aquí.
  await requireAdmin();

  const miembros = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
      isAdmin: profiles.isAdmin,
    })
    .from(profiles)
    .orderBy(asc(profiles.displayName));

  return (
    <>
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
      <Card>
        <table className="tabla">
          <tbody>
            {miembros.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.displayName}
                  {m.nickname ? (
                    <span style={{ color: "var(--texto-suave)" }}>
                      {" "}
                      · {m.nickname}
                    </span>
                  ) : null}
                </td>
                <td className="num">
                  {m.isAdmin ? <span className="chip chip-semioficial">Encargado</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
