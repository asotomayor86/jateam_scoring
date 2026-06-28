import "server-only";
import { asc, eq } from "drizzle-orm";
import { pgSchema, text } from "drizzle-orm/pg-core";
import { db, profiles } from "@/db";

/**
 * Vista de la tabla de usuarios que mantiene Neon Auth en el esquema
 * "neon_auth". Solo se declara para LEER el email (no la gestiona Drizzle: el
 * schemaFilter de drizzle.config es solo "public").
 */
const neonAuth = pgSchema("neon_auth");
export const authUsers = neonAuth.table("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
});

/** Miembros con su email (para gestión del encargado). */
export async function getMiembros() {
  return db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
      isAdmin: profiles.isAdmin,
      email: authUsers.email,
    })
    .from(profiles)
    .leftJoin(authUsers, eq(authUsers.id, profiles.id))
    .orderBy(asc(profiles.displayName));
}

/** Un miembro (perfil + email) por id. `null` si no existe. */
export async function getMiembro(id: string) {
  const [row] = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
      isAdmin: profiles.isAdmin,
      defaultGranularity: profiles.defaultGranularity,
      email: authUsers.email,
    })
    .from(profiles)
    .leftJoin(authUsers, eq(authUsers.id, profiles.id))
    .where(eq(profiles.id, id))
    .limit(1);
  return row ?? null;
}
