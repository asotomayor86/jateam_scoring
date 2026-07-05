import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth/helpers";
import { getEjercicio } from "@/db/queries/exercises";
import { ExerciseForm } from "@/components/exercise-form";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const e = await getEjercicio(id);
  if (!e) notFound();

  return (
    <>
      <SeccionTitulo>Editar {e.code}</SeccionTitulo>
      <ExerciseForm ejercicio={e} />
    </>
  );
}
