import type { MetadataRoute } from "next"
import { getPublishedRecipes } from "@/lib/queries"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await getPublishedRecipes()

  const recipeEntries: MetadataRoute.Sitemap = recipes.map((recipe) => ({
    url: `${BASE_URL}/recettes/${recipe.slug}`,
    lastModified: recipe.updatedAt ? new Date(recipe.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
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
  ]
}