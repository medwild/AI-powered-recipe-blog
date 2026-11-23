/**
 * Static public data provider reading exclusively from data/public-content.json.
 * Replaces lib/queries.ts for the 100% static public export.
 */

import fs from "node:fs"
import path from "node:path"
import type { PublicSnapshotPayload, PublicRecipeRecord, PublicArticleRecord } from "./public-types"

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

export function getPublicSnapshot(): PublicSnapshotPayload {
  return loadSnapshot()
}

export async function getPublishedRecipes(): Promise<PublicRecipeRecord[]> {
  const snap = loadSnapshot()
  return [...snap.recipes]
}

export async function getPublishedRecipesLight() {
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
    publishedAt: r.publishedAt,
  }))
}

export async function getPublishedRecipesByTag(tag: string) {
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
      publishedAt: r.publishedAt,
    }))
}

export async function getLatestRecipeHero() {
  const snap = loadSnapshot()
  const latest = snap.recipes[0]
  if (!latest) return null
  return {
    title: latest.title,
    heroImageUrl: latest.heroImageUrl,
  }
}

export async function searchPublishedRecipes(query?: string, category?: string) {
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

  return results
}

export async function getRecipeCategories(): Promise<string[]> {
  const snap = loadSnapshot()
  return [...snap.categories]
}

export type RelatedRecipeData = Pick<
  PublicRecipeRecord,
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

export async function getRecipeBySlug(slug: string): Promise<PublicRecipeRecord | null> {
  const snap = loadSnapshot()
  const found = snap.recipes.find((r) => r.slug === slug)
  return found ?? null
}

export async function getRecipeById(id: number): Promise<PublicRecipeRecord | null> {
  const snap = loadSnapshot()
  const found = snap.recipes.find((r) => r.id === id)
  return found ?? null
}

export async function getPublishedArticles(): Promise<PublicArticleRecord[]> {
  const snap = loadSnapshot()
  return [...snap.articles]
}

export async function getPublishedArticlesLight() {
  const snap = loadSnapshot()
  return snap.articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    heroImageUrl: a.heroImageUrl,
    category: a.category,
    publishedAt: a.publishedAt,
  }))
}

export async function getArticleBySlug(slug: string): Promise<PublicArticleRecord | null> {
  const snap = loadSnapshot()
  const found = snap.articles.find((a) => a.slug === slug)
  return found ?? null
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

export async function getRelatedForArticle(linkedRecipeId: number | null) {
  const snap = loadSnapshot()
  const recipeCardSelect = (r: PublicRecipeRecord) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    heroImageUrl: r.heroImageUrl,
    difficulty: r.difficulty,
    totalTime: r.totalTime,
    servings: r.servings,
    tags: r.tags,
    publishedAt: r.publishedAt,
  })

  let linked: ReturnType<typeof recipeCardSelect>[] = []
  if (linkedRecipeId !== null) {
    const match = snap.recipes.find((r) => r.id === linkedRecipeId)
    if (match) {
      linked = [recipeCardSelect(match)]
    }
  }

  const others = snap.recipes
    .filter((r) => linkedRecipeId === null || r.id !== linkedRecipeId)
    .slice(0, 2)
    .map(recipeCardSelect)

  return [...linked, ...others]
}

export async function getRecipesBySlugs(slugs: string[]) {
  if (slugs.length === 0) return []
  const snap = loadSnapshot()
  const slugSet = new Set(slugs)
  const recipeCardSelect = (r: PublicRecipeRecord) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    heroImageUrl: r.heroImageUrl,
    difficulty: r.difficulty,
    totalTime: r.totalTime,
    servings: r.servings,
    tags: r.tags,
    publishedAt: r.publishedAt,
  })

  return snap.recipes.filter((r) => slugSet.has(r.slug)).map(recipeCardSelect)
}

export async function getRecipeRating(recipeId: number): Promise<{ avg: number | null; count: number }> {
  const snap = loadSnapshot()
  const rating = snap.ratingsByRecipeId[String(recipeId)]
  if (!rating) return { avg: null, count: 0 }
  return { avg: rating.avg, count: rating.count }
}
