"use client";

import { useActionState, useEffect, useRef } from "react";
import { responder, type ResultadoAccion } from "@/actions/chat";
import { Aviso, estiloCampo } from "@/components/ui";

const inicial: ResultadoAccion = { ok: false };

/** Caja de respuesta de un hilo. Se limpia al enviar; Enter envía, Shift+Enter salto. */
export function ResponderForm({ threadId }: { threadId: string }) {
  const [estado, accion, enviando] = useActionState(responder, inicial);
  const formRef = useRef<HTMLFormElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (estado.ok && areaRef.current) {
      areaRef.current.value = "";
      areaRef.current.focus();
    }
  }, [estado]);

  return (
    <form
      ref={formRef}
      action={accion}
      style={{
        position: "sticky",
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        padding: "0.6rem 0",
        marginTop: "0.3rem",
        background: "var(--superficie)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        borderTop: "1px solid var(--borde)",
      }}
    >
      <input type="hidden" name="threadId" value={threadId} />
      <textarea
        ref={areaRef}
        name="body"
        placeholder="Escribe una respuesta…"
        maxLength={2000}
        rows={2}
        required
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        style={{ ...estiloCampo, resize: "vertical" }}
      />
      {estado.mensaje ? <Aviso tipo="error">{estado.mensaje}</Aviso> : null}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
