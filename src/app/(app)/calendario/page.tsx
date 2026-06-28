import { requireUser } from "@/auth/helpers";
import { listTiradas } from "@/db/queries/tiradas";
import { TiradaCard } from "@/components/tirada-card";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  await requireUser();
  const todas = await listTiradas();
  const hoy = new Date().toISOString().slice(0, 10);

  // Próximas: hoy o futuro, ascendente. Pasadas: ayer o antes, descendente.
  const proximas = todas
    .filter((t) => t.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pasadas = todas
    .filter((t) => t.date < hoy)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <SeccionTitulo>Calendario</SeccionTitulo>

      <SeccionTitulo>Próximas</SeccionTitulo>
      {proximas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>No hay tiradas próximas.</p>
      ) : (
        proximas.map((t) => <TiradaCard key={t.id} {...t} />)
      )}

      <SeccionTitulo>Pasadas</SeccionTitulo>
      {pasadas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>No hay tiradas pasadas.</p>
      ) : (
        pasadas.map((t) => <TiradaCard key={t.id} {...t} />)
      )}
    </>
  );
}
