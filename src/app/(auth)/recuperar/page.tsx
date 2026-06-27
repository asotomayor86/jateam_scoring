import Link from "next/link";
import { ForgotPasswordForm } from "@neondatabase/auth/react/ui";
import { localizacionAuth } from "@/auth/localization";

export default function RecuperarPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ForgotPasswordForm localization={localizacionAuth} />
      <p style={{ textAlign: "center", color: "var(--texto-suave)" }}>
        <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </div>
  );
}
