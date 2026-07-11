"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, SeccionTitulo, TipoChip } from "@/components/ui";
import { DianaMini } from "@/components/diana-mini";
import { MiniGrafica, RepartoBarras } from "@/components/mini-grafica";
import { RangoFechas, diaTs } from "@/components/rango-fechas";
import { formatPunt } from "@/lib/scoring";
import { mm } from "@/lib/diana";
import {
  agregarTiradas,
  agruparEntrenamientosPorTipo,
  agregarTipo,
  seriesDelModo,
  agregarEjercicios,
  rumbo,
  type GrupoTipo,
  type ModoDatos,
  type SerieTipo,
} from "@/lib/resultados";
import type { HojaResultado, SerieResultado } from "@/db/queries/resultados";

type Ejercicio = { id: string; code: string; title: string };
type Vista = "entrenamientos" | "tiradas";

export function ResultadosView({
  hojas,
  series,
  ejercicios,
}: {
  hojas: HojaResultado[];
  series: SerieResultado[];
  ejercicios: Ejercicio[];
}) {
  const [vista, setVista] = useState<Vista>("entrenamientos");

  // Límites del slider = rango de fechas de todas las hojas.
  const { min, max } = useMemo(() => {
    if (hojas.length === 0) return { min: 0, max: 0 };
    const ts = hojas.map((h) => diaTs(h.date));
    return { min: Math.min(...ts), max: Math.max(...ts) };
  }, [hojas]);

  const [desde, setDesde] = useState(min);
  const [hasta, setHasta] = useState(max);

  const ejMap = useMemo(() => new Map(ejercicios.map((e) => [e.id, e])), [ejercicios]);

  // Hojas y series dentro del rango de fechas seleccionado.
  const hojasRango = useMemo(
    () => hojas.filter((h) => diaTs(h.date) >= desde && diaTs(h.date) <= hasta),
    [hojas, desde, hasta],
  );
  const idsRango = useMemo(() => new Set(hojasRango.map((h) => h.scorecardId)), [hojasRango]);
  const seriesRango = useMemo(
    () => series.filter((s) => idsRango.has(s.scorecardId)),
    [series, idsRango],
  );

  const marcas = useMemo(() => agregarTiradas(hojasRango), [hojasRango]);
  const grupos = useMemo(
    () => agruparEntrenamientosPorTipo(hojasRango, seriesRango),
    [hojasRango, seriesRango],
  );
  const ejPract = useMemo(() => agregarEjercicios(seriesRango), [seriesRango]);

  const tiradas = hojasRango.filter((h) => h.type !== "entrenamiento");
  const entrenos = hojasRango.filter((h) => h.type === "entrenamiento");

  if (hojas.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Aún no te has apuntado a nada.{" "}
        <Link href="/tiradas" style={{ color: "var(--acento)" }}>
          Ver tiradas
        </Link>
      </p>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "0.6rem",
          background: "var(--superficie-2)",
          padding: 4,
          borderRadius: 10,
        }}
      >
        <Pestana activa={vista === "entrenamientos"} onClick={() => setVista("entrenamientos")}>
          Entrenamientos
        </Pestana>
        <Pestana activa={vista === "tiradas"} onClick={() => setVista("tiradas")}>
          Tiradas
        </Pestana>
      </div>

      <RangoFechas
        min={min}
        max={max}
        desde={desde}
        hasta={hasta}
        onChange={(d, h) => {
          setDesde(d);
          setHasta(h);
        }}
      />

      <Fuentes
        titulo={vista === "entrenamientos" ? "entrenamientos" : "tiradas"}
        hojas={vista === "entrenamientos" ? entrenos : tiradas}
      />

      {vista === "tiradas" ? (
        <VistaTiradas marcas={marcas} tiradas={tiradas} />
      ) : (
        <VistaEntrenamientos grupos={grupos} ejPract={ejPract} ejMap={ejMap} entrenos={entrenos} />
      )}
    </>
  );
}

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "center",
        padding: "0.45rem 0.5rem",
        borderRadius: 7,
        fontSize: "0.9rem",
        fontWeight: 700,
        border: "none",
        cursor: "pointer",
        color: activa ? "var(--fondo)" : "var(--texto)",
        background: activa ? "var(--acento)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

