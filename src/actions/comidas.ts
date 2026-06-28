"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { db, comidas, comidaAttendees } from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

const esquemaComida = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora no válida")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  restaurantId: z.string().uuid("Elige un restaurante"),
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

/** Crea una comida y redirige a su detalle. */
export async function crearComida(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user } = await requireUser();

  const parsed = esquemaComida.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    restaurantId: formData.get("restaurantId"),
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  let nuevoId: string;
  try {
    const [fila] = await db
      .insert(comidas)
      .values({ ...parsed.data, createdBy: user.id })
      .returning({ id: comidas.id });
    nuevoId = fila.id;
  } catch (e) {
    console.error("crearComida error:", e);
    return { ok: false, mensaje: "No se pudo crear la comida" };
  }

  revalidatePath("/comidas");
  revalidatePath("/calendario");
  redirect(`/comidas/${nuevoId}`);
}

/** Borra una comida (solo quien la creó o el encargado). */
export async function borrarComida(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [c] = await db
    .select({ createdBy: comidas.createdBy })
    .from(comidas)
    .where(eq(comidas.id, id))
    .limit(1);
  if (!c) return;
  if (c.createdBy !== user.id && !profile.isAdmin) return;

  await db.delete(comidas).where(eq(comidas.id, id));
  revalidatePath("/comidas");
  revalidatePath("/calendario");
  redirect("/comidas");
}

/** Apuntarse a una comida. */
export async function apuntarmeComida(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const comidaId = String(formData.get("comidaId") ?? "");
  if (!comidaId) return;

  await db
    .insert(comidaAttendees)
    .values({ comidaId, userId: user.id })
    .onConflictDoNothing();

  revalidatePath(`/comidas/${comidaId}`);
}

/** Desapuntarse de una comida. */
export async function desapuntarmeComida(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const comidaId = String(formData.get("comidaId") ?? "");
  if (!comidaId) return;

  await db
    .delete(comidaAttendees)
    .where(
      and(
        eq(comidaAttendees.comidaId, comidaId),
        eq(comidaAttendees.userId, user.id),
      ),
    );

  revalidatePath(`/comidas/${comidaId}`);
}
