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
  tiradaId: string;
  idx: number;
  date: string;
  shotCount: number;
  subtotal: number;
  valores: number[];
  impactos: Impacto[];
  tieneValores: boolean;
  tieneImpactos: boolean;
  /** Distancia de la sesión: "real" (25 m) / "reducida" (7 m) / null. */
  distancia: string | null;
  /** Diana usada: "duelo" o "precision" (null = precisión). */
  dianaTipo: "precision" | "duelo";
};

/** Subconjunto de series de un grupo según el modo de datos. */
export function seriesDelModo(series: SerieTipo[], modo: ModoDatos): SerieTipo[] {
  if (modo === "tiroatiro") return series.filter((s) => s.tieneValores);
  if (modo === "diana") return series.filter((s) => s.tieneImpactos);
  return series;
}

export type GrupoTipo = {
  tipo: TipoEj;
  label: string;
  series: SerieTipo[];
  /** ¿Alguna serie tiene detalle por tiro? (para ofrecer el filtro). */
  hayValores: boolean;
  /** ¿Alguna serie tiene impactos de diana? (para ofrecer el filtro). */
  hayImpactos: boolean;
};

/** Agrupación acumulada de un tipo de diana (precisión o duelo). */
export type DianaAgg = {
  tipo: "precision" | "duelo";
  nImpactos: number;
  impactos: Impacto[];
  agrupacionMedia: number | null;
  dispersionMedia: number | null;
  derivaX: number | null;
  derivaY: number | null;
  derivaMag: number | null;
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
  /** Agrupación separada por tipo de diana (precisión / duelo). */
  dianas: DianaAgg[];
  /** Progresión por sesión: media por tiro, agrupación media y deriva (mm) del día. */
  progresion: {
    fecha: string;
    media: number;
    agrupacion: number | null;
    deriva: number | null;
  }[];
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
      tiradaId: h.tiradaId,
      idx: s.idx,
      date: h.date,
      shotCount,
      subtotal: s.subtotal,
      valores,
      impactos,
      tieneValores: valores.length > 0,
      tieneImpactos: impactos.length > 0,
      distancia: s.distanceMode,
      dianaTipo: s.dianaType === "duelo" ? "duelo" : "precision",
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
  const sub = seriesDelModo(series, modo);

  let nTiros = 0;
  let sumPuntos = 0;
  const valores: number[] = [];
  const reparto = new Array(11).fill(0);
  const mediasSerie: number[] = [];
  // Por fecha: puntos/tiros (media), spreads (agrupación) y suma de impactos (deriva).
  const porFecha = new Map<
    string,
    { suma: number; tiros: number; spreads: number[]; sx: number; sy: number; ni: number }
  >();
  // Impactos y estadísticas separados por tipo de diana (precisión / duelo).
  const porDiana: Record<
    "precision" | "duelo",
    { impactos: Impacto[]; spreads: number[]; dispersions: number[] }
  > = {
    precision: { impactos: [], spreads: [], dispersions: [] },
    duelo: { impactos: [], spreads: [], dispersions: [] },
  };

  for (const s of sub) {
    nTiros += s.shotCount;
    sumPuntos += s.subtotal;
    for (const v of s.valores) {
      valores.push(v);
      const k = Math.round(v);
      if (k >= 0 && k <= 10) reparto[k]++;
    }
    const st = s.impactos.length ? estadisticas(s.impactos) : null;
    if (s.shotCount > 0) {
      mediasSerie.push(s.subtotal / s.shotCount);
      const f = porFecha.get(s.date) ?? { suma: 0, tiros: 0, spreads: [], sx: 0, sy: 0, ni: 0 };
      f.suma += s.subtotal;
      f.tiros += s.shotCount;
      if (st) f.spreads.push(st.spread);
      for (const im of s.impactos) {
        f.sx += im.x;
        f.sy += im.y;
        f.ni++;
      }
      porFecha.set(s.date, f);
    }
    if (s.impactos.length) {
      const d = porDiana[s.dianaTipo];
      d.impactos.push(...s.impactos);
      if (st) {
        d.spreads.push(st.spread);
        d.dispersions.push(st.dispersion);
      }
    }
  }

  const n = sub.length;
  const todosValores = n > 0 && sub.every((s) => s.tieneValores);
  const todosImpactos = n > 0 && sub.every((s) => s.tieneImpactos);

  const dianas: DianaAgg[] = todosImpactos
    ? (["precision", "duelo"] as const)
        .filter((t) => porDiana[t].impactos.length > 0)
        .map((t) => {
          const d = porDiana[t];
          const st = estadisticas(d.impactos);
          return {
            tipo: t,
            nImpactos: d.impactos.length,
            impactos: d.impactos,
            agrupacionMedia: d.spreads.length ? media(d.spreads) : null,
            dispersionMedia: d.dispersions.length ? media(d.dispersions) : null,
            derivaX: st ? st.mpiX : null,
            derivaY: st ? st.mpiY : null,
            derivaMag: st ? st.offset : null,
          };
        })
    : [];

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
    dianas,
    progresion: [...porFecha.entries()]
      .sort((x, y) => x[0].localeCompare(y[0]))
      .map(([fecha, f]) => ({
        fecha,
        media: f.suma / f.tiros,
        agrupacion: f.spreads.length ? media(f.spreads) : null,
        deriva: f.ni ? Math.hypot(f.sx / f.ni, f.sy / f.ni) : null,
      })),
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
