"use server";

import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/auth/helpers";
import { db, profiles } from "@/db";

/** Marca como vista una sección (pone a cero su contador del menú). */
export async function marcarVisto(seccion: "chat" | "tiradas"): Promise<void> {
  const { user } = await requireUser();
  const set =
    seccion === "chat"
      ? { chatSeenAt: sql`now()` }
      : { tiradasSeenAt: sql`now()` };
  await db.update(profiles).set(set).where(eq(profiles.id, user.id));
}
