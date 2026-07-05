import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getEjercicios } from "@/db/queries/exercises";
import { ExercisesBrowser } from "@/components/exercises-browser";
import { PrincipiosTraining } from "@/components/principios-training";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EjerciciosPage() {
  const { profile } = await requireUser();
  const ejercicios = await getEjercicios();

  return (
    <>
      <SeccionTitulo
        extra={
          profile.isAdmin ? (
            <Link href="/ejercicios/nuevo" className="btn btn-primario">
              + Nuevo
            </Link>
          ) : undefined
        }
      >
        Ejercicios
      </SeccionTitulo>

      <PrincipiosTraining />

      <SeccionTitulo>Biblioteca</SeccionTitulo>
      <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
        Filtra por tipología o busca.
      </p>
      <ExercisesBrowser
        ejercicios={ejercicios.map((e) => ({
          id: e.id,
          code: e.code,
          title: e.title,
          tipologia: e.tipologia,
          objetivo: e.objetivo,
        }))}
      />
    </>
  );
}
