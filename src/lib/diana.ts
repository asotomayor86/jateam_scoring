/**
 * Diana de entrenamiento gráfico ("Diana"): geometría de la diana, puntuación
 * por anillo y estadísticas de agrupación. Todo en coordenadas reales en
 * milímetros desde el centro (x → derecha, y → arriba). Lógica pura y sin
 * dependencias, para poder reutilizarla en el cliente y en el servidor.
 */

/** Un impacto sobre la diana. `s` es la puntuación (derivada del anillo, corregible). */
export type Impacto = { x: number; y: number; s: number };

/**
 * Especificación de una diana: anillos concéntricos regulares. El anillo de
 * valor 10 tiene radio `ringStep`; cada anillo siguiente suma `ringStep`. El
 * "diez interior" (X, para desempate) es el círculo central de radio `innerTenR`.
 */
export type DianaSpec = {
  slug: string;
  nombre: string;
  /** mm entre anillos (radio del 10). */
  ringStep: number;
  /** mm: radio del diez interior (X). */
  innerTenR: number;
  /** valor máximo (10 en pistola). */
  maxScore: number;
  /** mm: radio de la zona negra (solo visual). */
  blackR: number;
  /** ¿puntúa con décimas? (aire). De momento no. */
  decimals: boolean;
};

/**
 * Diana de pistola 25 m (precisión / standard), medidas ISSF. Radios en mm:
 * 10 → 25, 9 → 50, … 1 → 250; diez interior 12,5; zona negra = anillo 7 (100 mm).
 */
export const DIANA_25M: DianaSpec = {
  slug: "p25",
  nombre: "Pistola 25 m",
  ringStep: 25,
  innerTenR: 12.5,
  maxScore: 10,
  blackR: 100,
  decimals: false,
};

/** Radio (mm) del anillo de valor 1 = borde exterior puntuable. */
export function radioExterior(spec: DianaSpec): number {
  return spec.ringStep * spec.maxScore;
}

/** Distancia radial (mm) de un punto al centro. */
export function radio(x: number, y: number): number {
  return Math.hypot(x, y);
}

/**
 * Puntuación de un impacto según el anillo en el que cae (a partir de su radio).
 * Fuera del anillo de valor 1 → 0. En pistola 25 m: r≤25→10, r≤50→9, …, r≤250→1.
 */
export function puntuacionEnRadio(spec: DianaSpec, r: number): number {
  if (r <= 0) return spec.maxScore;
  const anillo = Math.ceil(r / spec.ringStep); // 1 = el 10, 2 = el 9, …
  const score = spec.maxScore + 1 - anillo;
  return Math.max(0, Math.min(spec.maxScore, score));
}

/** ¿El impacto es diez interior (X)? Se usa para el desempate. */
export function esDiezInterior(spec: DianaSpec, r: number): boolean {
  return r <= spec.innerTenR;
}

/** Puntuación de un impacto a partir de sus coordenadas (mm). */
export function puntuacionDeImpacto(spec: DianaSpec, x: number, y: number): number {
  return puntuacionEnRadio(spec, radio(x, y));
}

export type EstadisticasDiana = {
  n: number;
  /** Centro de agrupación (mm desde el centro de la diana). */
  mpiX: number;
  mpiY: number;
  /** Desplazamiento del centro de agrupación respecto al centro (mm). */
  offset: number;
  /** Tamaño de la agrupación: mayor distancia centro-a-centro entre impactos (mm). */
  spread: number;
  /** Dispersión media respecto al centro de agrupación (mm). */
  dispersion: number;
};

/**
 * Estadísticas de agrupación de un conjunto de impactos: centro de agrupación
 * (MPI), su desplazamiento respecto al centro, el tamaño de la agrupación
 * (extreme spread, centro a centro) y la dispersión media.
 */
export function estadisticas(impactos: readonly Impacto[]): EstadisticasDiana | null {
  const n = impactos.length;
  if (n === 0) return null;
  const mpiX = impactos.reduce((a, i) => a + i.x, 0) / n;
  const mpiY = impactos.reduce((a, i) => a + i.y, 0) / n;
  const offset = Math.hypot(mpiX, mpiY);

  let spread = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(impactos[i].x - impactos[j].x, impactos[i].y - impactos[j].y);
      if (d > spread) spread = d;
    }
  }
  const dispersion =
    impactos.reduce((a, i) => a + Math.hypot(i.x - mpiX, i.y - mpiY), 0) / n;

  return { n, mpiX, mpiY, offset, spread, dispersion };
}

/** Redondea a un decimal para mostrar (mm). */
export function mm(v: number): string {
  return (Math.round(v * 10) / 10).toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  });
}
