"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuth } from "@/auth/server";
import { requireAdmin } from "@/auth/helpers";
import { db, profiles } from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

/** Genera una contraseña temporal robusta (el invitado la cambiará por email). */
function passwordTemporal(): string {
  return randomBytes(18).toString("base64url");
}

const esquemaInvitar = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  displayName: z.string().trim().min(2, "El nombre es obligatorio").max(40),
  nickname: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Invita a un nuevo tirador (solo el encargado). Crea la cuenta vía el Admin
 * plugin de Neon Auth y su fila en `profiles`, y le envía un email para que fije
 * su contraseña (enlace a /restablecer).
 */
export async function invitarUsuario(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();

  const parsed = esquemaInvitar.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { email, displayName, nickname } = parsed.data;

  let nuevoId: string;
  try {
    const { data, error } = await getAuth().admin.createUser({
      email,
      name: displayName,
      password: passwordTemporal(),
      role: "user",
    });

    if (error || !data?.user?.id) {
      return {
        ok: false,
        mensaje: error?.message ?? "No se pudo crear la cuenta",
      };
    }
    nuevoId = data.user.id;

    await db
      .insert(profiles)
      .values({ id: nuevoId, displayName, nickname })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { displayName, nickname },
      });
  } catch (e) {
    console.error("invitarUsuario error:", e);
    const detalle = e instanceof Error ? e.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo invitar: ${detalle}` };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let correoEnviado = true;
  try {
    const { error } = await getAuth().requestPasswordReset({
      email,
      redirectTo: `${appUrl}/restablecer`,
    });
    if (error) correoEnviado = false;
  } catch (e) {
    console.error("invitarUsuario requestPasswordReset error:", e);
    correoEnviado = false;
  }

  revalidatePath("/miembros");
  return {
    ok: true,
    mensaje: correoEnviado
      ? `Invitado ${displayName}. Le hemos enviado un email a ${email} para que cree su contraseña.`
      : `Invitado ${displayName}, pero no se pudo enviar el email. Dile que entre y use «He olvidado mi contraseña» con ${email}.`,
  };
}
