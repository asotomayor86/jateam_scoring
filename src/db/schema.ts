/**
 * Esquema de la base de datos (Drizzle ORM) — esquema "public".
 *
 * Las tablas de usuarios/sesiones las gestiona Neon Auth en el esquema
 * "neon_auth" y NO se declaran aquí. La tabla `profiles` enlaza con ese usuario
 * por `id` (el id de usuario de Neon Auth, de tipo text).
 *
 * Autorización: toda la app accede a la BD a través del cliente privilegiado
 * (rol owner, ver `src/db/index.ts`), nunca con un rol "authenticated" desde el
 * cliente. Por eso los permisos se hacen cumplir en las Server Actions
 * (`requireUser`/`requireAdmin` + comprobación de autoría por `createdBy`/
 * `userId`), no con políticas RLS. No hay ningún lector externo de la BD.
 *
 * Dominio: tiro olímpico. Una `tirada` es un evento (con identificador
 * estandarizado); cada tirador apuntado tiene una `scorecard` con sus `series`.
 */
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
 * el total de la serie, o "asistido" (competición: recuento por valor con
 * descuento de blanco compartido).
 */
export const entryGranularity = pgEnum("entry_granularity", [
  "tiro",
  "bloque5",
  "bloque10",
  "serie",
  "asistido",
  "diana",
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
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  nickname: text("nickname"),
  // Datos federativos (opcionales).
  dni: text("dni"),
  licenseNumber: text("license_number"),
  isAdmin: boolean("is_admin").notNull().default(false),
  // Preferencia por defecto al rellenar la libreta.
  defaultGranularity: entryGranularity("default_granularity")
    .notNull()
    .default("tiro"),
  // Última vez que abrió el chat / la lista de tiradas (para los contadores de
  // "nuevos" del menú). Arrancan "al día" (default now) para no contar histórico.
  chatSeenAt: timestamp("chat_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  tiradasSeenAt: timestamp("tiradas_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Catálogo de modalidades de tiro (seed). Estandariza los formatos de tirada:
 * número de tiros, series, distancia y si admite décimas (p. ej. aire).
 */
export const modalities = pgTable("modalities", {
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
});

/**
 * Catálogo de "campos" (campos de tiro) para estandarizar el identificador de la
 * tirada. Internamente la tabla sigue llamándose `clubs` por compatibilidad con
 * los datos existentes; en la app se muestra como "Campo". Cualquier autenticado
 * puede añadir uno nuevo si falta.
 */
export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Sigla para el código de tirada (p. ej. "JATEAM").
  abbr: text("abbr").notNull(),
  // Enlace de Google Maps con la ubicación del campo (opcional).
  mapsUrl: text("maps_url"),
  createdBy: text("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Tirada (evento). Identificador estandarizado en `code`, generado por la app a
 * partir de fecha + modalidad + club + tipo: AAAAMMDD-MODALIDAD-CLUB-TIPO.
 */
export const tiradas = pgTable("tiradas", {
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
  // Hora de inicio (HH:MM), opcional.
  startTime: text("start_time"),
  // Cerrada: nadie nuevo puede apuntarse y se muestra como "pasada".
  closed: boolean("closed").notNull().default(false),
  // Público: si es false, solo lo ve (y se apunta) quien lo creó.
  isPublic: boolean("is_public").notNull().default(true),
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
});

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
    // Categoría con la que se apunta (solo tiradas oficiales).
    category: text("category"),
    // Total final (suma de series + ajuste). Es lo que ordena el ranking.
    total: real("total").notNull().default(0),
    // Ajuste manual del árbitro al total (puede ser negativo). Solo se usa en
    // tiradas oficiales/semioficiales.
    adjustment: real("adjustment").notNull().default(0),
    // Dieces interiores ("X") anotados, para desempate.
    innerCount: integer("inner_count").notNull().default(0),
    status: scorecardStatus("status").notNull().default("borrador"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.tiradaId, t.userId)],
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
    // --- Solo modo "asistido" (competición) ---
    // ¿Esta serie empieza un blanco nuevo? (la serie 1, por defecto, sí).
    blancoNuevo: boolean("blanco_nuevo").notNull().default(true),
    // Recuento ACUMULADO en la diana por valor [#10, #9, …, #0] tal como se
    // introduce. El subtotal/shotCount de la serie se derivan restando el
    // acumulado de la serie anterior del mismo blanco.
    buckets: jsonb("buckets").$type<number[] | null>(),
    // Solo modo "entrenamiento modular": tipo de módulo de esta serie
    // (p. ej. "p150", "v20", "v10", "duelo").
    moduleType: text("module_type"),
    // Modular: si esta fila es un EJERCICIO de la biblioteca (no una serie de
    // disparos), enlaza el ejercicio y guarda su calificación (verde/amarillo/rojo).
    exerciseId: uuid("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    rating: text("rating"),
    // Modular (fila de ejercicio): nº final de repeticiones realizadas, para una
    // futura evaluación de carga de trabajo.
    reps: integer("reps"),
    // Modular (serie de disparo): distancia de la sesión, "real" (25 m) o
    // "reducida" (7 m). Se guarda para el análisis (a 7 m las puntuaciones
    // tienden a ser más bajas). null = no informado / no aplica.
    distanceMode: text("distance_mode"),
    // Solo modo "diana": impactos sobre la diana a escala, en mm desde el
    // centro (x → derecha, y → arriba) con su puntuación derivada del anillo
    // (corregible). El subtotal/shots/inner se derivan de estos impactos.
    impacts: jsonb("impacts").$type<{ x: number; y: number; s: number }[] | null>(),
  },
  (t) => [unique().on(t.scorecardId, t.idx)],
);

/**
 * Catálogo de restaurantes (para los eventos "Comidas"). Mismos campos que los
 * campos de tiro, con enlace de Google Maps.
 */
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  abbr: text("abbr").notNull(),
  mapsUrl: text("maps_url"),
  createdBy: text("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Evento "Comida": fecha, hora y restaurante; la gente se apunta. */
export const comidas = pgTable("comidas", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  startTime: text("start_time"), // HH:MM
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "restrict" }),
  name: text("name"),
  notes: text("notes"),
  createdBy: text("created_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Asistentes apuntados a una comida. */
export const comidaAttendees = pgTable(
  "comida_attendees",
  {
    comidaId: uuid("comida_id")
      .notNull()
      .references(() => comidas.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Acompañantes que trae además de sí mismo (+1, +2, …).
    guests: integer("guests").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.comidaId, t.userId] })],
);

/**
 * Biblioteca de ejercicios de entrenamiento (catálogo curado por el encargado).
 */
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // EJ01
  title: text("title").notNull(),
  tipologia: text("tipologia").notNull(),
  objetivo: text("objetivo"),
  material: text("material"),
  ejecucion: text("ejecucion"),
  freqIniciacion: text("freq_iniciacion"),
  freqNacional: text("freq_nacional"),
  errores: text("errores"),
  progresion: text("progresion"),
  metrica: text("metrica"),
  claves: text("claves"),
  orden: integer("orden").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Sesiones de dispositivo (para el modo "dos dispositivos" del mismo usuario:
 * uno de Control y otro de Cámara láser remota). Una fila por dispositivo activo,
 * identificado por un token guardado en su localStorage. El rol se elige cuando
 * hay 2+ sesiones. Se cierran a mano (no caducan solas).
 */
export const deviceSessions = pgTable(
  "device_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    deviceToken: text("device_token").notNull(),
    // "control" | "camara" | null (sin elegir todavía).
    role: text("role"),
    active: boolean("active").notNull().default(true),
    // Serie que el Control tiene "en captura remota" (para la Fase 2).
    captureScorecardId: uuid("capture_scorecard_id"),
    captureIdx: integer("capture_idx"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.deviceToken)],
);

/**
 * Chat del grupo por hilos. Un usuario crea un hilo y dentro se responden.
 * Retención: los mensajes de más de 3 meses se filtran al leer y se purgan de
 * forma perezosa (al listar/publicar); los hilos sin actividad reciente caducan.
 */
export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  createdBy: text("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Última actividad (creación o último mensaje): ordena y decide la caducidad.
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Suscripciones Web Push por dispositivo (para avisar al móvil). */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A quién menciona (@) cada mensaje del chat. Base para avisar al mencionado. */
export const chatMentions = pgTable(
  "chat_mentions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
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
export type Exercise = typeof exercises.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type Comida = typeof comidas.$inferSelect;
export type ComidaAttendee = typeof comidaAttendees.$inferSelect;
