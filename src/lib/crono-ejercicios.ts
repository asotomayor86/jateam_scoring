/**
 * Cronómetro específico de cada ejercicio de la biblioteca. Reutiliza el motor de
 * `SeriesTimer` (PlanTimer). Algunos ejercicios exponen parámetros ajustables en
 * la libreta; esos valores viven solo en memoria (no se guardan).
 *
 * Convenciones:
 *  - Ejercicios de tiro: botón "Carguen" (1:00) + botón "Entrenamiento".
 *  - Ejercicios físicos/mentales: un botón "Empezar" (sin carguen).
 *  - Devuelve `null` si el ejercicio no usa cronómetro.
 */
import { opcionesConCarguen, type PlanTimer, type PasoTimer } from "@/lib/fases";

export type ParamDef = {
  key: string;
  label: string;
  def: number;
  min: number;
  max: number;
  paso?: number;
  unidad?: string;
};

export type CronoSpec = {
  /** Qué hace el cronómetro (se muestra al usuario). */
  descripcion: string;
  params: ParamDef[];
  construir: (v: Record<string, number>) => PlanTimer;
};

// --- Constructores de plan ---------------------------------------------------

function planPrecision(t: number): PlanTimer {
  return {
    opciones: opcionesConCarguen(
      [{ label: `Tiempo de tiro (${t}″)`, seconds: t, destacar: true, sonido: "disparen" }],
      "Entrenamiento",
    ),
    finalLabel: "Tiempo cumplido",
    conPitido: true,
  };
}

function planVelocidad(t: number): PlanTimer {
  return {
    opciones: opcionesConCarguen(
      [{ label: `¡Disparen! (${t}″)`, seconds: t, destacar: true, sonido: "disparen" }],
      "Entrenamiento",
    ),
    finalLabel: "¡Paren!",
    conPitido: true,
  };
}

function planDuelo(exposiciones: number, fuego: number): PlanTimer {
  const steps: PasoTimer[] = [];
  for (let i = 1; i <= exposiciones; i++) {
    if (i === 1) steps.push({ label: "Atención", seconds: 7, sonido: "atencion" });
    else steps.push({ label: `Alto ${i - 1}`, seconds: 7, sonido: "alto" });
    steps.push({ label: `¡Fuego! ${i}`, seconds: fuego, destacar: true, sonido: "disparen" });
  }
  return {
    opciones: opcionesConCarguen(steps, "Entrenamiento", false),
    finalLabel: "Fin",
    conPitido: true,
  };
}

function planTrabajoDescanso(trabajo: number, descanso: number, series: number): PlanTimer {
  const steps: PasoTimer[] = [];
  for (let i = 1; i <= series; i++) {
    steps.push({ label: `Trabajo ${i}`, seconds: trabajo, destacar: true, sonido: "disparen" });
    if (i < series) steps.push({ label: `Descanso ${i}`, seconds: descanso, sonido: "alto" });
  }
  return {
    opciones: [{ startLabel: "Empezar", steps }],
    finalLabel: "Hecho",
    conPitido: true,
  };
}

function planCuentaAtras(minutos: number): PlanTimer {
  return {
    opciones: [
      {
        startLabel: "Empezar",
        steps: [{ label: `En marcha (${minutos} min)`, seconds: minutos * 60, destacar: true, sonido: "disparen" }],
      },
    ],
    finalLabel: "Tiempo cumplido",
    conPitido: true,
  };
}

function planRespiracion(ciclos: number, insp: number, ret: number, esp: number): PlanTimer {
  const steps: PasoTimer[] = [];
  for (let i = 1; i <= ciclos; i++) {
    steps.push({ label: `Inspira ${i}`, seconds: insp, sonido: "atencion" });
    if (ret > 0) steps.push({ label: `Retén ${i}`, seconds: ret });
    steps.push({ label: `Espira ${i}`, seconds: esp, sonido: "alto" });
  }
  return {
    opciones: [{ startLabel: "Empezar", steps }],
    finalLabel: "Fin",
    conPitido: true,
  };
}

function planMetronomo(intervalo: number, golpes: number): PlanTimer {
  const steps: PasoTimer[] = [];
  for (let i = 1; i <= golpes; i++) {
    steps.push({ label: `${i}`, seconds: intervalo, destacar: true, sonido: "disparen" });
  }
  return {
    opciones: [{ startLabel: "Empezar", steps }],
    finalLabel: "Fin",
    conPitido: true,
  };
}

// --- Parámetros reutilizables ------------------------------------------------

const P = {
  tiempoPrec: { key: "t", label: "Tiempo de tiro", def: 150, min: 30, max: 300, paso: 10, unidad: "s" },
  tiempoVel: { key: "t", label: "Tiempo", def: 20, min: 5, max: 60, paso: 5, unidad: "s" },
  trabajo: (def: number) => ({ key: "trabajo", label: "Trabajo", def, min: 5, max: 300, paso: 5, unidad: "s" }),
  descanso: (def: number) => ({ key: "descanso", label: "Descanso", def, min: 0, max: 300, paso: 5, unidad: "s" }),
  series: (def: number) => ({ key: "series", label: "Series", def, min: 1, max: 20, unidad: "" }),
} as const;

// --- Mapa por código de ejercicio -------------------------------------------

