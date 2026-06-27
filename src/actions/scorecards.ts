"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import { redondea1 } from "@/lib/scoring";
import { db, scorecards, series } from "@/db";

export type ResultadoSerie = {
  ok: boolean;
  mensaje?: string;
  total?: number;
  innerCount?: number;
};

/** Comprueba que la hoja existe, es del usuario y está en borrador. */
async function hojaEditable(scorecardId: string, userId: string) {
  const [hoja] = await db
    .select({ id: scorecards.id, userId: scorecards.userId, status: scorecards.status, tiradaId: scorecards.tiradaId })
    .from(scorecards)
    .where(eq(scorecards.id, scorecardId))
    .limit(1);
  if (!hoja || hoja.userId !== userId) return null;
  return hoja;
}

/** Recalcula total y dieces de la hoja a partir de sus series. */
async function recalcular(scorecardId: string) {
  const filas = await db
    .select({ subtotal: series.subtotal, inner: series.inner })
    .from(series)
    .where(eq(series.scorecardId, scorecardId));
  const total = redondea1(filas.reduce((a, r) => a + r.subtotal, 0));
  const innerCount = filas.reduce((a, r) => a + r.inner, 0);
  await db
    .update(scorecards)
    .set({ total, innerCount })
    .where(eq(scorecards.id, scorecardId));
  return { total, innerCount };
}

const esquemaSerie = z.object({
  scorecardId: z.string().uuid(),
  idx: z.number().int().min(1).max(100),
  shots: z.array(z.number().min(0).max(11)).nullable(),
  shotCount: z.number().int().min(1).max(50),
  subtotal: z.number().min(0).max(600),
  inner: z.number().int().min(0).max(50),
});

/**
 * Crea o actualiza una serie (autosave). Devuelve el total y los dieces
 * actualizados de la hoja para refrescar la UI sin recargar.
 */
export async function guardarSerie(
  input: z.input<typeof esquemaSerie>,
): Promise<ResultadoSerie> {
  const { user } = await requireUser();

  const parsed = esquemaSerie.safeParse(input);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  const hoja = await hojaEditable(d.scorecardId, user.id);
  if (!hoja) return { ok: false, mensaje: "No puedes editar esta hoja" };

  try {
    await db
      .insert(series)
      .values({
        scorecardId: d.scorecardId,
        idx: d.idx,
        shots: d.shots,
        shotCount: d.shotCount,
        subtotal: redondea1(d.subtotal),
        inner: d.inner,
      })
      .onConflictDoUpdate({
        target: [series.scorecardId, series.idx],
        set: {
          shots: d.shots,
          shotCount: d.shotCount,
          subtotal: redondea1(d.subtotal),
          inner: d.inner,
        },
      });
  } catch (e) {
    console.error("guardarSerie error:", e);
    return { ok: false, mensaje: "No se pudo guardar la serie" };
  }

  const { total, innerCount } = await recalcular(d.scorecardId);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, total, innerCount };
}

/** Borra una serie y recalcula. */
export async function borrarSerie(input: {
  scorecardId: string;
  idx: number;
}): Promise<ResultadoSerie> {
  const { user } = await requireUser();
  const hoja = await hojaEditable(input.scorecardId, user.id);
  if (!hoja) return { ok: false, mensaje: "No puedes editar esta hoja" };

  await db
    .delete(series)
    .where(
      and(
        eq(series.scorecardId, input.scorecardId),
        eq(series.idx, input.idx),
      ),
    );
  const { total, innerCount } = await recalcular(input.scorecardId);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, total, innerCount };
}

/** Marca la hoja como finalizada (deja de poder editarse). */
export async function finalizarHoja(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = String(formData.get("scorecardId") ?? "");
  const hoja = await hojaEditable(id, user.id);
  if (!hoja) return;
  await db
    .update(scorecards)
    .set({ status: "finalizada" })
    .where(eq(scorecards.id, id));
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  redirect(`/tiradas/${hoja.tiradaId}`);
}

/** Reabre una hoja finalizada (vuelve a borrador para corregir). */
export async function reabrirHoja(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = String(formData.get("scorecardId") ?? "");
  const [hoja] = await db
    .select({ userId: scorecards.userId, tiradaId: scorecards.tiradaId })
    .from(scorecards)
    .where(eq(scorecards.id, id))
    .limit(1);
  if (!hoja || hoja.userId !== user.id) return;
  await db
    .update(scorecards)
    .set({ status: "borrador" })
    .where(eq(scorecards.id, id));
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  redirect(`/tiradas/${hoja.tiradaId}/libreta`);
}

/** Desapuntarse: borra la hoja propia (y sus series en cascada). */
export async function borrarHoja(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = String(formData.get("scorecardId") ?? "");
  const [hoja] = await db
    .select({ userId: scorecards.userId, tiradaId: scorecards.tiradaId })
    .from(scorecards)
    .where(eq(scorecards.id, id))
    .limit(1);
  if (!hoja || hoja.userId !== user.id) return;
  await db.delete(scorecards).where(eq(scorecards.id, id));
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  redirect(`/tiradas/${hoja.tiradaId}`);
}
