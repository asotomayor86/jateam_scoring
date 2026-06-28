import Link from "next/link";
import { Card, TipoChip } from "@/components/ui";

type Props = {
  id: string;
  code: string;
  date: string;
  type: string;
  closed: boolean;
  startTime: string | null;
  name: string | null;
  caliber: string | null;
  modalityName: string;
  clubName: string;
  tiradores: number;
};

/** Fecha ISO (YYYY-MM-DD) a formato español corto (27 jun 2026). */
function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${d} ${meses[(m ?? 1) - 1]} ${y}`;
}

export function TiradaCard(t: Props) {
  return (
    <Link href={`/tiradas/${t.id}`} style={{ display: "block" }}>
      <Card
        style={{
          marginBottom: "0.6rem",
          // Cerrada = "pasada": fondo gris apagado y texto atenuado.
          ...(t.closed
            ? {
                background: "rgba(120, 130, 140, 0.16)",
                opacity: 0.78,
              }
            : null),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {t.modalityName}
              {t.caliber ? (
                <span style={{ color: "var(--texto-suave)" }}> · {t.caliber}</span>
              ) : null}
            </div>
            {t.name ? (
              <div style={{ color: "var(--texto)", fontSize: "0.95rem" }}>
                {t.name}
              </div>
            ) : null}
            <div style={{ color: "var(--texto-suave)", fontSize: "0.85rem" }}>
              {fechaCorta(t.date)}
              {t.startTime ? ` · ${t.startTime}` : ""} · {t.clubName}
            </div>
            <div
              style={{
                color: "var(--texto-suave)",
                fontSize: "0.72rem",
                fontFamily: "ui-monospace, monospace",
                marginTop: "0.2rem",
              }}
            >
              {t.code}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {t.closed ? (
              <span className="chip" style={{ marginRight: "0.3rem" }}>
                Cerrada
              </span>
            ) : null}
            <TipoChip tipo={t.type} />
            <div
              style={{
                marginTop: "0.4rem",
                color: "var(--texto-suave)",
                fontSize: "0.85rem",
              }}
            >
              {t.tiradores} 🎯
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
