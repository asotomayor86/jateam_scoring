"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth/helpers";
import { db, restaurants, comidas } from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

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

/** Crea un restaurante (solo encargado). */
export async function crearRestaurante(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user } = await requireAdmin();

  const parsed = esquema.safeParse({
    name: formData.get("name"),
    abbr: formData.get("abbr"),
    mapsUrl: formData.get("mapsUrl"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  try {
    await db.insert(restaurants).values({
      name: parsed.data.name,
      abbr: parsed.data.abbr.toUpperCase(),
      mapsUrl: parsed.data.mapsUrl,
      createdBy: user.id,
    });
  } catch (e) {
    console.error("crearRestaurante error:", e);
    return { ok: false, mensaje: "No se pudo crear el restaurante" };
  }

  revalidatePath("/restaurantes");
  revalidatePath("/comidas/nueva");
  return { ok: true, mensaje: `Restaurante «${parsed.data.name}» añadido` };
}

/** Actualiza un restaurante (solo encargado). */
export async function actualizarRestaurante(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = esquema.safeParse({
    name: formData.get("name"),
    abbr: formData.get("abbr"),
    mapsUrl: formData.get("mapsUrl"),
  });
  if (!id || !parsed.success) return;

  await db
    .update(restaurants)
    .set({
      name: parsed.data.name,
      abbr: parsed.data.abbr.toUpperCase(),
      mapsUrl: parsed.data.mapsUrl,
    })
    .where(eq(restaurants.id, id));

  revalidatePath("/restaurantes");
  revalidatePath("/comidas/nueva");
}

/** Borra un restaurante, solo si ninguna comida lo usa (FK restrict). */
export async function borrarRestaurante(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const enUso = await db
    .select({ id: comidas.id })
    .from(comidas)
    .where(eq(comidas.restaurantId, id))
    .limit(1);
  if (enUso.length > 0) return;

  await db.delete(restaurants).where(eq(restaurants.id, id));
  revalidatePath("/restaurantes");
  revalidatePath("/comidas/nueva");
}
