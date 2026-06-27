/**
 * Esquema de la base de datos (Drizzle ORM) — esquema "public".
 *
 * Las tablas de usuarios/sesiones las gestiona Neon Auth en el esquema
 * "neon_auth" y NO se declaran aquí. La tabla `profiles` enlaza con ese usuario
 * por `id` (el id de usuario de Neon Auth, de tipo text).
 *
 * Dominio: tiro olímpico. Una `tirada` es un evento (con identificador
 * estandarizado); cada tirador apuntado tiene una `scorecard` con sus `series`.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authenticatedRole, crudPolicy } from "drizzle-orm/neon";

/**
 * Predicado SQL "el usuario actual es encargado (admin)". Lo usa la política de
 * escritura del catálogo de modalidades (solo el encargado lo edita).
 *
 * No provoca recursión: la política de LECTURA de `profiles` permite a cualquier
 * autenticado leer la tabla, así que esta subconsulta encuentra la fila sin
 * disparar de nuevo una comprobación de admin.
 */
const esAdmin = sql`(
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)`;

// --- Enums -------------------------------------------------------------------

/** Tipo de tirada según su oficialidad. */
export const tiradaType = pgEnum("tirada_type", [
  "entrenamiento",
  "oficial",
  "semioficial",
]);

/** Estado de una hoja de puntuación. */
export const scorecardStatus = pgEnum("scorecard_status", [
  "borrador",
  "finalizada",
]);

/**
 * Granularidad con la que un tirador apunta: tiro a tiro, en bloques de 5 o 10,
 * o el total de la serie completa.
 */
export const entryGranularity = pgEnum("entry_granularity", [
  "tiro",
  "bloque5",
  "bloque10",
  "serie",
]);

// --- Tablas ------------------------------------------------------------------

/**
 * Perfil de cada persona. `id` es el id de usuario de Neon Auth (text).
 * No se declara FK física al esquema neon_auth (lo gestiona Neon Auth); la
 * integridad se mantiene desde la app al invitar / primer login.
 *
 * `isAdmin` = "encargado": el único rol con privilegio especial, y solo para
 * invitar a nuevos miembros. El resto de acciones están abiertas a todos.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    nickname: text("nickname"),
    isAdmin: boolean("is_admin").notNull().default(false),
    // Preferencia por defecto al rellenar la libreta.
    defaultGranularity: entryGranularity("default_granularity")
      .notNull()
      .default("tiro"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Cualquier autenticado lee todos los perfiles (se muestran en rankings);
    // cada quien solo modifica su propia fila. El encargado edita otros perfiles
    // desde el servidor con la conexión privilegiada (salta RLS).
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: authUid(t.id),
    }),
  ],
);

/**
 * Catálogo de modalidades de tiro (seed). Estandariza los formatos de tirada:
 * número de tiros, series, distancia y si admite décimas (p. ej. aire).
 */
export const modalities = pgTable(
  "modalities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    // Sigla para el código de tirada (p. ej. "STD", "FC", "AIRE").
    abbr: text("abbr").notNull(),
    distance: integer("distance").notNull(), // metros
    totalShots: integer("total_shots").notNull(),
    seriesCount: integer("series_count").notNull(),
    defaultSeriesSize: integer("default_series_size").notNull(),
    allowsDecimals: boolean("allows_decimals").notNull().default(false),
    maxPerShot: real("max_per_shot").notNull().default(10),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    // Catálogo visible para todos; solo el encargado lo modifica (evita que cada
    // uno cree formatos divergentes).
    crudPolicy({ role: authenticatedRole, read: true, modify: esAdmin }),
  ],
);

/**
 * Catálogo de clubs (para estandarizar el identificador de la tirada). Cualquier
 * autenticado puede añadir uno nuevo si falta.
 */
export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Sigla para el código de tirada (p. ej. "JATEAM").
    abbr: text("abbr").notNull(),
    createdBy: text("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    // Todos leen; todos pueden añadir (no hay update/delete desde la app).
    crudPolicy({ role: authenticatedRole, read: true, modify: sql`true` }),
  ],
);

/**
 * Tirada (evento). Identificador estandarizado en `code`, generado por la app a
 * partir de fecha + modalidad + club + tipo: AAAAMMDD-MODALIDAD-CLUB-TIPO.
 */
export const tiradas = pgTable(
  "tiradas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    // Fecha de la tirada (sin hora; el día es lo relevante).
    date: text("date").notNull(), // ISO YYYY-MM-DD
    modalityId: uuid("modality_id")
      .notNull()
      .references(() => modalities.id, { onDelete: "restrict" }),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "restrict" }),
    type: tiradaType("type").notNull(),
    // Calibre libre opcional (p. ej. "9mm", ".38", "22").
    caliber: text("caliber"),
    // Etiqueta opcional para distinguir varias tiradas el mismo día.
    name: text("name"),
    notes: text("notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Todos ven las tiradas y cualquiera crea una; solo quien la creó la edita
    // o borra.
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: authUid(t.createdBy),
    }),
  ],
);

/**
 * Hoja de puntuación de un tirador en una tirada. Una por (tirada, usuario).
 * `total` e `innerCount` se denormalizan (recalculados al guardar series) para
 * que el ranking sea una simple lectura.
 */
export const scorecards = pgTable(
  "scorecards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tiradaId: uuid("tirada_id")
      .notNull()
      .references(() => tiradas.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    granularity: entryGranularity("granularity").notNull().default("tiro"),
    total: real("total").notNull().default(0),
    // Dieces interiores ("X") anotados, para desempate.
    innerCount: integer("inner_count").notNull().default(0),
    status: scorecardStatus("status").notNull().default("borrador"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique().on(t.tiradaId, t.userId),
    // Todos ven todas las hojas (para comparar); cada uno solo modifica la suya.
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: authUid(t.userId),
    }),
  ],
);

/**
 * Una serie dentro de una hoja. Una fila por serie = guardado en vivo atómico.
 *
 * - Modo tiro a tiro: `shots` = [9,10,8,…] y `subtotal` = suma.
 * - Modo bloque/serie: `shots` = null, `subtotal` introducido a mano y
 *   `shotCount` indica cuántos tiros cubre. Es mezclable dentro de la misma hoja.
 */
export const series = pgTable(
  "series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scorecardId: uuid("scorecard_id")
      .notNull()
      .references(() => scorecards.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(), // orden (1, 2, 3, …)
    shots: jsonb("shots").$type<number[] | null>(),
    shotCount: integer("shot_count").notNull(),
    subtotal: real("subtotal").notNull().default(0),
    inner: integer("inner").notNull().default(0), // dieces interiores en la serie
    notes: text("notes"),
  },
  (t) => [
    unique().on(t.scorecardId, t.idx),
    // Todos leen; solo el dueño de la hoja padre escribe sus series.
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: sql`(
        select exists (
          select 1 from scorecards s
          where s.id = ${t.scorecardId} and s.user_id = (select auth.user_id())
        )
      )`,
    }),
  ],
);

// --- Tipos inferidos ---------------------------------------------------------

export type TiradaType = (typeof tiradaType.enumValues)[number];
export type ScorecardStatus = (typeof scorecardStatus.enumValues)[number];
export type EntryGranularity = (typeof entryGranularity.enumValues)[number];

export type Profile = typeof profiles.$inferSelect;
export type Modality = typeof modalities.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type Tirada = typeof tiradas.$inferSelect;
export type Scorecard = typeof scorecards.$inferSelect;
export type Serie = typeof series.$inferSelect;
