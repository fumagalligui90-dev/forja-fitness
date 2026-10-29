ALTER TABLE "exercises" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "primary_muscles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "secondary_muscles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "images" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_slug_unique" UNIQUE("slug");