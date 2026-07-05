import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { listTiradas } from "@/db/queries/tiradas";
import { listComidas } from "@/db/queries/comidas";
import { TiradaCard } from "@/components/tirada-card";
import { ComidaCard } from "@/components/comida-card";
import { Portada } from "@/components/portada";
import { SeccionTitulo } from "@/components/ui";

type Tiradas = Awaited<ReturnType<typeof listTiradas>>;
type Comidas = Awaited<ReturnType<typeof listComidas>>;
type Evento =
  | { kind: "tirada"; date: string; startTime: string | null; data: Tiradas[number] }
  | { kind: "comida"; date: string; startTime: string | null; data: Comidas[number] };

export const dynamic = "force-dynamic";

/** "Ahora" en hora de España (YYYY-MM-DD HH:MM), para saber qué es futuro. */
function ahoraMadrid(): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}

const clave = (e: Evento) => `${e.date} ${e.startTime ?? "23:59"}`;

export default async function HomePage() {
  const { profile } = await requireUser();
  const [tiradas, comidas] = await Promise.all([listTiradas(), listComidas()]);

  const eventos: Evento[] = [
    ...tiradas.map(
      (t): Evento => ({ kind: "tirada", date: t.date, startTime: t.startTime, data: t }),
    ),
    ...comidas.map(
      (c): Evento => ({ kind: "comida", date: c.date, startTime: c.startTime, data: c }),
    ),
  ];

  // Solo eventos futuros (por hora de inicio; sin hora, hasta el fin del día).
  const now = ahoraMadrid();
  const proximas = eventos
    .filter((e) => clave(e) >= now)
    .sort((a, b) => clave(a).localeCompare(clave(b)));

  return (
    <>
      <div style={{ textAlign: "center", margin: "0.5rem 0 1rem" }}>
        <h1
          className="titulo-app"
          style={{ margin: 0, fontSize: "2.6rem" }}
        >
          JA TEAM SCORING
        </h1>
        <Portada />
      </div>

      <div style={{ margin: "0.5rem 0 0.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
          Hola, {profile.nickname || profile.displayName} 👋
        </h2>
        <p style={{ margin: "0.25rem 0 0", color: "var(--texto-suave)" }}>
          Apunta tu tirada o consulta el ranking del grupo.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.6rem",
          margin: "1rem 0",
        }}
      >
        <Link href="/tiradas/nueva" className="btn btn-primario btn-bloque">
          + Nueva tirada
        </Link>
        <Link href="/tiradas" className="btn btn-bloque">
          Ver tiradas
        </Link>
      </div>

      <SeccionTitulo
        extra={
          <Link
            href="/calendario"
            style={{ color: "var(--acento)", fontSize: "0.9rem" }}
          >
            Calendario
          </Link>
        }
      >
        Próximos eventos
      </SeccionTitulo>

      {proximas.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>
          No hay eventos próximos.
        </p>
      ) : (
        proximas.map((e) =>
          e.kind === "tirada" ? (
            <TiradaCard key={`t-${e.data.id}`} {...e.data} />
          ) : (
            <ComidaCard key={`c-${e.data.id}`} {...e.data} />
          ),
        )
      )}
    </>
  );
}
