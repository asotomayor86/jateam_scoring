/**
 * Fases de tiro por serie y planes de temporizador, según la modalidad y el
 * tipo de tirada.
 *
 * Cada serie tiene DOS relojes:
 *  - "Carguen": 1:00 y, al terminar, arranca automáticamente el de la serie.
 *  - "Serie": empieza con 7" de atención y sigue con el tiempo de la serie.
 * Si se pulsa la serie directamente, arranca en los 7" de atención.
 */

export type Fase = {
  tipo: "precision" | "velocidad";
  segundos: number;
  nombre: string;
};

/** Fase de una serie (1-based) para la ETIQUETA. `null` si la modalidad no la define. */
export function faseSerie(modalitySlug: string, idx: number): Fase | null {
  if (modalitySlug === "pistola-standard") {
    if (idx <= 4) return { tipo: "precision", segundos: 150, nombre: "Precisión" };
    if (idx <= 8) return { tipo: "velocidad", segundos: 20, nombre: "Velocidad" };
    return { tipo: "velocidad", segundos: 10, nombre: "Velocidad" };
  }
  if (modalitySlug === "pistola-velocidad") {
    return { tipo: "velocidad", segundos: 20, nombre: "Velocidad" };
  }
  return null;
}

/**
 * Sonido asociado a la transición hacia un paso. Cada uno tiene una cadencia y
 * un tono distintos para poder distinguirlos sin mirar la pantalla:
 *  - "carguen": imita la cadencia "caaar-guen".
 *  - "atencion": imita la cadencia "aaa-ten-ción".
 *  - "disparen": comienzo de disparos, agudo.
 *  - "stop": fin/alto, grave.
 *
 * En el duelo, el "preparados" de cada exposición es una atención más (mismo
 * sonido); no hay un sonido "preparados" propio.
 */
export type SonidoPaso = "carguen" | "atencion" | "disparen" | "stop";

export type PasoTimer = {
  label: string;
  seconds: number;
  // Paso de "disparo" (se resalta en verde).
  destacar?: boolean;
  // Sonido de la transición hacia este paso.
  sonido?: SonidoPaso;
};

/** Una opción de arranque del temporizador (un botón). */
export type Opcion = { startLabel: string; steps: PasoTimer[] };

export type PlanTimer = {
  opciones: Opcion[];
  finalLabel: string;
  // Pitidos en las transiciones (solo en entrenamientos).
  conPitido?: boolean;
};

/**
 * Construye las dos opciones (Carguen + Serie) a partir de los pasos intrínsecos
 * de la serie. La serie siempre empieza con 7" de atención.
 */
export function opcionesConCarguen(
  intrinsecos: PasoTimer[],
  serieLabel = "Serie",
  // Los intrínsecos ya empiezan con su propia atención (p. ej. el duelo): no
  // anteponer otra.
  conAtencion = true,
): Opcion[] {
  const serie: PasoTimer[] = conAtencion
    ? [{ label: "Atención", seconds: 7, sonido: "atencion" }, ...intrinsecos]
    : [...intrinsecos];
  return [
    {
      startLabel: "Carguen",
      steps: [{ label: "Carguen", seconds: 60, sonido: "carguen" }, ...serie],
    },
    { startLabel: serieLabel, steps: serie },
  ];
}

/** Pasos intrínsecos (sin atención ni carguen) de una fase. */
function intrinsecosDeFase(fase: Fase): PasoTimer[] {
  if (fase.tipo === "velocidad") {
    return [{ label: `¡Disparen! (${fase.segundos}″)`, seconds: fase.segundos, destacar: true, sonido: "disparen" }];
  }
  return [{ label: `Tiempo de tiro (${fase.segundos}″)`, seconds: fase.segundos, destacar: true, sonido: "disparen" }];
}

/**
 * Plan de temporizador de una serie (siempre existe). Si la modalidad no define
 * fase, por defecto precisión 150".
 */
export function planTimer(
  tipoTirada: string,
  modalitySlug: string,
  idx: number,
): PlanTimer {
  const fase =
    faseSerie(modalitySlug, idx) ??
    ({ tipo: "precision", segundos: 150, nombre: "Precisión" } as Fase);
  return {
    opciones: opcionesConCarguen(intrinsecosDeFase(fase)),
    finalLabel: fase.tipo === "velocidad" ? "¡Paren!" : "Tiempo cumplido",
    conPitido: tipoTirada === "entrenamiento",
  };
}

// --- Entrenamiento modular ---------------------------------------------------

/** Un tipo de módulo del entrenamiento modular (con su cronómetro). */
export type Modulo = {
  key: string;
  label: string;
  shots: number;
  intrinsecos: PasoTimer[];
  finalLabel: string;
  // Los intrínsecos ya empiezan con su propia atención (duelo): no anteponer otra.
  sinAtencionInicial?: boolean;
};

/** Pasos del duelo 7/3: 5 exposiciones (7" de atención, 3" ¡Fuego!). */
function dueloIntrinsecos(): PasoTimer[] {
  const steps: PasoTimer[] = [];
  for (let i = 1; i <= 5; i++) {
    steps.push({ label: `Atención ${i}`, seconds: 7, sonido: "atencion" });
    steps.push({ label: `¡Fuego! ${i}`, seconds: 3, destacar: true, sonido: "disparen" });
  }
  return steps;
}

/** Catálogo de módulos del entrenamiento modular. */
export const MODULOS: Modulo[] = [
  {
    key: "p150",
    label: "Precisión 150″",
    shots: 5,
    intrinsecos: [{ label: "Tiempo de tiro (150″)", seconds: 150, destacar: true, sonido: "disparen" }],
    finalLabel: "Tiempo cumplido",
  },
  {
    key: "v20",
    label: "Velocidad 20″",
    shots: 5,
    intrinsecos: [{ label: "¡Disparen! (20″)", seconds: 20, destacar: true, sonido: "disparen" }],
    finalLabel: "¡Paren!",
  },
  {
    key: "v10",
    label: "Velocidad 10″",
    shots: 5,
    intrinsecos: [{ label: "¡Disparen! (10″)", seconds: 10, destacar: true, sonido: "disparen" }],
    finalLabel: "¡Paren!",
  },
  {
    key: "duelo",
    label: "Duelo 7/3 (×5)",
    shots: 5,
    intrinsecos: dueloIntrinsecos(),
    finalLabel: "Fin",
    sinAtencionInicial: true,
  },
];

export function getModulo(key: string): Modulo | undefined {
  return MODULOS.find((m) => m.key === key);
}

/** Plan de temporizador (Carguen + Serie) de un módulo. */
export function moduloPlan(mod: Modulo): PlanTimer {
  return {
    opciones: opcionesConCarguen(mod.intrinsecos, "Serie", !mod.sinAtencionInicial),
    finalLabel: mod.finalLabel,
    conPitido: true,
  };
}
