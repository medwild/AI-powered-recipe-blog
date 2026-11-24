import { NextResponse } from "next/server"
import { getRecipeBySlug } from "@/lib/public-data"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe || recipe.status !== "published" || recipe.content_type !== "recipe") {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.json(
    {
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      metaTitle: recipe.metaTitle,
      metaDescription: recipe.metaDescription,
      excerpt: recipe.excerpt,
      contentMarkdown: recipe.contentMarkdown,
      heroImageUrl: recipe.heroImageUrl,
      tags: recipe.tags,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      category: recipe.category,
      content_type: recipe.content_type,
      publishedAt: recipe.publishedAt?.toISOString() ?? null,
      jsonLd: recipe.jsonLd,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  )
}
