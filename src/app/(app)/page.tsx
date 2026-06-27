import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { listTiradas } from "@/db/queries/tiradas";
import { TiradaCard } from "@/components/tirada-card";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await requireUser();
  const todas = await listTiradas();
  const recientes = todas.slice(0, 6);

  return (
    <>
      <div style={{ margin: "0.5rem 0 0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
          Hola, {profile.nickname || profile.displayName} 👋
        </h1>
        <p style={{ margin: "0.25rem 0 0", color: "var(--texto-suave)" }}>
          Apunta tu tirada o consulta el ranking del grupo.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.6rem",
          margin: "1rem 0",
        }}
      >
        <Link href="/tiradas/nueva" className="btn btn-primario btn-bloque">
          + Nueva tirada
        </Link>
        <Link href="/tiradas" className="btn btn-bloque">
          Ver tiradas
        </Link>
      </div>

      <SeccionTitulo
        extra={
          <Link
            href="/tiradas"
            style={{ color: "var(--acento)", fontSize: "0.9rem" }}
          >
            Ver todas
          </Link>
        }
      >
        Tiradas recientes
      </SeccionTitulo>

      {recientes.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>
          Todavía no hay tiradas. Crea la primera con «Nueva tirada».
        </p>
      ) : (
        recientes.map((t) => <TiradaCard key={t.id} {...t} />)
      )}
    </>
  );
}
