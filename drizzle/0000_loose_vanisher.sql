CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"keyword" text NOT NULL,
	"title" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"excerpt" text,
	"content_markdown" text,
	"hero_image_url" text,
	"prep_time" text,
	"cook_time" text,
	"total_time" text,
	"servings" text,
	"difficulty" text,
	"ingredients" jsonb DEFAULT '[]'::jsonb,
	"instructions" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"serp_data" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"workflow_log" jsonb DEFAULT '[]'::jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "self_improvement_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"recommendation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_recipes_status" ON "recipes" USING btree ("status");