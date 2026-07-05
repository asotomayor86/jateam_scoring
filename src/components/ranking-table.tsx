import { formatPunt } from "@/lib/scoring";

type Fila = {
  scorecardId: string;
  userId: string;
  total: number;
  innerCount: number;
  status: string;
  category: string | null;
  displayName: string;
  nickname: string | null;
};

/** Tabla de clasificación de una tirada (ya viene ordenada por total y dieces). */
export function RankingTable({
  filas,
  allowsDecimals,
  currentUserId,
  mostrarCategoria = false,
}: {
  filas: Fila[];
  allowsDecimals: boolean;
  currentUserId: string;
  mostrarCategoria?: boolean;
}) {
  if (filas.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Nadie se ha apuntado todavía. ¡Sé el primero!
      </p>
    );
  }

  return (
    <table className="tabla">
      <thead>
        <tr>
          <th style={{ width: 32 }}>#</th>
          <th>Tirador</th>
          {mostrarCategoria ? <th>Cat.</th> : null}
          <th className="num">Total</th>
          <th className="num" title="Dieces interiores">
            X
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => {
          const yo = f.userId === currentUserId;
          return (
            <tr
              key={f.scorecardId}
              style={yo ? { background: "rgba(245,158,11,0.12)" } : undefined}
            >
              <td>{i + 1}</td>
              <td>
                {f.nickname || f.displayName}
                {yo ? " (tú)" : ""}
                {f.status === "borrador" ? (
                  <span
                    style={{
                      marginLeft: "0.4rem",
                      color: "var(--texto-suave)",
                      fontSize: "0.75rem",
                    }}
                  >
                    en curso
                  </span>
                ) : null}
              </td>
              {mostrarCategoria ? (
                <td style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
                  {f.category ?? "—"}
                </td>
              ) : null}
              <td className="num" style={{ fontWeight: 700 }}>
                {formatPunt(f.total, allowsDecimals)}
              </td>
              <td className="num">{f.innerCount}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
