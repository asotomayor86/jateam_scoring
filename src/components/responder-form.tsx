"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { responder, type ResultadoAccion } from "@/actions/chat";
import { Aviso, Card } from "@/components/ui";
import {
  MentionableTextarea,
  type MiembroMencion,
} from "@/components/mentionable-textarea";

const inicial: ResultadoAccion = { ok: false };

/** Caja de respuesta de un hilo. Menciona con @; Enter envía, Shift+Enter salta. */
export function ResponderForm({
  threadId,
  members,
}: {
  threadId: string;
  members: MiembroMencion[];
}) {
  const [estado, accion, enviando] = useActionState(responder, inicial);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    if (estado.ok) setResetToken((t) => t + 1);
  }, [estado]);

  return (
    <Card style={{ marginTop: "0.8rem" }}>
      <form
        ref={formRef}
        action={accion}
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        <input type="hidden" name="threadId" value={threadId} />
        <MentionableTextarea
          name="body"
          members={members}
          placeholder="Escribe una respuesta…  (@ para mencionar)"
          required
          resetToken={resetToken}
          onEnterSubmit={() => formRef.current?.requestSubmit()}
        />
        {estado.mensaje ? <Aviso tipo="error">{estado.mensaje}</Aviso> : null}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primario" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </Card>
  );
}
