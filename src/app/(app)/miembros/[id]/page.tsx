import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth/helpers";
import { getMiembro } from "@/db/queries/members";
import { MemberEditForm } from "@/components/member-edit-form";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MiembroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const miembro = await getMiembro(id);
  if (!miembro) notFound();

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <SeccionTitulo>Editar miembro</SeccionTitulo>
        <Link
          href="/miembros"
          style={{ color: "var(--acento)", fontSize: "0.9rem" }}
        >
          ← Miembros
        </Link>
      </div>
      <MemberEditForm
        id={miembro.id}
        email={miembro.email}
        displayName={miembro.displayName}
        nickname={miembro.nickname}
        isAdmin={miembro.isAdmin}
        defaultGranularity={miembro.defaultGranularity}
      />
    </>
  );
}
