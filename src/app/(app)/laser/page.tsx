import { requireUser } from "@/auth/helpers";
import { LaserTrainer } from "@/components/laser-trainer";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LaserPage() {
  await requireUser();

  return (
    <>
      <SeccionTitulo grande>Modo láser (beta)</SeccionTitulo>
      <LaserTrainer />
    </>
  );
}
