const MESES_G = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
function fechaCortaG(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_G[(m ?? 1) - 1]}`;
}

/** Punto de una gráfica de progresión: valor principal + agrupación (mm) opcional. */
type PuntoProg = { fecha: string; valor: number; agrupacion?: number | null };

/**
 * Gráfica de progresión temporal con valores en los puntos y fechas en el eje X.
 * Si hay datos de agrupación, se muestra una SEGUNDA gráfica alineada debajo
 * (no un doble eje: dos escalas en un mismo dibujo engañan).
 */
export function GraficaProgresion({
  puntos,
  etiquetaValor,
  colorValor = "var(--verde)",
  decimales = 2,
  sufijoValor = "",
}: {
  puntos: PuntoProg[];
  etiquetaValor: string;
  colorValor?: string;
  decimales?: number;
  sufijoValor?: string;
}) {
  const n = puntos.length;
  if (n === 0) return null;
  const W = 320;
  const mL = 8;
  const mR = 26;
  const xAt = (i: number) => (n === 1 ? W / 2 : mL + (i / (n - 1)) * (W - mL - mR));
  const hayAgr = puntos.some((p) => p.agrupacion != null);

  return (
    <div>
      <SubLinea
        titulo={etiquetaValor}
        valores={puntos.map((p) => p.valor)}
        color={colorValor}
        decimales={decimales}
        sufijo={sufijoValor}
        xAt={xAt}
        w={W}
        n={n}
      />
      {hayAgr ? (
        <SubLinea
          titulo="Agrupación media"
          valores={puntos.map((p) => p.agrupacion ?? null)}
          color="#0ea5b7"
          decimales={0}
          sufijo=" mm"
          xAt={xAt}
          w={W}
          n={n}
        />
      ) : null}
      <EjeFechas fechas={puntos.map((p) => p.fecha)} xAt={xAt} w={W} n={n} />
    </div>
  );
}

function SubLinea({
  titulo,
  valores,
  color,
  decimales,
  sufijo,
  xAt,
  w,
  n,
}: {
  titulo: string;
  valores: (number | null)[];
  color: string;
  decimales: number;
  sufijo: string;
  xAt: (i: number) => number;
  w: number;
  n: number;
}) {
  const H = 84;
  const mT = 18;
  const mB = 8;
  const defs = valores.map((v, i) => ({ v, i })).filter((d): d is { v: number; i: number } => d.v != null);
  if (defs.length === 0) return null;
  const vals = defs.map((d) => d.v);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.18;
  min -= pad;
  max += pad;
  const yAt = (v: number) => H - mB - ((v - min) / (max - min)) * (H - mT - mB);
  const linea = defs.map((d) => `${xAt(d.i).toFixed(1)},${yAt(d.v).toFixed(1)}`).join(" ");
  // Etiquetas: todas si son pocas; si no, una de cada N para no amontonar.
  const paso = Math.max(1, Math.ceil(n / 8));

  return (
    <div style={{ marginTop: "0.35rem" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--texto-suave)", marginBottom: 1 }}>
        {titulo}
      </div>
      <svg
        viewBox={`0 0 ${w} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <polyline
          points={linea}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {defs.map((d, k) => (
          <g key={d.i}>
            <circle cx={xAt(d.i)} cy={yAt(d.v)} r={2.6} fill={color} vectorEffect="non-scaling-stroke" />
            {k % paso === 0 || k === defs.length - 1 ? (
              <text
                x={xAt(d.i)}
                y={yAt(d.v) - 6}
                fontSize={9}
                textAnchor="middle"
                fill="var(--texto)"
                stroke="var(--fondo)"
                strokeWidth={2.6}
                paintOrder="stroke"
                style={{ fontWeight: 600 }}
              >
                {d.v.toFixed(decimales)}
                {sufijo}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function EjeFechas({
  fechas,
  xAt,
  w,
  n,
}: {
  fechas: string[];
  xAt: (i: number) => number;
  w: number;
  n: number;
}) {
  const paso = Math.max(1, Math.ceil(n / 6));
  return (
    <svg
      viewBox={`0 0 ${w} 16`}
      style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
    >
      {fechas.map((f, i) =>
        i % paso === 0 || i === n - 1 ? (
          <text key={i} x={xAt(i)} y={11} fontSize={9} textAnchor="middle" fill="var(--texto-suave)">
            {fechaCortaG(f)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

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
