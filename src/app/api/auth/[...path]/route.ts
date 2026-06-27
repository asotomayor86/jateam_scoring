/**
 * Handler de Neon Auth: expone /api/auth/* (login, sesión, reset, admin, etc.).
 * Neon Auth hace de proxy hacia el servidor configurado en NEON_AUTH_BASE_URL.
 *
 * getAuth() se invoca dentro de cada handler (no al cargar el módulo) para que el
 * build no exija las variables de entorno.
 */
import { getAuth } from "@/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  return getAuth().handler().GET(request, ctx);
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  return getAuth().handler().POST(request, ctx);
}
