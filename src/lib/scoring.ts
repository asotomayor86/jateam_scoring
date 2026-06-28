/**
 * Lógica de puntuación de tiro (pura, sin dependencias de DB ni React).
 *
 * Un "tiro" vale de 0 a `maxPerShot` (10 en modalidades enteras, 10.9 en aire).
 * La "X" representa un diez interior: vale el máximo y suma para el desempate.
 */

/** Redondea a 1 decimal evitando artefactos de coma flotante (10.299… → 10.3). */
export function redondea1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Suma los tiros de una serie, redondeada a 1 decimal. */
export function sumaTiros(shots: number[]): number {
  return redondea1(shots.reduce((a, b) => a + b, 0));
}

/**
 * Interpreta lo que el tirador escribe en una celda de tiro.
 * - "" / null  → null (todavía no disparado)
 * - "x" / "X"  → diez interior: { value: maxPerShot, inner: true }
 * - número en [0, maxPerShot] → { value, inner: false }
 *   (solo enteros si la modalidad no admite décimas)
 * Devuelve `undefined` si la entrada no es válida.
 */
export function parseTiro(
  raw: string,
  maxPerShot: number,
  allowsDecimals: boolean,
): { value: number; inner: boolean } | null | undefined {
  const s = raw.trim().toLowerCase().replace(",", ".");
  if (s === "") return null;
  if (s === "x") return { value: redondea1(maxPerShot), inner: true };

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  if (n < 0 || n > maxPerShot) return undefined;
  if (!allowsDecimals && !Number.isInteger(n)) return undefined;
  if (allowsDecimals && redondea1(n) !== n) return undefined; // máx. 1 decimal

  // Un 10 (o el máximo) escrito a mano NO cuenta como interior: la X es explícita.
  return { value: redondea1(n), inner: false };
}

/** Formatea una puntuación para mostrar (entero sin decimales, aire con 1). */
export function formatPunt(n: number, allowsDecimals = false): string {
  return allowsDecimals ? n.toFixed(1) : String(Math.round(n));
}

// --- Modo "asistido competición" ---------------------------------------------

/** Valores de los anillos, en el orden de las casillas: 10, 9, …, 1, 0. */
export const ASISTIDO_VALORES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

/** Puntos de un recuento por valor: Σ count[i] · valor[i]. */
export function puntosDeRecuento(counts: number[]): number {
  let s = 0;
  for (let i = 0; i < ASISTIDO_VALORES.length; i++) {
    s += (counts[i] || 0) * ASISTIDO_VALORES[i];
  }
  return s;
}

/** Nº de tiros de un recuento: Σ count[i]. */
export function tirosDeRecuento(counts: number[]): number {
  let n = 0;
  for (const c of counts) n += c || 0;
  return n;
}

/** Resta dos recuentos elemento a elemento (no baja de 0). */
export function restaRecuentos(actual: number[], previo: number[]): number[] {
  return ASISTIDO_VALORES.map((_, i) =>
    Math.max(0, (actual[i] || 0) - (previo[i] || 0)),
  );
}
