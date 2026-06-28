import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  comidas,
  comidaAttendees,
  restaurants,
  profiles,
} from "@/db";

/** Listado de comidas (con restaurante y nº de apuntados). */
export async function listComidas() {
  return db
    .select({
      id: comidas.id,
      date: comidas.date,
      startTime: comidas.startTime,
      name: comidas.name,
      restaurantName: restaurants.name,
      // Total de personas (cada apuntado cuenta como 1 + sus acompañantes).
      asistentes: sql<number>`(
        select coalesce(sum(1 + ${comidaAttendees.guests}), 0)::int
        from ${comidaAttendees}
        where ${comidaAttendees.comidaId} = ${comidas.id}
      )`,
    })
    .from(comidas)
    .innerJoin(restaurants, eq(comidas.restaurantId, restaurants.id))
    .orderBy(desc(comidas.date), desc(comidas.createdAt));
}

/** Una comida con su restaurante. `null` si no existe. */
export async function getComida(id: string) {
  const [row] = await db
    .select({
      id: comidas.id,
      date: comidas.date,
      startTime: comidas.startTime,
      name: comidas.name,
      notes: comidas.notes,
      createdBy: comidas.createdBy,
      restaurantId: comidas.restaurantId,
      restaurantName: restaurants.name,
      restaurantMapsUrl: restaurants.mapsUrl,
    })
    .from(comidas)
    .innerJoin(restaurants, eq(comidas.restaurantId, restaurants.id))
    .where(eq(comidas.id, id))
    .limit(1);
  return row ?? null;
}

/** Asistentes apuntados a una comida (nombre/apodo + acompañantes). */
export async function getAsistentes(comidaId: string) {
  return db
    .select({
      userId: comidaAttendees.userId,
      guests: comidaAttendees.guests,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(comidaAttendees)
    .innerJoin(profiles, eq(comidaAttendees.userId, profiles.id))
    .where(eq(comidaAttendees.comidaId, comidaId))
    .orderBy(asc(profiles.displayName));
}

/** Asistencia del usuario a la comida (con acompañantes), o `null`. */
export async function miAsistencia(comidaId: string, userId: string) {
  const [row] = await db
    .select({ guests: comidaAttendees.guests })
    .from(comidaAttendees)
    .where(
      and(
        eq(comidaAttendees.comidaId, comidaId),
        eq(comidaAttendees.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}
