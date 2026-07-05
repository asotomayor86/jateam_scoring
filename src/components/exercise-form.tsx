"use client";

import { useActionState } from "react";
import { guardarEjercicio, type ResultadoAccion } from "@/actions/exercises";
import { Aviso, estiloCampo } from "@/components/ui";

export type EjercicioInicial = {
  id: string;
  code: string;
  title: string;
  tipologia: string;
  objetivo: string | null;
  material: string | null;
  ejecucion: string | null;
  freqIniciacion: string | null;
  freqNacional: string | null;
  errores: string | null;
  progresion: string | null;
  metrica: string | null;
  claves: string | null;
};

const inicial: ResultadoAccion = { ok: false };
const etiqueta = { fontSize: "0.8rem", color: "var(--texto-suave)" };

function Campo({
  label,
  name,
  value,
  area = false,
  required = false,
}: {
  label: string;
  name: string;
  value?: string | null;
  area?: boolean;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={etiqueta}>{label}</span>
      {area ? (
        <textarea
          name={name}
          defaultValue={value ?? ""}
          rows={3}
          maxLength={4000}
          style={estiloCampo}
        />
      ) : (
        <input
          name={name}
          defaultValue={value ?? ""}
          required={required}
          maxLength={160}
          style={estiloCampo}
        />
      )}
    </label>
  );
}

export function ExerciseForm({ ejercicio }: { ejercicio?: EjercicioInicial }) {
  const [estado, accion, enviando] = useActionState(guardarEjercicio, inicial);

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      {ejercicio ? <input type="hidden" name="id" value={ejercicio.id} /> : null}
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <div style={{ width: 110 }}>
          <Campo label="Código" name="code" value={ejercicio?.code} required />
        </div>
        <div style={{ flex: 1 }}>
          <Campo label="Título" name="title" value={ejercicio?.title} required />
        </div>
      </div>
      <Campo label="Tipología" name="tipologia" value={ejercicio?.tipologia} required />
      <Campo label="Objetivo" name="objetivo" value={ejercicio?.objetivo} area />
      <Campo label="Material" name="material" value={ejercicio?.material} area />
      <Campo label="Ejecución" name="ejecucion" value={ejercicio?.ejecucion} area />
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Campo label="Frecuencia iniciación" name="freqIniciacion" value={ejercicio?.freqIniciacion} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Campo label="Frecuencia nacional" name="freqNacional" value={ejercicio?.freqNacional} />
        </div>
      </div>
      <Campo label="Errores comunes" name="errores" value={ejercicio?.errores} area />
      <Campo label="Progresión" name="progresion" value={ejercicio?.progresion} area />
      <Campo label="Métrica" name="metrica" value={ejercicio?.metrica} area />
      <Campo label="Claves" name="claves" value={ejercicio?.claves} area />

      <button type="submit" className="btn btn-primario btn-bloque" disabled={enviando}>
        {enviando ? "Guardando…" : ejercicio ? "Guardar cambios" : "Crear ejercicio"}
      </button>
      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
    </form>
  );
}
