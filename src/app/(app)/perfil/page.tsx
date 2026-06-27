import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { ProfileForm } from "@/components/profile-form";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { user, profile } = await requireUser();

  return (
    <>
      <SeccionTitulo>Mi perfil</SeccionTitulo>
      <Card style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0, color: "var(--texto-suave)", fontSize: "0.9rem" }}>
          Email: <strong style={{ color: "var(--texto)" }}>{user.email}</strong>
        </p>
        <ProfileForm
          displayName={profile.displayName}
          nickname={profile.nickname}
          defaultGranularity={profile.defaultGranularity}
        />
      </Card>

      <SeccionTitulo>Seguridad</SeccionTitulo>
      <Card>
        <p style={{ margin: "0 0 0.75rem", color: "var(--texto-suave)" }}>
          ¿Quieres cambiar tu contraseña?
        </p>
        <Link href="/cambiar-password" className="btn">
          Cambiar contraseña
        </Link>
      </Card>
    </>
  );
}
