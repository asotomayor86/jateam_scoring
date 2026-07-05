import { requireUser } from "@/auth/helpers";
import { getRestaurantesConUso } from "@/db/queries/catalog";
import { RestaurantsManager } from "@/components/restaurants-manager";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RestaurantesPage() {
  await requireUser();
  const restaurantes = await getRestaurantesConUso();

  return (
    <>
      <SeccionTitulo grande>Restaurantes</SeccionTitulo>
      <p
        style={{
          color: "var(--texto-suave)",
          fontSize: "0.9rem",
          margin: "0 0 1rem",
        }}
      >
        Cualquiera puede añadir o editar restaurantes (con su enlace de Google
        Maps). Solo se pueden borrar los que no tengan comidas.
      </p>
      <RestaurantsManager restaurantes={restaurantes} />
    </>
  );
}
