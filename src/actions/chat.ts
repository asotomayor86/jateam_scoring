"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { db, chatThreads, chatMessages, chatMentions } from "@/db";
import { purgarChat } from "@/db/queries/chat";
import { enviarPush } from "@/lib/push";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

function recorta(s: string, n = 120): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Guarda a quién menciona (@) un mensaje y devuelve esos ids. No falla el envío. */
async function guardarMenciones(
  messageId: string,
  formData: FormData,
): Promise<string[]> {
  try {
    const ids = JSON.parse(String(formData.get("mentions") ?? "[]"));
    if (!Array.isArray(ids)) return [];
    const limpios = [...new Set(ids.filter((x) => typeof x === "string" && x))].slice(0, 20);
    if (limpios.length === 0) return [];
    await db
      .insert(chatMentions)
      .values(limpios.map((userId) => ({ messageId, userId })))
      .onConflictDoNothing();
    return limpios;
  } catch (e) {
    console.error("guardarMenciones error:", e);
    return [];
  }
}

const esquemaHilo = z.object({
  title: z.string().trim().min(1, "Ponle un título").max(120),
  body: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Crea un hilo (con un primer mensaje opcional) y redirige a su detalle. */
export async function crearHilo(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user, profile } = await requireUser();
  const autor = profile.nickname || profile.displayName;
  const parsed = esquemaHilo.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  await purgarChat();

  let nuevoId: string;
  try {
    const [fila] = await db
      .insert(chatThreads)
      .values({ title: parsed.data.title, createdBy: user.id })
      .returning({ id: chatThreads.id });
    nuevoId = fila.id;
    if (parsed.data.body) {
      const [msg] = await db
        .insert(chatMessages)
        .values({ threadId: nuevoId, userId: user.id, body: parsed.data.body })
        .returning({ id: chatMessages.id });
      const mencionados = await guardarMenciones(msg.id, formData);
      await enviarPush(
        mencionados.filter((id) => id !== user.id),
        {
          title: `${autor} te mencionó`,
          body: recorta(parsed.data.body),
          url: `/chat/${nuevoId}`,
          tag: `chat-${nuevoId}`,
        },
      );
    }
  } catch (e) {
    console.error("crearHilo error:", e);
    return { ok: false, mensaje: "No se pudo crear el hilo" };
  }

  revalidatePath("/chat");
  redirect(`/chat/${nuevoId}`);
}

const esquemaMensaje = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1, "Escribe algo").max(2000),
});

/** Añade un mensaje a un hilo y actualiza su última actividad. */
export async function responder(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { user, profile } = await requireUser();
  const autor = profile.nickname || profile.displayName;
  const parsed = esquemaMensaje.safeParse({
    threadId: formData.get("threadId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  // El hilo debe existir (y no haber caducado).
  const [hilo] = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(eq(chatThreads.id, d.threadId))
    .limit(1);
  if (!hilo) return { ok: false, mensaje: "El hilo ya no existe" };

  try {
    const [msg] = await db
      .insert(chatMessages)
      .values({ threadId: d.threadId, userId: user.id, body: d.body })
      .returning({ id: chatMessages.id });
    const mencionados = await guardarMenciones(msg.id, formData);
    await db
      .update(chatThreads)
      .set({ lastActivityAt: sql`now()` })
      .where(eq(chatThreads.id, d.threadId));
    await enviarPush(
      mencionados.filter((id) => id !== user.id),
      {
        title: `${autor} te mencionó`,
        body: recorta(d.body),
        url: `/chat/${d.threadId}`,
        tag: `chat-${d.threadId}`,
      },
    );
  } catch (e) {
    console.error("responder error:", e);
    return { ok: false, mensaje: "No se pudo enviar" };
  }

  await purgarChat();
  revalidatePath(`/chat/${d.threadId}`);
  revalidatePath("/chat");
  return { ok: true };
}

/** Borra un hilo entero. Solo el encargado. */
export async function borrarHilo(formData: FormData): Promise<void> {
  const { profile } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  if (!profile.isAdmin) redirect(`/chat/${id}`);
  await db.delete(chatThreads).where(eq(chatThreads.id, id));
  revalidatePath("/chat");
  redirect("/chat");
}

/** Borra un mensaje (solo autor o encargado). */
export async function borrarMensaje(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const threadId = String(formData.get("threadId") ?? "");
  if (!id) return;
  const [msg] = await db
    .select({ userId: chatMessages.userId })
    .from(chatMessages)
    .where(eq(chatMessages.id, id))
    .limit(1);
  if (msg && (msg.userId === user.id || profile.isAdmin)) {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
  }
  if (threadId) revalidatePath(`/chat/${threadId}`);
}
