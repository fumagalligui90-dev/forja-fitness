CREATE TYPE "public"."goal" AS ENUM('hypertrophy', 'weight_loss', 'conditioning', 'strength', 'health');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('dark', 'light');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"height_cm" smallint,
	"weight_kg" numeric(5, 1),
	"goal" "goal",
	"experience_level" "difficulty",
	"training_days" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"session_minutes" smallint,
	"theme" "theme" DEFAULT 'dark' NOT NULL,
	"accent_color" text,
	"rest_alerts" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;