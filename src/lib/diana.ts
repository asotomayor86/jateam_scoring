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
  /** mm entre anillos (paso de radio de un anillo al siguiente). */
  ringStep: number;
  /** mm: radio del anillo del 10. Si se omite, es igual a `ringStep` (blanco
   *  "regular" como el de precisión). En el de duelo el 10 es mayor que el paso. */
  tenRingR?: number;
  /** mm: radio del diez interior (X). */
  innerTenR: number;
  /** valor máximo (10 en pistola). */
  maxScore: number;
  /** mm: radio de la zona negra (solo visual). */
  blackR: number;
  /** mm: diámetro del punto de impacto tal como se dibuja en la diana. La
   * puntuación cuenta por su BORDE: si el punto toca la línea de un anillo, vale
   * ese anillo (lo que ves es lo que puntúa). El lienzo dibuja el punto con este
   * mismo diámetro para que coincidan. */
  caliberMm: number;
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
  caliberMm: 12, // diámetro del punto en pantalla = lo que puntúa por su borde
  decimals: false,
};

/**
 * Diana de duelo / fuego rápido 25 m (medidas ISSF). Anillo 10 = 100 mm ⌀
 * (radio 50), paso 80 mm ⌀ (40 mm de radio), diez interior 50 mm ⌀ (radio 25),
 * zona negra hasta el anillo 5 (⌀500, radio 250). El anillo 1 queda a ⌀820.
 */
export const DIANA_DUELO: DianaSpec = {
  slug: "duelo25",
  nombre: "Duelo 25 m",
  ringStep: 40,
  tenRingR: 50,
  innerTenR: 25,
  maxScore: 10,
  blackR: 250,
  caliberMm: 12,
  decimals: false,
};

/** Diana según el tipo ("duelo" → diana de duelo; resto → precisión 25 m). */
export function dianaPorTipo(tipo: string | null | undefined): DianaSpec {
  return tipo === "duelo" ? DIANA_DUELO : DIANA_25M;
}

/** Radio (mm) del anillo del 10. */
export function radioDiez(spec: DianaSpec): number {
  return spec.tenRingR ?? spec.ringStep;
}

/** Radio (mm) del borde exterior del anillo de valor 1 (límite puntuable). */
export function radioExterior(spec: DianaSpec): number {
  return radioDiez(spec) + spec.ringStep * (spec.maxScore - 1);
}

/** Distancia radial (mm) de un punto al centro. */
export function radio(x: number, y: number): number {
  return Math.hypot(x, y);
}

/**
 * Radio "efectivo" para puntuar: el borde del impacto más cercano al centro.
 * Como la puntuación cuenta por el borde del balín (si toca la línea, vale ese
 * anillo), se descuenta el radio del proyectil de la distancia al centro.
 */
export function radioEfectivo(spec: DianaSpec, r: number): number {
  return Math.max(0, r - spec.caliberMm / 2);
}

/**
 * Puntuación de un impacto según el anillo en el que cae (a partir de su radio).
 * Fuera del anillo de valor 1 → 0. En pistola 25 m: r≤25→10, r≤50→9, …, r≤250→1.
 * El radio que se pasa aquí debe ser ya el radio efectivo (borde del balín).
 */
export function puntuacionEnRadio(spec: DianaSpec, r: number): number {
  const t = radioDiez(spec);
  if (r <= t) return spec.maxScore; // dentro del anillo del 10
  const anillo = Math.ceil((r - t) / spec.ringStep); // 1 = el 9, 2 = el 8, …
  const score = spec.maxScore - anillo;
  return Math.max(0, Math.min(spec.maxScore, score));
}

/** ¿El impacto es diez interior (X)? Se usa para el desempate. Cuenta por borde. */
export function esDiezInterior(spec: DianaSpec, r: number): boolean {
  return radioEfectivo(spec, r) <= spec.innerTenR;
}

/** Puntuación de un impacto a partir de sus coordenadas (mm). Cuenta por borde. */
export function puntuacionDeImpacto(spec: DianaSpec, x: number, y: number): number {
  return puntuacionEnRadio(spec, radioEfectivo(spec, radio(x, y)));
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
  /** Radio que engloba todos los impactos desde el centro de agrupación (mm). */
  covering: number;
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
  let dispersion = 0;
  let covering = 0;
  for (const i of impactos) {
    const d = Math.hypot(i.x - mpiX, i.y - mpiY);
    dispersion += d;
    if (d > covering) covering = d;
  }
  dispersion /= n;

  return { n, mpiX, mpiY, offset, spread, dispersion, covering };
}

/** Redondea a un decimal para mostrar (mm). */
export function mm(v: number): string {
  return (Math.round(v * 10) / 10).toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  });
}
