/**
 * Siembra la biblioteca de ejercicios (Pistola Standard 25 m y Fuego Central).
 * Ejecuta:  npm run seed:ej
 * Idempotente: upsert por `code`.
 */
import { db, exercises } from "../src/db";

type Ej = {
  code: string;
  title: string;
  tipologia: string;
  objetivo: string;
  material: string;
  ejecucion: string;
  freqIniciacion: string;
  freqNacional: string;
  errores: string;
  progresion: string;
  metrica: string;
  claves: string;
};

const EJERCICIOS: Ej[] = [
  {
    code: "EJ01",
    title: "Tiro en seco sobre pared blanca / blanco vuelto",
    tipologia: "Técnica – seco",
    objetivo:
      "Perfeccionar enrase de miras y accionamiento limpio del disparador sin distracción del blanco.",
    material: "Pistola descargada, pared lisa o blanco vuelto. Protección auditiva no necesaria.",
    ejecucion:
      "1) Verifica arma descargada. 2) Adopta postura y empuñadura completas. 3) Alza el arma frente a pared blanca. 4) Enfoca el punto de mira, mantén alineación. 5) Presiona el disparador de forma progresiva hasta el disparo en seco. 6) Mantén follow-through 2 s. 7) Baja, respira, repite.",
    freqIniciacion: "3×/sem, 15-20 min",
    freqNacional: "5-6×/sem, 20-30 min",
    errores:
      "Mirar 'a través' de las miras; acelerar el dedo; abatir el arma justo al disparar.",
    progresion: "Pared blanca → blanco vuelto → blanco reglamentario en seco.",
    metrica:
      "El punto de mira no debe moverse en el momento del disparo (autoobservación o compañero).",
    claves: "El 80% de la técnica se construye aquí. Calidad sobre cantidad.",
  },
  {
    code: "EJ02",
    title: "Ejercicio de la moneda sobre el arma",
    tipologia: "Técnica – seco",
    objetivo: "Accionar el disparador sin perturbar la estabilidad del arma.",
    material: "Pistola descargada, moneda.",
    ejecucion:
      "1) Arma descargada, postura completa. 2) Un compañero coloca una moneda sobre el carro/masa de miras. 3) Apunta y acciona el disparador en seco. 4) La moneda no debe caer. 5) 10 repeticiones por serie.",
    freqIniciacion: "2-3×/sem, 10 min",
    freqNacional: "4×/sem, 10 min",
    errores: "Golpear el disparador; tensar la muñeca; anticipar el disparo.",
    progresion: "Moneda grande → pequeña → de canto (avanzado).",
    metrica: "% de repeticiones sin caída de moneda (objetivo >90%).",
    claves: "Feedback inmediato y sin electrónica. Ideal para detectar gatillazo.",
  },
  {
    code: "EJ03",
    title: "Mantenimientos estáticos con arma (holds)",
    tipologia: "Estabilidad – seco",
    objetivo:
      "Aumentar la resistencia específica del brazo y reducir el arco de movimiento en zona de puntería.",
    material: "Pistola descargada o mancuerna equivalente (1-1,5 kg).",
    ejecucion:
      "1) Alza el arma a posición de puntería. 2) Mantén 20-30 s con miras alineadas sobre la zona de blanco. 3) Baja y descansa 60 s. 4) Repite según series.",
    freqIniciacion: "3×/sem, 3-5 series",
    freqNacional: "5×/sem, 5-8 series",
    errores:
      "Elevar el hombro; bloquear la respiración todo el hold; compensar con el tronco.",
    progresion: "20 s → 30 s → 45 s; añadir lastre ligero solo en nivel nacional.",
    metrica: "Tiempo de hold con miras dentro del área del 9.",
    claves: "Trabaja hasta fatiga controlada, nunca hasta temblor severo.",
  },
  {
    code: "EJ04",
    title: "Alzadas cronometradas desde 45°",
    tipologia: "Técnica específica – seco",
    objetivo:
      "Automatizar la salida de duelo: alzada, estabilización y disparo en 3 s (fuego central) y base de series rápidas Standard.",
    material: "Pistola descargada, temporizador o compañero con voz de mando.",
    ejecucion:
      "1) Posición LISTO: brazo a 45°. 2) A la señal, alza en ~1 s. 3) Estabiliza 0,5-1 s. 4) Dispara en seco antes de 3 s. 5) Mantén follow-through. 6) Vuelve a 45°.",
    freqIniciacion: "2×/sem, 20-30 rep",
    freqNacional: "4×/sem, 40-60 rep",
    errores:
      "Alzada balística que sobrepasa el blanco; disparar sin estabilizar; alzada lenta que consume el tiempo.",
    progresion: "Sin tiempo → 5 s → 4 s → 3 s reglamentarios.",
    metrica: "% de disparos en seco dentro de tiempo con miras alineadas.",
    claves: "La alzada debe frenar suave y morir en el centro del blanco.",
  },
  {
    code: "EJ05",
    title: "Series simuladas 10\" y 20\" con metrónomo",
    tipologia: "Ritmo/cadencia – seco",
    objetivo:
      "Interiorizar la cadencia de las series rápidas de Pistola Standard (5 disparos en 10\" o 20\").",
    material: "Pistola descargada, metrónomo (~32 BPM para 10\") o app de temporizador.",
    ejecucion:
      "1) Configura el metrónomo. 2) A la señal de inicio, alza y encadena 5 disparos en seco siguiendo el pulso. 3) Un disparo por beat, recuperando enrase entre ellos. 4) Descansa y repite.",
    freqIniciacion: "2×/sem",
    freqNacional: "3-4×/sem",
    errores:
      "Primer disparo tardío que comprime los restantes; perder enrase por ir 'a ritmo' sin verificar miras.",
    progresion: "20\" dominada → 10\"; empieza a 28 BPM y sube a 32.",
    metrica: "5 disparos completados dentro de tiempo con enrase verificado en cada uno.",
    claves: "El ritmo debe ser constante, no acelerado al final.",
  },
  {
    code: "EJ06",
    title: "Ball-and-dummy",
    tipologia: "Técnica – fuego real",
    objetivo:
      "Detectar y eliminar el gatillazo/anticipación mediante mezcla aleatoria de cartuchos y vainas inertes.",
    material: "Munición real, vainas inertes/dummies, blanco 25 m.",
    ejecucion:
      "1) Un compañero carga el cargador mezclando cartuchos y dummies sin que lo veas. 2) Tira la serie con técnica normal. 3) Al caer el martillo sobre un dummy, observa el movimiento del arma. 4) Analiza y corrige.",
    freqIniciacion: "1×/sem, 10-20 tiros",
    freqNacional: "2×/sem, 20-30 tiros",
    errores:
      "Saber cuáles son los dummies (pierde efecto); no analizar el movimiento observado.",
    progresion: "50% dummies → 25% → 10% (más difícil de predecir).",
    metrica: "Arma inmóvil al percutir dummy = técnica correcta.",
    claves: "El mejor diagnóstico de anticipación sin electrónica.",
  },
  {
    code: "EJ07",
    title: "Fuego real – fase de precisión",
    tipologia: "Técnica – fuego real",
    objetivo:
      "Consolidar la técnica completa en la fase de precisión (series de 5 en 150\" / tiempo amplio).",
    material: "Munición, blanco de precisión 25 m, diario de entrenamiento.",
    ejecucion:
      "1) Rutina pre-disparo completa. 2) Series de 5 disparos con tiempo holgado. 3) Llamada del tiro antes de ver el impacto. 4) Anota cada disparo y sensación. 5) Analiza la agrupación por serie.",
    freqIniciacion: "1×/sem, 40-60 disparos",
    freqNacional: "2-3×/sem, 60-100 disparos",
    errores:
      "Tirar por volumen sin analizar; forzar el disparo cuando la puntería no es estable (abortar es correcto).",
    progresion: "Blanco completo → zonas objetivo → simulación de match con puntuación.",
    metrica: "Media de serie y % de llamadas de tiro acertadas.",
    claves: "Cada disparo con propósito. Abortar un mal disparo es entrenar bien.",
  },
  {
    code: "EJ08",
    title: "Fuego real – series rápidas 20\" y 10\"",
    tipologia: "Específico Standard – fuego real",
    objetivo:
      "Transferir la cadencia entrenada en seco a fuego real en las fases de 20\" y 10\" de la Standard.",
    material: "Munición, blanco 25 m, temporizador o mandos de galería.",
    ejecucion:
      "1) Serie de 5 disparos dentro del tiempo. 2) Comienza con tiempo ampliado (30\") si es necesario. 3) Reduce progresivamente a tiempo reglamentario. 4) Analiza agrupación y desviaciones por posición del disparo (1º-5º).",
    freqIniciacion: "1×/sem, 20-30 disparos",
    freqNacional: "2×/sem, 40-60 disparos",
    errores:
      "Sacrificar el enrase por cumplir tiempo; agrupaciones que se abren en los disparos 4-5 (fatiga/precipitación).",
    progresion: "30\" → 20\" → 10\".",
    metrica:
      "Diferencia de puntuación entre serie de precisión y serie rápida (objetivo: reducirla).",
    claves:
      "Si la serie de 10\" pierde >5 puntos vs precisión, vuelve al trabajo con metrónomo.",
  },
  {
    code: "EJ09",
    title: "Simulacro completo de competición",
    tipologia: "Competitivo",
    objetivo:
      "Ensayar el curso de fuego íntegro con tiempos, ensayos y protocolo real de competición.",
    material: "Munición completa del match, blancos reglamentarios, cronometraje, planilla de puntuación.",
    ejecucion:
      "1) Reproduce horarios, ensayos y pausas reales. 2) Puntúa oficialmente. 3) Sin repeticiones ni excusas. 4) Análisis posterior por fases en el diario.",
    freqIniciacion: "1×/mes",
    freqNacional: "2-3×/mes",
    errores:
      "'Reiniciar' series malas; no simular las esperas y el protocolo (parte clave de la presión).",
    progresion: "Simulacro solo → con público interno → con consecuencias (ranking de equipo).",
    metrica: "Puntuación total y diferencia vs entrenamientos normales.",
    claves: "El objetivo es que la competición se sienta como un entrenamiento más.",
  },
  {
    code: "EJ10",
    title: "Llamada del tiro + diario de entrenamiento",
    tipologia: "Análisis",
    objetivo:
      "Desarrollar autoconocimiento técnico prediciendo la posición del impacto antes de verlo.",
    material: "Diario/planilla, bolígrafo.",
    ejecucion:
      "1) Tras cada disparo, di/anota dónde crees que ha impactado (zona horaria + valor). 2) Verifica en el blanco. 3) Registra aciertos y desviaciones. 4) Anota condiciones, sensaciones y foco de la sesión.",
    freqIniciacion: "Cada sesión de fuego",
    freqNacional: "Cada sesión de fuego",
    errores:
      "Llamar el tiro después de ver el impacto; diario genérico sin datos accionables.",
    progresion: "Llamar zona (alto/bajo/izq/dcha) → cuadrante + valor → valor exacto.",
    metrica: "% de llamadas correctas (objetivo >70% en nacional).",
    claves:
      "Si no puedes llamar el tiro, no estás viendo tus miras en el momento del disparo.",
  },
  {
    code: "EJ11",
    title: "Análisis de agrupaciones sobre blanco",
    tipologia: "Análisis",
    objetivo: "Diagnosticar errores técnicos por el patrón de dispersión sin electrónica.",
    material: "Blancos usados, plantilla de diagnóstico de errores de pistola (tirador diestro/zurdo).",
    ejecucion:
      "1) Conserva los blancos por serie. 2) Identifica el patrón: bajo-izquierda (gatillazo, diestro), disperso vertical (respiración/muñeca), horizontal (dedo lateral), etc. 3) Cruza con las llamadas de tiro. 4) Define UN foco de corrección para la siguiente sesión.",
    freqIniciacion: "1×/sem",
    freqNacional: "2×/sem",
    errores:
      "Corregir varios errores a la vez; confundir dispersión aleatoria con patrón.",
    progresion: "Análisis con entrenador → autoanálisis → análisis cruzado entre compañeros.",
    metrica: "Reducción del diámetro de agrupación por fase (precisión / 20\" / 10\").",
    claves: "Un patrón repetido en 2-3 series es diagnóstico; un tiro suelto no.",
  },
  {
    code: "EJ12",
    title: "Isométricos de hombro/deltoides",
    tipologia: "Físico – fuerza específica",
    objetivo:
      "Resistencia isométrica del deltoides y manguito rotador para sostener el arma estable toda la tirada.",
    material: "Mancuerna o disco de 1-1,5 kg (o la propia arma descargada).",
    ejecucion:
      "1) Brazo extendido al frente a altura de puntería con el peso. 2) Mantén 30-45 s. 3) Descansa 60-90 s. 4) Completa las series. Alterna con elevaciones laterales lentas ligeras.",
    freqIniciacion: "2×/sem, 3×30-45 s",
    freqNacional: "3×/sem, 4×45-60 s",
    errores: "Peso excesivo (transfiere temblor, no estabilidad); encoger el hombro.",
    progresion: "Aumenta tiempo antes que peso. Máximo ~2 kg.",
    metrica: "Tiempo máximo de hold estable sin temblor visible.",
    claves: "Nunca entrenar fuerza pesada de hombro el día antes de tirar.",
  },
  {
    code: "EJ13",
    title: "Fuerza de agarre y antebrazo",
    tipologia: "Físico – fuerza específica",
    objetivo:
      "Empuñadura consistente y resistente a la fatiga; independencia del dedo índice.",
    material: "Hand grip, cubo de arroz, banda elástica, muñequera con peso ligero.",
    ejecucion:
      "1) Hand grip: 3×10-15 cierres por mano. 2) Rice bucket: 2×1 min de movimientos de mano dentro del arroz. 3) Flexo-extensión de muñeca con peso ligero: 3×15. 4) Extensiones de dedos con banda: 3×15.",
    freqIniciacion: "2×/sem",
    freqNacional: "3×/sem",
    errores:
      "Trabajar solo flexores (desequilibrio); agarrotar el índice junto al resto de dedos.",
    progresion:
      "Añade cierres mantenidos 5 s y trabajo de índice aislado (presión progresiva simulando disparador).",
    metrica: "Presión de empuñadura constante durante una serie completa (sin reajustes).",
    claves: "La presión de empuñadura debe ser firme e idéntica en cada disparo.",
  },
  {
    code: "EJ14",
    title: "Core y estabilidad postural",
    tipologia: "Físico – core",
    objetivo: "Base estable del tronco que minimice las oscilaciones transmitidas al brazo.",
    material: "Esterilla.",
    ejecucion:
      "Circuito: plancha frontal 3×30-45 s, plancha lateral 2×30 s por lado, bird-dog 3×10 por lado, puente de glúteo 3×15.",
    freqIniciacion: "2×/sem, 15 min",
    freqNacional: "3×/sem, 20 min",
    errores: "Cadera caída en plancha; ejecutar con rebotes/rapidez.",
    progresion:
      "Aumenta tiempos; planchas con apoyo reducido; añade anti-rotación (Pallof press con banda).",
    metrica: "Plancha frontal 60 s estable como estándar mínimo.",
    claves: "El core trabaja en cada disparo: postura de tiro = plancha vertical sutil.",
  },
  {
    code: "EJ15",
    title: "Equilibrio y propiocepción",
    tipologia: "Físico – propiocepción",
    objetivo:
      "Reducir el balanceo corporal (postural sway), correlacionado directamente con la puntuación en tiro.",
    material: "Superficie inestable opcional (cojín, bosu).",
    ejecucion:
      "1) Apoyo monopodal 3×30 s por pierna. 2) Igual con ojos cerrados 3×20 s. 3) Sobre superficie inestable 3×30 s. 4) Opcional: simular postura de tiro sobre cojín 3×30 s.",
    freqIniciacion: "2×/sem, 10 min",
    freqNacional: "3×/sem, 10-15 min",
    errores: "Fijar la vista en el suelo (usa un punto a la altura de los ojos, como en tiro).",
    progresion: "Ojos abiertos → cerrados → superficie inestable → con brazo de tiro extendido.",
    metrica: "30 s monopodal con ojos cerrados sin apoyo.",
    claves:
      "Los estudios muestran que los tiradores de élite se diferencian sobre todo por menor sway.",
  },
  {
    code: "EJ16",
    title: "Trabajo aeróbico suave",
    tipologia: "Físico – cardiovascular",
    objetivo:
      "Reducir el pulso basal y mejorar la recuperación entre series; facilita disparar entre latidos.",
    material: "Calzado deportivo / bici.",
    ejecucion:
      "Caminar rápido, bici o carrera suave en zona 1-2 (conversacional), 30-45 min continuos.",
    freqIniciacion: "2×/sem, 30 min",
    freqNacional: "3×/sem, 30-45 min",
    errores: "Alta intensidad el día previo a tirar (temblor residual y fatiga).",
    progresion: "Aumenta duración, no intensidad.",
    metrica: "Pulso en reposo; objetivo tendencia descendente.",
    claves:
      "Un pulso bajo y una buena vagalidad = ventana de estabilidad más larga en cada puntería.",
  },
  {
    code: "EJ17",
    title: "Rutina pre-disparo estandarizada",
    tipologia: "Mental – rutina",
    objetivo:
      "Automatizar una secuencia idéntica que garantice consistencia y ancle la concentración.",
    material: "Ninguno.",
    ejecucion:
      "Secuencia fija (ejemplo): 1) Colocación de pies. 2) Verificación de empuñadura. 3) Respiración profunda. 4) Alzada. 5) Enrase. 6) Presión progresiva. 7) Follow-through. 8) Bajada y evaluación. La misma secuencia SIEMPRE, en seco y en fuego.",
    freqIniciacion: "Cada serie (seco y fuego)",
    freqNacional: "Cada serie (seco y fuego)",
    errores:
      "Rutinas distintas en entrenamiento y competición; saltarse pasos bajo presión.",
    progresion: "Escribe tu rutina → cronométrala → hazla idéntica ±1 s.",
    metrica: "Consistencia temporal de la rutina (cronometrar 10 rutinas: desviación <10%).",
    claves: "En competición no ejecutas técnica, ejecutas tu rutina.",
  },
  {
    code: "EJ18",
    title: "Visualización / imaginería",
    tipologia: "Mental",
    objetivo:
      "Reforzar el patrón motor del disparo perfecto y ensayar mentalmente la competición.",
    material: "Lugar tranquilo.",
    ejecucion:
      "1) Ojos cerrados, relajado. 2) Visualiza en 1ª persona la secuencia completa: sensación del arma, imagen de miras, presión del dedo, sonido, retroceso, impacto en el 10. 3) Incluye detalles sensoriales. 4) 10-15 repeticiones mentales. 5) Versión competición: visualiza también nervios, esperas y cómo los gestionas.",
    freqIniciacion: "2×/sem, 5-10 min",
    freqNacional: "Diario, 10 min",
    errores:
      "Visualizar en 3ª persona (menos transferencia); visualizar solo resultados, no proceso.",
    progresion: "Disparo aislado → serie completa → match completo con adversidades.",
    metrica:
      "Viveza subjetiva de la imagen (escala 1-5) y realismo temporal (la serie mental dura lo que la real).",
    claves:
      "El cerebro no distingue del todo entre disparo imaginado vívido y real: es entrenamiento gratis.",
  },
  {
    code: "EJ19",
    title: "Respiración diafragmática / relajación",
    tipologia: "Mental – arousal",
    objetivo:
      "Controlar la activación, bajar el pulso pre-serie y gestionar la ansiedad competitiva.",
    material: "Ninguno.",
    ejecucion:
      "1) Inspira por la nariz 4 s (el abdomen se expande). 2) Retén 2 s. 3) Espira por la boca 6 s. 4) Repite 5-10 ciclos. Aplícalo antes de cada serie y en pausas de competición. Complemento: relajación muscular progresiva 1×/sem.",
    freqIniciacion: "2×/sem, 5 min",
    freqNacional: "4-5×/sem, 5-10 min",
    errores: "Respiración torácica; usarla solo en competición sin haberla automatizado.",
    progresion:
      "En calma → tras esfuerzo físico ligero (simula pulso de competición) → en simulacros.",
    metrica: "Descenso de pulso medible tras 5 ciclos (con pulsómetro o manual).",
    claves:
      "La espiración larga activa el parasimpático: es tu freno de mano fisiológico.",
  },
  {
    code: "EJ20",
    title: "Tiro en seco con cambio de blanco (transiciones Standard)",
    tipologia: "Técnica – seco",
    objetivo:
      "Automatizar la recuperación del enrase tras el disparo y el reencare inmediato, clave para encadenar los 5 disparos de las series de 20\" y 10\".",
    material:
      "Pistola descargada, blanco reducido a distancia proporcional (o 5 marcas en pared separadas ~10 cm).",
    ejecucion:
      "1) Arma descargada, postura completa. 2) Alza sobre la primera marca, dispara en seco. 3) Sin bajar el brazo, reencara sobre la siguiente marca recuperando el enrase completo. 4) Encadena 5 disparos en seco, uno por marca. 5) Baja, descansa y repite. Variante Standard real: 5 disparos sobre la misma marca simulando la recuperación del retroceso (eleva ligeramente el arma entre disparos y vuelve al centro).",
    freqIniciacion: "2×/sem, 10-15 min",
    freqNacional: "3-4×/sem, 15-20 min",
    errores:
      "Reencarar sin verificar enrase (mover el arma no es apuntar); bajar el brazo entre disparos; acelerar perdiendo la presión progresiva del disparador.",
    progresion:
      "Sin tiempo → con metrónomo a cadencia de 20\" → cadencia de 10\" → variante con simulación de recuperación de retroceso.",
    metrica:
      "5 disparos en seco encadenados con enrase verificado en cada uno dentro de la cadencia objetivo.",
    claves:
      "En las series rápidas no ganas tiempo disparando más rápido, sino recuperando el enrase más rápido.",
  },
];

async function main() {
  for (let i = 0; i < EJERCICIOS.length; i++) {
    const e = EJERCICIOS[i];
    await db
      .insert(exercises)
      .values({ ...e, orden: i + 1 })
      .onConflictDoUpdate({
        target: exercises.code,
        set: { ...e, orden: i + 1 },
      });
  }
  console.log(`✓ ${EJERCICIOS.length} ejercicios sembrados/actualizados`);
}

main().catch((e) => {
  console.error("Error en el seed de ejercicios:", e);
  process.exit(1);
});
