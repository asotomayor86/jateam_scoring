import { defineConfig } from "drizzle-kit";

// Configuración de Drizzle Kit: genera y aplica migraciones contra Neon Postgres.
// La cadena DATABASE_URL la inyecta la integración de Neon en Vercel; en local
// se lee de .env.local.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Solo gestionamos el esquema "public"; el esquema "neon_auth" lo administra
  // Neon Auth y no debe tocarlo Drizzle.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
