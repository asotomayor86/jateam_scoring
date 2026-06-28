/**
 * Fases de tiro por serie y planes de temporizador, según la modalidad y el
 * tipo de tirada.
 *
 * Pistola Standard (12 series de 5): series 1-4 precisión (150"), 5-8 velocidad
 * (20"), 9-12 velocidad (10").
 */

export type Fase = {
  tipo: "precision" | "velocidad";
  segundos: number;
  nombre: string;
};

/** Fase de una serie (1-based) según la modalidad. `null` si no aplica. */
export function faseSerie(modalitySlug: string, idx: number): Fase | null {
  if (modalitySlug === "pistola-standard") {
    if (idx <= 4) return { tipo: "precision", segundos: 150, nombre: "Precisión" };
    if (idx <= 8) return { tipo: "velocidad", segundos: 20, nombre: "Velocidad" };
    return { tipo: "velocidad", segundos: 10, nombre: "Velocidad" };
  }
  if (modalitySlug === "pistola-velocidad") {
    // Sin desglose oficial definido: por defecto todas a 20". (Ajustable.)
    return { tipo: "velocidad", segundos: 20, nombre: "Velocidad" };
  }
  return null;
}

export type PasoTimer = { label: string; seconds: number };
export type PlanTimer = {
  startLabel: string;
  finalLabel: string;
  steps: PasoTimer[];
  // Estilo del paso de "disparo" (para resaltar ¡Disparen!).
  destacarUltimo?: boolean;
};

/**
 * Plan de temporizador para una serie. `null` si esa serie no lleva
 * temporizador.
 *
 * - Oficial / semioficial: botón "Carguen" → cuenta de 1:00; en precisión de
 *   Standard, le sigue la cuenta de tiro (150").
 * - Entrenamiento + serie de velocidad: "Iniciar serie" → Atención (7") →
 *   ¡Disparen! (20"/10" según la fase) → ¡Paren!
 */
export function planTimer(
  tipoTirada: string,
  modalitySlug: string,
  idx: number,
): PlanTimer | null {
  const fase = faseSerie(modalitySlug, idx);

  if (tipoTirada === "oficial" || tipoTirada === "semioficial") {
    const steps: PasoTimer[] = [{ label: "Carguen", seconds: 60 }];
    if (fase?.tipo === "precision") {
      steps.push({ label: "Tiempo de tiro", seconds: fase.segundos });
    }
    return {
      startLabel: "Carguen",
      finalLabel: "Tiempo cumplido",
      steps,
    };
  }

  if (tipoTirada === "entrenamiento" && fase?.tipo === "velocidad") {
    return {
      startLabel: "Iniciar serie",
      finalLabel: "¡Paren!",
      steps: [
        { label: "Atención", seconds: 7 },
        { label: "¡Disparen!", seconds: fase.segundos },
      ],
      destacarUltimo: true,
    };
  }

  return null;
}
