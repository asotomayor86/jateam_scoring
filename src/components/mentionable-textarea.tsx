"use client";

import { useRef, useState } from "react";
import { estiloCampo } from "@/components/ui";

export type MiembroMencion = { id: string; label: string };

/**
 * Textarea con autocompletado de menciones: al escribir "@" sale la lista de
 * miembros; al elegir uno se inserta "@Nombre" y se registra su id en un input
 * oculto `mentions` (JSON) para que el servidor sepa a quién se menciona.
 */
export function MentionableTextarea({
  name,
  members,
  placeholder,
  rows = 2,
  maxLength = 2000,
  required,
  autoFocus,
  onEnterSubmit,
  resetToken = 0,
}: {
  name: string;
  members: MiembroMencion[];
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  autoFocus?: boolean;
  onEnterSubmit?: () => void;
  resetToken?: number;
}) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState("");
  const [mencionados, setMencionados] = useState<string[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const posRef = useRef(0); // índice del "@" que se está escribiendo
  const ultimoReset = useRef(resetToken);

  // Limpieza tras enviar (el padre incrementa resetToken).
  if (resetToken !== ultimoReset.current) {
    ultimoReset.current = resetToken;
    if (value !== "") setValue("");
    if (mencionados.length) setMencionados([]);
    setQuery(null);
  }

  function detecta(v: string, caret: number) {
    const antes = v.slice(0, caret);
    const m = antes.match(/@([\p{L}\d_]*)$/u);
    if (m) {
      setQuery(m[1]);
      posRef.current = caret - m[0].length;
    } else {
      setQuery(null);
    }
  }

  const sugerencias =
    query != null
      ? members
          .filter((mb) => mb.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6)
      : [];

  function elegir(mb: MiembroMencion) {
    const caret = areaRef.current?.selectionStart ?? value.length;
    const antes = value.slice(0, posRef.current);
    const despues = value.slice(caret);
    const insert = `@${mb.label} `;
    const nuevo = antes + insert + despues;
    setValue(nuevo);
    setQuery(null);
    setMencionados((prev) => (prev.includes(mb.id) ? prev : [...prev, mb.id]));
    requestAnimationFrame(() => {
      const p = (antes + insert).length;
      areaRef.current?.focus();
      areaRef.current?.setSelectionRange(p, p);
    });
  }

  // Solo se envían las menciones cuyo texto sigue presente.
  const mencionesFinal = mencionados.filter((id) => {
    const mb = members.find((m) => m.id === id);
    return mb && value.includes(`@${mb.label}`);
  });

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={areaRef}
        name={name}
        value={value}
        rows={rows}
        maxLength={maxLength}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          detecta(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (sugerencias.length > 0 && (e.key === "Enter" || e.key === "Tab")) {
            e.preventDefault();
            elegir(sugerencias[0]);
            return;
          }
          if (e.key === "Escape" && query != null) {
            setQuery(null);
            return;
          }
          if (e.key === "Enter" && !e.shiftKey && onEnterSubmit) {
            e.preventDefault();
            onEnterSubmit();
          }
        }}
        style={{ ...estiloCampo, resize: "vertical" }}
      />
      <input type="hidden" name="mentions" value={JSON.stringify(mencionesFinal)} />
      {sugerencias.length > 0 ? (
        <ul
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            zIndex: 20,
            margin: "0.2rem 0 0",
            padding: "0.25rem",
            listStyle: "none",
            borderRadius: 10,
            border: "1px solid var(--borde)",
            background: "var(--superficie)",
            backdropFilter: "blur(14px) saturate(140%)",
            WebkitBackdropFilter: "blur(14px) saturate(140%)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {sugerencias.map((mb) => (
            <li key={mb.id}>
              <button
                type="button"
                onClick={() => elegir(mb)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.4rem 0.5rem",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--texto)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                @{mb.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
