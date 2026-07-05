import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { listTiradas, type FiltrosTiradas } from "@/db/queries/tiradas";
import { getModalidades, getClubs } from "@/db/queries/catalog";
import { TiradaCard } from "@/components/tirada-card";
import { TiradasFiltros } from "@/components/tiradas-filtros";
import { SeccionTitulo } from "@/components/ui";
import type { TiradaType } from "@/db/schema";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  modalityId?: string;
  clubId?: string;
  type?: string;
}>;

const TIPOS_VALIDOS = ["oficial", "semioficial", "entrenamiento"];

export default async function TiradasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { user } = await requireUser();
  const sp = await searchParams;

  const filtros: FiltrosTiradas = {
    modalityId: sp.modalityId || undefined,
    clubId: sp.clubId || undefined,
    type:
      sp.type && TIPOS_VALIDOS.includes(sp.type)
        ? (sp.type as TiradaType)
        : undefined,
  };

  const [tiradas, modalidades, clubs] = await Promise.all([
    listTiradas(filtros, user.id),
    getModalidades(),
    getClubs(),
  ]);

  return (
    <>
      <SeccionTitulo
        grande
        extra={
          <Link href="/tiradas/nueva" className="btn btn-primario">
            + Nueva
          </Link>
        }
      >
        Tiradas y Entrenamientos
      </SeccionTitulo>

      <TiradasFiltros
        modalidades={modalidades.map((m) => ({ id: m.id, name: m.name }))}
        clubs={clubs.map((c) => ({ id: c.id, name: c.name }))}
      />

      {tiradas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>
          No hay tiradas con esos filtros.
        </p>
      ) : (
        tiradas.map((t) => <TiradaCard key={t.id} {...t} />)
      )}
    </>
  );
}
