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

/**
 * Filtro de datos dentro de una sección:
 *  - "todos": todas las series del periodo. Una estadística solo se muestra si es
 *    rigurosa para TODAS (reparto/desviación exigen que todas tengan detalle tiro
 *    a tiro; agrupación exige que todas tengan impactos de diana).
 *  - "tiroatiro": solo las series con detalle por tiro.
 *  - "diana": solo las series registradas en diana/láser (con impactos).
 */
export type ModoDatos = "todos" | "tiroatiro" | "diana";

/** Una serie de entrenamiento ya clasificada, con lo necesario para agregar. */
export type SerieTipo = {
  date: string;
  shotCount: number;
  subtotal: number;
  valores: number[];
  impactos: Impacto[];
  tieneValores: boolean;
  tieneImpactos: boolean;
};

export type GrupoTipo = {
  tipo: TipoEj;
  label: string;
  series: SerieTipo[];
  /** ¿Alguna serie tiene detalle por tiro? (para ofrecer el filtro). */
  hayValores: boolean;
  /** ¿Alguna serie tiene impactos de diana? (para ofrecer el filtro). */
  hayImpactos: boolean;
};

export type AggTipo = {
  nSeries: number;
  nTiros: number;
  mediaPorTiro: number | null;
  desviacion: number | null;
  mejorSerie: number | null;
  peorSerie: number | null;
  reparto: number[];
  /** El reparto/desviación son rigurosos (todas las series consideradas tienen valores). */
  conValores: boolean;
  /** La agrupación es rigurosa (todas las series consideradas tienen impactos). */
  conImpactos: boolean;
  impactos: Impacto[];
  agrupacionMedia: number | null;
  dispersionMedia: number | null;
  derivaX: number | null;
  derivaY: number | null;
  derivaMag: number | null;
  progresion: { fecha: string; media: number }[];
};

/**
 * Agrupa las series de entrenamiento por tipo de ejercicio (sin agregar todavía).
 * Devuelve solo los tipos con datos, en orden precisión → vel 20 → vel 10 → duelo.
 */
export function agruparEntrenamientosPorTipo(
  hojas: HojaResultado[],
  series: SerieResultado[],
): GrupoTipo[] {
  const hojaDe = new Map(hojas.map((h) => [h.scorecardId, h]));
  const grupos: Record<TipoEj, SerieTipo[]> = {
    precision: [],
    vel20: [],
    vel10: [],
    duelo: [],
  };

  for (const s of series) {
    if (s.exerciseId) continue; // fila de ejercicio de biblioteca, no de disparos
    const h = hojaDe.get(s.scorecardId);
    if (!h || h.type !== "entrenamiento") continue;
    const tipo = tipoDeSerie(h.modalitySlug, s.moduleType, s.idx);
    if (!tipo) continue;

    const impactos = s.impacts ?? [];
    const valores = valoresDeSerie(s);
    const shotCount = s.shotCount || valores.length || impactos.length;
    if (shotCount === 0 && s.subtotal === 0 && valores.length === 0) continue; // vacía

    grupos[tipo].push({
      date: h.date,
      shotCount,
      subtotal: s.subtotal,
      valores,
      impactos,
      tieneValores: valores.length > 0,
      tieneImpactos: impactos.length > 0,
    });
  }

  const res: GrupoTipo[] = [];
  for (const tipo of ORDEN_TIPO) {
    const arr = grupos[tipo];
    if (arr.length === 0) continue;
    res.push({
      tipo,
      label: TIPO_LABEL[tipo],
      series: arr,
      hayValores: arr.some((x) => x.tieneValores),
      hayImpactos: arr.some((x) => x.tieneImpactos),
    });
  }
  return res;
}

/**
 * Agrega las series de un tipo según el modo de datos elegido. Cada estadística
 * solo se marca como mostrable (`conValores`/`conImpactos`) si es rigurosa para
 * TODAS las series consideradas en ese modo.
 */
export function agregarTipo(series: SerieTipo[], modo: ModoDatos): AggTipo {
  const sub =
    modo === "tiroatiro"
      ? series.filter((s) => s.tieneValores)
      : modo === "diana"
        ? series.filter((s) => s.tieneImpactos)
        : series;

  let nTiros = 0;
  let sumPuntos = 0;
  const valores: number[] = [];
  const reparto = new Array(11).fill(0);
  const mediasSerie: number[] = [];
  const impactos: Impacto[] = [];
  const spreads: number[] = [];
  const dispersions: number[] = [];
  const porFecha = new Map<string, { suma: number; tiros: number }>();

  for (const s of sub) {
    nTiros += s.shotCount;
    sumPuntos += s.subtotal;
    for (const v of s.valores) {
      valores.push(v);
      const k = Math.round(v);
      if (k >= 0 && k <= 10) reparto[k]++;
    }
    if (s.shotCount > 0) {
      mediasSerie.push(s.subtotal / s.shotCount);
      const f = porFecha.get(s.date) ?? { suma: 0, tiros: 0 };
      f.suma += s.subtotal;
      f.tiros += s.shotCount;
      porFecha.set(s.date, f);
    }
    if (s.impactos.length) {
      impactos.push(...s.impactos);
      const st = estadisticas(s.impactos);
      if (st) {
        spreads.push(st.spread);
        dispersions.push(st.dispersion);
      }
    }
  }

  const n = sub.length;
  const todosValores = n > 0 && sub.every((s) => s.tieneValores);
  const todosImpactos = n > 0 && sub.every((s) => s.tieneImpactos);
  const stGlobal = todosImpactos && impactos.length ? estadisticas(impactos) : null;

  return {
    nSeries: n,
    nTiros,
    mediaPorTiro: nTiros > 0 ? sumPuntos / nTiros : null,
    desviacion: todosValores && valores.length >= 2 ? desviacion(valores) : null,
    mejorSerie: mediasSerie.length ? Math.max(...mediasSerie) : null,
    peorSerie: mediasSerie.length ? Math.min(...mediasSerie) : null,
    reparto,
    conValores: todosValores,
    conImpactos: todosImpactos,
    impactos: todosImpactos ? impactos : [],
    agrupacionMedia: todosImpactos && spreads.length ? media(spreads) : null,
    dispersionMedia: todosImpactos && dispersions.length ? media(dispersions) : null,
    derivaX: stGlobal ? stGlobal.mpiX : null,
    derivaY: stGlobal ? stGlobal.mpiY : null,
    derivaMag: stGlobal ? stGlobal.offset : null,
    progresion: [...porFecha.entries()]
      .sort((x, y) => x[0].localeCompare(y[0]))
      .map(([fecha, f]) => ({ fecha, media: f.suma / f.tiros })),
  };
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
