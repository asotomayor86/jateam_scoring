import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import {
  getTirada,
  getRanking,
  getMiScorecard,
  getTiradores,
} from "@/db/queries/tiradas";
import {
  apuntarme,
  borrarTirada,
  cerrarTirada,
  reabrirTirada,
} from "@/actions/tiradas";
import { borrarHoja, finalizarHoja } from "@/actions/scorecards";
import { RankingTable } from "@/components/ranking-table";
import { Card, SeccionTitulo, TipoChip } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { CopiarTiradores } from "@/components/copiar-tiradores";
import { formatPunt } from "@/lib/scoring";
import { etiquetaGranularidad } from "@/lib/granularidad";
import { CATEGORIAS } from "@/lib/categorias";

export const dynamic = "force-dynamic";

export default async function TiradaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await requireUser();
  const { id } = await params;

  const tirada = await getTirada(id);
  if (!tirada) notFound();

  const [ranking, miHoja, tiradores] = await Promise.all([
    getRanking(id),
    getMiScorecard(id, user.id),
    profile.isAdmin ? getTiradores(id) : Promise.resolve([]),
  ]);

  const soyCreador = tirada.createdBy === user.id;
  const puedeGestionarCierre = soyCreador || profile.isAdmin;
  const esModular = tirada.modalitySlug === "entrenamiento-modular";

  return (
    <>
      <SeccionTitulo>
        {tirada.modalityName}
        {tirada.caliber ? ` · ${tirada.caliber}` : ""}
      </SeccionTitulo>

      <Card
        style={{
          marginBottom: "1rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.6rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
        {tirada.name ? (
          <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>
            {tirada.name}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <TipoChip tipo={tirada.type} />
          {tirada.closed ? <span className="chip">Cerrada</span> : null}
          <span style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            {tirada.date}
            {tirada.startTime ? ` · ${tirada.startTime}` : ""} · {tirada.clubName}
          </span>
        </div>
        {tirada.clubMapsUrl ? (
          <a
            href={tirada.clubMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--acento)",
              fontSize: "0.85rem",
              display: "inline-block",
              marginTop: "0.3rem",
            }}
          >
            📍 Ver campo en Google Maps
          </a>
        ) : null}
        <div
          style={{
            color: "var(--texto-suave)",
            fontSize: "0.78rem",
            fontFamily: "ui-monospace, monospace",
            marginTop: "0.4rem",
          }}
        >
          {tirada.code}
        </div>
        <div
          style={{
            color: "var(--texto-suave)",
            fontSize: "0.85rem",
            marginTop: "0.4rem",
          }}
        >
          {tirada.modalityDistance} m · {tirada.totalShots} tiros ·{" "}
          {tirada.seriesCount} series de {tirada.defaultSeriesSize}
        </div>
        {tirada.notes ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
            {tirada.notes}
          </p>
        ) : null}
        </div>
        {profile.isAdmin ? <CopiarTiradores tiradores={tiradores} /> : null}
      </Card>

      {/* Acción del usuario: apuntarse o abrir su libreta. */}
      {miHoja ? (
        <Card style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
                Tu resultado{" "}
                {miHoja.status === "finalizada" ? "(finalizado)" : "(en curso)"}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                {formatPunt(miHoja.total, tirada.allowsDecimals)}
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--texto-suave)",
                    fontWeight: 400,
                  }}
                >
                  {" "}
                  · {miHoja.innerCount} X
                </span>
              </div>
            </div>
            <Link href={`/tiradas/${id}/libreta`} className="btn btn-primario">
              {miHoja.status === "finalizada" ? "Ver libreta" : "Abrir libreta"}
            </Link>
          </div>
          {miHoja.total > 0 ? (
            <p
              style={{
                marginTop: "0.7rem",
                fontSize: "0.8rem",
                color: "var(--texto-suave)",
              }}
            >
              Ya tienes puntos anotados: esta tirada queda registrada y no puedes
              desapuntarte.
            </p>
          ) : (
            <form action={borrarHoja} style={{ marginTop: "0.7rem" }}>
              <input type="hidden" name="scorecardId" value={miHoja.id} />
              <ConfirmButton
                message="¿Desapuntarte y borrar tu hoja de esta tirada?"
                className="btn"
                style={{ fontSize: "0.85rem", color: "var(--rojo)" }}
              >
                Desapuntarme
              </ConfirmButton>
            </form>
          )}
        </Card>
      ) : tirada.closed ? (
        <Card style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            🔒 Esta tirada está <strong>cerrada</strong>: no se admiten nuevos
            apuntes.
          </p>
        </Card>
      ) : (
        <Card style={{ marginBottom: "1rem" }}>
          <form
            action={apuntarme}
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            <input type="hidden" name="tiradaId" value={id} />
            {tirada.type === "oficial" ? (
              <>
                <label style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
                  ¿En qué categoría te apuntas?
                </label>
                <select
                  name="category"
                  required
                  defaultValue=""
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.7rem",
                    borderRadius: 8,
                    border: "1px solid var(--borde)",
                    background: "var(--superficie-2)",
                    color: "var(--texto)",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="" disabled>
                    Elige categoría…
                  </option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <label style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
              {esModular
                ? "¿Cómo quieres apuntar los módulos?"
                : "¿Cómo quieres apuntar esta tirada?"}
            </label>
            <select
              name="granularity"
              defaultValue={profile.defaultGranularity}
              style={{
                width: "100%",
                padding: "0.6rem 0.7rem",
                borderRadius: 8,
                border: "1px solid var(--borde)",
                background: "var(--superficie-2)",
                color: "var(--texto)",
                fontSize: "0.95rem",
              }}
            >
              <option value="tiro">Tiro a tiro</option>
              <option value="bloque5">Total de bloques de 5</option>
              <option value="bloque10">Total de bloques de 10</option>
              <option value="serie">Total por serie</option>
              <option value="asistido">Asistido competición</option>
            </select>
            <span style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
              {esModular
                ? "Cada módulo se apunta con este modo. "
                : "Es el modo inicial; podrás cambiarlo en cada serie. "}
              (Por defecto: {etiquetaGranularidad(profile.defaultGranularity)}).
            </span>
            <button type="submit" className="btn btn-primario btn-bloque">
              🎯 Apuntarme a esta tirada
            </button>
          </form>
        </Card>
      )}

      <SeccionTitulo>Ranking</SeccionTitulo>
      <Card>
        <RankingTable
          filas={ranking}
          allowsDecimals={tirada.allowsDecimals}
          currentUserId={user.id}
          mostrarCategoria={tirada.type === "oficial"}
        />
      </Card>

      {/* Encargado: cerrar hojas que alguien dejó sin finalizar. */}
      {profile.isAdmin && ranking.some((r) => r.status === "borrador") ? (
        <>
          <SeccionTitulo>Cerrar hojas (encargado)</SeccionTitulo>
          <Card>
            <table className="tabla">
              <tbody>
                {ranking
                  .filter((r) => r.status === "borrador")
                  .map((r) => (
                    <tr key={r.scorecardId}>
                      <td>{r.nickname || r.displayName}</td>
                      <td className="num">
                        {formatPunt(r.total, tirada.allowsDecimals)}
                      </td>
                      <td className="num">
                        <form action={finalizarHoja}>
                          <input
                            type="hidden"
                            name="scorecardId"
                            value={r.scorecardId}
                          />
                          <ConfirmButton
                            message={`¿Cerrar la hoja de ${r.nickname || r.displayName}?`}
                            className="btn"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Cerrar
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}

      {puedeGestionarCierre ? (
        <Link
          href={`/tiradas/${id}/editar`}
          className="btn btn-bloque"
          style={{ marginTop: "1.5rem" }}
        >
          ✏️ Editar tirada
        </Link>
      ) : null}

      {puedeGestionarCierre ? (
        <form
          action={tirada.closed ? reabrirTirada : cerrarTirada}
          style={{ marginTop: "0.6rem" }}
        >
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            message={
              tirada.closed
                ? "¿Reabrir la tirada para que se pueda volver a apuntar gente?"
                : "¿Cerrar la tirada? No podrá apuntarse nadie nuevo."
            }
            className="btn btn-bloque"
          >
            {tirada.closed ? "Reabrir tirada" : "Cerrar tirada"}
          </ConfirmButton>
        </form>
      ) : null}

      {soyCreador ? (
        <form action={borrarTirada} style={{ marginTop: "0.6rem" }}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            message="¿Borrar la tirada entera? Se eliminarán todas las hojas y resultados. Esto no se puede deshacer."
            className="btn"
            style={{ color: "var(--rojo)", width: "100%" }}
          >
            Borrar tirada
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}
