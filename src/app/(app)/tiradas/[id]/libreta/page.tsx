import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getTirada, getMiScorecard } from "@/db/queries/tiradas";
import { getScorecardConSeries } from "@/db/queries/scorecards";
import { getEjercicios } from "@/db/queries/exercises";
import { Libreta } from "@/components/libreta";
import { LibretaAsistida } from "@/components/libreta-asistida";
import { LibretaModular } from "@/components/libreta-modular";
import { LibretaDiana } from "@/components/libreta-diana";
import { CambiarGranularidad } from "@/components/cambiar-granularidad";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LibretaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await requireUser();
  const { id } = await params;

  const tirada = await getTirada(id);
  if (!tirada) notFound();
  if (!tirada.isPublic && tirada.createdBy !== user.id) notFound();

  const miHoja = await getMiScorecard(id, user.id);
  if (!miHoja) redirect(`/tiradas/${id}`); // hay que apuntarse primero

  const hoja = await getScorecardConSeries(miHoja.id);
  if (!hoja) redirect(`/tiradas/${id}`);

  const esModular = tirada.modalitySlug === "entrenamiento-modular";
  const ejercicios = esModular ? await getEjercicios() : [];

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <SeccionTitulo grande>Mi libreta</SeccionTitulo>
        <Link
          href={`/tiradas/${id}`}
          style={{ color: "var(--acento)", fontSize: "0.9rem" }}
        >
          ← Tirada
        </Link>
      </div>
      <p
        style={{
          color: "var(--texto-suave)",
          fontSize: "0.85rem",
          margin: "0 0 0.8rem",
        }}
      >
        {tirada.modalityName}
        {tirada.caliber ? ` · ${tirada.caliber}` : ""} · {tirada.date}
      </p>

      {hoja.status !== "finalizada" &&
      hoja.series.filter((s) => !s.exerciseId).length === 0 ? (
        <div style={{ marginBottom: "0.7rem" }}>
          <CambiarGranularidad scorecardId={hoja.id} actual={hoja.granularity} />
        </div>
      ) : null}

      {esModular ? (
        <LibretaModular
          scorecardId={hoja.id}
          granularity={hoja.granularity}
          ejercicios={ejercicios.map((e) => ({
            id: e.id,
            code: e.code,
            title: e.title,
            tipologia: e.tipologia,
          }))}
          seriesIniciales={hoja.series.map((s) => ({
            idx: s.idx,
            moduleType: s.moduleType,
            shots: s.shots,
            subtotal: s.subtotal,
            buckets: s.buckets,
            blancoNuevo: s.blancoNuevo,
            exerciseId: s.exerciseId,
            rating: s.rating,
            notes: s.notes,
            impacts: s.impacts,
          }))}
          finalizada={hoja.status === "finalizada"}
          esAdmin={profile.isAdmin}
        />
      ) : hoja.granularity === "diana" ? (
        <LibretaDiana
          scorecardId={hoja.id}
          seriesIniciales={hoja.series.map((s) => ({
            idx: s.idx,
            impacts: s.impacts ?? [],
          }))}
          totalInicial={hoja.total}
          innerInicial={hoja.innerCount}
          finalizada={hoja.status === "finalizada"}
        />
      ) : hoja.granularity === "asistido" ? (
        <LibretaAsistida
          scorecardId={hoja.id}
          modalidad={{
            seriesCount: tirada.seriesCount,
            totalShots: tirada.totalShots,
            defaultSeriesSize: tirada.defaultSeriesSize,
            maxPerShot: tirada.maxPerShot,
          }}
          seriesIniciales={hoja.series.map((s) => ({
            idx: s.idx,
            blancoNuevo: s.blancoNuevo,
            buckets: s.buckets,
            impacts: s.impacts,
          }))}
          finalizada={hoja.status === "finalizada"}
          permiteAjuste={tirada.type !== "entrenamiento"}
          ajusteInicial={hoja.adjustment}
          modalitySlug={tirada.modalitySlug}
          tipo={tirada.type}
          esAdmin={profile.isAdmin}
        />
      ) : (
        <Libreta
          scorecardId={hoja.id}
          modalidad={{
            totalShots: tirada.totalShots,
            seriesCount: tirada.seriesCount,
            defaultSeriesSize: tirada.defaultSeriesSize,
            allowsDecimals: tirada.allowsDecimals,
            maxPerShot: tirada.maxPerShot,
          }}
          seriesIniciales={hoja.series.map((s) => ({
            idx: s.idx,
            shots: s.shots,
            shotCount: s.shotCount,
            subtotal: s.subtotal,
            inner: s.inner,
            impacts: s.impacts,
          }))}
          preferTotal={hoja.granularity !== "tiro"}
          totalInicial={hoja.total}
          innerInicial={hoja.innerCount}
          finalizada={hoja.status === "finalizada"}
          permiteAjuste={tirada.type !== "entrenamiento"}
          ajusteInicial={hoja.adjustment}
          modalitySlug={tirada.modalitySlug}
          tipo={tirada.type}
          esAdmin={profile.isAdmin}
        />
      )}
    </>
  );
}
