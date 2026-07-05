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

export type PasoTimer = {
  label: string;
  seconds: number;
  // Paso de "disparo" (se resalta en verde).
  destacar?: boolean;
};
export type PlanTimer = {
  startLabel: string;
  finalLabel: string;
  steps: PasoTimer[];
  // Pitidos en las transiciones (solo en entrenamientos).
  conPitido?: boolean;
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
      conPitido: false,
    };
  }

  if (tipoTirada === "entrenamiento" && fase?.tipo === "velocidad") {
    return {
      startLabel: "Iniciar serie",
      finalLabel: "¡Paren!",
      steps: [
        { label: "Atención", seconds: 7 },
        { label: "¡Disparen!", seconds: fase.segundos, destacar: true },
      ],
      conPitido: true,
    };
  }

  return null;
}

// --- Entrenamiento modular ---------------------------------------------------

/** Un tipo de módulo del entrenamiento modular (con su cronómetro). */
export type Modulo = {
  key: string;
  label: string;
  shots: number;
  plan: PlanTimer;
};

/** Cronómetro del duelo 7/3: 5 exposiciones (7" preparados, 3" ¡Fuego!). */
function planDuelo(): PlanTimer {
  const steps: PasoTimer[] = [];
  for (let i = 1; i <= 5; i++) {
    steps.push({ label: `Preparados ${i}`, seconds: 7 });
    steps.push({ label: `¡Fuego! ${i}`, seconds: 3, destacar: true });
  }
  return { startLabel: "Iniciar duelo", finalLabel: "Fin", steps, conPitido: true };
}

/** Catálogo de módulos del entrenamiento modular. */
export const MODULOS: Modulo[] = [
  {
    key: "p150",
    label: "Precisión 150″",
    shots: 5,
    plan: {
      startLabel: "Iniciar 150″",
      finalLabel: "Tiempo cumplido",
      steps: [{ label: "Tiempo de tiro (150″)", seconds: 150, destacar: true }],
      conPitido: true,
    },
  },
  {
    key: "v20",
    label: "Velocidad 20″",
    shots: 5,
    plan: {
      startLabel: "Iniciar serie",
      finalLabel: "¡Paren!",
      steps: [
        { label: "Atención", seconds: 7 },
        { label: "¡Disparen! (20″)", seconds: 20, destacar: true },
      ],
      conPitido: true,
    },
  },
  {
    key: "v10",
    label: "Velocidad 10″",
    shots: 5,
    plan: {
      startLabel: "Iniciar serie",
      finalLabel: "¡Paren!",
      steps: [
        { label: "Atención", seconds: 7 },
        { label: "¡Disparen! (10″)", seconds: 10, destacar: true },
      ],
      conPitido: true,
    },
  },
  {
    key: "duelo",
    label: "Duelo 7/3 (×5)",
    shots: 5,
    plan: planDuelo(),
  },
];

export function getModulo(key: string): Modulo | undefined {
  return MODULOS.find((m) => m.key === key);
}
