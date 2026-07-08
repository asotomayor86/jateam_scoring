"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanTimer, PasoTimer, SonidoPaso } from "@/lib/fases";

/**
 * Una nota de un patrón sonoro. Si se indica `f2`, el tono desliza de `f` a `f2`
 * a lo largo de la nota (para acentuar/subir al final, p. ej. "guééen").
 */
type Nota = { f: number; f2?: number; dur: number; hueco?: number; tipo?: OscillatorType };

/**
 * Patrones sonoros por tipo de aviso. La idea es que cada uno tenga una cadencia
 * y un tono reconocibles de oído, sin mirar la pantalla:
 *  - carguen: "caaaaaar-guééen": 1ª sílaba sostenida y larga (sin caer), 2ª sube y se acentúa al final.
 *  - atencion: tres golpes imitando "aaa-ten-ción" (largo-corto-corto, sube al final).
 *  - disparen: un pitido agudo y brillante (empiezan los disparos).
 *  - alto: alto el fuego entre exposiciones del duelo (grave, medio).
 *  - fin: final de la serie (grave y bastante más largo que el alto).
 */
const PATRONES: Record<SonidoPaso, Nota[]> = {
  carguen: [
    { f: 523, dur: 1.0, hueco: 0.05 }, //         "caaaaaar" (sostenida, larga, sin caer)
    { f: 523, f2: 659, dur: 0.42 }, //            "guééen"   (sube y se acentúa al final)
  ],
  atencion: [
    { f: 587, dur: 0.26, hueco: 0.06 }, // "aaa" (largo)
    { f: 587, dur: 0.12, hueco: 0.05 }, // "ten" (corto)
    { f: 740, dur: 0.22 }, //              "ción" (sube)
  ],
  disparen: [{ f: 1245, dur: 0.16, tipo: "triangle" }], // agudo
  alto: [
    { f: 311, dur: 0.14, hueco: 0.03 },
    { f: 165, dur: 0.5 }, // grave y medio
  ],
  fin: [
    { f: 233, dur: 0.22, hueco: 0.04 },
    { f: 117, dur: 0.9, hueco: 0.04 }, // muy grave
    { f: 87, dur: 1.1 }, //              aún más grave y largo
  ],
};

// Volumen muy alto para oírlo en el campo de tiro (el compresor de abajo evita
// que sature al empujar tanto nivel).
const VOLUMEN = 1.7;

/** Muestras de audio grabadas por tipo de aviso (si existen). Se intentan primero
 *  y, si el navegador no las puede decodificar (p. ej. Ogg en iOS), se cae al
 *  pitido sintético. */
const MUESTRAS: Partial<Record<SonidoPaso, string>> = {
  carguen: "/carguen.ogg",
};

function nuevoCtx(): AudioContext | null {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return Ctx ? new Ctx() : null;
}

/**
 * Cadena de salida común: → compresor (limita picos al empujar mucho nivel) →
 * makeup (sube el volumen ya comprimido, cerca del máximo sin saturar) → destino.
 * Devuelve el nodo de entrada al que conectar las fuentes.
 */
function crearCadena(ctx: AudioContext, makeupGain: number): AudioNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.ratio.value = 20;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  const makeup = ctx.createGain();
  makeup.gain.value = makeupGain;
  comp.connect(makeup);
  makeup.connect(ctx.destination);
  return comp;
}

/** Reproduce un patrón de notas con Web Audio (permitido tras un clic previo). */
function reproducir(notas: Nota[]) {
  try {
    const ctx = nuevoCtx();
    if (!ctx) return;
    const comp = crearCadena(ctx, 3.2);
    let t = ctx.currentTime;
    for (const n of notas) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.tipo ?? "sine";
      osc.frequency.setValueAtTime(n.f, t);
      if (n.f2) osc.frequency.linearRampToValueAtTime(n.f2, t + n.dur);
      osc.connect(gain);
      gain.connect(comp);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(VOLUMEN, t + 0.012);
      gain.gain.setValueAtTime(VOLUMEN, t + n.dur - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
      osc.start(t);
      osc.stop(t + n.dur + 0.03);
      t += n.dur + (n.hueco ?? 0.05);
    }
    const fin = t;
    setTimeout(() => ctx.close().catch(() => {}), (fin - ctx.currentTime) * 1000 + 150);
  } catch {
    /* sin audio */
  }
}

