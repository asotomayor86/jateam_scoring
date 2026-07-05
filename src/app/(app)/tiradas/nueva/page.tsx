import { requireUser } from "@/auth/helpers";
import { getModalidades, getClubs } from "@/db/queries/catalog";
import { CreateTiradaForm } from "@/components/create-tirada-form";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NuevaTiradaPage() {
  const { profile } = await requireUser();
  const [modalidades, clubs] = await Promise.all([
    getModalidades(),
    getClubs(),
  ]);

  // Fecha de hoy (servidor) como valor por defecto del formulario.
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <SeccionTitulo grande>Nueva tirada</SeccionTitulo>
      <p
        style={{
          color: "var(--texto-suave)",
          fontSize: "0.9rem",
          margin: "0 0 1rem",
        }}
      >
        El identificador de la tirada se genera solo a partir de fecha, modalidad,
        club y tipo, para que todas tengan la misma estructura.
      </p>
      <CreateTiradaForm
        modalidades={modalidades.map((m) => ({ id: m.id, name: m.name }))}
        clubs={clubs.map((c) => ({ id: c.id, name: c.name }))}
        hoy={hoy}
        puedeGestionarCampos={profile.isAdmin}
      />
    </>
  );
}
