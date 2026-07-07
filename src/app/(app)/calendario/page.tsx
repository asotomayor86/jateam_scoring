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

/** Categoría de un evento (para el color). */
function categoria(it: Item): "oficial" | "semioficial" | "entrenamiento" | "comida" {
  return it.kind === "comida" ? "comida" : it.data.type;
}

/** Clave fecha+hora; sin hora cuenta como fin del día (sigue "próxima" ese día). */
function clave(it: Item): string {
  return `${it.date} ${it.startTime ?? "23:59"}`;
}

function fechaLarga(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1]} de ${y}`;
}

/** "Ahora" en hora de España (independiente de la zona del servidor). */
function ahoraMadrid(): { fecha: string; completo: string } {
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
  const fecha = `${g("year")}-${g("month")}-${g("day")}`;
  return { fecha, completo: `${fecha} ${g("hour")}:${g("minute")}` };
}

type SearchParams = Promise<{ vista?: string; mes?: string; dia?: string }>;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { user } = await requireUser();
  const sp = await searchParams;
  const vista = sp.vista === "mes" ? "mes" : "lista";

  const [tiradas, comidas] = await Promise.all([
    listTiradas({}, user.id),
    listComidas(),
  ]);
  const items: Item[] = [
    ...tiradas.map(
      (t): Item => ({ kind: "tirada", date: t.date, startTime: t.startTime, data: t }),
    ),
    ...comidas.map(
      (c): Item => ({ kind: "comida", date: c.date, startTime: c.startTime, data: c }),
    ),
  ];

  const now = ahoraMadrid();

  return (
    <>
      <SeccionTitulo
        grande
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

      <div className="cal-leyenda">
        <span><i style={{ background: "rgba(239,90,111,0.9)" }} /> Oficial</span>
        <span><i style={{ background: "rgba(245,158,11,0.9)" }} /> Amistosa</span>
        <span><i style={{ background: "rgba(70,201,139,0.9)" }} /> Entrenamiento</span>
        <span><i style={{ background: "rgba(56,132,255,0.9)" }} /> Comida</span>
      </div>

      {vista === "mes" ? (
        <VistaMes items={items} mesParam={sp.mes} hoyStr={now.fecha} />
      ) : (
        <VistaLista items={items} now={now} dia={sp.dia} />
      )}
    </>
  );
}

function VistaLista({
  items,
  now,
  dia,
}: {
  items: Item[];
  now: { fecha: string; completo: string };
  dia?: string;
}) {
  const render = (it: Item) =>
    it.kind === "tirada" ? (
      <TiradaCard key={`t-${it.data.id}`} {...it.data} />
    ) : (
      <ComidaCard key={`c-${it.data.id}`} {...it.data} />
    );

  // Lista filtrada a un único día (al pulsar un día del calendario).
  if (dia) {
    const delDia = items
      .filter((it) => it.date === dia)
      .sort((a, b) => clave(a).localeCompare(clave(b)));
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            margin: "0.5rem 0",
          }}
        >
          <strong>{fechaLarga(dia)}</strong>
          <Link
            href={`/calendario?vista=mes&mes=${dia.slice(0, 7)}`}
            style={{ color: "var(--acento)", fontSize: "0.9rem" }}
          >
            ← Mes
          </Link>
        </div>
        {delDia.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>No hay eventos este día.</p>
        ) : (
          delDia.map(render)
        )}
      </>
    );
  }

  // Pasado = la hora de inicio ya pasó (sin hora, cuenta hasta fin del día).
  const proximas = items
    .filter((it) => clave(it) >= now.completo)
    .sort((a, b) => clave(a).localeCompare(clave(b)));
  const pasadas = items
    .filter((it) => clave(it) < now.completo)
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

  // Eventos por fecha, con su categoría (color).
  const porFecha = new Map<
    string,
    { id: string; kind: "tirada" | "comida"; cat: string; label: string }[]
  >();
  for (const it of items) {
    const label = it.kind === "tirada" ? it.data.modalityName : it.data.name || "Comida";
    const arr = porFecha.get(it.date) ?? [];
    arr.push({ id: it.data.id, kind: it.kind, cat: categoria(it), label });
    porFecha.set(it.date, arr);
  }

  const primero = new Date(Date.UTC(yy, mm - 1, 1));
  const offset = (primero.getUTCDay() + 6) % 7; // 0 = lunes
  const diasMes = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const semanas = Math.ceil((offset + diasMes) / 7);
  const celdas = Array.from({ length: semanas * 7 }, (_, i) => {
    const d = new Date(Date.UTC(yy, mm - 1, 1 - offset + i));
    const ds = d.toISOString().slice(0, 10);
    return {
      ds,
      dia: d.getUTCDate(),
      enMes: d.getUTCMonth() === mm - 1,
      hoy: ds === hoyStr,
      semana: Math.floor(i / 7),
    };
  });
  const semanaActual = celdas.find((c) => c.ds === hoyStr)?.semana ?? -1;

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
            <Link
              key={c.ds}
              href={`/calendario?vista=lista&dia=${c.ds}`}
              className={clases}
              style={{ color: "inherit" }}
            >
              <span className="dia">{c.dia}</span>
              {eventos.slice(0, 3).map((e, j) => (
                <span key={j} className={`cal-pill cal-pill-${e.cat}`} title={e.label}>
                  {e.label}
                </span>
              ))}
              {eventos.length > 3 ? (
                <span className="cal-mas">+{eventos.length - 3} más</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </>
  );
}
