CREATE TABLE "self_improvement_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"recommendation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
