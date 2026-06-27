import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, modalities, clubs } from "@/db";

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
