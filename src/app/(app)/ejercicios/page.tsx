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
        grande
        extra={
          profile.isAdmin ? (
            <Link href="/ejercicios/nuevo" className="btn btn-primario">
              + Nuevo
            </Link>
          ) : undefined
        }
      >
        Academia
      </SeccionTitulo>

      <SeccionTitulo>Principios de entrenamiento</SeccionTitulo>
      <a
        href="/academia_principios_tirador.html"
        style={{
          display: "block",
          marginBottom: "1rem",
          borderRadius: 14,
          padding: "1rem 1.1rem",
          color: "#fff",
          textDecoration: "none",
          background:
            "radial-gradient(120% 95% at 70% 0%, #2a5c93 0%, #14304f 46%, #0b1420 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 6px 20px rgba(13,28,46,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>📖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: "1.05rem", color: "#fff", display: "block" }}>
              Principios básicos del tirador
            </strong>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)" }}>
              Guía completa · 10 principios · 7 bloques · ~15 min
            </span>
          </div>
          <span style={{ fontSize: "1.3rem", color: "rgba(255,255,255,0.85)" }}>›</span>
        </div>
      </a>

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
