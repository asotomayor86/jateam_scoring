import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getResultados } from "@/db/queries/resultados";
import { getEjercicios } from "@/db/queries/exercises";
import { Card, SeccionTitulo, TipoChip } from "@/components/ui";
import { DianaMini } from "@/components/diana-mini";
import { MiniGrafica, RepartoBarras } from "@/components/mini-grafica";
import { formatPunt } from "@/lib/scoring";
import { mm } from "@/lib/diana";
import {
  agregarTiradas,
  agregarEntrenamientos,
  agregarEjercicios,
  rumbo,
  type AggTipo,
  type MarcaModalidad,
  type EjercicioPracticado,
} from "@/lib/resultados";
import type { HojaResultado } from "@/db/queries/resultados";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ vista?: string }>;

export default async function YoPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, profile } = await requireUser();
  const [{ hojas, series }, ejercicios] = await Promise.all([
    getResultados(user.id),
    getEjercicios(),
  ]);
  const sp = await searchParams;
  const vista = sp.vista === "tiradas" ? "tiradas" : "entrenamientos";

  const marcas = agregarTiradas(hojas);
  const aggs = agregarEntrenamientos(hojas, series);
  const ejPract = agregarEjercicios(series);
  const ejMap = new Map(ejercicios.map((e) => [e.id, e]));

  const tiradas = hojas.filter((h) => h.type !== "entrenamiento");
  const entrenos = hojas.filter((h) => h.type === "entrenamiento");

  return (
    <>
      <SeccionTitulo grande>Mis resultados</SeccionTitulo>
      <p style={{ color: "var(--texto-suave)", margin: "0 0 0.7rem" }}>
        {profile.nickname || profile.displayName} · {tiradas.length} tiradas ·{" "}
        {entrenos.length} entrenamientos
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "0.9rem",
          background: "var(--superficie-2)",
          padding: 4,
          borderRadius: 10,
        }}
      >
        <Pestana activa={vista === "entrenamientos"} vista="entrenamientos" texto="Entrenamientos" />
        <Pestana activa={vista === "tiradas"} vista="tiradas" texto="Tiradas" />
      </div>

      {vista === "tiradas" ? (
        <VistaTiradas marcas={marcas} tiradas={tiradas} />
      ) : (
        <VistaEntrenamientos aggs={aggs} ejPract={ejPract} ejMap={ejMap} nEntrenos={entrenos.length} />
      )}
    </>
  );
}

function Pestana({ activa, vista, texto }: { activa: boolean; vista: string; texto: string }) {
  return (
    <Link
      href={`/yo?vista=${vista}`}
      style={{
        flex: 1,
        textAlign: "center",
        padding: "0.45rem 0.5rem",
        borderRadius: 7,
        fontSize: "0.9rem",
        fontWeight: 700,
        color: activa ? "var(--fondo)" : "var(--texto)",
        background: activa ? "var(--acento)" : "transparent",
      }}
    >
      {texto}
    </Link>
  );
}

// --- Tiradas oficiales / amistosas ------------------------------------------

function VistaTiradas({
  marcas,
  tiradas,
}: {
  marcas: MarcaModalidad[];
  tiradas: HojaResultado[];
}) {
  if (tiradas.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Aún no tienes tiradas oficiales ni amistosas.{" "}
        <Link href="/tiradas" style={{ color: "var(--acento)" }}>
          Ver tiradas
        </Link>
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
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
              >
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
  aggs,
  ejPract,
  ejMap,
  nEntrenos,
}: {
  aggs: AggTipo[];
  ejPract: EjercicioPracticado[];
  ejMap: Map<string, { code: string; title: string }>;
  nEntrenos: number;
}) {
  if (nEntrenos === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Aún no tienes entrenamientos.{" "}
        <Link href="/tiradas" style={{ color: "var(--acento)" }}>
          Ver tiradas
        </Link>
      </p>
    );
  }
  if (aggs.length === 0 && ejPract.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Tus entrenamientos aún no tienen series con datos suficientes para el análisis.
      </p>
    );
  }
  return (
    <>
      {aggs.map((a) => (
        <BloqueTipo key={a.tipo} a={a} />
      ))}

      {ejPract.length > 0 && (
        <>
          <SeccionTitulo>Ejercicios practicados</SeccionTitulo>
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

function BloqueTipo({ a }: { a: AggTipo }) {
  return (
    <Card style={{ marginBottom: "0.7rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: "1.05rem" }}>{a.label}</strong>
        <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
          {a.nSeries} series · {a.nTiros} tiros
        </span>
      </div>

      <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        {a.mediaPorTiro != null && (
          <Dato etiqueta="Media/tiro" valor={a.mediaPorTiro.toFixed(2)} grande />
        )}
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
            {a.agrupacionMedia != null && (
              <Dato etiqueta="Agrupación media" valor={`${mm(a.agrupacionMedia)} mm`} />
            )}
            {a.dispersionMedia != null && (
              <Dato etiqueta="Dispersión media" valor={`${mm(a.dispersionMedia)} mm`} />
            )}
            {a.derivaMag != null && a.derivaX != null && a.derivaY != null && (
              <Dato
                etiqueta="Deriva"
                valor={
                  a.derivaMag < 3 ? "centrada" : `${mm(a.derivaMag)} mm ${rumbo(a.derivaX, a.derivaY)}`
                }
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
    </Card>
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
