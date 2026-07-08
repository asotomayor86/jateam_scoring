import { requireUser } from "@/auth/helpers";
import { getResultados } from "@/db/queries/resultados";
import { getEjercicios } from "@/db/queries/exercises";
import { SeccionTitulo } from "@/components/ui";
import { ResultadosView } from "@/components/resultados-view";

export const dynamic = "force-dynamic";

export default async function YoPage() {
  const { user, profile } = await requireUser();
  const [{ hojas, series }, ejercicios] = await Promise.all([
    getResultados(user.id),
    getEjercicios(),
  ]);

  const tiradas = hojas.filter((h) => h.type !== "entrenamiento").length;
  const entrenos = hojas.filter((h) => h.type === "entrenamiento").length;

  return (
    <>
      <SeccionTitulo grande>Mis resultados</SeccionTitulo>
      <p style={{ color: "var(--texto-suave)", margin: "0 0 0.7rem" }}>
        {profile.nickname || profile.displayName} · {tiradas} tiradas · {entrenos} entrenamientos
      </p>
      <ResultadosView
        hojas={hojas}
        series={series}
        ejercicios={ejercicios.map((e) => ({ id: e.id, code: e.code, title: e.title }))}
      />
    </>
  );
}
