import type { MetadataRoute } from "next"
import { eq, and, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { getRecipeCategories } from "@/lib/queries"
import { getAllClusters } from "@/lib/cluster-resolver"
import { tagToSlug } from "@/lib/tag-utils"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

// Force dynamic — Vercel caches the sitemap otherwise (x-vercel-cache: HIT)
export const dynamic = "force-dynamic"

const ARTICLE_CATEGORIES = ["techniques", "guides", "histoire", "equipement", "idees"]
const STATIC_PAGES = ["privacy", "terms"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [recipeRows, articles, categories] = await Promise.all([
    // Lightweight: only fetch columns the sitemap actually needs
    db
      .select({
        slug: recipes.slug,
        updatedAt: recipes.updatedAt,
        ingredients: recipes.ingredients,
        instructions: recipes.instructions,
      })
      .from(recipes)
      .where(and(
        eq(recipes.content_type, "recipe"),
        eq(recipes.status, "published"),
      ))
      .orderBy(desc(recipes.publishedAt)),
    db
      .select({ slug: recipes.slug, category: recipes.category, updatedAt: recipes.updatedAt })
      .from(recipes)
      .where(and(
        eq(recipes.content_type, "article"),
        eq(recipes.status, "published"),
      )),
    getRecipeCategories(),
  ])

  const clusters = getAllClusters()

  // Exclude test pages and ghost recipes (no ingredients AND no instructions)
  const cleanRecipes = recipeRows.filter((r) => {
    if (r.slug.startsWith("test-")) return false
    const hasContent = (r.ingredients?.length ?? 0) > 0 || (r.instructions?.length ?? 0) > 0
    return hasContent
  })

  const recipeEntries: MetadataRoute.Sitemap = cleanRecipes.map((recipe) => ({
    url: `${BASE_URL}/recipes/${recipe.slug}`,
    lastModified: recipe.updatedAt ? new Date(recipe.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/${a.category}/${a.slug}`,
    lastModified: a.updatedAt ?? new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Recipe tag categories — dynamically generated from published recipe tags
  const recipeCategoryEntries: MetadataRoute.Sitemap = categories.map((tag) => ({
    url: `${BASE_URL}/recipes/category/${tagToSlug(tag)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }))

  // Topical cluster hub pages — 6 pillar pages for content architecture
  const clusterEntries: MetadataRoute.Sitemap = clusters.map((c) => ({
    url: `${BASE_URL}/recipes/cluster/${c.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  // Article category pages (techniques, guides, etc.)
  const articleCategoryEntries: MetadataRoute.Sitemap = ARTICLE_CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/${cat}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE_URL}/${page}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/recipes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...articleCategoryEntries,
    ...staticEntries,
    ...recipeEntries,
    ...recipeCategoryEntries,
    ...clusterEntries,
    ...articleEntries,
  ]
}
