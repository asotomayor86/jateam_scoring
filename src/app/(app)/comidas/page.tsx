import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { listComidas } from "@/db/queries/comidas";
import { ComidaCard } from "@/components/comida-card";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ComidasPage() {
  await requireUser();
  const comidas = await listComidas();

  return (
    <>
      <SeccionTitulo
        extra={
          <Link href="/comidas/nueva" className="btn btn-primario">
            + Nueva
          </Link>
        }
      >
        Comidas
      </SeccionTitulo>

      <p style={{ margin: "0 0 1rem" }}>
        <Link href="/restaurantes" style={{ color: "var(--acento)", fontSize: "0.9rem" }}>
          Gestionar restaurantes →
        </Link>
      </p>

      {comidas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>
          Aún no hay comidas. Crea la primera con «Nueva».
        </p>
      ) : (
        comidas.map((c) => <ComidaCard key={c.id} {...c} />)
      )}
    </>
  );
}
