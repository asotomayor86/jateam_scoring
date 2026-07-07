"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  displayName: string;
  isAdmin: boolean;
  badges?: { chat: number; tiradas: number };
};

/** Círculo con el número de "nuevos" (rojo para chat, verde para tiradas). */
function Badge({ n, color }: { n: number; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        marginLeft: 6,
        borderRadius: 9,
        background: color,
        color: "#fff",
        fontSize: "0.7rem",
        fontWeight: 700,
        lineHeight: 1,
        verticalAlign: "middle",
      }}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

const enlaces = [
  { href: "/", label: "Inicio" },
  { href: "/formacion", label: "Formación APP" },
  { href: "/calendario", label: "Calendario" },
  { href: "/tiradas", label: "Tiradas y Entrenamientos" },
  { href: "/yo", label: "Mis tiradas" },
  { href: "/ejercicios", label: "Ejercicios" },
  { href: "/clubs", label: "Campos" },
  { href: "/comidas", label: "Comidas" },
  { href: "/restaurantes", label: "Restaurantes" },
  { href: "/chat", label: "Chat" },
  { href: "/perfil", label: "Perfil" },
];

/**
 * Barra de navegación del área privada. En móvil pasa a hamburguesa + drawer
 * (CSS en globals.css). El enlace "Miembros" solo aparece para el encargado.
 */
export function Nav({ displayName, isAdmin, badges }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const chat = badges?.chat ?? 0;
  const tir = badges?.tiradas ?? 0;
  const badgeDe = (href: string) =>
    href === "/chat" && chat > 0
      ? { n: chat, color: "#e5484d" }
      : href === "/tiradas" && tir > 0
        ? { n: tir, color: "#2fb344" }
        : null;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function cerrarSesion() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const items = isAdmin
    ? [...enlaces, { href: "/miembros", label: "Miembros" }]
    : enlaces;

  const esActivo = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={open ? "nav-open" : undefined}
      style={{
        borderBottom: "1px solid var(--borde)",
        background: "var(--superficie)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        backdropFilter: "blur(14px) saturate(140%)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <nav
        className="contenedor nav-bar"
        style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
      >
        <Link
          href="/"
          className="nav-brand"
          onClick={() => setOpen(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            fontWeight: 700,
            color: "inherit",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
            style={{ display: "block", borderRadius: 6 }}
          />
          <span
            className="titulo-app"
            style={{
              fontSize: "1.45rem",
              lineHeight: 1,
              // La fuente Avengeance tira hacia arriba: la bajamos un pelín
              // para alinearla con el icono.
              position: "relative",
              top: "0.09em",
            }}
          >
            JA Team
          </span>
        </Link>

        {/* Enlaces en línea (solo escritorio). */}
        <div className="nav-links">
          {items.map((e) => {
            const activo = esActivo(e.href);
            const badge = badgeDe(e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                style={{
                  padding: "0.35rem 0.7rem",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  background: activo ? "var(--superficie-2)" : "transparent",
                  color: activo ? "var(--texto)" : "var(--texto-suave)",
                }}
              >
                {e.label}
                {badge ? <Badge n={badge.n} color={badge.color} /> : null}
              </Link>
            );
          })}
        </div>

        <span
          className="nav-user"
          style={{
            fontSize: "0.85rem",
            color: "var(--texto-suave)",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </span>
        <span className="nav-signout">
          <ThemeToggle />
        </span>
        <button
          className="nav-signout"
          type="button"
          onClick={cerrarSesion}
          style={{
            border: "1px solid var(--borde)",
            background: "transparent",
            color: "var(--texto-suave)",
            borderRadius: 8,
            padding: "0.35rem 0.7rem",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Salir
        </button>

        {/* Hamburguesa (solo móvil). */}
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="nav-drawer"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      {/* Drawer móvil. */}
      <div id="nav-drawer" className="nav-drawer">
        {items.map((e) => {
          const badge = badgeDe(e.href);
          return (
            <Link key={e.href} href={e.href} data-activo={esActivo(e.href)}>
              {e.label}
              {badge ? <Badge n={badge.n} color={badge.color} /> : null}
            </Link>
          );
        })}
        <div className="nav-drawer-foot">
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          <ThemeToggle />
          <button
            type="button"
            onClick={cerrarSesion}
            style={{
              border: "1px solid var(--borde)",
              background: "transparent",
              color: "var(--texto-suave)",
              borderRadius: 8,
              padding: "0.45rem 0.85rem",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
