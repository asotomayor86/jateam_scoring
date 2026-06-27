import type { MetadataRoute } from "next";

// Manifest del PWA: permite instalar JA Team Scoring en la pantalla de inicio
// del móvil y abrirlo en modo standalone (como una app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JA Team Scoring",
    short_name: "JATeam",
    description:
      "Libreta y ranking de tiro: apunta tus tiradas y compáralas con el grupo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
