CREATE TABLE "image_variant_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"variant_index" integer NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_link_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_content_id" integer NOT NULL,
	"target_slug" text NOT NULL,
	"target_content_id" integer,
	"anchor_text" text NOT NULL,
	"action" text NOT NULL,
	"source" text NOT NULL,
	"score" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pin_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"pin_draft_id" integer,
	"pinterest_pin_url" text,
	"pinterest_pin_id" text,
	"board" text NOT NULL,
	"board_slug" text NOT NULL,
	"pin_index" integer NOT NULL,
	"pin_title" text NOT NULL,
	"overlay_hook" text,
	"visual_type" text,
	"intent" text NOT NULL,
	"utm_source" text DEFAULT 'pinterest',
	"utm_medium" text DEFAULT 'pin',
	"utm_campaign" text,
	"utm_content" text,
	"publish_status" text DEFAULT 'draft',
	"published_at" timestamp with time zone,
	"impressions" integer DEFAULT 0,
	"saves" integer DEFAULT 0,
	"pin_clicks" integer DEFAULT 0,
	"outbound_clicks" integer DEFAULT 0,
	"outbound_click_rate" numeric(5, 2),
	"save_rate" numeric(5, 2),
	"last_metrics_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pin_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"pin_title" text NOT NULL,
	"overlay_text" text NOT NULL,
	"description" text NOT NULL,
	"image_prompt" text NOT NULL,
	"board" text NOT NULL,
	"intent" text NOT NULL,
	"ptra_score" integer NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb,
	"variant_index" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"pin_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"step_name" text NOT NULL,
	"error_type" text NOT NULL,
	"message" text NOT NULL,
	"severity" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "image_variants" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "content_type" text DEFAULT 'recipe';--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "linked_content_id" integer;--> statement-breakpoint
ALTER TABLE "self_improvement_logs" ADD COLUMN "criterion" text;--> statement-breakpoint
ALTER TABLE "self_improvement_logs" ADD COLUMN "score" text;--> statement-breakpoint
ALTER TABLE "self_improvement_logs" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "self_improvement_logs" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "self_improvement_logs" ADD COLUMN "ai_score" text;--> statement-breakpoint
CREATE INDEX "idx_ivs_recipe" ON "image_variant_stats" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_ivs_recipe_variant" ON "image_variant_stats" USING btree ("recipe_id","variant_index");--> statement-breakpoint
CREATE INDEX "idx_ill_source_content_id" ON "internal_link_logs" USING btree ("source_content_id");--> statement-breakpoint
CREATE INDEX "idx_ill_target_slug" ON "internal_link_logs" USING btree ("target_slug");--> statement-breakpoint
CREATE INDEX "idx_ill_action" ON "internal_link_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_pa_recipe" ON "pin_analytics" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_pa_board_slug" ON "pin_analytics" USING btree ("board_slug");--> statement-breakpoint
CREATE INDEX "idx_pa_publish_status" ON "pin_analytics" USING btree ("publish_status");--> statement-breakpoint
CREATE INDEX "idx_pa_published_at" ON "pin_analytics" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_pin_drafts_recipe" ON "pin_drafts" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_pin_drafts_status" ON "pin_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pe_recipe" ON "pipeline_errors" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_pe_step" ON "pipeline_errors" USING btree ("step_name");--> statement-breakpoint
CREATE INDEX "idx_pe_severity" ON "pipeline_errors" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_recipes_slug" ON "recipes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_recipes_published_at" ON "recipes" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_recipes_created_at" ON "recipes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_recipes_content_type" ON "recipes" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "idx_recipes_linked_content_id" ON "recipes" USING btree ("linked_content_id");