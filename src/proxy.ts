/**
 * Proxy (antes "middleware") de Neon Auth: refresca la sesión y bloquea el
 * acceso a las rutas protegidas. Las páginas públicas de auth (login, recuperar,
 * restablecer) quedan fuera del `matcher`. En Next 16 este fichero es `proxy.ts`.
 *
 * IMPORTANTE: las Server Actions van por POST a la URL de la propia página. El
 * proxy de Neon Auth las redirige (307) y rompe la acción. Como cada ruta
 * protegida ya valida la sesión con requireUser en su layout (y cada acción
 * vuelve a comprobarlo), dejamos pasar sin tocar todo lo que no sea una
 * navegación GET/HEAD.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/auth/server";

export default function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }
  return getAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: [
    "/",
    "/tiradas/:path*",
    "/clubs/:path*",
    "/calendario/:path*",
    "/comidas/:path*",
    "/restaurantes/:path*",
    "/perfil/:path*",
    "/yo/:path*",
    "/miembros/:path*",
    "/cambiar-password/:path*",
  ],
};
