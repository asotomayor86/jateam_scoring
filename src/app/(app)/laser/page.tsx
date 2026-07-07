import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { LaserTrainer } from "@/components/laser-trainer";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LaserPage() {
  const { profile } = await requireUser();
  if (!profile.isAdmin) notFound();

  return (
    <>
      <SeccionTitulo grande>Modo láser (beta)</SeccionTitulo>
      <LaserTrainer />
    </>
  );
}
