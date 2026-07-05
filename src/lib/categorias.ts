/** Categorías de tirador para las tiradas oficiales (lista fija). */
export const CATEGORIAS = [
  "1ª Categoría",
  "2ª Categoría",
  "3ª Categoría",
  "Veterano",
  "Damas",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export function esCategoria(v: string): v is Categoria {
  return (CATEGORIAS as readonly string[]).includes(v);
}
