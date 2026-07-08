import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, scorecards, series, tiradas, modalities } from "@/db";

/**
 * Todas las hojas de un tirador con sus series completas, para la página de
 * análisis ("Mis resultados"). Dos lecturas: las hojas (con datos de tirada y
 * modalidad) y todas sus series de una vez.
 */
export async function getResultados(userId: string) {
  const hojas = await db
    .select({
      scorecardId: scorecards.id,
      tiradaId: scorecards.tiradaId,
      date: tiradas.date,
      type: tiradas.type,
      total: scorecards.total,
      innerCount: scorecards.innerCount,
      status: scorecards.status,
      category: scorecards.category,
      modalityName: modalities.name,
      modalitySlug: modalities.slug,
      allowsDecimals: modalities.allowsDecimals,
    })
    .from(scorecards)
    .innerJoin(tiradas, eq(scorecards.tiradaId, tiradas.id))
    .innerJoin(modalities, eq(tiradas.modalityId, modalities.id))
    .where(eq(scorecards.userId, userId))
    .orderBy(desc(tiradas.date), desc(scorecards.createdAt));

  if (hojas.length === 0) return { hojas, series: [] as SerieResultado[] };

  const ids = hojas.map((h) => h.scorecardId);
  const filas = await db
    .select({
      scorecardId: series.scorecardId,
      idx: series.idx,
      shots: series.shots,
      shotCount: series.shotCount,
      subtotal: series.subtotal,
      inner: series.inner,
      buckets: series.buckets,
      moduleType: series.moduleType,
      exerciseId: series.exerciseId,
      rating: series.rating,
      impacts: series.impacts,
    })
    .from(series)
    .where(inArray(series.scorecardId, ids))
    .orderBy(asc(series.idx));

  return { hojas, series: filas };
}

export type HojaResultado = Awaited<ReturnType<typeof getResultados>>["hojas"][number];
export type SerieResultado = {
  scorecardId: string;
  idx: number;
  shots: number[] | null;
  shotCount: number;
  subtotal: number;
  inner: number;
  buckets: number[] | null;
  moduleType: string | null;
  exerciseId: string | null;
  rating: string | null;
  impacts: { x: number; y: number; s: number }[] | null;
};
