# JA Team Scoring 🎯

Libreta y ranking de **tiro olímpico** para el grupo: apunta tus tiradas (en vivo,
serie a serie), deja grabados los resultados y compárate con los demás.

Pensada para **móvil** (instalable como app / PWA). Modalidades: Pistola
Standard, Fuego Central / 9mm, Pistola Aire (con décimas), Pistola Libre y
Velocidad.

## Stack

- **Next.js 16** (App Router, React 19, Server Actions)
- **Drizzle ORM** + **Neon Postgres** (`@neondatabase/serverless`)
- **Neon Auth** (Better Auth): login por email/contraseña + **invitación por correo**
- **Tailwind 4**, mobile-first
- Desplegado en **Vercel**

## Cómo funciona

- **Acceso por invitación**: no hay registro abierto. Un **encargado** (perfil con
  `is_admin = true`) invita por email desde **Miembros**; la persona recibe un
  correo para fijar su contraseña.
- **Todos hacen todo**: cualquier miembro crea tiradas, añade clubs y se apunta.
  Cada uno edita/borra **solo lo suyo**; la tirada la borra **quien la creó**.
- **Identificador estandarizado** de cada tirada: `AAAAMMDD-MODALIDAD-CLUB-TIPO`
  (p. ej. `20260627-STD-JATEAM-OF`), generado automáticamente.
- **Libreta flexible**: cada serie se apunta **tiro a tiro** (con `X` = diez
  interior) o solo con el **total**, mezclable. Autosave por serie.
- **Ranking** por tirada (total y desempate por dieces) e **histórico** personal.

## Desarrollo local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env.local` y rellena los valores (ver más abajo).
3. Aplica el esquema y siembra el catálogo:
   ```bash
   npm run db:generate   # genera la migración a partir de src/db/schema.ts
   npm run db:migrate    # la aplica en Neon
   npm run seed          # modalidades + club por defecto
   ```
4. Arranca:
   ```bash
   npm run dev
   ```

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL` | Neon (Vercel la inyecta en prod) | Conexión a Postgres |
| `NEON_AUTH_BASE_URL` | Neon Auth | Servidor de autenticación |
| `NEON_AUTH_COOKIE_SECRET` | tú | Firma de cookies de sesión |
| `NEXT_PUBLIC_APP_URL` | tú | Enlaces de los emails (invitación/reset) |

## Despliegue en Vercel

1. Sube el repo a GitHub (`asotomayor86/jateam_scoring`) e impórtalo en Vercel.
2. Añade la **integración de Neon** (crea la base de datos y define `DATABASE_URL`).
3. Configura **Neon Auth** en su consola:
   - SMTP / plantillas de correo (invitación y restablecer contraseña).
   - **Trusted domains**: la URL de Vercel y `localhost` (desarrollo).
4. Define las variables de entorno (`NEON_AUTH_BASE_URL`,
   `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_APP_URL`).
5. El `build` ejecuta `drizzle-kit migrate && next build`, así que las migraciones
   se aplican en cada despliegue.
6. Tras el primer deploy, ejecuta el seed una vez (`npm run seed` apuntando a la
   `DATABASE_URL` de producción) y marca a tu usuario como encargado:
   ```sql
   update profiles set is_admin = true where id = '<tu user id de Neon Auth>';
   ```

## Scripts

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Migra y compila para producción |
| `npm run typecheck` | Comprobación de tipos |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle Kit |
| `npm run seed` | Siembra modalidades y club por defecto |
