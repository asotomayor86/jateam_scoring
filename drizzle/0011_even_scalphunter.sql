CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"tipologia" text NOT NULL,
	"objetivo" text,
	"material" text,
	"ejecucion" text,
	"freq_iniciacion" text,
	"freq_nacional" text,
	"errores" text,
	"progresion" text,
	"metrica" text,
	"claves" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_code_unique" UNIQUE("code")
);
