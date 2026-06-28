import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { listTiradas } from "@/db/queries/tiradas";
import { listComidas } from "@/db/queries/comidas";
import { TiradaCard } from "@/components/tirada-card";
import { ComidaCard } from "@/components/comida-card";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

type Tiradas = Awaited<ReturnType<typeof listTiradas>>;
type Comidas = Awaited<ReturnType<typeof listComidas>>;

type Item =
  | { kind: "tirada"; date: string; startTime: string | null; data: Tiradas[number] }
  | { kind: "comida"; date: string; startTime: string | null; data: Comidas[number] };

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function clave(it: Item): string {
  return `${it.date} ${it.startTime ?? "99:99"}`;
}

type SearchParams = Promise<{ vista?: string; mes?: string }>;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();
  const sp = await searchParams;
  const vista = sp.vista === "mes" ? "mes" : "lista";

  const [tiradas, comidas] = await Promise.all([listTiradas(), listComidas()]);
  const items: Item[] = [
    ...tiradas.map(
      (t): Item => ({ kind: "tirada", date: t.date, startTime: t.startTime, data: t }),
    ),
    ...comidas.map(
      (c): Item => ({ kind: "comida", date: c.date, startTime: c.startTime, data: c }),
    ),
  ];

  const hoyStr = ymd(new Date());

  return (
    <>
      <SeccionTitulo
        extra={
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Link
              href="/calendario?vista=lista"
              className="btn"
              style={{
                fontSize: "0.85rem",
                ...(vista === "lista"
                  ? { background: "var(--acento-fuerte)", color: "#1a1205" }
                  : null),
              }}
            >
              Lista
            </Link>
            <Link
              href="/calendario?vista=mes"
              className="btn"
              style={{
                fontSize: "0.85rem",
                ...(vista === "mes"
                  ? { background: "var(--acento-fuerte)", color: "#1a1205" }
                  : null),
              }}
            >
              Calendario
            </Link>
          </div>
        }
      >
        Calendario
      </SeccionTitulo>

      <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: "0 0 0.7rem" }}>
        Tiradas (ámbar) y comidas (azul).
      </p>

      {vista === "mes" ? (
        <VistaMes items={items} mesParam={sp.mes} hoyStr={hoyStr} />
      ) : (
        <VistaLista items={items} hoyStr={hoyStr} />
      )}
    </>
  );
}

function VistaLista({ items, hoyStr }: { items: Item[]; hoyStr: string }) {
  const render = (it: Item) =>
    it.kind === "tirada" ? (
      <TiradaCard key={`t-${it.data.id}`} {...it.data} />
    ) : (
      <ComidaCard key={`c-${it.data.id}`} {...it.data} />
    );

  const proximas = items
    .filter((it) => it.date >= hoyStr)
    .sort((a, b) => clave(a).localeCompare(clave(b)));
  const pasadas = items
    .filter((it) => it.date < hoyStr)
    .sort((a, b) => clave(b).localeCompare(clave(a)));

  return (
    <>
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

function VistaMes({
  items,
  mesParam,
  hoyStr,
}: {
  items: Item[];
  mesParam?: string;
  hoyStr: string;
}) {
  const mes =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : hoyStr.slice(0, 7);
  const [yy, mm] = mes.split("-").map(Number);

  // Eventos por fecha.
  const porFecha = new Map<
    string,
    { id: string; kind: "tirada" | "comida"; label: string }[]
  >();
  for (const it of items) {
    const label =
      it.kind === "tirada"
        ? it.data.modalityName
        : it.data.name || "Comida";
    const arr = porFecha.get(it.date) ?? [];
    arr.push({ id: it.data.id, kind: it.kind, label });
    porFecha.set(it.date, arr);
  }

  // Construye las celdas (lunes primero) del mes.
  const primero = new Date(Date.UTC(yy, mm - 1, 1));
  const offset = (primero.getUTCDay() + 6) % 7; // 0 = lunes
  const diasMes = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const semanas = Math.ceil((offset + diasMes) / 7);
  const celdas = Array.from({ length: semanas * 7 }, (_, i) => {
    const d = new Date(Date.UTC(yy, mm - 1, 1 - offset + i));
    const ds = ymd(d);
    return {
      ds,
      dia: d.getUTCDate(),
      enMes: d.getUTCMonth() === mm - 1,
      hoy: ds === hoyStr,
      semana: Math.floor(i / 7),
    };
  });
  const semanaActual =
    celdas.find((c) => c.ds === hoyStr)?.semana ?? -1;

  // Navegación de meses.
  const prev = new Date(Date.UTC(yy, mm - 2, 1));
  const next = new Date(Date.UTC(yy, mm, 1));
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "0.2rem 0 0.6rem",
        }}
      >
        <Link href={`/calendario?vista=mes&mes=${fmt(prev)}`} className="btn" style={{ fontSize: "0.85rem" }}>
          ‹
        </Link>
        <strong style={{ textTransform: "capitalize" }}>
          {MESES[mm - 1]} {yy}
        </strong>
        <Link href={`/calendario?vista=mes&mes=${fmt(next)}`} className="btn" style={{ fontSize: "0.85rem" }}>
          ›
        </Link>
      </div>

      <div className="cal-grid" style={{ marginBottom: "4px" }}>
        {DIAS.map((d) => (
          <div key={d} className="cal-head">
            {d}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {celdas.map((c) => {
          const eventos = porFecha.get(c.ds) ?? [];
          const clases = [
            "cal-cell",
            c.enMes ? "" : "cal-dia-otro",
            c.semana === semanaActual ? "cal-cell-actual" : "",
            c.hoy ? "cal-hoy" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={c.ds} className={clases}>
              <span className="dia">{c.dia}</span>
              {eventos.slice(0, 3).map((e) => (
                <Link
                  key={`${e.kind}-${e.id}`}
                  href={`/${e.kind === "tirada" ? "tiradas" : "comidas"}/${e.id}`}
                  className={`cal-pill ${e.kind === "tirada" ? "cal-pill-tirada" : "cal-pill-comida"}`}
                  title={e.label}
                >
                  {e.label}
                </Link>
              ))}
              {eventos.length > 3 ? (
                <span className="cal-mas">+{eventos.length - 3} más</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
