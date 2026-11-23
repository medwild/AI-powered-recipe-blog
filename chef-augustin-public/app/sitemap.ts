import type { MetadataRoute } from "next"
import { getPublishedRecipes, getPublishedArticles, getRecipeCategories, getPublicSnapshot } from "@/lib/public-data"
import { getAllClusters } from "@/lib/cluster-resolver"
import { tagToSlug } from "@/lib/tag-utils"
import { HUBS } from "@/lib/hub-content"
import { CANONICAL_CATEGORIES } from "@/lib/category-consolidation"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

const ARTICLE_CATEGORIES = ["techniques", "guides", "histoire", "equipement", "idees"]
const STATIC_PAGES = ["privacy", "terms", "about"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [recipeRows, articles, categories] = await Promise.all([
    getPublishedRecipes(),
    getPublishedArticles(),
    getRecipeCategories(),
  ])

  const snap = getPublicSnapshot()
  const baseDate = snap.sourceUpdatedAt ? new Date(snap.sourceUpdatedAt) : new Date("2026-11-23T00:00:00.000Z")

  const clusters = getAllClusters()

  const cleanRecipes = recipeRows.filter((r) => {
    if (r.slug.startsWith("test-")) return false
    const hasContent = (r.ingredients?.length ?? 0) > 0 || (r.instructions?.length ?? 0) > 0
    return hasContent
  })

  const recipeEntries: MetadataRoute.Sitemap = cleanRecipes.map((recipe) => ({
    url: `${BASE_URL}/recipes/${recipe.slug}`,
    lastModified: recipe.updatedAt ? new Date(recipe.updatedAt) : baseDate,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/${a.category || "guides"}/${a.slug}`,
    lastModified: a.updatedAt ? new Date(a.updatedAt) : baseDate,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const recipeCategoryEntries: MetadataRoute.Sitemap = categories
    .filter((tag) => CANONICAL_CATEGORIES.has(tag.toLowerCase()))
    .map((tag) => ({
      url: `${BASE_URL}/recipes/category/${tagToSlug(tag)}`,
      lastModified: baseDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

  const clusterEntries: MetadataRoute.Sitemap = clusters.map((c) => ({
    url: `${BASE_URL}/recipes/collections/${c.id}`,
    lastModified: baseDate,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const hubEntries: MetadataRoute.Sitemap = HUBS.map((hub) => ({
    url: `${BASE_URL}/${hub.category}/${hub.slug}`,
    lastModified: baseDate,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const articleCategoryEntries: MetadataRoute.Sitemap = ARTICLE_CATEGORIES
    .filter((cat) => HUBS.some((h) => h.category === cat))
    .map((cat) => ({
      url: `${BASE_URL}/${cat}`,
      lastModified: baseDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE_URL}/${page}`,
    lastModified: baseDate,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: baseDate,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/recipes`,
      lastModified: baseDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: baseDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...articleCategoryEntries,
    ...staticEntries,
    ...recipeEntries,
    ...recipeCategoryEntries,
    ...clusterEntries,
    ...hubEntries,
    ...articleEntries,
  ]
}
