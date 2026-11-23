/**
 * Static public data provider reading exclusively from data/public-content.json.
 * Replaces lib/queries.ts for the 100% static public export.
 *
 * Guarantees:
 * - 0 database connections, 0 Neon calls, 0 private credentials
 * - Strict type compatibility with existing public components
 * - Dates parsed to Date objects so .toISOString() and formatters work reliably
 * - Published status populated explicitly
 */

import fs from "node:fs"
import path from "node:path"
import type {
  PublicSnapshotPayload,
  PublicRecipeRecord,
  PublicArticleRecord,
} from "./public-types"
import type { Recipe, RecipeCardData } from "./types"

let cachedSnapshot: PublicSnapshotPayload | null = null

function loadSnapshot(): PublicSnapshotPayload {
  if (cachedSnapshot) return cachedSnapshot
  const filePath = path.resolve(process.cwd(), "data/public-content.json")
  if (!fs.existsSync(filePath)) {
    throw new Error(`Public snapshot not found at ${filePath}. Run export-public-snapshot first.`)
  }
  const raw = fs.readFileSync(filePath, "utf8")
  cachedSnapshot = JSON.parse(raw) as PublicSnapshotPayload
  return cachedSnapshot
}

function adaptRecipe(r: PublicRecipeRecord): Recipe {
  return {
    ...r,
    imageVariants: null,
    serpData: null,
    workflowLog: null,
    status: "published",
    publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }
}

function adaptArticle(a: PublicArticleRecord): Recipe {
  return {
    id: a.id,
    slug: a.slug,
    keyword: a.keyword,
    title: a.title,
    metaTitle: a.metaTitle,
    metaDescription: a.metaDescription,
    excerpt: a.excerpt,
    contentMarkdown: a.contentMarkdown,
    heroImageUrl: a.heroImageUrl,
    imageVariants: null,
    prepTime: null,
    cookTime: null,
    totalTime: null,
    servings: null,
    difficulty: null,
    ingredients: [],
    instructions: [],
    tags: a.tags,
    serpData: null,
    jsonLd: a.jsonLd,
    status: "published",
    workflowLog: null,
    content_type: a.content_type,
    category: a.category,
    linked_content_id: a.linked_content_id,
    publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
  }
}

export function getPublicSnapshot(): PublicSnapshotPayload {
  return loadSnapshot()
}

export async function getPublishedRecipes(): Promise<Recipe[]> {
  const snap = loadSnapshot()
  return snap.recipes.map(adaptRecipe)
}

export async function getPublishedRecipesLight(): Promise<RecipeCardData[]> {
  const snap = loadSnapshot()
  return snap.recipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    heroImageUrl: r.heroImageUrl,
    difficulty: r.difficulty,
    totalTime: r.totalTime,
    servings: r.servings,
    tags: r.tags,
    publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
  }))
}

export async function getPublishedRecipesByTag(tag: string): Promise<RecipeCardData[]> {
  const snap = loadSnapshot()
  const lower = tag.toLowerCase()
  return snap.recipes
    .filter((r) => r.tags.some((t) => t.toLowerCase().includes(lower)))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      heroImageUrl: r.heroImageUrl,
      difficulty: r.difficulty,
      totalTime: r.totalTime,
      servings: r.servings,
      tags: r.tags,
      publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
    }))
}

export async function getLatestRecipeHero(): Promise<{ title: string; heroImageUrl: string | null } | null> {
  const snap = loadSnapshot()
  const latest = snap.recipes[0]
  if (!latest) return null
  return {
    title: latest.title,
    heroImageUrl: latest.heroImageUrl,
  }
}

export async function searchPublishedRecipes(query?: string, category?: string): Promise<Recipe[]> {
  const snap = loadSnapshot()
  let results = [...snap.recipes]

  if (query) {
    const q = query.toLowerCase()
    results = results.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.keyword.toLowerCase().includes(q) ||
        (r.excerpt && r.excerpt.toLowerCase().includes(q)),
    )
  }

  if (category) {
    const cat = category.toLowerCase()
    results = results.filter((r) => r.tags.some((t) => t.toLowerCase().includes(cat)))
  }

  return results.map(adaptRecipe)
}