const ESPECIFICO: Record<string, CronoSpec> = {
  EJ01: {
    descripcion: "Metrónomo para marcar la cadencia de los disparos en seco.",
    params: [
      { key: "intervalo", label: "Intervalo", def: 6, min: 2, max: 20, unidad: "s" },
      { key: "golpes", label: "Disparos", def: 5, min: 1, max: 30, unidad: "" },
    ],
    construir: (v) => planMetronomo(v.intervalo, v.golpes),
  },
  EJ02: {
    descripcion: "Metrónomo para las 10 repeticiones del ejercicio de la moneda.",
    params: [
      { key: "intervalo", label: "Intervalo", def: 6, min: 2, max: 20, unidad: "s" },
      { key: "golpes", label: "Repeticiones", def: 10, min: 1, max: 30, unidad: "" },
    ],
    construir: (v) => planMetronomo(v.intervalo, v.golpes),
  },
  EJ03: {
    descripcion: "Mantenimientos estáticos: trabajo (hold) y descanso, por series.",
    params: [P.trabajo(25), P.descanso(60), P.series(5)],
    construir: (v) => planTrabajoDescanso(v.trabajo, v.descanso, v.series),
  },
  EJ04: {
    descripcion: "Alzadas desde 45°: atención y ventana de fuego, repetidas (como el duelo).",
    params: [
      { key: "exposiciones", label: "Exposiciones", def: 5, min: 1, max: 20, unidad: "" },
      { key: "fuego", label: "Fuego", def: 3, min: 1, max: 10, unidad: "s" },
    ],
    construir: (v) => planDuelo(v.exposiciones, v.fuego),
  },
  EJ05: {
    descripcion: "Series rápidas en seco: Carguen + ventana de tiempo (10″/20″).",
    params: [P.tiempoVel],
    construir: (v) => planVelocidad(v.t),
  },
  EJ06: {
    descripcion: "Ball-and-dummy: serie de precisión con tiempo holgado.",
    params: [P.tiempoPrec],
    construir: (v) => planPrecision(v.t),
  },
  EJ07: {
    descripcion: "Fuego real, fase de precisión: serie de 5 en tiempo amplio.",
    params: [P.tiempoPrec],
    construir: (v) => planPrecision(v.t),
  },
  EJ08: {
    descripcion: "Series rápidas de fuego real (empieza en 30″ y reduce a 20″/10″).",
    params: [{ key: "t", label: "Tiempo", def: 30, min: 5, max: 60, paso: 5, unidad: "s" }],
    construir: (v) => planVelocidad(v.t),
  },
  EJ09: {
    descripcion: "Simulacro: usa el cronómetro de precisión para cada serie de la fase.",
    params: [P.tiempoPrec],
    construir: (v) => planPrecision(v.t),
  },
  EJ12: {
    descripcion: "Isométricos de hombro: trabajo (hold) y descanso, por series.",
    params: [P.trabajo(35), P.descanso(75), P.series(4)],
    construir: (v) => planTrabajoDescanso(v.trabajo, v.descanso, v.series),
  },
  EJ13: {
    descripcion: "Fuerza de agarre: trabajo y descanso, por series.",
    params: [P.trabajo(60), P.descanso(60), P.series(3)],
    construir: (v) => planTrabajoDescanso(v.trabajo, v.descanso, v.series),
  },
  EJ14: {
    descripcion: "Core: trabajo (plancha) y descanso, por series.",
    params: [P.trabajo(40), P.descanso(30), P.series(4)],
    construir: (v) => planTrabajoDescanso(v.trabajo, v.descanso, v.series),
  },
  EJ15: {
    descripcion: "Equilibrio: trabajo (apoyo) y descanso, por series.",
    params: [P.trabajo(30), P.descanso(20), P.series(3)],
    construir: (v) => planTrabajoDescanso(v.trabajo, v.descanso, v.series),
  },
  EJ16: {
    descripcion: "Aeróbico suave: cuenta atrás de la duración del trabajo continuo.",
    params: [{ key: "minutos", label: "Duración", def: 35, min: 5, max: 90, paso: 5, unidad: "min" }],
    construir: (v) => planCuentaAtras(v.minutos),
  },
  EJ19: {
    descripcion: "Respiración diafragmática: inspira, retén y espira, por ciclos.",
    params: [
      { key: "ciclos", label: "Ciclos", def: 7, min: 3, max: 15, unidad: "" },
      { key: "insp", label: "Inspira", def: 4, min: 2, max: 10, unidad: "s" },
      { key: "ret", label: "Retén", def: 2, min: 0, max: 10, unidad: "s" },
      { key: "esp", label: "Espira", def: 6, min: 2, max: 12, unidad: "s" },
    ],
    construir: (v) => planRespiracion(v.ciclos, v.insp, v.ret, v.esp),
  },
  EJ20: {
    descripcion: "Transiciones Standard en seco: Carguen + ventana de tiempo (20″/10″).",
    params: [P.tiempoVel],
    construir: (v) => planVelocidad(v.t),
  },
};

/** Cronómetro específico de un ejercicio por su código, o null si no usa. */
export function cronoDeEjercicio(code: string): CronoSpec | null {
  return ESPECIFICO[code] ?? null;
}
