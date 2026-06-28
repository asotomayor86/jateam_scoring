"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/auth/server";
import { requireAdmin } from "@/auth/helpers";
import { getMiembro } from "@/db/queries/members";
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

// --- Editar el perfil de un miembro (encargado) ------------------------------

const esquemaPerfilAdmin = z.object({
  userId: z.string().min(1),
  displayName: z.string().trim().min(2, "El nombre es obligatorio").max(40),
  nickname: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((v) => (v ? v : null)),
  defaultGranularity: z.enum(["tiro", "bloque5", "bloque10", "serie", "asistido"]),
  isAdmin: z.boolean(),
});

/**
 * Actualiza el perfil de cualquier miembro (solo encargado). Si cambia la marca
 * de encargado, sincroniza también el rol en Neon Auth (necesario para que un
 * encargado pueda invitar/gestionar).
 */
export async function actualizarPerfilAdmin(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();

  const parsed = esquemaPerfilAdmin.safeParse({
    userId: formData.get("userId"),
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname"),
    defaultGranularity: formData.get("defaultGranularity"),
    isAdmin: formData.get("isAdmin") === "on" || formData.get("isAdmin") === "true",
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { userId, displayName, nickname, defaultGranularity, isAdmin } =
    parsed.data;

  await db
    .update(profiles)
    .set({ displayName, nickname, defaultGranularity, isAdmin })
    .where(eq(profiles.id, userId));

  // Sincroniza el rol en Neon Auth (mejor esfuerzo).
  try {
    await getAuth().admin.setRole({
      userId,
      role: isAdmin ? "admin" : "user",
    });
  } catch (e) {
    console.error("actualizarPerfilAdmin setRole error:", e);
  }

  revalidatePath("/miembros");
  revalidatePath(`/miembros/${userId}`);
  return { ok: true, mensaje: "Perfil actualizado" };
}

// --- Reenviar invitación / restablecer contraseña (encargado) ----------------

/**
 * Vuelve a enviar a un miembro el email para fijar/restablecer su contraseña.
 */
export async function reenviarInvitacion(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, mensaje: "Falta el usuario" };

  const miembro = await getMiembro(userId);
  if (!miembro?.email) {
    return { ok: false, mensaje: "No se encontró el email del miembro" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    const { error } = await getAuth().requestPasswordReset({
      email: miembro.email,
      redirectTo: `${appUrl}/restablecer`,
    });
    if (error) {
      return { ok: false, mensaje: "No se pudo enviar el email" };
    }
  } catch (e) {
    console.error("reenviarInvitacion error:", e);
    return { ok: false, mensaje: "No se pudo enviar el email" };
  }

  return {
    ok: true,
    mensaje: `Email enviado a ${miembro.email}.`,
  };
}
