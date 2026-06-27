/**
 * Instancia de servidor de Neon Auth (Better Auth).
 *
 * Punto único para Server Components, Server Actions, Route Handlers y proxy.
 * Se construye de forma PEREZOSA (en la primera petición), no al cargar el
 * módulo: así el build de Next no se rompe si las variables de entorno aún no
 * están configuradas.
 *
 * El envío de correos (invitación / reseteo) y el SMTP se configuran a nivel de
 * proyecto en Neon Auth (Consola o API). Ver README.md.
 */
import "server-only";
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let instancia: NeonAuth | null = null;

/** Devuelve la instancia de Neon Auth, creándola la primera vez. */
export function getAuth(): NeonAuth {
  if (instancia) return instancia;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl) throw new Error("Falta la variable de entorno NEON_AUTH_BASE_URL");
  if (!secret) {
    throw new Error("Falta la variable de entorno NEON_AUTH_COOKIE_SECRET");
  }

  instancia = createNeonAuth({
    baseUrl,
    cookies: { secret },
  });
  return instancia;
}
