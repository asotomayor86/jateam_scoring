"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth/helpers";
import {
  redondea1,
  puntosDeRecuento,
  tirosDeRecuento,
  restaRecuentos,
  ASISTIDO_VALORES,
} from "@/lib/scoring";
import { DIANA_25M, radio, esDiezInterior } from "@/lib/diana";
import { db, scorecards, series } from "@/db";

export type SerieCalculada = { idx: number; subtotal: number; shotCount: number };

export type ResultadoSerie = {
  ok: boolean;
  mensaje?: string;
  total?: number;
  innerCount?: number;
  series?: SerieCalculada[];
};

/** Comprueba que la hoja existe, es del usuario y está en borrador. */
async function hojaEditable(scorecardId: string, userId: string) {
  const [hoja] = await db
    .select({
      id: scorecards.id,
      userId: scorecards.userId,
      status: scorecards.status,
      tiradaId: scorecards.tiradaId,
      granularity: scorecards.granularity,
    })
    .from(scorecards)
    .where(eq(scorecards.id, scorecardId))
    .limit(1);
  if (!hoja || hoja.userId !== userId) return null;
  return hoja;
}

const CEROS = () => ASISTIDO_VALORES.map(() => 0);

/**
 * Recalcula la hoja a partir de sus series y actualiza total/dieces.
 * - Modo "asistido": las series guardan el recuento ACUMULADO en la diana; el
 *   subtotal de cada serie se deriva restando el acumulado de la serie anterior
 *   del mismo blanco (los blancos nuevos reinician el acumulado). Se reescriben
 *   los subtotales derivados de cada fila.
 * - Resto de modos: el subtotal de cada serie ya es definitivo; solo se suman.
 */
async function recomputar(
  scorecardId: string,
  granularity: string,
): Promise<{ total: number; innerCount: number; series: SerieCalculada[] }> {
  const filas = await db
    .select()
    .from(series)
    .where(eq(series.scorecardId, scorecardId))
    .orderBy(asc(series.idx));

  // Ajuste manual del árbitro (se suma al total final).
  const [hoja] = await db
    .select({ adjustment: scorecards.adjustment })
    .from(scorecards)
    .where(eq(scorecards.id, scorecardId))
    .limit(1);
  const ajuste = hoja?.adjustment ?? 0;

  const calculadas: SerieCalculada[] = [];

  if (granularity === "asistido") {
    let prev = CEROS();
    let total = 0;
    let innerCount = 0;
    for (const f of filas) {
      // Las filas de "ejercicio" no puntúan ni afectan al blanco.
      if (f.exerciseId) {
        if (f.subtotal !== 0 || f.shotCount !== 0 || f.inner !== 0) {
          await db
            .update(series)
            .set({ subtotal: 0, shotCount: 0, inner: 0 })
            .where(eq(series.id, f.id));
        }
        calculadas.push({ idx: f.idx, subtotal: 0, shotCount: 0 });
        continue;
      }
      // Series apuntadas con la diana: sus buckets son su histograma PROPIO
      // (incremental). Puntúan directamente, sin restar ni avanzar el acumulado
      // del blanco (los impactos previos se muestran en gris en el cliente).
      if (f.impacts && f.impacts.length > 0) {
        const own = f.buckets ?? CEROS();
        const subtotal = puntosDeRecuento(own);
        const shotCount = tirosDeRecuento(own);
        const inner = own[0] || 0;
        total += subtotal;
        innerCount += inner;
        if (f.subtotal !== subtotal || f.shotCount !== shotCount || f.inner !== inner) {
          await db
            .update(series)
            .set({ subtotal, shotCount, inner })
            .where(eq(series.id, f.id));
        }
        calculadas.push({ idx: f.idx, subtotal, shotCount });
        continue;
      }
      const acumulado = f.buckets ?? CEROS();
      if (f.blancoNuevo) prev = CEROS();
      const incremental = restaRecuentos(acumulado, prev);
      const subtotal = puntosDeRecuento(incremental);
      const shotCount = tirosDeRecuento(incremental);
      const inner = incremental[0] || 0; // nº de dieces (desempate)
      prev = acumulado;
      total += subtotal;
      innerCount += inner;
      // Persiste los valores derivados si cambiaron.
      if (f.subtotal !== subtotal || f.shotCount !== shotCount || f.inner !== inner) {
        await db
          .update(series)
          .set({ subtotal, shotCount, inner })
          .where(eq(series.id, f.id));
      }
      calculadas.push({ idx: f.idx, subtotal, shotCount });
    }
    total = redondea1(total + ajuste);
    await db
      .update(scorecards)
      .set({ total, innerCount })
      .where(eq(scorecards.id, scorecardId));
    return { total, innerCount, series: calculadas };
  }

  // Modos normales: el subtotal ya es el definitivo.
  const total = redondea1(
    filas.reduce((a, r) => a + r.subtotal, 0) + ajuste,
  );
  const innerCount = filas.reduce((a, r) => a + r.inner, 0);
  for (const f of filas) {
    calculadas.push({ idx: f.idx, subtotal: f.subtotal, shotCount: f.shotCount });
  }
  await db
    .update(scorecards)
    .set({ total, innerCount })
    .where(eq(scorecards.id, scorecardId));
  return { total, innerCount, series: calculadas };
}

