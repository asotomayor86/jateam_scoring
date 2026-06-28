"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { codigoTirada } from "@/lib/codigo";
import {
  db,
  tiradas,
  clubs,
  modalities,
  scorecards,
  type TiradaType,
} from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

const esquemaTirada = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora no válida")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  modalityId: z.string().uuid("Elige una modalidad"),
  clubId: z.string().uuid("Elige un campo"),
  type: z.enum(["entrenamiento", "oficial", "semioficial"]),
  caliber: z
    .string()
    .trim()
    .max(16)
    .optional()
    .transform((v) => (v ? v : null)),
  name: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Encuentra un código libre añadiendo sufijo -2, -3… si el base ya existe.
 * `excludeId` ignora la propia tirada (al editar) para no chocar consigo misma.
 */
async function codigoLibre(base: string, excludeId?: string): Promise<string> {
  const existentes = await db
    .select({ id: tiradas.id, code: tiradas.code })
    .from(tiradas)
    .where(like(tiradas.code, `${base}%`));
  const usados = new Set(
    existentes.filter((r) => r.id !== excludeId).map((r) => r.code),
  );
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Crea una tirada con identificador estandarizado y redirige a su detalle. */
export async function crearTirada(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user } = await requireUser();

  const parsed = esquemaTirada.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    modalityId: formData.get("modalityId"),
    clubId: formData.get("clubId"),
    type: formData.get("type"),
    caliber: formData.get("caliber"),
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const datos = parsed.data;

  // Necesitamos las siglas de modalidad y club para el código.
  const [mod] = await db
    .select({ abbr: modalities.abbr })
    .from(modalities)
    .where(eq(modalities.id, datos.modalityId))
    .limit(1);
  const [club] = await db
    .select({ abbr: clubs.abbr })
    .from(clubs)
    .where(eq(clubs.id, datos.clubId))
    .limit(1);
  if (!mod || !club) {
    return { ok: false, mensaje: "Modalidad o club no válidos" };
  }

  const base = codigoTirada({
    date: datos.date,
    modalityAbbr: mod.abbr,
    clubAbbr: club.abbr,
    type: datos.type as TiradaType,
  });
  const code = await codigoLibre(base);

  let nuevoId: string;
  try {
    const [fila] = await db
      .insert(tiradas)
      .values({ ...datos, code, createdBy: user.id })
      .returning({ id: tiradas.id });
    nuevoId = fila.id;
  } catch (e) {
    console.error("crearTirada error:", e);
    return { ok: false, mensaje: "No se pudo crear la tirada" };
  }

  revalidatePath("/tiradas");
  revalidatePath("/");
  redirect(`/tiradas/${nuevoId}`);
}

/**
 * Edita una tirada existente. La puede editar quien la creó o el encargado.
 * Regenera el código estandarizado a partir de los nuevos valores.
 */
export async function actualizarTirada(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, mensaje: "Falta la tirada" };

  const [actual] = await db
    .select({ createdBy: tiradas.createdBy })
    .from(tiradas)
    .where(eq(tiradas.id, id))
    .limit(1);
  if (!actual) return { ok: false, mensaje: "La tirada no existe" };
  if (actual.createdBy !== user.id && !profile.isAdmin) {
    return { ok: false, mensaje: "No puedes editar esta tirada" };
  }

  const parsed = esquemaTirada.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    modalityId: formData.get("modalityId"),
    clubId: formData.get("clubId"),
    type: formData.get("type"),
    caliber: formData.get("caliber"),
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const datos = parsed.data;

  const [mod] = await db
    .select({ abbr: modalities.abbr })
    .from(modalities)
    .where(eq(modalities.id, datos.modalityId))
    .limit(1);
  const [club] = await db
    .select({ abbr: clubs.abbr })
    .from(clubs)
    .where(eq(clubs.id, datos.clubId))
    .limit(1);
  if (!mod || !club) {
    return { ok: false, mensaje: "Modalidad o campo no válidos" };
  }

  const base = codigoTirada({
    date: datos.date,
    modalityAbbr: mod.abbr,
    clubAbbr: club.abbr,
    type: datos.type as TiradaType,
  });
  const code = await codigoLibre(base, id);

  try {
    await db
      .update(tiradas)
      .set({ ...datos, code })
      .where(eq(tiradas.id, id));
  } catch (e) {
    console.error("actualizarTirada error:", e);
    return { ok: false, mensaje: "No se pudo guardar la tirada" };
  }

  revalidatePath(`/tiradas/${id}`);
  revalidatePath("/tiradas");
  revalidatePath("/");
  redirect(`/tiradas/${id}`);
}

