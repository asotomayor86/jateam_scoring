"use client";

/**
 * Cliente de Neon Auth para componentes de cliente (formularios de UI, hooks).
 * Sin argumentos: usa el endpoint `/api/auth` del propio dominio.
 */
import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();
