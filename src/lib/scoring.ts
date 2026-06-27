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
