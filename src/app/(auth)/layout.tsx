import type { ReactNode } from "react";

// Marco centrado y mobile-first para las páginas públicas de autenticación.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "1.5rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 className="titulo-app" style={{ margin: 0, fontSize: "2.2rem" }}>
          JA TEAM SCORING
        </h1>
        <p style={{ margin: "0.25rem 0 0", color: "var(--texto-suave)" }}>
          Libreta y ranking de tiro del grupo
        </p>
      </div>
      <div style={{ width: "100%", maxWidth: 400 }}>{children}</div>
    </main>
  );
}
