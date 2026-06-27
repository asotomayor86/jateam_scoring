import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getTirada, getRanking, getMiScorecard } from "@/db/queries/tiradas";
import { apuntarme, borrarTirada } from "@/actions/tiradas";
import { borrarHoja } from "@/actions/scorecards";
import { RankingTable } from "@/components/ranking-table";
import { Card, SeccionTitulo, TipoChip } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { formatPunt } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function TiradaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireUser();
  const { id } = await params;

  const tirada = await getTirada(id);
  if (!tirada) notFound();

  const [ranking, miHoja] = await Promise.all([
    getRanking(id),
    getMiScorecard(id, user.id),
  ]);

  const soyCreador = tirada.createdBy === user.id;

  return (
    <>
      <SeccionTitulo>
        {tirada.modalityName}
        {tirada.caliber ? ` · ${tirada.caliber}` : ""}
      </SeccionTitulo>

      <Card style={{ marginBottom: "1rem" }}>
        {tirada.name ? (
          <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>
            {tirada.name}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TipoChip tipo={tirada.type} />
          <span style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            {tirada.date} · {tirada.clubName}
          </span>
        </div>
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
        </Card>
      ) : (
        <form action={apuntarme} style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="tiradaId" value={id} />
          <button type="submit" className="btn btn-primario btn-bloque">
            🎯 Apuntarme a esta tirada
          </button>
        </form>
      )}

      <SeccionTitulo>Ranking</SeccionTitulo>
      <Card>
        <RankingTable
          filas={ranking}
          allowsDecimals={tirada.allowsDecimals}
          currentUserId={user.id}
        />
      </Card>

      {soyCreador ? (
        <form action={borrarTirada} style={{ marginTop: "1.5rem" }}>
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
