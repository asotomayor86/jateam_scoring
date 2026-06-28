import type { EntryGranularity } from "@/db/schema";

/** Etiqueta legible de cada modo de apunte. */
export function etiquetaGranularidad(g: EntryGranularity): string {
  switch (g) {
    case "tiro":
      return "Tiro a tiro";
    case "bloque5":
      return "Total de bloques de 5";
    case "bloque10":
      return "Total de bloques de 10";
    case "serie":
      return "Total por serie";
    case "asistido":
      return "Asistido competición";
  }
}
