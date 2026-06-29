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

export type ImageVariantStat = typeof imageVariantStats.$inferSelect
export type NewImageVariantStat = typeof imageVariantStats.$inferInsert

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
  }),
)

export type Recipe = typeof recipes.$inferSelect
export type NewRecipe = typeof recipes.$inferInsert
