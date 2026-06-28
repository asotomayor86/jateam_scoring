import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, modalities, clubs, tiradas, restaurants, comidas } from "@/db";

/** Modalidades activas, ordenadas por nombre. */
export async function getModalidades() {
  return db
    .select()
    .from(modalities)
    .where(eq(modalities.active, true))
    .orderBy(asc(modalities.name));
}

/** Todos los clubs, ordenados por nombre. */
export async function getClubs() {
  return db.select().from(clubs).orderBy(asc(clubs.name));
}

/** Clubs con el nº de tiradas que los usan (para la gestión). */
export async function getClubsConUso() {
  return db
    .select({
      id: clubs.id,
      name: clubs.name,
      abbr: clubs.abbr,
      mapsUrl: clubs.mapsUrl,
      usos: sql<number>`(
        select count(*)::int from ${tiradas}
        where ${tiradas.clubId} = ${clubs.id}
      )`,
    })
    .from(clubs)
    .orderBy(asc(clubs.name));
}

/** Todos los restaurantes, ordenados por nombre. */
export async function getRestaurantes() {
  return db.select().from(restaurants).orderBy(asc(restaurants.name));
}

/** Restaurantes con el nº de comidas que los usan (para la gestión). */
export async function getRestaurantesConUso() {
  return db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      abbr: restaurants.abbr,
      mapsUrl: restaurants.mapsUrl,
      usos: sql<number>`(
        select count(*)::int from ${comidas}
        where ${comidas.restaurantId} = ${restaurants.id}
      )`,
    })
    .from(restaurants)
    .orderBy(asc(restaurants.name));
}
