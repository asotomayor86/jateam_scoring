import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db, pushSubscriptions } from "@/db";

let configurado = false;
function configura(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || "mailto:noreply@jateam.app";
  if (!pub || !priv) return false;
  if (!configurado) {
    webpush.setVapidDetails(sub, pub, priv);
    configurado = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Envía una notificación push a todos los dispositivos de los usuarios dados.
 * Borra las suscripciones caducadas (404/410). Nunca lanza (el envío es
 * "best effort": no debe tumbar la acción que lo dispara).
 */
export async function enviarPush(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  try {
    if (!configura()) return;
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return;

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, ids));
    if (subs.length === 0) return;

    const data = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
        } catch (e: unknown) {
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, s.id));
          } else {
            console.error("enviarPush fallo:", code);
          }
        }
      }),
    );
  } catch (e) {
    console.error("enviarPush error:", e);
  }
}
