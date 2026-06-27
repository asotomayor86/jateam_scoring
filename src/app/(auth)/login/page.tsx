import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@neondatabase/auth/react/ui";
import { getCurrentUser } from "@/auth/helpers";
import { localizacionAuth } from "@/auth/localization";

// Necesita render dinámico porque lee la sesión.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <SignInForm localization={localizacionAuth} />
      <p style={{ textAlign: "center", color: "var(--texto-suave)" }}>
        <Link href="/recuperar">¿Has olvidado tu contraseña?</Link>
      </p>
      <p
        style={{
          textAlign: "center",
          fontSize: "0.85rem",
          color: "var(--texto-suave)",
        }}
      >
        No hay registro abierto. Pide al encargado del grupo que te invite por
        email.
      </p>
    </div>
  );
}