export async function getRecipeCategories(): Promise<string[]> {
  const snap = loadSnapshot()
  return [...snap.categories]
}

export type RelatedRecipeData = Pick<
  Recipe,
  "id" | "slug" | "title" | "heroImageUrl" | "excerpt" | "tags" | "totalTime" | "servings" | "difficulty"
> & { score: number }

export async function getRelatedRecipes(currentId: number, tags: string[]): Promise<RelatedRecipeData[]> {
  if (tags.length === 0) return []
  const snap = loadSnapshot()
  const currentTagsLower = new Set(tags.map((t) => t.toLowerCase()))

  const scored = snap.recipes
    .filter((r) => r.id !== currentId)
    .map((r) => {
      let score = 0
      for (const t of r.tags) {
        if (currentTagsLower.has(t.toLowerCase())) {
          score++
        }
      }
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        heroImageUrl: r.heroImageUrl,
        excerpt: r.excerpt,
        tags: r.tags,
        totalTime: r.totalTime,
        servings: r.servings,
        difficulty: r.difficulty,
        score,
      }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return scored
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const snap = loadSnapshot()
  const found = snap.recipes.find((r) => r.slug === slug)
  return found ? adaptRecipe(found) : null
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
  const snap = loadSnapshot()
  const found = snap.recipes.find((r) => r.id === id)
  return found ? adaptRecipe(found) : null
}

export async function getPublishedArticles(): Promise<Recipe[]> {
  const snap = loadSnapshot()
  return snap.articles.map(adaptArticle)
}

export async function getPublishedArticlesLight() {
  const snap = loadSnapshot()
  return snap.articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    heroImageUrl: a.heroImageUrl,
    category: a.category,
    publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
  }))
}

export async function getArticleBySlug(slug: string): Promise<Recipe | null> {
  const snap = loadSnapshot()
  const found = snap.articles.find((a) => a.slug === slug)
  return found ? adaptArticle(found) : null
}

export async function getLinkedArticle(recipeId: number) {
  const snap = loadSnapshot()
  const found = snap.articles.find((a) => a.linked_content_id === recipeId)
  if (!found) return null
  return {
    slug: found.slug,
    title: found.title,
    category: found.category,
    excerpt: found.excerpt,
  }
}

export async function getRelatedForArticle(linkedRecipeId: number | null): Promise<RecipeCardData[]> {
  const snap = loadSnapshot()
  const toCardData = (r: PublicRecipeRecord): RecipeCardData => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    heroImageUrl: r.heroImageUrl,
    difficulty: r.difficulty,
    totalTime: r.totalTime,
    servings: r.servings,
    tags: r.tags,
    publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
  })

  let linked: RecipeCardData[] = []
  if (linkedRecipeId !== null) {
    const match = snap.recipes.find((r) => r.id === linkedRecipeId)
    if (match) {
      linked = [toCardData(match)]
    }
  }

  const others = snap.recipes
    .filter((r) => linkedRecipeId === null || r.id !== linkedRecipeId)
    .slice(0, 2)
    .map(toCardData)

  return [...linked, ...others]
}

export async function getRecipesBySlugs(slugs: string[]): Promise<RecipeCardData[]> {
  if (slugs.length === 0) return []
  const snap = loadSnapshot()
  const slugSet = new Set(slugs)
  return snap.recipes
    .filter((r) => slugSet.has(r.slug))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      heroImageUrl: r.heroImageUrl,
      difficulty: r.difficulty,
      totalTime: r.totalTime,
      servings: r.servings,
      tags: r.tags,
      publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
    }))
}

export async function getRecipeRating(recipeId: number): Promise<{ avg: number | null; count: number }> {
  const snap = loadSnapshot()
  const rating = snap.ratingsByRecipeId[String(recipeId)]
  if (!rating) return { avg: null, count: 0 }
  return { avg: rating.avg, count: rating.count }
}
