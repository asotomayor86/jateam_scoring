/** Carita de calificación: verde sonriente, amarilla neutra, roja enfadada. */
export function RatingFace({
  tipo,
  size = 30,
}: {
  tipo: "verde" | "amarillo" | "rojo";
  size?: number;
}) {
  const color =
    tipo === "verde" ? "#46c98b" : tipo === "amarillo" ? "#f5c451" : "#ef5a6f";
  const trazo = "#1c1206";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle cx="12" cy="12" r="10" fill={color} stroke="rgba(0,0,0,0.28)" strokeWidth="0.6" />
      {tipo === "rojo" ? (
        <>
          {/* cejas enfadadas */}
          <line x1="6.6" y1="7.6" x2="10" y2="9.2" stroke={trazo} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="17.4" y1="7.6" x2="14" y2="9.2" stroke={trazo} strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : null}
      {/* ojos */}
      <circle cx="8.6" cy="10.4" r="1.25" fill={trazo} />
      <circle cx="15.4" cy="10.4" r="1.25" fill={trazo} />
      {/* boca */}
      {tipo === "verde" ? (
        <path d="M8 13.6 Q12 17.6 16 13.6" fill="none" stroke={trazo} strokeWidth="1.6" strokeLinecap="round" />
      ) : tipo === "amarillo" ? (
        <line x1="8.5" y1="15" x2="15.5" y2="15" stroke={trazo} strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M8 16.4 Q12 13 16 16.4" fill="none" stroke={trazo} strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}
