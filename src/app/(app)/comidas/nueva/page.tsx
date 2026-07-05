import { requireUser } from "@/auth/helpers";
import { getRestaurantes } from "@/db/queries/catalog";
import { CreateComidaForm } from "@/components/create-comida-form";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NuevaComidaPage() {
  const { profile } = await requireUser();
  const restaurantes = await getRestaurantes();
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <SeccionTitulo grande>Nueva comida</SeccionTitulo>
      <CreateComidaForm
        restaurantes={restaurantes.map((r) => ({ id: r.id, name: r.name }))}
        hoy={hoy}
        puedeGestionarRestaurantes={profile.isAdmin}
      />
    </>
  );
}
