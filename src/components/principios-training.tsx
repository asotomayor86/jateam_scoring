"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui";

type Principio = { corto: string; titulo: string; puntos: string[] };

const PRINCIPIOS: Principio[] = [
  {
    corto: "Seco vs fuego",
    titulo: "1. Seco vs. fuego real",
    puntos: [
      "Proporción recomendada: 3:1 en iniciación, 4:1 en nacional (por tiempo dedicado, no por disparos).",
      "El seco construye la técnica; el fuego real la verifica. Si un error aparece en fuego, se corrige en seco.",
      "Nunca uses el fuego real para 'practicar': cada cartucho debe confirmar algo ya trabajado en seco.",
      "Volumen orientativo de fuego real: 60-100 disparos/sem (iniciación) · 150-300/sem (nacional).",
    ],
  },
  {
    corto: "Calidad",
    titulo: "2. Calidad sobre cantidad",
    puntos: [
      "20 disparos en seco con atención plena valen más que 100 mecánicos.",
      "Termina cada sesión con un buen disparo, nunca con fatiga o frustración.",
      "Abortar un disparo cuando la puntería no es estable ES entrenar bien.",
    ],
  },
  {
    corto: "Un foco",
    titulo: "3. Un foco por sesión",
    puntos: [
      "Cada sesión tiene UN objetivo técnico (disparador, alzada, cadencia…). No corrijas dos cosas a la vez.",
      "El foco se decide analizando la sesión anterior (diario + agrupaciones).",
    ],
  },
  {
    corto: "Consistencia",
    titulo: "4. Consistencia sobre intensidad",
    puntos: [
      "5 sesiones cortas por semana superan a 2 maratonianas.",
      "La rutina pre-disparo es idéntica siempre: en seco, en fuego y en competición. En competición no ejecutas técnica, ejecutas tu rutina.",
    ],
  },
  {
    corto: "Progresión",
    titulo: "5. Progresión del tiempo (Standard)",
    puntos: [
      "El tiempo se gana recuperando el enrase, no moviendo el dedo más rápido.",
      "Progresión estándar: dominar sin tiempo → 30\" → 20\" → 10\". No bajes de escalón hasta no perder más de 2-3 puntos respecto al anterior.",
    ],
  },
  {
    corto: "Análisis",
    titulo: "6. El análisis es entrenamiento",
    puntos: [
      "Sin electrónica, tus herramientas son: llamada del tiro, agrupaciones y diario. Úsalas en cada sesión de fuego.",
      "Un patrón repetido en 2-3 series es diagnóstico; un tiro suelto es ruido.",
      "Si no puedes llamar el tiro, no estás viendo tus miras al disparar.",
    ],
  },
  {
    corto: "Físico y mental",
    titulo: "7. Lo físico y lo mental son parte del plan",
    puntos: [
      "El físico no da puntos directos, pero reduce el arco de movimiento y alarga la ventana de estabilidad.",
      "Evita fuerza intensa o cardio fuerte el día antes de tirar.",
      "La respiración y la visualización se automatizan en entrenamiento; en competición ya deben ser reflejas.",
    ],
  },
  {
    corto: "Presión",
    titulo: "8. La presión se entrena",
    puntos: [
      "Introduce estresores en dosis progresivas y variadas. La competición no debe ser la primera vez que sientes presión.",
      "Objetivo: diferencia entre puntuación normal y bajo presión < 3%.",
    ],
  },
];

export function PrincipiosTraining() {
  const [activo, setActivo] = useState(0);
  const carruselRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  function irA(i: number) {
    const el = carruselRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(PRINCIPIOS.length - 1, i));
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setActivo(idx);
    // Lleva la pestaña activa a la vista.
    tabsRef.current?.children[idx]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  function onScroll() {
    const el = carruselRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== activo) setActivo(i);
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "0.5rem",
        }}
      >
        <h2 className="seccion-titulo" style={{ margin: 0, fontSize: "1rem", flex: 1 }}>
          Tips rápidos
        </h2>
        <button
          type="button"
          className="btn"
          style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
          onClick={() => irA(activo - 1)}
          aria-label="Anterior"
        >
          ‹
        </button>
        <button
          type="button"
          className="btn"
          style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
          onClick={() => irA(activo + 1)}
          aria-label="Siguiente"
        >
          ›
        </button>
      </div>

      {/* Pestañas (scroll horizontal) */}
      <div
        ref={tabsRef}
        className="sin-scroll"
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.4rem",
        }}
      >
        {PRINCIPIOS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => irA(i)}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              padding: "0.35rem 0.7rem",
              borderRadius: 999,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--borde)",
              background: i === activo ? "var(--acento-fuerte)" : "transparent",
              color: i === activo ? "#1a1205" : "var(--texto-suave)",
            }}
          >
            {p.corto}
          </button>
        ))}
      </div>

      {/* Tarjeta ESTÁTICA: solo se desliza el contenido dentro de ella. */}
      <Card>
        <div
          ref={carruselRef}
          onScroll={onScroll}
          className="sin-scroll"
          style={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
          }}
        >
          {PRINCIPIOS.map((p, i) => (
            <div
              key={i}
              style={{ flex: "0 0 100%", scrollSnapAlign: "start", minWidth: 0, paddingTop: "0.4rem" }}
            >
              <strong
                style={{
                  fontSize: "1.15rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  display: "block",
                }}
              >
                {p.titulo}
              </strong>
              <ul
                style={{
                  margin: "0.5rem 0 0",
                  paddingLeft: 0,
                  listStylePosition: "inside",
                  lineHeight: 1.45,
                }}
              >
                {p.puntos.map((t, j) => (
                  <li key={j} style={{ padding: "0.2rem 0" }}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Puntos indicadores */}
      <div style={{ display: "flex", justifyContent: "center", gap: "0.35rem", marginTop: "0.5rem" }}>
        {PRINCIPIOS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir al principio ${i + 1}`}
            onClick={() => irA(i)}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: i === activo ? "var(--acento-fuerte)" : "var(--borde)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
