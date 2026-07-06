import "server-only";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db, chatThreads, chatMessages, profiles } from "@/db";

/** Miembros para el desplegable de menciones (@). */
export async function getMiembrosMencion() {
  return db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(profiles)
    .orderBy(asc(profiles.displayName));
}

// Antigüedad máxima que se conserva. Todo lo anterior se oculta al leer y se
// purga físicamente de forma perezosa.
const CADUCA = sql`now() - interval '3 months'`;

/**
 * Purga perezosa: borra los mensajes de más de 3 meses y los hilos sin
 * actividad reciente (con sus mensajes en cascada). Se llama al listar y al
 * publicar, así no hace falta un cron.
 */
export async function purgarChat() {
  await db.delete(chatMessages).where(sql`${chatMessages.createdAt} < ${CADUCA}`);
  await db.delete(chatThreads).where(sql`${chatThreads.lastActivityAt} < ${CADUCA}`);
}

/** Hilos con actividad en los últimos 3 meses (autor, nº de mensajes, preview). */
export async function listThreads() {
  await purgarChat();
  return db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      createdBy: chatThreads.createdBy,
      lastActivityAt: chatThreads.lastActivityAt,
      autorNombre: profiles.displayName,
      autorApodo: profiles.nickname,
      mensajes: sql<number>`(
        select count(*)::int from ${chatMessages}
        where ${chatMessages.threadId} = ${chatThreads.id}
          and ${chatMessages.createdAt} > ${CADUCA}
      )`,
      ultimoMensaje: sql<string | null>`(
        select ${chatMessages.body} from ${chatMessages}
        where ${chatMessages.threadId} = ${chatThreads.id}
          and ${chatMessages.createdAt} > ${CADUCA}
        order by ${chatMessages.createdAt} desc limit 1
      )`,
    })
    .from(chatThreads)
    .leftJoin(profiles, eq(chatThreads.createdBy, profiles.id))
    .where(gt(chatThreads.lastActivityAt, CADUCA))
    .orderBy(desc(chatThreads.lastActivityAt));
}

/** Cabecera de un hilo (con autor). `null` si no existe o ya caducó. */
export async function getThread(id: string) {
  const [row] = await db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      createdBy: chatThreads.createdBy,
      createdAt: chatThreads.createdAt,
      autorNombre: profiles.displayName,
      autorApodo: profiles.nickname,
    })
    .from(chatThreads)
    .leftJoin(profiles, eq(chatThreads.createdBy, profiles.id))
    .where(and(eq(chatThreads.id, id), gt(chatThreads.lastActivityAt, CADUCA)))
    .limit(1);
  return row ?? null;
}

/** Mensajes de un hilo (últimos 3 meses), del más antiguo al más nuevo. */
export async function getMessages(threadId: string) {
  return db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      userId: chatMessages.userId,
      autorNombre: profiles.displayName,
      autorApodo: profiles.nickname,
    })
    .from(chatMessages)
    .leftJoin(profiles, eq(chatMessages.userId, profiles.id))
    .where(
      and(eq(chatMessages.threadId, threadId), gt(chatMessages.createdAt, CADUCA)),
    )
    .orderBy(asc(chatMessages.createdAt));
}
