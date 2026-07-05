/**
 * Seed inicial: catálogo de modalidades de tiro y un club por defecto.
 *
 * Ejecuta:  npm run seed   (usa .env.local para DATABASE_URL)
 *
 * Es idempotente: las modalidades se insertan por `slug` con onConflictDoNothing
 * y el club solo se crea si aún no existe ninguno.
 */
import { db, modalities, clubs } from "../src/db";

const MODALIDADES = [
  {
    slug: "pistola-standard",
    name: "Pistola Standard",
    abbr: "STD",
    distance: 25,
    totalShots: 60,
    seriesCount: 12,
    defaultSeriesSize: 5,
    allowsDecimals: false,
    maxPerShot: 10,
  },
  {
    slug: "fuego-central",
    name: "Fuego Central / 9mm",
    abbr: "FC",
    distance: 25,
    totalShots: 60,
    seriesCount: 12,
    defaultSeriesSize: 5,
    allowsDecimals: false,
    maxPerShot: 10,
  },
  {
    slug: "pistola-aire",
    name: "Pistola Aire Comprimido",
    abbr: "AIRE",
    distance: 10,
    totalShots: 60,
    seriesCount: 6,
    defaultSeriesSize: 10,
    allowsDecimals: true,
    maxPerShot: 10.9,
  },
  {
    slug: "pistola-libre",
    name: "Pistola Libre",
    abbr: "LIBRE",
    distance: 50,
    totalShots: 60,
    seriesCount: 6,
    defaultSeriesSize: 10,
    allowsDecimals: false,
    maxPerShot: 10,
  },
  {
    slug: "pistola-velocidad",
    name: "Pistola Velocidad",
    abbr: "VEL",
    distance: 25,
    totalShots: 60,
    seriesCount: 12,
    defaultSeriesSize: 5,
    allowsDecimals: false,
    maxPerShot: 10,
  },
  {
    // Modalidad especial: la libreta empieza vacía y se van añadiendo módulos.
    slug: "entrenamiento-modular",
    name: "Entrenamiento modular",
    abbr: "MOD",
    distance: 25,
    totalShots: 0,
    seriesCount: 0,
    defaultSeriesSize: 5,
    allowsDecimals: false,
    maxPerShot: 10,
  },
];

async function main() {
  // Modalidades (idempotente por slug).
  for (const m of MODALIDADES) {
    await db.insert(modalities).values(m).onConflictDoNothing({
      target: modalities.slug,
    });
  }
  console.log(`✓ ${MODALIDADES.length} modalidades aseguradas`);

  // Club por defecto, solo si no hay ninguno.
  const existentes = await db.select({ id: clubs.id }).from(clubs).limit(1);
  if (existentes.length === 0) {
    await db.insert(clubs).values({ name: "JA Team", abbr: "JATEAM" });
    console.log("✓ Club por defecto creado (JA Team)");
  } else {
    console.log("• Ya existen clubs, no se crea el por defecto");
  }

  console.log("Seed completado.");
}

main().catch((e) => {
  console.error("Error en el seed:", e);
  process.exit(1);
});
