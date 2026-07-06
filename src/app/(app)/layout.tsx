import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { InstallBanner } from "@/components/install-banner";
import { requireUser } from "@/auth/helpers";
import { getBadges } from "@/db/queries/badges";

// Render dinámico: todo el área privada lee la sesión.
export const dynamic = "force-dynamic";

/** Layout del área privada: exige sesión y pinta la navegación. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireUser();
  const badges = await getBadges(
    user.id,
    profile.chatSeenAt,
    profile.tiradasSeenAt,
  );

  return (
    <>
      <InstallBanner />
      <Nav
        displayName={profile.nickname || profile.displayName}
        isAdmin={profile.isAdmin}
        badges={badges}
      />
      <main className="contenedor" style={{ paddingBottom: "3rem" }}>
        {children}
      </main>
    </>
  );
}
