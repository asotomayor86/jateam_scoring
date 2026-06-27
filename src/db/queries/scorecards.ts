import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  scorecards,
  series,
  tiradas,
  modalities,
} from "@/db";

/** Una hoja con sus series (ordenadas). `null` si no existe. */
export async function getScorecardConSeries(scorecardId: string) {
  const [hoja] = await db
    .select()
    .from(scorecards)
    .where(eq(scorecards.id, scorecardId))
    .limit(1);
  if (!hoja) return null;

  const filas = await db
    .select()
    .from(series)
    .where(eq(series.scorecardId, scorecardId))
    .orderBy(asc(series.idx));

  return { ...hoja, series: filas };
}

/** Histórico de un tirador: sus hojas con datos de la tirada y modalidad. */
export async function getHistorial(userId: string) {
  return db
    .select({
      scorecardId: scorecards.id,
      tiradaId: scorecards.tiradaId,
      total: scorecards.total,
      innerCount: scorecards.innerCount,
      status: scorecards.status,
      date: tiradas.date,
      code: tiradas.code,
      type: tiradas.type,
      modalityName: modalities.name,
      allowsDecimals: modalities.allowsDecimals,
    })
    .from(scorecards)
    .innerJoin(tiradas, eq(scorecards.tiradaId, tiradas.id))
    .innerJoin(modalities, eq(tiradas.modalityId, modalities.id))
    .where(eq(scorecards.userId, userId))
    .orderBy(desc(tiradas.date), desc(scorecards.createdAt));
}
