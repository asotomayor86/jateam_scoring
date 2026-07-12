import {
  DIANA_25M,
  type DianaSpec,
  type Impacto,
  estadisticas,
  radioExterior,
  radioDiez,
  puntMin,
} from "@/lib/diana";

// Paleta fija de diana (igual en claro y oscuro).
const PAPEL = "#e9e4d6";
const NEGRO = "#14110c";
const LINEA_CLARA = "rgba(255,255,255,0.5)";
const LINEA_OSCURA = "rgba(0,0,0,0.4)";
const IMPACTO = "rgba(209,55,47,0.72)";
const MPI_COLOR = "#0ea5b7";
const MPI_FILL = "rgba(14,165,183,0.16)";

/**
 * Diana estática (solo lectura) que dibuja una nube de impactos acumulados con
 * su centro de agrupación (MPI) y el círculo que los engloba. Para el análisis
 * agregado de "Mis resultados": todos los impactos se pintan en mm desde el
 * centro real, así se ve la tendencia y la dispersión de conjunto.
 */
export function DianaMini({
  impactos,
  maxWidth = 260,
  spec = DIANA_25M,
}: {
  impactos: Impacto[];
  maxWidth?: number;
  spec?: DianaSpec;
}) {
  const SPEC = spec;
  const R = radioExterior(SPEC) + 22;
  const VIEW = R * 2;
  const DOT = SPEC.caliberMm / 2;
  const tenR = radioDiez(SPEC);
  const stats = estadisticas(impactos);
  const rings: number[] = [];
  for (let i = 0; i <= SPEC.maxScore - puntMin(SPEC); i++) rings.push(tenR + i * SPEC.ringStep);
  return (
    <svg
      viewBox={`${-R} ${-R} ${VIEW} ${VIEW}`}
      style={{ width: "100%", maxWidth, margin: "0 auto", display: "block", borderRadius: 10 }}
    >
      <rect x={-R} y={-R} width={VIEW} height={VIEW} fill={PAPEL} />
      <circle cx={0} cy={0} r={SPEC.blackR} fill={NEGRO} />
      {rings.map((rad) => (
        <circle
          key={rad}
          cx={0}
          cy={0}
          r={rad}
          fill="none"
          stroke={rad <= SPEC.blackR ? LINEA_CLARA : LINEA_OSCURA}
          strokeWidth={1.2}
        />
      ))}
      {impactos.map((im, i) => (
        <circle
          key={i}
          cx={im.x}
          cy={-im.y}
          r={DOT}
          fill={IMPACTO}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={0.8}
        />
      ))}
      {stats && stats.n > 1 && (
        <g>
          {stats.covering > 1 && (
            <circle
              cx={stats.mpiX}
              cy={-stats.mpiY}
              r={stats.covering}
              fill={MPI_FILL}
              stroke={MPI_COLOR}
              strokeWidth={1.6}
              strokeDasharray="6 5"
              strokeOpacity={0.75}
            />
          )}
          <g stroke={MPI_COLOR} strokeWidth={2.6} opacity={0.95}>
            <line x1={stats.mpiX - 12} y1={-stats.mpiY} x2={stats.mpiX + 12} y2={-stats.mpiY} />
            <line x1={stats.mpiX} y1={-stats.mpiY - 12} x2={stats.mpiX} y2={-stats.mpiY + 12} />
          </g>
        </g>
      )}
    </svg>
  );
}
