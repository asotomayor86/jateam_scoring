import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, chatMessages, tiradas } from "@/db";

/**
 * Contadores de "nuevos" para el menú: mensajes de chat de otros desde la última
 * visita, y tiradas/entrenos públicos de otros desde la última visita.
 */
export async function getBadges(
  userId: string,
  chatSeenAt: Date,
  tiradasSeenAt: Date,
): Promise<{ chat: number; tiradas: number }> {
  const [chatRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(
      and(
        gt(chatMessages.createdAt, chatSeenAt),
        sql`${chatMessages.userId} is distinct from ${userId}`,
        gt(chatMessages.createdAt, sql`now() - interval '3 months'`),
      ),
    );
  const [tirRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tiradas)
    .where(
      and(
        gt(tiradas.createdAt, tiradasSeenAt),
        sql`${tiradas.createdBy} is distinct from ${userId}`,
        eq(tiradas.isPublic, true),
      ),
    );
  return { chat: chatRow?.n ?? 0, tiradas: tirRow?.n ?? 0 };
}
