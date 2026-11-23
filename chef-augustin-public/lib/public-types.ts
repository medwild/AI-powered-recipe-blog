/**
 * Public snapshot types for Chef Augustin static export.
 * Zero database or private field dependencies.
 */

export interface PublicIngredient {
  name: string
  quantity?: string
}

export interface PublicInstruction {
  step: number
  text: string
}

export interface PublicRecipeRecord {
  id: number
  slug: string
  keyword: string
  title: string
  metaTitle: string | null
  metaDescription: string | null
  excerpt: string | null
  contentMarkdown: string | null
  heroImageUrl: string | null
  prepTime: string | null
  cookTime: string | null
  totalTime: string | null
  servings: string | null
  difficulty: string | null
  ingredients: PublicIngredient[]
  instructions: PublicInstruction[]
  tags: string[]
  jsonLd: Record<string, unknown> | null
  content_type: "recipe"
  category: string | null
  linked_content_id: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicArticleRecord {
  id: number
  slug: string
  keyword: string
  title: string
  metaTitle: string | null
  metaDescription: string | null
  excerpt: string | null
  contentMarkdown: string | null
  heroImageUrl: string | null
  tags: string[]
  jsonLd: Record<string, unknown> | null
  content_type: "article"
  category: string | null
  linked_content_id: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicRatingSummary {
  avg: number
  count: number
}

export interface PublicSnapshotPayload {
  schemaVersion: "1.0.0"
  sourceUpdatedAt: string | null
  contentHash: string
  counts: {
    recipes: number
    articles: number
    ratedRecipes: number
    categories: number
  }
  categories: string[]
  recipes: PublicRecipeRecord[]
  articles: PublicArticleRecord[]
  ratingsByRecipeId: Record<string, PublicRatingSummary>
}
