"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { marcarVisto } from "@/actions/notificaciones";

/**
 * Al montar, marca la sección como vista (pone a cero su contador) y refresca
 * para que el menú se actualice. No pinta nada.
 */
export function MarcarVisto({ seccion }: { seccion: "chat" | "tiradas" }) {
  const router = useRouter();
  useEffect(() => {
    let vivo = true;
    marcarVisto(seccion).then(() => {
      if (vivo) router.refresh();
    });
    return () => {
      vivo = false;
    };
  }, [seccion, router]);
  return null;
}
