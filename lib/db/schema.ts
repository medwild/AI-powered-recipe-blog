import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
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

export const imageVariantStats = pgTable(
  "image_variant_stats",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id").notNull(),
    variantIndex: integer("variant_index").notNull(),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipeIdx: index("idx_ivs_recipe").on(table.recipeId),
    uniqueVariant: index("idx_ivs_recipe_variant").on(table.recipeId, table.variantIndex),
  }),
)

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

export type ImageVariantStat = typeof imageVariantStats.$inferSelect
export type NewImageVariantStat = typeof imageVariantStats.$inferInsert

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

export type Recipe = typeof recipes.$inferSelect
export type NewRecipe = typeof recipes.$inferInsert
