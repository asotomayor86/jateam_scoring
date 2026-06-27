CREATE TYPE "public"."entry_granularity" AS ENUM('tiro', 'bloque5', 'bloque10', 'serie');--> statement-breakpoint
CREATE TYPE "public"."scorecard_status" AS ENUM('borrador', 'finalizada');--> statement-breakpoint
CREATE TYPE "public"."tirada_type" AS ENUM('entrenamiento', 'oficial', 'semioficial');--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"abbr" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "modalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"abbr" text NOT NULL,
	"distance" integer NOT NULL,
	"total_shots" integer NOT NULL,
	"series_count" integer NOT NULL,
	"default_series_size" integer NOT NULL,
	"allows_decimals" boolean DEFAULT false NOT NULL,
	"max_per_shot" real DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modalities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "modalities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"nickname" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"default_granularity" "entry_granularity" DEFAULT 'tiro' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tirada_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"granularity" "entry_granularity" DEFAULT 'tiro' NOT NULL,
	"total" real DEFAULT 0 NOT NULL,
	"inner_count" integer DEFAULT 0 NOT NULL,
	"status" "scorecard_status" DEFAULT 'borrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scorecards_tirada_id_user_id_unique" UNIQUE("tirada_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "scorecards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scorecard_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"shots" jsonb,
	"shot_count" integer NOT NULL,
	"subtotal" real DEFAULT 0 NOT NULL,
	"inner" integer DEFAULT 0 NOT NULL,
	"notes" text,
	CONSTRAINT "series_scorecard_id_idx_unique" UNIQUE("scorecard_id","idx")
);
--> statement-breakpoint
ALTER TABLE "series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tiradas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"date" text NOT NULL,
	"modality_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"type" "tirada_type" NOT NULL,
	"caliber" text,
	"name" text,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tiradas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "tiradas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_tirada_id_tiradas_id_fk" FOREIGN KEY ("tirada_id") REFERENCES "public"."tiradas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_scorecard_id_scorecards_id_fk" FOREIGN KEY ("scorecard_id") REFERENCES "public"."scorecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiradas" ADD CONSTRAINT "tiradas_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiradas" ADD CONSTRAINT "tiradas_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiradas" ADD CONSTRAINT "tiradas_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "clubs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "clubs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "clubs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "clubs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "modalities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "modalities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "modalities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)) WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "modalities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "profiles"."id")) WITH CHECK ((select auth.user_id() = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "scorecards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "scorecards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "scorecards"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "scorecards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "scorecards"."user_id")) WITH CHECK ((select auth.user_id() = "scorecards"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "scorecards" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "scorecards"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "series" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "series" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
        select exists (
          select 1 from scorecards s
          where s.id = "series"."scorecard_id" and s.user_id = (select auth.user_id())
        )
      ));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "series" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
        select exists (
          select 1 from scorecards s
          where s.id = "series"."scorecard_id" and s.user_id = (select auth.user_id())
        )
      )) WITH CHECK ((
        select exists (
          select 1 from scorecards s
          where s.id = "series"."scorecard_id" and s.user_id = (select auth.user_id())
        )
      ));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "series" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
        select exists (
          select 1 from scorecards s
          where s.id = "series"."scorecard_id" and s.user_id = (select auth.user_id())
        )
      ));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "tiradas" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "tiradas" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "tiradas"."created_by"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "tiradas" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "tiradas"."created_by")) WITH CHECK ((select auth.user_id() = "tiradas"."created_by"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "tiradas" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "tiradas"."created_by"));