// Impactos sobre la diana (mm desde el centro + puntuación). Reutilizado por
// varios modos: cuando una serie se apunta con la diana gráfica.
const impactosSchema = z
  .array(
    z.object({
      x: z.number().min(-400).max(400),
      y: z.number().min(-400).max(400),
      s: z.number().int().min(0).max(10),
    }),
  )
  .max(60);

const esquemaSerie = z.object({
  scorecardId: z.string().uuid(),
  idx: z.number().int().min(1).max(100),
  shots: z.array(z.number().min(0).max(11)).nullable(),
  shotCount: z.number().int().min(1).max(50),
  subtotal: z.number().min(0).max(600),
  inner: z.number().int().min(0).max(50),
  // Solo entrenamiento modular: tipo de módulo de la serie.
  moduleType: z.string().max(20).nullable().optional(),
  // Si la serie se apuntó con la diana gráfica: sus impactos (o null si no).
  impacts: impactosSchema.nullable().optional(),
});

/**
 * Crea o actualiza una serie en modos normales (tiro a tiro / total). Devuelve
 * el total y los dieces actualizados para refrescar la UI sin recargar.
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
  if (!hoja || hoja.status !== "borrador") {
    return { ok: false, mensaje: "No puedes editar esta hoja" };
  }

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
        moduleType: d.moduleType ?? null,
        impacts: d.impacts ?? null,
      })
      .onConflictDoUpdate({
        target: [series.scorecardId, series.idx],
        set: {
          shots: d.shots,
          shotCount: d.shotCount,
          subtotal: redondea1(d.subtotal),
          inner: d.inner,
          moduleType: d.moduleType ?? null,
          impacts: d.impacts ?? null,
        },
      });
  } catch (e) {
    console.error("guardarSerie error:", e);
    return { ok: false, mensaje: "No se pudo guardar la serie" };
  }

  const r = await recomputar(d.scorecardId, hoja.granularity);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, ...r };
}

const esquemaAsistida = z.object({
  scorecardId: z.string().uuid(),
  idx: z.number().int().min(1).max(100),
  blancoNuevo: z.boolean(),
  buckets: z.array(z.number().int().min(0).max(200)).length(ASISTIDO_VALORES.length),
  // Si el recuento se apuntó con la diana gráfica: sus impactos (o null si no).
  impacts: impactosSchema.nullable().optional(),
  // Solo asistido dentro de un modular: tipo de módulo (para conservarlo).
  moduleType: z.string().max(20).nullable().optional(),
});

/**
 * Crea o actualiza una serie en modo "asistido competición": guarda el recuento
 * acumulado por valor y si empieza blanco nuevo. Recalcula toda la hoja (porque
 * cada serie depende del acumulado de la anterior del mismo blanco) y devuelve
 * los subtotales derivados de todas las series.
 */
