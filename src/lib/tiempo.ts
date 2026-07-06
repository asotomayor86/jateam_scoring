/** "hace 5 min", "hace 2 h", "hace 3 d"… a partir de una fecha. */
export function haceCuanto(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const seg = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seg < 45) return "hace un momento";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `hace ${dias} d`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses > 1 ? "es" : ""}`;
}

/** Fecha y hora corta en la zona de Madrid, p. ej. "12 jul · 14:32". */
export function fechaHoraCorta(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dia = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  }).format(d);
  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(d);
  return `${dia} · ${hora}`;
}
