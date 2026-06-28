import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { pgSchema, text, uuid } from "drizzle-orm/pg-core";
import { db, profiles } from "@/db";

/**
 * Vista de la tabla de usuarios que mantiene Neon Auth en el esquema
 * "neon_auth". Solo se declara para LEER el email (no la gestiona Drizzle: el
 * schemaFilter de drizzle.config es solo "public").
 *
 * Ojo: aquí `id` es UUID, mientras que `profiles.id` es TEXT, así que el join se
 * hace casteando el uuid a texto.
 */
const neonAuth = pgSchema("neon_auth");
export const authUsers = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
});

/** Condición de join entre profiles (text) y neon_auth.user (uuid). */
const joinUsuario = sql`${authUsers.id}::text = ${profiles.id}`;

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
    .leftJoin(authUsers, joinUsuario)
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
    .leftJoin(authUsers, joinUsuario)
    .where(eq(profiles.id, id))
    .limit(1);
  return row ?? null;
}
