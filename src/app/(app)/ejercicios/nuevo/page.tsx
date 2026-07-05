import { requireAdmin } from "@/auth/helpers";
import { ExerciseForm } from "@/components/exercise-form";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NuevoEjercicioPage() {
  await requireAdmin();
  return (
    <>
      <SeccionTitulo>Nuevo ejercicio</SeccionTitulo>
      <ExerciseForm />
    </>
  );
}
