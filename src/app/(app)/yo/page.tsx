import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getHistorial } from "@/db/queries/scorecards";
import { Card, SeccionTitulo, TipoChip } from "@/components/ui";
import { formatPunt } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function YoPage() {
  const { user, profile } = await requireUser();
  const historial = await getHistorial(user.id);

  // Mejor marca por modalidad (solo hojas finalizadas).
  const mejores = new Map<
    string,
    { total: number; allowsDecimals: boolean }
  >();
  for (const h of historial) {
    if (h.status !== "finalizada") continue;
    const prev = mejores.get(h.modalityName);
    if (!prev || h.total > prev.total) {
      mejores.set(h.modalityName, {
        total: h.total,
        allowsDecimals: h.allowsDecimals,
      });
    }
  }

  return (
    <>
      <SeccionTitulo>Mis tiradas</SeccionTitulo>
      <p style={{ color: "var(--texto-suave)", margin: "0 0 0.8rem" }}>
        {profile.nickname || profile.displayName} · {historial.length} hojas
      </p>

      {mejores.size > 0 && (
        <>
          <SeccionTitulo>Mejores marcas</SeccionTitulo>
          <Card style={{ marginBottom: "0.5rem" }}>
            <table className="tabla">
              <tbody>
                {[...mejores.entries()].map(([modalidad, m]) => (
                  <tr key={modalidad}>
                    <td>{modalidad}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatPunt(m.total, m.allowsDecimals)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <SeccionTitulo>Historial</SeccionTitulo>
      {historial.length === 0 ? (
        <p style={{ color: "var(--texto-suave)" }}>
          Aún no te has apuntado a ninguna tirada.{" "}
          <Link href="/tiradas" style={{ color: "var(--acento)" }}>
            Ver tiradas
          </Link>
        </p>
      ) : (
        <Card>
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Modalidad</th>
                <th className="num">Total</th>
                <th className="num">X</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr key={h.scorecardId}>
                  <td>
                    <Link
                      href={`/tiradas/${h.tiradaId}`}
                      style={{ color: "var(--acento)" }}
                    >
                      {h.date}
                    </Link>
                    <div style={{ marginTop: 2 }}>
                      <TipoChip tipo={h.type} />
                    </div>
                  </td>
                  <td>{h.modalityName}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {formatPunt(h.total, h.allowsDecimals)}
                    {h.status !== "finalizada" ? (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--texto-suave)",
                          fontWeight: 400,
                        }}
                      >
                        en curso
                      </div>
                    ) : null}
                  </td>
                  <td className="num">{h.innerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
