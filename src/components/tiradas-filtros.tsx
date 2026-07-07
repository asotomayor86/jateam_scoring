"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { estiloCampo } from "@/components/ui";

type Opcion = { id: string; name: string };

const TIPOS = [
  { value: "", label: "Todos los tipos" },
  { value: "oficial", label: "Oficial" },
  { value: "semioficial", label: "Amistosa" },
  { value: "entrenamiento", label: "Entrenamiento" },
];

/** Filtros del listado de tiradas: actualizan los query params de la URL. */
export function TiradasFiltros({
  modalidades,
  clubs,
}: {
  modalidades: Opcion[];
  clubs: Opcion[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function set(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString());
    if (valor) next.set(clave, valor);
    else next.delete(clave);
    router.replace(`/tiradas?${next.toString()}`);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.5rem",
        margin: "0.5rem 0 1rem",
      }}
    >
      <select
        aria-label="Modalidad"
        style={estiloCampo}
        value={params.get("modalityId") ?? ""}
        onChange={(e) => set("modalityId", e.target.value)}
      >
        <option value="">Todas las modalidades</option>
        {modalidades.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Tipo"
        style={estiloCampo}
        value={params.get("type") ?? ""}
        onChange={(e) => set("type", e.target.value)}
      >
        {TIPOS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Club"
        style={{ ...estiloCampo, gridColumn: "1 / -1" }}
        value={params.get("clubId") ?? ""}
        onChange={(e) => set("clubId", e.target.value)}
      >
        <option value="">Todos los clubs</option>
        {clubs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
