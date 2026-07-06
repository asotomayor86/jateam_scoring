/** Renderiza texto con los enlaces (http/https) convertidos en enlaces clicables. */
export function TextoConEnlaces({ texto }: { texto: string }) {
  const partes = texto.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {partes.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--acento)", wordBreak: "break-all" }}
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}