/** Lista desplegable de las sesiones que se están teniendo en cuenta. */
function Fuentes({ titulo, hojas }: { titulo: string; hojas: HojaResultado[] }) {
  return (
    <details style={{ marginBottom: "0.9rem" }}>
      <summary
        style={{
          cursor: "pointer",
          color: "var(--texto-suave)",
          fontSize: "0.82rem",
          padding: "0.2rem 0",
        }}
      >
        Fuentes: {hojas.length} {titulo} en el rango
      </summary>
      {hojas.length > 0 ? (
        <div style={{ display: "grid", gap: 4, marginTop: "0.4rem" }}>
          {hojas.map((h) => (
            <Link
              key={h.scorecardId}
              href={`/tiradas/${h.tiradaId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.82rem",
                color: "var(--texto)",
              }}
            >
              <span style={{ color: "var(--texto-suave)", minWidth: 88 }}>{h.date}</span>
              <span style={{ flex: 1 }}>{h.modalityName}</span>
              <TipoChip tipo={h.type} corto />
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", marginTop: "0.4rem" }}>
          No hay {titulo} en este rango de fechas.
        </p>
      )}
    </details>
  );
}

// --- Tiradas ----------------------------------------------------------------

function VistaTiradas({
  marcas,
  tiradas,
}: {
  marcas: ReturnType<typeof agregarTiradas>;
  tiradas: HojaResultado[];
}) {
  if (tiradas.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        No hay tiradas oficiales ni amistosas en el rango seleccionado.
      </p>
    );
  }
  return (
    <>
      {marcas.length > 0 && (
        <>
          <SeccionTitulo>Marcas por modalidad</SeccionTitulo>
          {marcas.map((m) => (
            <Card key={m.modalityName} style={{ marginBottom: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{m.modalityName}</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  {m.nHojas} {m.nHojas === 1 ? "tirada" : "tiradas"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                <Dato etiqueta="Mejor" valor={formatPunt(m.mejor, m.allowsDecimals)} grande />
                <Dato etiqueta="Media" valor={formatPunt(m.mediaMarca, m.allowsDecimals)} />
                <Dato etiqueta="Mejor X" valor={String(m.mejorX)} />
              </div>
              {m.progresion.length >= 2 && (
                <div style={{ marginTop: "0.6rem" }}>
                  <MiniGrafica valores={m.progresion.map((p) => p.total)} />
                </div>
              )}
            </Card>
          ))}
        </>
      )}

      <SeccionTitulo>Historial</SeccionTitulo>
      <Card>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Modalidad</th>
              <th className="num">Total</th>
              <th className="num">X</th>
            </tr>
          </thead>
          <tbody>
            {tiradas.map((h) => (
              <tr key={h.scorecardId}>
                <td>
                  <Link href={`/tiradas/${h.tiradaId}`} style={{ color: "var(--acento)" }}>
                    {h.date}
                  </Link>
                  <div style={{ marginTop: 2 }}>
                    <TipoChip tipo={h.type} corto />
                  </div>
                </td>
                <td>{h.modalityName}</td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {formatPunt(h.total, h.allowsDecimals)}
                  {h.status !== "finalizada" ? (
                    <div style={{ fontSize: "0.7rem", color: "var(--texto-suave)", fontWeight: 400 }}>
                      en curso
                    </div>
                  ) : null}
                </td>
                <td className="num">{h.innerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// --- Entrenamientos ---------------------------------------------------------

function VistaEntrenamientos({
  grupos,
  ejPract,
  ejMap,
  entrenos,
}: {
  grupos: GrupoTipo[];
  ejPract: ReturnType<typeof agregarEjercicios>;
  ejMap: Map<string, Ejercicio>;
  entrenos: HojaResultado[];
}) {
  const [verEntrenos, setVerEntrenos] = useState(false);
  if (entrenos.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        No hay entrenamientos en el rango seleccionado.
      </p>
    );
  }
  if (grupos.length === 0 && ejPract.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Los entrenamientos del rango no tienen series con datos suficientes para el análisis.
      </p>
    );
  }
  return (
    <>
      {grupos.length > 0 && <SeccionTitulo>Series realizadas</SeccionTitulo>}
      {grupos.map((g) => (
        <BloqueTipo key={g.tipo} grupo={g} />
      ))}

      {ejPract.length > 0 && (
        <>
          <SeccionTitulo extra={<EnlaceToggle texto="Ver entrenamientos" onClick={() => setVerEntrenos((v) => !v)} abierto={verEntrenos} />}>
            Ejercicios practicados
          </SeccionTitulo>
          {verEntrenos && <ListaHojas hojas={entrenos} />}
          <Card>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th className="num">Veces</th>
                  <th className="num">Valoración</th>
                </tr>
              </thead>
              <tbody>
                {ejPract.map((e) => {
                  const ej = ejMap.get(e.exerciseId);
                  return (
                    <tr key={e.exerciseId}>
                      <td>{ej ? `${ej.code} · ${ej.title}` : "Ejercicio"}</td>
                      <td className="num">{e.total}</td>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>
                        {e.verde ? `🟢${e.verde} ` : ""}
                        {e.amarillo ? `🟡${e.amarillo} ` : ""}
                        {e.rojo ? `🔴${e.rojo}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}

const MODOS: { modo: ModoDatos; label: string }[] = [
  { modo: "todos", label: "Todos los puntos" },
  { modo: "tiroatiro", label: "Tiro a tiro" },
  { modo: "diana", label: "Diana con impactos" },
];

function BloqueTipo({ grupo }: { grupo: GrupoTipo }) {
  const [modo, setModo] = useState<ModoDatos>("todos");
  const [verApuntes, setVerApuntes] = useState(false);
  const a = useMemo(() => agregarTipo(grupo.series, modo), [grupo.series, modo]);
  const sub = useMemo(() => seriesDelModo(grupo.series, modo), [grupo.series, modo]);

  return (
    <Card style={{ marginBottom: "0.7rem" }}>
      <span className="seccion-titulo" style={{ fontSize: "1.05rem" }}>
        {grupo.label}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          margin: "0.5rem 0 0.1rem",
        }}
      >
        {MODOS.map((m) => (
          <button
            key={m.modo}
            type="button"
            onClick={() => setModo(m.modo)}
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "0.22rem 0.55rem",
              borderRadius: 999,
              cursor: "pointer",
              border: "1px solid var(--borde)",
              color: modo === m.modo ? "var(--fondo)" : "var(--texto-suave)",
              background: modo === m.modo ? "var(--acento)" : "transparent",
            }}
          >
            {m.label}
          </button>
        ))}
        <EnlaceToggle texto="Ver apuntes" onClick={() => setVerApuntes((v) => !v)} abierto={verApuntes} />
      </div>

      {verApuntes && <ListaApuntes series={sub} />}

      <div style={{ fontSize: "0.8rem", color: "var(--texto-suave)", marginTop: "0.35rem" }}>
        {a.nSeries} series · {a.nTiros} tiros
      </div>

      {a.nSeries === 0 ? (
        <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
          No hay series de este tipo con esos datos en el rango.
        </p>
      ) : (
        <>
      <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        {a.mediaPorTiro != null && <Dato etiqueta="Media/tiro" valor={a.mediaPorTiro.toFixed(2)} grande />}
        {a.desviacion != null && <Dato etiqueta="Desviación" valor={`±${a.desviacion.toFixed(2)}`} />}
        {a.mejorSerie != null && a.peorSerie != null && (
          <Dato etiqueta="Serie (mín–máx)" valor={`${a.peorSerie.toFixed(2)}–${a.mejorSerie.toFixed(2)}`} />
        )}
      </div>

      {a.conValores && (
        <div style={{ marginTop: "0.6rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)", marginBottom: 2 }}>
            Reparto de valores
          </div>
          <RepartoBarras reparto={a.reparto} />
        </div>
      )}

      {a.conImpactos && (
        <div style={{ marginTop: "0.8rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)", marginBottom: "0.3rem" }}>
            Agrupación acumulada ({a.impactos.length} impactos)
          </div>
          <DianaMini impactos={a.impactos} />
          <div
            style={{
              display: "flex",
              gap: "1.1rem",
              flexWrap: "wrap",
              marginTop: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--texto-suave)",
            }}
          >
            {a.agrupacionMedia != null && <Dato etiqueta="Agrupación media" valor={`${mm(a.agrupacionMedia)} mm`} />}
            {a.dispersionMedia != null && <Dato etiqueta="Dispersión media" valor={`${mm(a.dispersionMedia)} mm`} />}
            {a.derivaMag != null && a.derivaX != null && a.derivaY != null && (
              <Dato
                etiqueta="Deriva"
                valor={a.derivaMag < 3 ? "centrada" : `${mm(a.derivaMag)} mm ${rumbo(a.derivaX, a.derivaY)}`}
              />
            )}
          </div>
        </div>
      )}

      {a.progresion.length >= 2 && (
        <div style={{ marginTop: "0.7rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)", marginBottom: 2 }}>
            Progresión (media/tiro por sesión)
          </div>
          <MiniGrafica valores={a.progresion.map((p) => p.media)} color="var(--verde)" />
        </div>
      )}
        </>
      )}
    </Card>
  );
}

/** Enlace tipo botón para desplegar/ocultar una lista. */
function EnlaceToggle({
  texto,
  onClick,
  abierto,
}: {
  texto: string;
  onClick: () => void;
  abierto: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginLeft: "auto",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--acento)",
        fontSize: "0.78rem",
        fontWeight: 700,
        padding: "0.22rem 0",
      }}
    >
      {texto} {abierto ? "▲" : "▼"}
    </button>
  );
}

