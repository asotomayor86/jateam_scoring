import { requireUser } from "@/auth/helpers";
import { listTiradas } from "@/db/queries/tiradas";
import { listComidas } from "@/db/queries/comidas";
import { TiradaCard } from "@/components/tirada-card";
import { ComidaCard } from "@/components/comida-card";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

type ItemTirada = {
  kind: "tirada";
  date: string;
  startTime: string | null;
  data: Awaited<ReturnType<typeof listTiradas>>[number];
};
type ItemComida = {
  kind: "comida";
  date: string;
  startTime: string | null;
  data: Awaited<ReturnType<typeof listComidas>>[number];
};
type Item = ItemTirada | ItemComida;

/** Clave de orden: fecha + hora (las sin hora van al final del día). */
function clave(it: Item): string {
  return `${it.date} ${it.startTime ?? "99:99"}`;
}

function render(it: Item) {
  return it.kind === "tirada" ? (
    <TiradaCard key={`t-${it.data.id}`} {...it.data} />
  ) : (
    <ComidaCard key={`c-${it.data.id}`} {...it.data} />
  );
}

export default async function CalendarioPage() {
  await requireUser();
  const [tiradas, comidas] = await Promise.all([listTiradas(), listComidas()]);
  const hoy = new Date().toISOString().slice(0, 10);

  const items: Item[] = [
    ...tiradas.map(
      (t): Item => ({ kind: "tirada", date: t.date, startTime: t.startTime, data: t }),
    ),
    ...comidas.map(
      (c): Item => ({ kind: "comida", date: c.date, startTime: c.startTime, data: c }),
    ),
  ];

  const proximas = items
    .filter((it) => it.date >= hoy)
    .sort((a, b) => clave(a).localeCompare(clave(b)));
  const pasadas = items
    .filter((it) => it.date < hoy)
    .sort((a, b) => clave(b).localeCompare(clave(a)));

  return (
    <>
      <SeccionTitulo>Calendario</SeccionTitulo>
      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
        Tiradas y comidas. Las <strong>comidas</strong> se muestran con fondo azul.
      </p>

      <SeccionTitulo>Próximas</SeccionTitulo>
      {proximas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>No hay eventos próximos.</p>
      ) : (
        proximas.map(render)
      )}

      <SeccionTitulo>Pasadas</SeccionTitulo>
      {pasadas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>No hay eventos pasados.</p>
      ) : (
        pasadas.map(render)
      )}
    </>
  );
}