// Muestras que ya fallaron al decodificarse: no reintentarlas, ir directas al
// pitido sintético.
const muestraFallida = new Set<string>();

/**
 * Reproduce una muestra grabada. Si no se puede decodificar (formato no
 * soportado, p. ej. Ogg en iOS) o falla la carga, ejecuta `fallback`.
 */
function reproducirMuestra(url: string, fallback: () => void) {
  if (muestraFallida.has(url)) {
    fallback();
    return;
  }
  const ctx = nuevoCtx();
  if (!ctx) {
    fallback();
    return;
  }
  const entrada = crearCadena(ctx, 2.4);
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((buf) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(entrada);
      src.start();
      src.onended = () => ctx.close().catch(() => {});
    })
    .catch(() => {
      muestraFallida.add(url);
      ctx.close().catch(() => {});
      fallback();
    });
}

/** Reproduce el sonido de un tipo de aviso (si existe). */
function sonar(tipo?: SonidoPaso) {
  if (!tipo) return;
  const url = MUESTRAS[tipo];
  if (url) reproducirMuestra(url, () => reproducir(PATRONES[tipo]));
  else reproducir(PATRONES[tipo]);
}

function mmss(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/**
 * Temporizador de serie. Muestra un botón por opción de arranque (Carguen /
 * Serie). Al pulsar una, ejecuta su secuencia de pasos con pitidos opcionales.
 */
export function SeriesTimer({ plan }: { plan: PlanTimer }) {
  const [steps, setSteps] = useState<PasoTimer[] | null>(null); // null = inactivo
  const [idx, setIdx] = useState(-1);
  const [rem, setRem] = useState(0);
  const intervalo = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const ultimoPaso = useRef(-1);

  const limpiar = useCallback(() => {
    clearInterval(intervalo.current);
    intervalo.current = undefined;
  }, []);

  useEffect(() => () => limpiar(), [limpiar]);

  function iniciar(pasos: PasoTimer[]) {
    limpiar();
    setSteps(pasos);
    const total = pasos.reduce((a, s) => a + s.seconds, 0);
    const t0 = Date.now();
    ultimoPaso.current = -1;
    const update = () => {
      const el = (Date.now() - t0) / 1000;
      if (el >= total) {
        limpiar();
        setIdx(pasos.length);
        setRem(0);
        if (ultimoPaso.current !== pasos.length) {
          ultimoPaso.current = pasos.length;
          if (plan.conPitido) sonar("fin");
        }
        return;
      }
      let acc = 0;
      let i = 0;
      for (; i < pasos.length; i++) {
        if (el < acc + pasos[i].seconds) break;
        acc += pasos[i].seconds;
      }
      setIdx(i);
      setRem(Math.ceil(acc + pasos[i].seconds - el));
      if (i !== ultimoPaso.current) {
        ultimoPaso.current = i;
        if (plan.conPitido) sonar(pasos[i].sonido);
      }
    };
    update();
    intervalo.current = setInterval(update, 200);
  }

  function reset() {
    limpiar();
    setSteps(null);
    setIdx(-1);
    setRem(0);
    ultimoPaso.current = -1;
  }

  const enMarcha = steps !== null && idx >= 0 && idx < steps.length;
  const terminado = steps !== null && idx === steps.length;
  const pasoActual = enMarcha ? steps![idx] : null;
  const esDisparo = enMarcha && !!pasoActual?.destacar;

  return (
    <div
      style={{
        marginTop: "0.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
      }}
    >
      {steps === null ? (
        plan.opciones.map((op) => (
          <button
            key={op.startLabel}
            type="button"
            className="btn"
            style={{ fontSize: "0.85rem" }}
            onClick={() => iniciar(op.steps)}
          >
            ⏱ {op.startLabel}
          </button>
        ))
      ) : (
        <>
          <span
            style={{
              fontWeight: 700,
              fontSize: esDisparo ? "1.05rem" : "0.95rem",
              color: terminado
                ? "var(--rojo)"
                : esDisparo
                  ? "var(--verde)"
                  : "var(--acento)",
            }}
          >
            {terminado ? plan.finalLabel : pasoActual?.label}
            {enMarcha ? ` · ${mmss(rem)}` : ""}
          </span>
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.8rem" }}
            onClick={reset}
          >
            Reset
          </button>
        </>
      )}
    </div>
  );
}
