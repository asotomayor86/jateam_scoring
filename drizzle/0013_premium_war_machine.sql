ALTER TYPE "public"."entry_granularity" ADD VALUE 'diana';--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "impacts" jsonb;