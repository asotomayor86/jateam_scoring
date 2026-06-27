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
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"nickname" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"default_granularity" "entry_granularity" DEFAULT 'tiro' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_tirada_id_tiradas_id_fk" FOREIGN KEY ("tirada_id") REFERENCES "public"."tiradas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_scorecard_id_scorecards_id_fk" FOREIGN KEY ("scorecard_id") REFERENCES "public"."scorecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiradas" ADD CONSTRAINT "tiradas_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiradas" ADD CONSTRAINT "tiradas_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiradas" ADD CONSTRAINT "tiradas_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;