/** Borra una tirada (solo quien la creó). En cascada borra hojas y series. */
export async function borrarTirada(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Solo el creador. (La RLS lo refuerza, pero comprobamos también aquí porque
  // este cliente es privilegiado.)
  await db
    .delete(tiradas)
    .where(and(eq(tiradas.id, id), eq(tiradas.createdBy, user.id)));

  revalidatePath("/tiradas");
  revalidatePath("/yo");
  redirect("/tiradas");
}

/** Crea un club nuevo (cualquier miembro), para estandarizar el catálogo. */
export async function crearClub(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user } = await requireUser();

  const esquema = z.object({
    name: z.string().trim().min(2, "Nombre obligatorio").max(60),
    abbr: z
      .string()
      .trim()
      .min(2, "Sigla obligatoria")
      .max(12)
      .regex(/^[A-Za-z0-9]+$/, "Sigla: solo letras y números"),
    mapsUrl: z
      .string()
      .trim()
      .url("El enlace de mapa no es válido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  });
  const parsed = esquema.safeParse({
    name: formData.get("name"),
    abbr: formData.get("abbr"),
    mapsUrl: formData.get("mapsUrl"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  try {
    await db.insert(clubs).values({
      name: parsed.data.name,
      abbr: parsed.data.abbr.toUpperCase(),
      mapsUrl: parsed.data.mapsUrl,
      createdBy: user.id,
    });
  } catch (e) {
    console.error("crearClub error:", e);
    return { ok: false, mensaje: "No se pudo crear el campo" };
  }

  revalidatePath("/clubs");
  revalidatePath("/tiradas/nueva");
  return { ok: true, mensaje: `Campo «${parsed.data.name}» añadido` };
}

/** Actualiza nombre y sigla de un club (cualquier miembro). */
export async function actualizarClub(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const esquema = z.object({
    name: z.string().trim().min(2).max(60),
    abbr: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .regex(/^[A-Za-z0-9]+$/),
    mapsUrl: z
      .string()
      .trim()
      .url()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  });
  const parsed = esquema.safeParse({
    name: formData.get("name"),
    abbr: formData.get("abbr"),
    mapsUrl: formData.get("mapsUrl"),
  });
  if (!id || !parsed.success) return;

  await db
    .update(clubs)
    .set({
      name: parsed.data.name,
      abbr: parsed.data.abbr.toUpperCase(),
      mapsUrl: parsed.data.mapsUrl,
    })
    .where(eq(clubs.id, id));

  revalidatePath("/clubs");
  revalidatePath("/tiradas/nueva");
}

/** Borra un club, solo si ninguna tirada lo usa (FK restrict). */
export async function borrarClub(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const enUso = await db
    .select({ id: tiradas.id })
    .from(tiradas)
    .where(eq(tiradas.clubId, id))
    .limit(1);
  if (enUso.length > 0) return; // hay tiradas con ese club: no se borra

  await db.delete(clubs).where(eq(clubs.id, id));
  revalidatePath("/clubs");
  revalidatePath("/tiradas/nueva");
}

/** Cierra una tirada (creador o encargado): impide nuevos apuntes. */
export async function cerrarTirada(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [t] = await db
    .select({ createdBy: tiradas.createdBy })
    .from(tiradas)
    .where(eq(tiradas.id, id))
    .limit(1);
  if (!t) return;
  if (t.createdBy !== user.id && !profile.isAdmin) return;

  await db.update(tiradas).set({ closed: true }).where(eq(tiradas.id, id));
  revalidatePath(`/tiradas/${id}`);
  revalidatePath("/tiradas");
  revalidatePath("/");
}

/** Reabre una tirada cerrada (creador o encargado). */
export async function reabrirTirada(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [t] = await db
    .select({ createdBy: tiradas.createdBy })
    .from(tiradas)
    .where(eq(tiradas.id, id))
    .limit(1);
  if (!t) return;
  if (t.createdBy !== user.id && !profile.isAdmin) return;

  await db.update(tiradas).set({ closed: false }).where(eq(tiradas.id, id));
  revalidatePath(`/tiradas/${id}`);
  revalidatePath("/tiradas");
  revalidatePath("/");
}

const GRANULARIDADES = [
  "tiro",
  "bloque5",
  "bloque10",
  "serie",
  "asistido",
] as const;

/** Apunta al usuario actual a una tirada: crea su hoja si no la tiene. */
export async function apuntarme(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const tiradaId = String(formData.get("tiradaId") ?? "");
  if (!tiradaId) return;

  // Granularidad elegida al apuntarse; si no llega válida, la del perfil.
  const elegida = String(formData.get("granularity") ?? "");
  const granularity = (GRANULARIDADES as readonly string[]).includes(elegida)
    ? (elegida as (typeof GRANULARIDADES)[number])
    : profile.defaultGranularity;

  const existente = await db
    .select({ id: scorecards.id })
    .from(scorecards)
    .where(
      and(eq(scorecards.tiradaId, tiradaId), eq(scorecards.userId, user.id)),
    )
    .limit(1);

  if (existente.length === 0) {
    // Si la tirada está cerrada, no se admiten nuevos apuntes.
    const [t] = await db
      .select({ closed: tiradas.closed })
      .from(tiradas)
      .where(eq(tiradas.id, tiradaId))
      .limit(1);
    if (!t || t.closed) {
      redirect(`/tiradas/${tiradaId}`);
    }
    await db.insert(scorecards).values({
      tiradaId,
      userId: user.id,
      granularity,
    });
  }

  revalidatePath(`/tiradas/${tiradaId}`);
  redirect(`/tiradas/${tiradaId}/libreta`);
}
