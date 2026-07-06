"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { db, pushSubscriptions } from "@/db";

const esquemaSub = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().max(500),
  auth: z.string().max(500),
});

/** Guarda (o refresca) la suscripción push del dispositivo actual. */
export async function guardarSuscripcion(
  input: z.input<typeof esquemaSub>,
): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  const parsed = esquemaSub.safeParse(input);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  try {
    await db
      .insert(pushSubscriptions)
      .values({ userId: user.id, endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId: user.id, p256dh: d.p256dh, auth: d.auth },
      });
    return { ok: true };
  } catch (e) {
    console.error("guardarSuscripcion error:", e);
    return { ok: false };
  }
}

/** Borra la suscripción de este dispositivo (al desactivar). */
export async function borrarSuscripcion(endpoint: string): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  try {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, user.id),
        ),
      );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
