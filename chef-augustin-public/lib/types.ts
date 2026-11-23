/**
 * Shared types for Chef Augustin static public application.
 * Decoupled from PostgreSQL and Drizzle ORM schema.
 */

export type Ingredient = {
  name: string
  quantity?: string
}

export type Instruction = {
  step: number
  text: string
}

export type ImageVariant = {
  label: string
  url: string
  prompt: string
}

export type Recipe = {
  id: number
  slug: string
  keyword: string
  title: string
  metaTitle: string | null
  metaDescription: string | null
  excerpt: string | null
  contentMarkdown: string | null
  heroImageUrl: string | null
  imageVariants: ImageVariant[] | null
  prepTime: string | null
  cookTime: string | null
  totalTime: string | null
  servings: string | null
  difficulty: string | null
  ingredients: Ingredient[]
  instructions: Instruction[]
  tags: string[]
  serpData: Record<string, unknown> | null
  jsonLd: Record<string, unknown> | null
  status: string
  workflowLog: unknown[] | null
  content_type: string | null
  category: string | null
  linked_content_id: number | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ── Domain types ──────────────────────────────────────────────────────────

export type ContentType = "recipe" | "article"

// ── Component prop types ──────────────────────────────────────────────────

/** Fields consumed by RecipeCard */
export type RecipeCardData = Pick<
  Recipe,
  "id" | "slug" | "title" | "heroImageUrl" | "difficulty" | "totalTime" | "servings" | "tags" | "publishedAt"
>

/** Fields consumed by RecipeHero */
export type RecipeHeroData = Pick<
  Recipe,
  "title" | "excerpt" | "heroImageUrl" | "tags" | "publishedAt" | "totalTime" | "slug"
>

/** Fields consumed by RecipeMetaBar */
export type RecipeMetaData = Pick<
  Recipe,
  "prepTime" | "cookTime" | "servings" | "difficulty"
>

/** Fields consumed by ArticleCard */
export type ArticleCardData = Pick<
  Recipe,
  "id" | "slug" | "title" | "heroImageUrl" | "publishedAt" | "category"
>

export interface PublicRatingSummary {
  avg: number
  count: number
}
