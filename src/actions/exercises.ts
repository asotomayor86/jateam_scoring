"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth/helpers";
import { db, exercises } from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

const opcional = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v ? v : null));

const esquema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1, "El código es obligatorio").max(20),
  title: z.string().trim().min(2, "El título es obligatorio").max(160),
  tipologia: z.string().trim().min(2, "La tipología es obligatoria").max(80),
  objetivo: opcional,
  material: opcional,
  ejecucion: opcional,
  freqIniciacion: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
  freqNacional: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
  errores: opcional,
  progresion: opcional,
  metrica: opcional,
  claves: opcional,
});

function parse(formData: FormData) {
  return esquema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    title: formData.get("title"),
    tipologia: formData.get("tipologia"),
    objetivo: formData.get("objetivo"),
    material: formData.get("material"),
    ejecucion: formData.get("ejecucion"),
    freqIniciacion: formData.get("freqIniciacion"),
    freqNacional: formData.get("freqNacional"),
    errores: formData.get("errores"),
    progresion: formData.get("progresion"),
    metrica: formData.get("metrica"),
    claves: formData.get("claves"),
  });
}

/** Crea o edita un ejercicio (solo encargado). */
export async function guardarEjercicio(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { id, ...datos } = parsed.data;

  let destinoId = id;
  try {
    if (id) {
      await db.update(exercises).set(datos).where(eq(exercises.id, id));
    } else {
      const [fila] = await db
        .insert(exercises)
        .values(datos)
        .returning({ id: exercises.id });
      destinoId = fila.id;
    }
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("unique");
    return {
      ok: false,
      mensaje: dup ? "Ya existe un ejercicio con ese código" : "No se pudo guardar",
    };
  }

  revalidatePath("/ejercicios");
  revalidatePath(`/ejercicios/${destinoId}`);
  redirect(`/ejercicios/${destinoId}`);
}

/** Borra un ejercicio (solo encargado). */
export async function borrarEjercicio(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(exercises).where(eq(exercises.id, id));
  revalidatePath("/ejercicios");
  redirect("/ejercicios");
}