export async function guardarSerieAsistida(
  input: z.input<typeof esquemaAsistida>,
): Promise<ResultadoSerie> {
  const { user } = await requireUser();

  const parsed = esquemaAsistida.safeParse(input);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  const hoja = await hojaEditable(d.scorecardId, user.id);
  if (!hoja || hoja.status !== "borrador") {
    return { ok: false, mensaje: "No puedes editar esta hoja" };
  }

  try {
    await db
      .insert(series)
      .values({
        scorecardId: d.scorecardId,
        idx: d.idx,
        shots: null,
        shotCount: 0,
        subtotal: 0,
        inner: 0,
        blancoNuevo: d.blancoNuevo,
        buckets: d.buckets,
        impacts: d.impacts ?? null,
        moduleType: d.moduleType ?? null,
      })
      // No se toca moduleType al actualizar: se fija al crear la fila.
      .onConflictDoUpdate({
        target: [series.scorecardId, series.idx],
        set: { blancoNuevo: d.blancoNuevo, buckets: d.buckets, impacts: d.impacts ?? null },
      });
  } catch (e) {
    console.error("guardarSerieAsistida error:", e);
    return { ok: false, mensaje: "No se pudo guardar la serie" };
  }

  const r = await recomputar(d.scorecardId, hoja.granularity);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, ...r };
}

const esquemaDiana = z.object({
  scorecardId: z.string().uuid(),
  idx: z.number().int().min(1).max(100),
  impacts: impactosSchema,
  // Solo si la diana es una serie de un entrenamiento modular: tipo de módulo.
  moduleType: z.string().max(20).nullable().optional(),
});

/**
 * Crea o actualiza una serie en modo "diana": guarda los impactos (coordenadas
 * en mm + puntuación corregida) y deriva subtotal, nº de tiros y dieces
 * interiores (estos, por geometría, para el desempate). Recalcula la hoja.
 */
export async function guardarDianaSerie(
  input: z.input<typeof esquemaDiana>,
): Promise<ResultadoSerie> {
  const { user } = await requireUser();

  const parsed = esquemaDiana.safeParse(input);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  const hoja = await hojaEditable(d.scorecardId, user.id);
  if (!hoja || hoja.status !== "borrador") {
    return { ok: false, mensaje: "No puedes editar esta hoja" };
  }

  const shots = d.impacts.map((i) => i.s);
  const subtotal = redondea1(shots.reduce((a, s) => a + s, 0));
  const inner = d.impacts.filter((i) => esDiezInterior(DIANA_25M, radio(i.x, i.y))).length;

  try {
    await db
      .insert(series)
      .values({
        scorecardId: d.scorecardId,
        idx: d.idx,
        shots,
        shotCount: d.impacts.length,
        subtotal,
        inner,
        blancoNuevo: false,
        moduleType: d.moduleType ?? null,
        impacts: d.impacts,
      })
      // No se toca moduleType al actualizar: se fija al crear la fila y se conserva.
      .onConflictDoUpdate({
        target: [series.scorecardId, series.idx],
        set: { shots, shotCount: d.impacts.length, subtotal, inner, impacts: d.impacts },
      });
  } catch (e) {
    console.error("guardarDianaSerie error:", e);
    return { ok: false, mensaje: "No se pudo guardar la serie" };
  }

  const r = await recomputar(d.scorecardId, hoja.granularity);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, ...r };
}

const esquemaEjercicio = z.object({
  scorecardId: z.string().uuid(),
  idx: z.number().int().min(1).max(200),
  exerciseId: z.string().uuid(),
  rating: z.enum(["verde", "amarillo", "rojo"]).nullable(),
});

/**
 * Añade o actualiza una fila de "ejercicio" (de la biblioteca) en un
 * entrenamiento modular, con su calificación (verde/amarillo/rojo). No puntúa.
 */
export async function guardarEjercicioSerie(
  input: z.input<typeof esquemaEjercicio>,
): Promise<ResultadoSerie> {
  const { user } = await requireUser();

  const parsed = esquemaEjercicio.safeParse(input);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  const hoja = await hojaEditable(d.scorecardId, user.id);
  if (!hoja || hoja.status !== "borrador") {
    return { ok: false, mensaje: "No puedes editar esta hoja" };
  }

  try {
    await db
      .insert(series)
      .values({
        scorecardId: d.scorecardId,
        idx: d.idx,
        shots: null,
        shotCount: 0,
        subtotal: 0,
        inner: 0,
        blancoNuevo: false,
        exerciseId: d.exerciseId,
        rating: d.rating,
      })
      .onConflictDoUpdate({
        target: [series.scorecardId, series.idx],
        set: { exerciseId: d.exerciseId, rating: d.rating },
      });
  } catch (e) {
    console.error("guardarEjercicioSerie error:", e);
    return { ok: false, mensaje: "No se pudo guardar el ejercicio" };
  }

  const r = await recomputar(d.scorecardId, hoja.granularity);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, ...r };
}

