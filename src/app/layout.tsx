import type { Metadata } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

// Tipografía condensada, legible en cifras (puntuaciones).
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JA Team Scoring",
  description:
    "Libreta y ranking de tiro olímpico para el grupo: apunta tus tiradas y compáralas.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JATeam",
    startupImage: undefined,
  },
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0b0f14",
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={barlow.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
