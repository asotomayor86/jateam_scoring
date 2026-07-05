import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  tiradas,
  modalities,
  clubs,
  scorecards,
  profiles,
  type TiradaType,
} from "@/db";

export type FiltrosTiradas = {
  modalityId?: string;
  clubId?: string;
  type?: TiradaType;
};

/** Listado de tiradas (con modalidad, club y nº de tiradores apuntados). */
export async function listTiradas(filtros: FiltrosTiradas = {}) {
  const condiciones = [];
  if (filtros.modalityId)
    condiciones.push(eq(tiradas.modalityId, filtros.modalityId));
  if (filtros.clubId) condiciones.push(eq(tiradas.clubId, filtros.clubId));
  if (filtros.type) condiciones.push(eq(tiradas.type, filtros.type));

  return db
    .select({
      id: tiradas.id,
      code: tiradas.code,
      date: tiradas.date,
      type: tiradas.type,
      closed: tiradas.closed,
      startTime: tiradas.startTime,
      name: tiradas.name,
      caliber: tiradas.caliber,
      modalityName: modalities.name,
      modalityAbbr: modalities.abbr,
      clubName: clubs.name,
      tiradores: sql<number>`(
        select count(*)::int from ${scorecards}
        where ${scorecards.tiradaId} = ${tiradas.id}
      )`,
    })
    .from(tiradas)
    .innerJoin(modalities, eq(tiradas.modalityId, modalities.id))
    .innerJoin(clubs, eq(tiradas.clubId, clubs.id))
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(tiradas.date), desc(tiradas.createdAt));
}

/** Una tirada con su modalidad y club. `null` si no existe. */
export async function getTirada(id: string) {
  const [row] = await db
    .select({
      id: tiradas.id,
      code: tiradas.code,
      date: tiradas.date,
      type: tiradas.type,
      closed: tiradas.closed,
      startTime: tiradas.startTime,
      name: tiradas.name,
      caliber: tiradas.caliber,
      notes: tiradas.notes,
      createdBy: tiradas.createdBy,
      modalityId: tiradas.modalityId,
      clubId: tiradas.clubId,
      modalitySlug: modalities.slug,
      modalityName: modalities.name,
      modalityAbbr: modalities.abbr,
      modalityDistance: modalities.distance,
      totalShots: modalities.totalShots,
      seriesCount: modalities.seriesCount,
      defaultSeriesSize: modalities.defaultSeriesSize,
      allowsDecimals: modalities.allowsDecimals,
      maxPerShot: modalities.maxPerShot,
      clubName: clubs.name,
      clubMapsUrl: clubs.mapsUrl,
    })
    .from(tiradas)
    .innerJoin(modalities, eq(tiradas.modalityId, modalities.id))
    .innerJoin(clubs, eq(tiradas.clubId, clubs.id))
    .where(eq(tiradas.id, id))
    .limit(1);
  return row ?? null;
}

/** Ranking de una tirada: hojas ordenadas por total y dieces (desempate). */
export async function getRanking(tiradaId: string) {
  return db
    .select({
      scorecardId: scorecards.id,
      userId: scorecards.userId,
      total: scorecards.total,
      innerCount: scorecards.innerCount,
      status: scorecards.status,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(scorecards)
    .innerJoin(profiles, eq(scorecards.userId, profiles.id))
    .where(eq(scorecards.tiradaId, tiradaId))
    .orderBy(desc(scorecards.total), desc(scorecards.innerCount));
}

/** Relación de tiradores apuntados (nombre, DNI, licencia) para el encargado. */
export async function getTiradores(tiradaId: string) {
  return db
    .select({
      displayName: profiles.displayName,
      dni: profiles.dni,
      licenseNumber: profiles.licenseNumber,
      category: scorecards.category,
    })
    .from(scorecards)
    .innerJoin(profiles, eq(scorecards.userId, profiles.id))
    .where(eq(scorecards.tiradaId, tiradaId))
    .orderBy(asc(profiles.displayName));
}

/** La hoja del usuario en una tirada (o null si no se ha apuntado). */
export async function getMiScorecard(tiradaId: string, userId: string) {
  const [row] = await db
    .select()
    .from(scorecards)
    .where(
      and(eq(scorecards.tiradaId, tiradaId), eq(scorecards.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}