/** Borra una serie y recalcula (sirve para todos los modos). */
export async function borrarSerie(input: {
  scorecardId: string;
  idx: number;
}): Promise<ResultadoSerie> {
  const { user } = await requireUser();
  const hoja = await hojaEditable(input.scorecardId, user.id);
  if (!hoja || hoja.status !== "borrador") {
    return { ok: false, mensaje: "No puedes editar esta hoja" };
  }

  await db
    .delete(series)
    .where(
      and(eq(series.scorecardId, input.scorecardId), eq(series.idx, input.idx)),
    );
  const r = await recomputar(input.scorecardId, hoja.granularity);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, ...r };
}

const esquemaAjuste = z.object({
  scorecardId: z.string().uuid(),
  adjustment: z.number().min(-600).max(600),
});

/**
 * Guarda el "ajuste final de puntuación" (suma/resta manual del árbitro) y
 * recalcula el total final de la hoja.
 */
export async function guardarAjuste(
  input: z.input<typeof esquemaAjuste>,
): Promise<ResultadoSerie> {
  const { user } = await requireUser();

  const parsed = esquemaAjuste.safeParse(input);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  const hoja = await hojaEditable(d.scorecardId, user.id);
  if (!hoja || hoja.status !== "borrador") {
    return { ok: false, mensaje: "No puedes editar esta hoja" };
  }

  await db
    .update(scorecards)
    .set({ adjustment: redondea1(d.adjustment) })
    .where(eq(scorecards.id, d.scorecardId));

  const r = await recomputar(d.scorecardId, hoja.granularity);
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  return { ok: true, ...r };
}

/**
 * Marca una hoja como finalizada. La puede cerrar su dueño o el encargado
 * (admin), por si alguien se olvida de cerrarla.
 */
export async function finalizarHoja(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("scorecardId") ?? "");
  const [hoja] = await db
    .select({ userId: scorecards.userId, tiradaId: scorecards.tiradaId })
    .from(scorecards)
    .where(eq(scorecards.id, id))
    .limit(1);
  if (!hoja) return;
  if (hoja.userId !== user.id && !profile.isAdmin) return;

  await db
    .update(scorecards)
    .set({ status: "finalizada" })
    .where(eq(scorecards.id, id));
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  redirect(`/tiradas/${hoja.tiradaId}`);
}

/** Reabre una hoja finalizada (su dueño o el encargado). */
export async function reabrirHoja(formData: FormData): Promise<void> {
  const { user, profile } = await requireUser();
  const id = String(formData.get("scorecardId") ?? "");
  const [hoja] = await db
    .select({ userId: scorecards.userId, tiradaId: scorecards.tiradaId })
    .from(scorecards)
    .where(eq(scorecards.id, id))
    .limit(1);
  if (!hoja) return;
  if (hoja.userId !== user.id && !profile.isAdmin) return;

  await db
    .update(scorecards)
    .set({ status: "borrador" })
    .where(eq(scorecards.id, id));
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  redirect(`/tiradas/${hoja.tiradaId}/libreta`);
}

/**
 * Desapuntarse: borra la hoja propia. Solo se permite si aún no se ha anotado
 * ningún punto (total = 0); una vez puntuada, la marca queda registrada.
 */
export async function borrarHoja(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = String(formData.get("scorecardId") ?? "");
  const [hoja] = await db
    .select({
      userId: scorecards.userId,
      tiradaId: scorecards.tiradaId,
      total: scorecards.total,
    })
    .from(scorecards)
    .where(eq(scorecards.id, id))
    .limit(1);
  if (!hoja || hoja.userId !== user.id) return;
  if (hoja.total > 0) return; // ya tiene puntos: no puede desapuntarse

  await db.delete(scorecards).where(eq(scorecards.id, id));
  revalidatePath(`/tiradas/${hoja.tiradaId}`);
  redirect(`/tiradas/${hoja.tiradaId}`);
}
