"use client";

/**
 * Proveedor de la UI de Neon Auth, en español y conectado al enrutado de Next.
 * Envuelve la app para que <SignInForm>, <ForgotPasswordForm>,
 * <ResetPasswordForm>, <ChangePasswordCard>, etc. funcionen y naveguen bien.
 */
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/auth/client";
import { localizacionAuth } from "@/auth/localization";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      localization={localizacionAuth}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={({ href, ...props }) => <Link href={href} {...props} />}
      // A dónde ir tras iniciar sesión.
      redirectTo="/"
      // Mapear las rutas internas de la UI a NUESTRAS páginas en español.
      basePath=""
      viewPaths={{
        SIGN_IN: "login",
        FORGOT_PASSWORD: "recuperar",
        RESET_PASSWORD: "restablecer",
      }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
