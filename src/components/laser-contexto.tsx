"use client";

import { createContext, useContext } from "react";

/**
 * Indica si el láser local debe estar bloqueado (dispositivo de Control cuando hay
 * una Cámara remota activa). Lo pone `SesionesGuard`.
 */
export const LaserBloqueadoContext = createContext(false);

export function useLaserBloqueado(): boolean {
  return useContext(LaserBloqueadoContext);
}
