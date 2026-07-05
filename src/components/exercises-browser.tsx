"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, estiloCampo } from "@/components/ui";

type Ej = {
  id: string;
  code: string;
  title: string;
  tipologia: string;
  objetivo: string | null;
};

export function ExercisesBrowser({ ejercicios }: { ejercicios: Ej[] }) {
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");

  const tipologias = useMemo(
    () => Array.from(new Set(ejercicios.map((e) => e.tipologia))).sort(),
    [ejercicios],
  );

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ejercicios.filter((e) => {
      if (tipo && e.tipologia !== tipo) return false;
      if (!term) return true;
      return (
        e.title.toLowerCase().includes(term) ||
        e.code.toLowerCase().includes(term) ||
        (e.objetivo ?? "").toLowerCase().includes(term) ||
        e.tipologia.toLowerCase().includes(term)
      );
    });
  }, [ejercicios, tipo, q]);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
          margin: "0.5rem 0 1rem",
        }}
      >
        <input
          placeholder="Buscar ejercicio…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...estiloCampo, gridColumn: "1 / -1" }}
        />
        <select
          aria-label="Tipología"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          style={{ ...estiloCampo, gridColumn: "1 / -1" }}
        >
          <option value="">Todas las tipologías</option>
          {tipologias.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
        {filtrados.length} ejercicio{filtrados.length === 1 ? "" : "s"}
      </p>

      {filtrados.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>No hay ejercicios con esos filtros.</p>
      ) : (
        filtrados.map((e) => (
          <Link key={e.id} href={`/ejercicios/${e.id}`} style={{ display: "block" }}>
            <Card style={{ marginBottom: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                    <span style={{ color: "var(--texto-suave)", fontSize: "0.82rem" }}>
                      {e.code}
                    </span>{" "}
                    <span style={{ textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      {e.title}
                    </span>
                  </div>
                  {e.objetivo ? (
                    <div
                      style={{
                        color: "var(--texto-suave)",
                        fontSize: "0.85rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {e.objetivo}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="chip" style={{ marginTop: "0.4rem", display: "inline-block" }}>
                {e.tipologia}
              </span>
            </Card>
          </Link>
        ))
      )}
    </>
  );
}
