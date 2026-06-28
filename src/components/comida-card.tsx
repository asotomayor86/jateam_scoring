import Link from "next/link";
import { Card } from "@/components/ui";

type Props = {
  id: string;
  date: string;
  startTime: string | null;
  name: string | null;
  restaurantName: string;
  asistentes: number;
};

function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${d} ${meses[(m ?? 1) - 1]} ${y}`;
}

/** Tarjeta de una comida. Fondo distinto (azulado) para diferenciar de tiradas. */
export function ComidaCard(c: Props) {
  return (
    <Link href={`/comidas/${c.id}`} style={{ display: "block" }}>
      <Card
        style={{
          marginBottom: "0.6rem",
          background: "rgba(56, 132, 255, 0.16)",
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
              🍽️ {c.name || "Comida"}
            </div>
            <div style={{ color: "var(--texto)", fontSize: "0.95rem" }}>
              {c.restaurantName}
            </div>
            <div style={{ color: "var(--texto-suave)", fontSize: "0.85rem" }}>
              {fechaCorta(c.date)}
              {c.startTime ? ` · ${c.startTime}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span className="chip" style={{ borderColor: "rgba(56,132,255,0.6)", color: "#9cc0ff" }}>
              Comida
            </span>
            <div
              style={{
                marginTop: "0.4rem",
                color: "var(--texto-suave)",
                fontSize: "0.85rem",
              }}
            >
              {c.asistentes} 👥
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
