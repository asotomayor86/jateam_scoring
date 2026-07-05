"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanTimer, PasoTimer } from "@/lib/fases";

/** Pitido corto con Web Audio (se dispara tras un clic, así que está permitido). */
function beep(largo = false) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = largo ? 880 : 660;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    osc.start();
    const dur = largo ? 0.6 : 0.15;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
    osc.onended = () => ctx.close();
  } catch {
    /* sin audio */
  }
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
          if (plan.conPitido) beep(true);
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
        if (plan.conPitido) beep(false);
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
