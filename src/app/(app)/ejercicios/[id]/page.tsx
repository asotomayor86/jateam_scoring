import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/helpers";
import { getEjercicio } from "@/db/queries/exercises";
import { borrarEjercicio } from "@/actions/exercises";
import { Card, SeccionTitulo } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

export const dynamic = "force-dynamic";

function Bloque({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div style={{ marginTop: "0.8rem" }}>
      <div
        className="seccion-titulo"
        style={{ fontSize: "0.8rem", color: "var(--texto-suave)", marginBottom: "0.2rem" }}
      >
        {titulo}
      </div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{texto}</p>
    </div>
  );
}

export default async function EjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireUser();
  const { id } = await params;

  const e = await getEjercicio(id);
  if (!e) notFound();

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
        <SeccionTitulo>{e.code}</SeccionTitulo>
        <Link href="/ejercicios" style={{ color: "var(--acento)", fontSize: "0.9rem" }}>
          ← Ejercicios
        </Link>
      </div>

      <Card>
        <h2 style={{ margin: "0 0 0.3rem", fontSize: "1.2rem" }}>{e.title}</h2>
        <span className="chip">{e.tipologia}</span>

        <Bloque titulo="Objetivo" texto={e.objetivo} />
        <Bloque titulo="Material" texto={e.material} />
        <Bloque titulo="Ejecución" texto={e.ejecucion} />

        {(e.freqIniciacion || e.freqNacional) && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
            {e.freqIniciacion ? (
              <div>
                <div className="seccion-titulo" style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  Frec. iniciación
                </div>
                <div>{e.freqIniciacion}</div>
              </div>
            ) : null}
            {e.freqNacional ? (
              <div>
                <div className="seccion-titulo" style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  Frec. nacional
                </div>
                <div>{e.freqNacional}</div>
              </div>
            ) : null}
          </div>
        )}

        <Bloque titulo="Errores comunes" texto={e.errores} />
        <Bloque titulo="Progresión" texto={e.progresion} />
        <Bloque titulo="Métrica" texto={e.metrica} />
        <Bloque titulo="Claves" texto={e.claves} />
      </Card>

      {profile.isAdmin ? (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <Link href={`/ejercicios/${e.id}/editar`} className="btn" style={{ flex: 1 }}>
            ✏️ Editar
          </Link>
          <form action={borrarEjercicio} style={{ flex: 1 }}>
            <input type="hidden" name="id" value={e.id} />
            <ConfirmButton
              message={`¿Borrar el ejercicio ${e.code}?`}
              className="btn btn-bloque"
              style={{ color: "var(--rojo)" }}
            >
              Borrar
            </ConfirmButton>
          </form>
        </div>
      ) : null}
    </>
  );
}
