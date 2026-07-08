/**
 * Análisis de "Mis resultados": clasifica cada serie por tipo de ejercicio
 * (precisión / velocidad 20 / velocidad 10 / duelo) y agrega estadísticas.
 *  - Si la serie tiene impactos (diana/láser): agrupación, dispersión y deriva.
 *  - Si no: medias, desviación y reparto de valores por tiro.
 * Lógica pura (sin acceso a BD) para poder testarla y reutilizarla.
 */
import { faseSerie } from "@/lib/fases";
import { estadisticas, type Impacto } from "@/lib/diana";
import type { HojaResultado, SerieResultado } from "@/db/queries/resultados";

export type TipoEj = "precision" | "vel20" | "vel10" | "duelo";

export const TIPO_LABEL: Record<TipoEj, string> = {
  precision: "Precisión",
  vel20: "Velocidad 20″",
  vel10: "Velocidad 10″",
  duelo: "Duelo 7/3",
};

const ORDEN_TIPO: TipoEj[] = ["precision", "vel20", "vel10", "duelo"];

/**
 * Tipo de ejercicio de una serie. En modular viene del `moduleType`; en el resto
 * se deriva de la fase de la modalidad por número de serie (Standard: 1-4
 * precisión, 5-8 vel 20, 9-12 vel 10; Velocidad: vel 20; resto: precisión).
 */
export function tipoDeSerie(
  modalitySlug: string,
  moduleType: string | null,
  idx: number,
): TipoEj | null {
  if (moduleType) {
    if (moduleType === "p150") return "precision";
    if (moduleType === "v20") return "vel20";
    if (moduleType === "v10") return "vel10";
    if (moduleType === "duelo") return "duelo";
    return null;
  }
  const fase = faseSerie(modalitySlug, idx);
  if (!fase) return "precision";
  if (fase.tipo === "precision") return "precision";
  return fase.segundos <= 10 ? "vel10" : "vel20";
}

/** Valores individuales de una serie (de los impactos o del detalle tiro a tiro). */
function valoresDeSerie(s: SerieResultado): number[] {
  if (s.impacts && s.impacts.length) return s.impacts.map((i) => i.s);
  if (s.shots && s.shots.length) return s.shots;
  return [];
}

