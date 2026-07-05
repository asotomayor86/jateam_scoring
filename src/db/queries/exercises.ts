import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, exercises } from "@/db";

/** Todos los ejercicios, ordenados. */
export async function getEjercicios() {
  return db.select().from(exercises).orderBy(asc(exercises.orden), asc(exercises.code));
}

/** Un ejercicio por id. `null` si no existe. */
export async function getEjercicio(id: string) {
  const [row] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  return row ?? null;
}
