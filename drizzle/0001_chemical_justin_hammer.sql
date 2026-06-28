ALTER TYPE "public"."entry_granularity" ADD VALUE 'asistido';--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "blanco_nuevo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "buckets" jsonb;