function media(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Desviación típica muestral (n-1). 0 si hay menos de 2 valores. */
function desviacion(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = media(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1);
  return Math.sqrt(v);
}

export type AggTipo = {
  tipo: TipoEj;
  label: string;
  nSeries: number;
  nTiros: number;
  /** Media por tiro (puntos totales / tiros). null si no hay tiros. */
  mediaPorTiro: number | null;
  /** Desviación típica por tiro (consistencia). null si no hay valores. */
  desviacion: number | null;
  /** Media por serie más alta y más baja (subtotal/tiros). */
  mejorSerie: number | null;
  peorSerie: number | null;
  /** Reparto de valores: índice = valor (0..10), contenido = nº de tiros. */
  reparto: number[];
  /** ¿Hay valores individuales para el reparto/desviación? */
  conValores: boolean;
  /** ¿Hay impactos (diana/láser) para el análisis de agrupación? */
  conImpactos: boolean;
  impactos: Impacto[];
  /** Tamaño de agrupación medio (extreme spread por serie, mm). */
  agrupacionMedia: number | null;
  /** Dispersión media (mm). */
  dispersionMedia: number | null;
  /** Deriva sistemática (centro medio de los impactos, mm desde el centro). */
  derivaX: number | null;
  derivaY: number | null;
  derivaMag: number | null;
  /** Progresión: media por tiro por fecha (orden cronológico). */
  progresion: { fecha: string; media: number }[];
};

type Acc = {
  nSeries: number;
  nTiros: number;
  sumPuntos: number;
  valores: number[];
  reparto: number[];
  mediasSerie: number[];
  impactos: Impacto[];
  spreads: number[];
  dispersions: number[];
  porFecha: Map<string, { suma: number; tiros: number }>;
};

function nuevoAcc(): Acc {
  return {
    nSeries: 0,
    nTiros: 0,
    sumPuntos: 0,
    valores: [],
    reparto: new Array(11).fill(0),
    mediasSerie: [],
    impactos: [],
    spreads: [],
    dispersions: [],
    porFecha: new Map(),
  };
}

/**
 * Agrega las series de entrenamiento por tipo de ejercicio. Devuelve solo los
 * tipos con datos, en orden precisión → vel 20 → vel 10 → duelo.
 */
export function agregarEntrenamientos(
  hojas: HojaResultado[],
  series: SerieResultado[],
): AggTipo[] {
  const hojaDe = new Map(hojas.map((h) => [h.scorecardId, h]));
  const acc: Record<TipoEj, Acc> = {
    precision: nuevoAcc(),
    vel20: nuevoAcc(),
    vel10: nuevoAcc(),
    duelo: nuevoAcc(),
  };

  for (const s of series) {
    if (s.exerciseId) continue; // fila de ejercicio de biblioteca, no de disparos
    const h = hojaDe.get(s.scorecardId);
    if (!h || h.type !== "entrenamiento") continue;
    const tipo = tipoDeSerie(h.modalitySlug, s.moduleType, s.idx);
    if (!tipo) continue;
    const a = acc[tipo];

    const vals = valoresDeSerie(s);
    const tiros = s.shotCount || vals.length;
    if (tiros === 0 && vals.length === 0 && s.subtotal === 0) continue; // serie vacía

    a.nSeries++;
    a.nTiros += tiros;
    a.sumPuntos += s.subtotal;
    for (const v of vals) {
      a.valores.push(v);
      const k = Math.round(v);
      if (k >= 0 && k <= 10) a.reparto[k]++;
    }
    if (tiros > 0) {
      const m = s.subtotal / tiros;
      a.mediasSerie.push(m);
      const f = a.porFecha.get(h.date) ?? { suma: 0, tiros: 0 };
      f.suma += s.subtotal;
      f.tiros += tiros;
      a.porFecha.set(h.date, f);
    }
    if (s.impacts && s.impacts.length) {
      a.impactos.push(...s.impacts);
      const st = estadisticas(s.impacts);
      if (st) {
        a.spreads.push(st.spread);
        a.dispersions.push(st.dispersion);
      }
    }
  }

  const res: AggTipo[] = [];
  for (const tipo of ORDEN_TIPO) {
    const a = acc[tipo];
    if (a.nSeries === 0) continue;
    const stGlobal = a.impactos.length ? estadisticas(a.impactos) : null;
    res.push({
      tipo,
      label: TIPO_LABEL[tipo],
      nSeries: a.nSeries,
      nTiros: a.nTiros,
      mediaPorTiro: a.nTiros > 0 ? a.sumPuntos / a.nTiros : null,
      desviacion: a.valores.length >= 2 ? desviacion(a.valores) : null,
      mejorSerie: a.mediasSerie.length ? Math.max(...a.mediasSerie) : null,
      peorSerie: a.mediasSerie.length ? Math.min(...a.mediasSerie) : null,
      reparto: a.reparto,
      conValores: a.valores.length > 0,
      conImpactos: a.impactos.length > 0,
      impactos: a.impactos,
      agrupacionMedia: a.spreads.length ? media(a.spreads) : null,
      dispersionMedia: a.dispersions.length ? media(a.dispersions) : null,
      derivaX: stGlobal ? stGlobal.mpiX : null,
      derivaY: stGlobal ? stGlobal.mpiY : null,
      derivaMag: stGlobal ? stGlobal.offset : null,
      progresion: [...a.porFecha.entries()]
        .sort((x, y) => x[0].localeCompare(y[0]))
        .map(([fecha, f]) => ({ fecha, media: f.suma / f.tiros })),
    });
  }
  return res;
}

// --- Tiradas (oficiales / amistosas) ----------------------------------------

export type MarcaModalidad = {
  modalityName: string;
  allowsDecimals: boolean;
  mejor: number;
  mediaMarca: number;
  mejorX: number;
  nHojas: number;
  progresion: { fecha: string; total: number }[];
};

/** Resumen de marcas por modalidad de las tiradas oficiales y amistosas finalizadas. */
export function agregarTiradas(hojas: HojaResultado[]): MarcaModalidad[] {
  const porMod = new Map<
    string,
    {
      allowsDecimals: boolean;
      totales: number[];
      xs: number[];
      progresion: { fecha: string; total: number }[];
    }
  >();
  for (const h of hojas) {
    if (h.type === "entrenamiento") continue;
    if (h.status !== "finalizada") continue;
    const e = porMod.get(h.modalityName) ?? {
      allowsDecimals: h.allowsDecimals,
      totales: [],
      xs: [],
      progresion: [],
    };
    e.totales.push(h.total);
    e.xs.push(h.innerCount);
    e.progresion.push({ fecha: h.date, total: h.total });
    porMod.set(h.modalityName, e);
  }
  return [...porMod.entries()].map(([modalityName, e]) => ({
    modalityName,
    allowsDecimals: e.allowsDecimals,
    mejor: Math.max(...e.totales),
    mediaMarca: media(e.totales),
    mejorX: Math.max(...e.xs),
    nHojas: e.totales.length,
    progresion: e.progresion.sort((a, b) => a.fecha.localeCompare(b.fecha)),
  }));
}

// --- Ejercicios de biblioteca practicados -----------------------------------

export type EjercicioPracticado = {
  exerciseId: string;
  verde: number;
  amarillo: number;
  rojo: number;
  total: number;
};

/** Cuenta los ejercicios de biblioteca practicados por su calificación. */
export function agregarEjercicios(series: SerieResultado[]): EjercicioPracticado[] {
  const m = new Map<string, EjercicioPracticado>();
  for (const s of series) {
    if (!s.exerciseId) continue;
    const e =
      m.get(s.exerciseId) ??
      { exerciseId: s.exerciseId, verde: 0, amarillo: 0, rojo: 0, total: 0 };
    if (s.rating === "verde") e.verde++;
    else if (s.rating === "amarillo") e.amarillo++;
    else if (s.rating === "rojo") e.rojo++;
    e.total++;
    m.set(s.exerciseId, e);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/** Dirección aproximada de una deriva (mm) para leerla en palabras. */
export function rumbo(x: number, y: number): string {
  const v = y > 8 ? "arriba" : y < -8 ? "abajo" : "";
  const h = x > 8 ? "derecha" : x < -8 ? "izquierda" : "";
  return [v, h].filter(Boolean).join("-") || "centrado";
}
