"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { db, chatThreads, chatMessages } from "@/db";
import { purgarChat } from "@/db/queries/chat";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

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
  const { user } = await requireUser();
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
      await db.insert(chatMessages).values({
        threadId: nuevoId,
        userId: user.id,
        body: parsed.data.body,
      });
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
  const { user } = await requireUser();
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
    await db
      .insert(chatMessages)
      .values({ threadId: d.threadId, userId: user.id, body: d.body });
    await db
      .update(chatThreads)
      .set({ lastActivityAt: sql`now()` })
      .where(eq(chatThreads.id, d.threadId));
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
