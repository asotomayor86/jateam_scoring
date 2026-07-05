ALTER TABLE "series" ADD COLUMN "exercise_id" uuid;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "rating" text;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;