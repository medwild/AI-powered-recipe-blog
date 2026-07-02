import type { MetadataRoute } from "next"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { getPublishedRecipes } from "@/lib/queries"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allRecipes, articles] = await Promise.all([
    getPublishedRecipes(),
    db
      .select({ slug: recipes.slug, category: recipes.category, updatedAt: recipes.updatedAt })
      .from(recipes)
      .where(eq(recipes.content_type, "article")),
  ])

  const recipeEntries: MetadataRoute.Sitemap = allRecipes.map((recipe) => ({
    url: `${BASE_URL}/recettes/${recipe.slug}`,
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

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/recettes`,
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
    ...recipeEntries,
    ...articleEntries,
  ]
}