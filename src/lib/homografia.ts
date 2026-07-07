/**
 * Homografía (transformación de perspectiva) entre 4 puntos de la imagen y 4
 * puntos de destino. Sirve para convertir un píxel de la cámara (donde se ve la
 * diana en perspectiva) en una coordenada real de la diana.
 *
 * Se trabaja en coordenadas de imagen NORMALIZADAS (0..1) para que no dependa
 * del tamaño del vídeo/canvas.
 */

export type Punto = { x: number; y: number };

/**
 * Calcula la homografía que lleva `src[i]` -> `dst[i]` (4 correspondencias).
 * Devuelve [a,b,c,d,e,f,g,h] (con i = 1) o null si el sistema es singular.
 */
export function calcularHomografia(
  src: Punto[],
  dst: Punto[],
): number[] | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  // Sistema 8x8: A·h = b
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }
  return resolver(A, b);
}

/** Aplica la homografía a un punto (x,y) normalizado y devuelve el destino. */
export function aplicarHomografia(h: number[], x: number, y: number): Punto {
  const den = h[6] * x + h[7] * y + 1;
  return {
    x: (h[0] * x + h[1] * y + h[2]) / den,
    y: (h[3] * x + h[4] * y + h[5]) / den,
  };
}

/** Eliminación gaussiana con pivoteo parcial para un sistema n x n. */
function resolver(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Matriz aumentada.
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let col = 0; col < n; col++) {
    // Pivote.
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    // Normaliza fila.
    const p = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= p;
    // Elimina el resto.
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map((fila) => fila[n]);
}
