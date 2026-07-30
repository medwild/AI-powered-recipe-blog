import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core"

export type Ingredient = {
  name: string
  quantity?: string
}

export type Instruction = {
  step: number
  text: string
}

export type ImageVariant = {
  /** Variant label: "A", "B", etc. */
  label: string
  /** Cloudinary URL */
  url: string
  /** Prompt used to generate this variant */
  prompt: string
}

export type WorkflowLogEntry = {
  agent: string
  status: "running" | "done" | "error"
  message: string
  at: string
}

export const selfImprovementLogs = pgTable(
  "self_improvement_logs",
  {
    id: serial("id").primaryKey(),
    keyword: text("keyword").notNull(),
    recommendation: text("recommendation").notNull(),
    criterion: text("criterion"),
    score: text("score"),
    tags: jsonb("tags").$type<string[]>().default([]),
    source: text("source"),
    aiScore: text("ai_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export type SelfImprovementLog = typeof selfImprovementLogs.$inferSelect
export type NewSelfImprovementLog = typeof selfImprovementLogs.$inferInsert

export const pipelineErrors = pgTable(
  "pipeline_errors",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id").notNull(),
    stepName: text("step_name").notNull(),
    errorType: text("error_type").notNull(),
    message: text("message").notNull(),
    severity: text("severity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipeIdx: index("idx_pe_recipe").on(table.recipeId),
    stepIdx: index("idx_pe_step").on(table.stepName),
    severityIdx: index("idx_pe_severity").on(table.severity),
  }),
)

export type PipelineError = typeof pipelineErrors.$inferSelect
export type NewPipelineError = typeof pipelineErrors.$inferInsert

export const recipeRatings = pgTable(
  "recipe_ratings",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id").notNull(),
    rating: integer("rating").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipeIdx: index("idx_rr_recipe").on(table.recipeId),
    uniqueVote: index("idx_rr_recipe_ip").on(table.recipeId, table.ipHash),
  }),
)

export type RecipeRating = typeof recipeRatings.$inferSelect
export type NewRecipeRating = typeof recipeRatings.$inferInsert

export const pinDrafts = pgTable(
  "pin_drafts",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id").notNull(),
    pinTitle: text("pin_title").notNull(),
    overlayText: text("overlay_text").notNull(),
    description: text("description").notNull(),
    imagePrompt: text("image_prompt").notNull(),
    board: text("board").notNull(),
    intent: text("intent").notNull(),
    ptraScore: integer("ptra_score").notNull(),
    hashtags: jsonb("hashtags").$type<string[]>().default([]),
    variantIndex: integer("variant_index").default(0),
    status: text("status").notNull().default("draft"),
    pinUrl: text("pin_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipeIdx: index("idx_pin_drafts_recipe").on(table.recipeId),
    statusIdx: index("idx_pin_drafts_status").on(table.status),
  }),
)

export type PinDraft = typeof pinDrafts.$inferSelect
export type NewPinDraft = typeof pinDrafts.$inferInsert

export const pinAnalytics = pgTable(
  "pin_analytics",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id").notNull(),
    pinDraftId: integer("pin_draft_id"),
    pinterestPinUrl: text("pinterest_pin_url"),
    pinterestPinId: text("pinterest_pin_id"),
    board: text("board").notNull(),
    boardSlug: text("board_slug").notNull(),
    pinIndex: integer("pin_index").notNull(),
    pinTitle: text("pin_title").notNull(),
    overlayHook: text("overlay_hook"),
    visualType: text("visual_type"),
    intent: text("intent").notNull(),
    utmSource: text("utm_source").default("pinterest"),
    utmMedium: text("utm_medium").default("pin"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    publishStatus: text("publish_status").default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    impressions: integer("impressions").default(0),
    saves: integer("saves").default(0),
    pinClicks: integer("pin_clicks").default(0),
    outboundClicks: integer("outbound_clicks").default(0),
    outboundClickRate: numeric("outbound_click_rate", { precision: 5, scale: 2 }),
    saveRate: numeric("save_rate", { precision: 5, scale: 2 }),
    lastMetricsSyncAt: timestamp("last_metrics_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recipeIdx: index("idx_pa_recipe").on(table.recipeId),
    boardSlugIdx: index("idx_pa_board_slug").on(table.boardSlug),
    publishStatusIdx: index("idx_pa_publish_status").on(table.publishStatus),
    publishedAtIdx: index("idx_pa_published_at").on(table.publishedAt),
  }),
)

export type PinAnalytic = typeof pinAnalytics.$inferSelect
export type NewPinAnalytic = typeof pinAnalytics.$inferInsert

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    keyword: text("keyword").notNull(),
    title: text("title").notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    excerpt: text("excerpt"),
    contentMarkdown: text("content_markdown"),
    heroImageUrl: text("hero_image_url"),
    imageVariants: jsonb("image_variants").$type<ImageVariant[]>().default([]),
    /**
     * Human-readable time strings consumed by formatDuration() in persist-phase.ts.
     * Expected formats: "45 min", "1 hour 30 minutes", "2 hours", "1h30m".
     * Converted to ISO 8601 (PT45M, PT1H30M) for JSON-LD @graph output.
     */
    prepTime: text("prep_time"),
    cookTime: text("cook_time"),
    totalTime: text("total_time"),
    servings: text("servings"),
    difficulty: text("difficulty"),
    ingredients: jsonb("ingredients").$type<Ingredient[]>().default([]),
    instructions: jsonb("instructions").$type<Instruction[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),
    serpData: jsonb("serp_data"),
    jsonLd: jsonb("json_ld").$type<Record<string, unknown>>(),
    status: text("status").notNull().default("draft"),
    workflowLog: jsonb("workflow_log").$type<WorkflowLogEntry[]>().default([]),
    // v7.0 Aor — content type differentiation
    content_type: text("content_type").default("recipe"),
    category: text("category"),
    linked_content_id: integer("linked_content_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_recipes_status").on(table.status),
    slugIdx: index("idx_recipes_slug").on(table.slug),
    publishedAtIdx: index("idx_recipes_published_at").on(table.publishedAt),
    createdAtIdx: index("idx_recipes_created_at").on(table.createdAt),
    contentTypeIdx: index("idx_recipes_content_type").on(table.content_type),
    linkedContentIdIdx: index("idx_recipes_linked_content_id").on(table.linked_content_id),
  }),
)

export const internalLinkLogs = pgTable(
  "internal_link_logs",
  {
    id: serial("id").primaryKey(),
    sourceContentId: integer("source_content_id").notNull(),
    targetSlug: text("target_slug").notNull(),
    targetContentId: integer("target_content_id"),
    anchorText: text("anchor_text").notNull(),
    action: text("action").notNull(),
    source: text("source").notNull(),
    score: integer("score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ill_source_content_id").on(table.sourceContentId),
    index("idx_ill_target_slug").on(table.targetSlug),
    index("idx_ill_action").on(table.action),
  ],
)

export type Recipe = typeof recipes.$inferSelect
export type NewRecipe = typeof recipes.$inferInsert

export type InternalLinkLog = typeof internalLinkLogs.$inferSelect
