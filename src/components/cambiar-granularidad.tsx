"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { cambiarGranularidad } from "@/actions/scorecards";
import { Card } from "@/components/ui";

type Gran = "tiro" | "bloque5" | "bloque10" | "serie" | "asistido";

const OPCIONES: { v: Gran; label: string }[] = [
  { v: "tiro", label: "Tiro a tiro" },
  { v: "bloque5", label: "Total de bloques de 5" },
  { v: "bloque10", label: "Total de bloques de 10" },
  { v: "serie", label: "Total por serie" },
  { v: "asistido", label: "Asistido competición" },
];

/**
 * Selector para cambiar el modo de apunte de la hoja. Se muestra solo mientras
 * la libreta no tiene apuntes de disparo.
 */
export function CambiarGranularidad({
  scorecardId,
  actual,
}: {
  scorecardId: string;
  actual: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState<Gran>((actual as Gran) ?? "tiro");
  const [estado, setEstado] = useState<string>("");

  async function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const g = e.target.value as Gran;
    const anterior = valor;
    setValor(g);
    setEstado("guardando");
    try {
      const r = await cambiarGranularidad({ scorecardId, granularity: g });
      if (r.ok) {
        setEstado("");
        router.refresh();
      } else {
        setValor(anterior);
        setEstado(r.mensaje ?? "No se pudo cambiar");
      }
    } catch {
      setValor(anterior);
      setEstado("No se pudo cambiar");
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Modo de apunte</label>
        <select
          value={valor}
          onChange={onChange}
          style={{
            flex: 1,
            minWidth: 180,
            padding: "0.5rem 0.6rem",
            borderRadius: 8,
            border: "1px solid var(--borde)",
            background: "var(--superficie-2)",
            color: "var(--texto)",
            fontSize: "0.95rem",
          }}
        >
          {OPCIONES.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--texto-suave)" }}>
        {estado && estado !== "guardando"
          ? estado
          : "Puedes cambiarlo mientras la libreta no tenga apuntes."}
      </p>
    </Card>
  );
}
