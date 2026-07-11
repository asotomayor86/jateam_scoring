"use server";

import { and, eq } from "drizzle-orm";
import { db, laserEvents, deviceSessions } from "@/db";
import { requireUser } from "@/auth/helpers";

export type EventoLaser = { x: number; y: number; s: number };

/** (Cámara) Emite un disparo detectado para que lo recoja el Control. */
export async function emitirEventoLaser(imp: EventoLaser): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  if (![imp.x, imp.y, imp.s].every((n) => Number.isFinite(n))) return { ok: false };
  await db.insert(laserEvents).values({
    userId: user.id,
    x: imp.x,
    y: imp.y,
    s: Math.round(imp.s),
  });
  return { ok: true };
}

/** (Control) Consume (y borra) los eventos pendientes del usuario, en orden. */
export async function consumirEventosLaser(): Promise<EventoLaser[]> {
  const { user } = await requireUser();
  const filas = await db
    .delete(laserEvents)
    .where(eq(laserEvents.userId, user.id))
    .returning({ x: laserEvents.x, y: laserEvents.y, s: laserEvents.s, createdAt: laserEvents.createdAt });
  return filas
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((f) => ({ x: f.x, y: f.y, s: f.s }));
}

/**
 * (Control) Marca qué serie está en captura remota (o la limpia con null). Al
 * activar, vacía la cola de eventos pendientes para no arrastrar disparos viejos.
 */
export async function fijarCaptura(
  scorecardId: string | null,
  idx: number | null,
): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  await db
    .update(deviceSessions)
    .set({ captureScorecardId: scorecardId, captureIdx: idx })
    .where(and(eq(deviceSessions.userId, user.id), eq(deviceSessions.role, "control")));
  if (scorecardId) {
    // Descarta el backlog al empezar una captura nueva.
    await db.delete(laserEvents).where(eq(laserEvents.userId, user.id));
  }
  return { ok: true };
}
