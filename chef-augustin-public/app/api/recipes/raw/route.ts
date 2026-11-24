import { NextResponse } from "next/server"
import { getPublishedRecipes } from "@/lib/public-data"
import { buildRecipeMarkdown } from "@/lib/markdown"

export const dynamic = "force-static"

export async function GET() {
  const all = await getPublishedRecipes()

  const raw = all.map((recipe) => ({
    slug: recipe.slug,
    keyword: recipe.keyword,
    title: recipe.title,
    metaTitle: recipe.metaTitle,
    metaDescription: recipe.metaDescription,
    excerpt: recipe.excerpt,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    contentMarkdown: recipe.contentMarkdown,
    imageUrl: recipe.heroImageUrl,
    publishedAt: recipe.publishedAt?.toISOString() ?? null,
    markdown: buildRecipeMarkdown(recipe),
  }))

  return NextResponse.json(raw, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
