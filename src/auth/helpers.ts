import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "@/auth/server";
import { db, profiles, type Profile } from "@/db";

/** Usuario tal como lo devuelve Neon Auth (subconjunto que usamos). */
export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

/**
 * Devuelve el usuario de la sesión actual, o `null` si no hay sesión.
 * No redirige: úsalo cuando quieras comportarte distinto con/sin sesión.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await getAuth().getSession();
    const user = data?.user as AuthUser | undefined;
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Garantiza que existe una fila en `profiles` para este usuario.
 * Se llama tras el login. No sobreescribe nombre/apodo si ya existían.
 */
export async function ensureProfile(user: AuthUser): Promise<Profile> {
  const nombre = user.name?.trim() || user.email.split("@")[0];

  await db
    .insert(profiles)
    .values({ id: user.id, displayName: nombre })
    .onConflictDoNothing({ target: profiles.id });

  const [perfil] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return perfil;
}

/**
 * Exige sesión iniciada. Si no la hay, redirige a /login.
 * Devuelve el usuario y su perfil (creándolo si hiciera falta).
 */
export async function requireUser(): Promise<{
  user: AuthUser;
  profile: Profile;
}> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(user);
  return { user, profile };
}

/**
 * Exige que el usuario sea encargado (admin). Si no lo es (o no hay sesión),
 * redirige. Solo se usa para invitar a nuevos miembros.
 */
export async function requireAdmin(): Promise<{
  user: AuthUser;
  profile: Profile;
}> {
  const { user, profile } = await requireUser();
  if (!profile.isAdmin) redirect("/");
  return { user, profile };
}
