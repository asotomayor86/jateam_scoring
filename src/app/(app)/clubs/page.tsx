import { requireUser } from "@/auth/helpers";
import { getClubsConUso } from "@/db/queries/catalog";
import { ClubsManager } from "@/components/clubs-manager";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const { profile } = await requireUser();
  const clubs = await getClubsConUso();

  return (
    <>
      <SeccionTitulo grande>Campos</SeccionTitulo>
      <p
        style={{
          color: "var(--texto-suave)",
          fontSize: "0.9rem",
          margin: "0 0 1rem",
        }}
      >
        {profile.isAdmin
          ? "Como encargado, puedes añadir o editar campos (con su enlace de Google Maps). Solo se pueden borrar los que no tengan tiradas."
          : "Listado de campos. Solo el encargado puede añadir o editar campos."}
      </p>
      <ClubsManager clubs={clubs} puedeGestionar={profile.isAdmin} />
    </>
  );
}
