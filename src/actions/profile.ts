"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { db, profiles } from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

const esquemaPerfil = z.object({
  displayName: z.string().trim().min(2, "El nombre es obligatorio").max(40),
  nickname: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((v) => (v ? v : null)),
  defaultGranularity: z.enum([
    "tiro",
    "bloque5",
    "bloque10",
    "serie",
    "asistido",
  ]),
});

/** Actualiza el perfil del usuario actual (nombre, apodo y preferencia). */
export async function guardarPerfil(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user } = await requireUser();

  const parsed = esquemaPerfil.safeParse({
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname"),
    defaultGranularity: formData.get("defaultGranularity"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  await db
    .update(profiles)
    .set(parsed.data)
    .where(eq(profiles.id, user.id));

  revalidatePath("/perfil");
  return { ok: true, mensaje: "Perfil guardado" };
}
