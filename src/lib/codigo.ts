/**
 * Generación del identificador estandarizado de una tirada:
 *   AAAAMMDD-MODALIDAD-CLUB-TIPO   (p. ej. 20260627-STD-JATEAM-OF)
 *
 * Se construye siempre desde los desplegables del formulario (nunca a mano), de
 * modo que todas las tiradas comparten la misma estructura.
 */
import type { TiradaType } from "@/db/schema";

const SIGLA_TIPO: Record<TiradaType, string> = {
  oficial: "OF",
  semioficial: "SEMI",
  entrenamiento: "ENT",
};

/** Normaliza una sigla a A-Z0-9 en mayúsculas. */
function limpia(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Construye el código base (sin sufijo). El llamante añade "-2", "-3", … si ya
 * existe otra tirada con el mismo código ese día.
 */
export function codigoTirada(opts: {
  date: string; // YYYY-MM-DD
  modalityAbbr: string;
  clubAbbr: string;
  type: TiradaType;
}): string {
  const fecha = opts.date.replaceAll("-", "");
  return [
    fecha,
    limpia(opts.modalityAbbr),
    limpia(opts.clubAbbr),
    SIGLA_TIPO[opts.type],
  ].join("-");
}
