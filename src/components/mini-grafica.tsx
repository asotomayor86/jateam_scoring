/**
 * Mini-gráfica de línea (sparkline) para la progresión temporal. SVG propio, sin
 * dependencias. Los puntos ya vienen ordenados cronológicamente.
 */
export function MiniGrafica({
  valores,
  alto = 54,
  color = "var(--acento)",
}: {
  valores: number[];
  alto?: number;
  color?: string;
}) {
  const n = valores.length;
  if (n === 0) return null;

  const W = 300;
  const H = alto;
  const padY = 6;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - padY - ((v - min) / span) * (H - padY * 2);

  const puntos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const area = `M0,${H} L${puntos.join(" L")} L${W},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: alto, display: "block", overflow: "visible" }}
    >
      <path d={area} fill={color} opacity={0.14} />
      <polyline
        points={puntos.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {n <= 24 &&
        valores.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={2.4} fill={color} vectorEffect="non-scaling-stroke" />
        ))}
    </svg>
  );
}

/**
 * Barras horizontales del reparto de valores (10, 9, 8, …). `reparto[valor]` es
 * el número de tiros de ese valor.
 */
export function RepartoBarras({ reparto }: { reparto: number[] }) {
  const filas: { v: number; c: number }[] = [];
  for (let v = 10; v >= 0; v--) if (reparto[v]) filas.push({ v, c: reparto[v] });
  if (filas.length === 0) return null;
  const max = Math.max(...filas.map((f) => f.c));
  return (
    <div style={{ display: "grid", gap: 3, marginTop: "0.4rem" }}>
      {filas.map((f) => (
        <div key={f.v} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: 18,
              textAlign: "right",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--texto-suave)",
            }}
          >
            {f.v}
          </span>
          <div
            style={{
              flex: 1,
              height: 12,
              background: "var(--superficie-2)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(f.c / max) * 100}%`,
                height: "100%",
                background: "var(--acento)",
                borderRadius: 6,
              }}
            />
          </div>
          <span style={{ width: 26, fontSize: "0.75rem", color: "var(--texto-suave)" }}>
            {f.c}
          </span>
        </div>
      ))}
    </div>
  );
}