/** Lista de sesiones (entrenamientos/tiradas) que enlaza a cada tirada. */
function ListaHojas({ hojas }: { hojas: HojaResultado[] }) {
  if (hojas.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", margin: "0.2rem 0 0.6rem" }}>
        No hay sesiones en el rango.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 4, margin: "0.2rem 0 0.7rem" }}>
      {hojas.map((h) => (
        <Link
          key={h.scorecardId}
          href={`/tiradas/${h.tiradaId}`}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "var(--texto)" }}
        >
          <span style={{ color: "var(--texto-suave)", minWidth: 88 }}>{h.date}</span>
          <span style={{ flex: 1 }}>{h.modalityName}</span>
          <TipoChip tipo={h.type} corto />
        </Link>
      ))}
    </div>
  );
}

/** Lista de apuntes (series) que cumplen el filtro, enlazando a su tirada. */
function ListaApuntes({ series }: { series: SerieTipo[] }) {
  if (series.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", margin: "0.2rem 0 0.4rem" }}>
        No hay apuntes que cumplan el filtro.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 4, margin: "0.2rem 0 0.5rem" }}>
      {series.map((s, i) => {
        const tiros = s.shotCount || s.valores.length;
        const medio = tiros > 0 ? (s.subtotal / tiros).toFixed(2) : "–";
        return (
          <Link
            key={`${s.tiradaId}-${s.idx}-${i}`}
            href={`/tiradas/${s.tiradaId}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "var(--texto)" }}
          >
            <span style={{ color: "var(--texto-suave)", minWidth: 88 }}>{s.date}</span>
            <span style={{ flex: 1 }}>
              Serie {s.idx} · {tiros} tiros
              {s.tieneImpactos ? " · 🎯" : ""}
              {s.distancia === "reducida" ? " · 7 m" : ""}
            </span>
            <span style={{ fontWeight: 700 }}>{s.subtotal}</span>
            <span style={{ color: "var(--texto-suave)" }}>({medio})</span>
          </Link>
        );
      })}
    </div>
  );
}

function Dato({ etiqueta, valor, grande }: { etiqueta: string; valor: string; grande?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "0.72rem", color: "var(--texto-suave)" }}>{etiqueta}</div>
      <div style={{ fontWeight: 700, fontSize: grande ? "1.25rem" : "1rem", color: "var(--texto)" }}>
        {valor}
      </div>
    </div>
  );
}
