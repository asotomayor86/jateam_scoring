import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getTirada } from "@/db/queries/tiradas";
import { getModalidades, getClubs } from "@/db/queries/catalog";
import { CreateTiradaForm } from "@/components/create-tirada-form";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditarTiradaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await requireUser();
  const { id } = await params;

  const tirada = await getTirada(id);
  if (!tirada) notFound();
  // Solo el creador o el encargado.
  if (tirada.createdBy !== user.id && !profile.isAdmin) {
    redirect(`/tiradas/${id}`);
  }

  const [modalidades, clubs] = await Promise.all([
    getModalidades(),
    getClubs(),
  ]);

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
        <SeccionTitulo>Editar tirada</SeccionTitulo>
        <Link
          href={`/tiradas/${id}`}
          style={{ color: "var(--acento)", fontSize: "0.9rem" }}
        >
          ← Volver
        </Link>
      </div>
      <CreateTiradaForm
        modalidades={modalidades.map((m) => ({ id: m.id, name: m.name }))}
        clubs={clubs.map((c) => ({ id: c.id, name: c.name }))}
        hoy={tirada.date}
        tirada={{
          id: tirada.id,
          date: tirada.date,
          startTime: tirada.startTime,
          modalityId: tirada.modalityId,
          clubId: tirada.clubId,
          type: tirada.type,
          caliber: tirada.caliber,
          name: tirada.name,
          notes: tirada.notes,
        }}
      />
    </>
  );
}
