import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App autónoma (no hace de proxy a otras apps), así que sin rewrites.
  // No marcamos @neondatabase/auth como external: necesita que el bundler
  // resuelva sus imports internos (next/headers, etc.).
};

export default nextConfig;
