"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanTimer, PasoTimer, SonidoPaso } from "@/lib/fases";

/** Una nota de un patrón sonoro. */
type Nota = { f: number; dur: number; hueco?: number; tipo?: OscillatorType };

/**
 * Patrones sonoros por tipo de aviso. La idea es que cada uno tenga una cadencia
 * y un tono reconocibles de oído, sin mirar la pantalla:
 *  - carguen: dos golpes graves imitando "caaaaaar-guen" (1ª sílaba muy larga, baja).
 *  - atencion: tres golpes imitando "aaa-ten-ción" (largo-corto-corto, sube al final).
 *  - disparen: un pitido agudo y brillante (empiezan los disparos).
 *  - stop: un tono grave y largo, descendente (alto / fin).
 */
const PATRONES: Record<SonidoPaso, Nota[]> = {
  carguen: [
    { f: 523, dur: 0.85, hueco: 0.06 }, // "caaaaaar" (muy largo)
    { f: 415, dur: 0.2 }, //               "guen"     (corto, baja)
  ],
  atencion: [
    { f: 587, dur: 0.26, hueco: 0.06 }, // "aaa" (largo)
    { f: 587, dur: 0.12, hueco: 0.05 }, // "ten" (corto)
    { f: 740, dur: 0.22 }, //              "ción" (sube)
  ],
  disparen: [{ f: 1245, dur: 0.16, tipo: "triangle" }], // agudo
  stop: [
    { f: 311, dur: 0.14, hueco: 0.03 },
    { f: 165, dur: 0.5 }, // grave y largo
  ],
};

// Volumen alto para oírlo en el campo de tiro (junto con el compresor de abajo).
const VOLUMEN = 0.9;

/** Reproduce un patrón de notas con Web Audio (permitido tras un clic previo). */
function reproducir(notas: Nota[]) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    // Compresor: permite subir mucho el nivel sin que sature/chasquee.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 12;
    comp.attack.value = 0.002;
    comp.release.value = 0.15;
    comp.connect(ctx.destination);
    let t = ctx.currentTime;
    for (const n of notas) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.tipo ?? "sine";
      osc.frequency.value = n.f;
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

/** Reproduce el sonido de un tipo de aviso (si existe). */
function sonar(tipo?: SonidoPaso) {
  if (tipo) reproducir(PATRONES[tipo]);
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
          if (plan.conPitido) sonar("stop");
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
