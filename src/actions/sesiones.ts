"use server";

import { and, eq, ne } from "drizzle-orm";
import { db, deviceSessions } from "@/db";
import { requireUser } from "@/auth/helpers";

export type SesionInfo = {
  id: string;
  role: "control" | "camara" | null;
  esEste: boolean;
};

export type EstadoSesiones = {
  miRol: "control" | "camara" | null;
  necesitaRol: boolean;
  bloqueada: boolean; // cámara en conflicto (hay más de una)
  laserBloqueado: boolean; // el Control debe bloquear el láser local
  cerrada: boolean; // esta sesión fue cerrada (por el otro dispositivo)
  capturaActiva: boolean; // el Control tiene una serie en captura remota
  total: number;
  sesiones: SesionInfo[];
};

function rolValido(r: string | null): "control" | "camara" | null {
  return r === "control" || r === "camara" ? r : null;
}

/** Estado de las sesiones del usuario tal como lo ve el dispositivo `token`. */
async function leerEstado(userId: string, token: string): Promise<EstadoSesiones> {
  const activas = await db
    .select()
    .from(deviceSessions)
    .where(and(eq(deviceSessions.userId, userId), eq(deviceSessions.active, true)));

  // Fila de este dispositivo (activa o no) para detectar cierre por el otro.
  const [miFila] = await db
    .select()
    .from(deviceSessions)
    .where(and(eq(deviceSessions.userId, userId), eq(deviceSessions.deviceToken, token)))
    .limit(1);

  const este = activas.find((f) => f.deviceToken === token);
  const total = activas.length;
  const camaras = activas.filter((f) => rolValido(f.role) === "camara");
  const conflicto = camaras.length > 1;
  const miRol = rolValido(este?.role ?? null);
  const hayCamaraValida = camaras.length === 1;

  return {
    miRol,
    necesitaRol: total >= 2 && !!este && miRol === null,
    bloqueada: miRol === "camara" && conflicto,
    laserBloqueado: total >= 2 && miRol !== "camara" && hayCamaraValida,
    cerrada: !!miFila && !miFila.active,
    // Captura activa solo si algún Control la fijó y sigue "vivo" (latido reciente).
    capturaActiva: activas.some(
      (f) => f.captureScorecardId != null && Date.now() - f.lastSeenAt.getTime() < 30000,
    ),
    total,
    sesiones: activas
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((f) => ({ id: f.id, role: rolValido(f.role), esEste: f.deviceToken === token })),
  };
}

/** Registra/activa este dispositivo (al abrir la app o al reabrir tras un cierre). */
export async function registrarDispositivo(deviceToken: string): Promise<EstadoSesiones> {
  const { user } = await requireUser();
  const token = deviceToken.slice(0, 80);
  await db
    .insert(deviceSessions)
    .values({ userId: user.id, deviceToken: token, active: true })
    .onConflictDoUpdate({
      target: [deviceSessions.userId, deviceSessions.deviceToken],
      set: { active: true, lastSeenAt: new Date() },
    });
  return leerEstado(user.id, token);
}

/**
 * Latido de solo lectura (polling): actualiza "visto por última vez" SOLO si la
 * sesión sigue activa (no reactiva una cerrada) y devuelve el estado.
 */
export async function estadoSesiones(deviceToken: string): Promise<EstadoSesiones> {
  const { user } = await requireUser();
  const token = deviceToken.slice(0, 80);
  await db
    .update(deviceSessions)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(deviceSessions.userId, user.id),
        eq(deviceSessions.deviceToken, token),
        eq(deviceSessions.active, true),
      ),
    );
  return leerEstado(user.id, token);
}

/**
 * Elige el modo de este dispositivo:
 *  - "unico": cierra TODAS las demás sesiones (queda como dispositivo único).
 *  - "control"/"camara": fija el rol y cierra cualquier OTRA sesión con ese mismo
 *    rol (solo puede haber un Control y una Cámara).
 */
export async function elegirRol(
  deviceToken: string,
  rol: "control" | "camara" | "unico",
): Promise<EstadoSesiones> {
  const { user } = await requireUser();
  const token = deviceToken.slice(0, 80);

  if (rol === "unico") {
    // Cierra las demás sesiones activas del usuario.
    await db
      .update(deviceSessions)
      .set({ active: false, role: null })
      .where(
        and(
          eq(deviceSessions.userId, user.id),
          eq(deviceSessions.active, true),
          ne(deviceSessions.deviceToken, token),
        ),
      );
    // Esta queda sin rol (dispositivo único, sin restricciones).
    await db
      .update(deviceSessions)
      .set({ role: null, lastSeenAt: new Date() })
      .where(and(eq(deviceSessions.userId, user.id), eq(deviceSessions.deviceToken, token)));
    return leerEstado(user.id, token);
  }

  await db
    .update(deviceSessions)
    .set({ role: rol, lastSeenAt: new Date() })
    .where(and(eq(deviceSessions.userId, user.id), eq(deviceSessions.deviceToken, token)));
  // Solo un dispositivo por rol: cierra las otras que tengan el mismo rol.
  await db
    .update(deviceSessions)
    .set({ active: false, role: null })
    .where(
      and(
        eq(deviceSessions.userId, user.id),
        eq(deviceSessions.active, true),
        ne(deviceSessions.deviceToken, token),
        eq(deviceSessions.role, rol),
      ),
    );
  return leerEstado(user.id, token);
}

/** Cierra una sesión (la propia o la del otro dispositivo del mismo usuario). */
export async function cerrarSesion(sessionId: string): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  await db
    .update(deviceSessions)
    .set({ active: false, role: null })
    .where(and(eq(deviceSessions.id, sessionId), eq(deviceSessions.userId, user.id)));
  return { ok: true };
}
