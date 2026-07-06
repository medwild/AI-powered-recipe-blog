import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { buildRecipeMarkdown } from "@/lib/markdown"

export const dynamic = "force-dynamic"

export async function GET() {
  const all = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.status, "published"), eq(recipes.content_type, "recipe")))
    .orderBy(desc(recipes.publishedAt))

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
    publishedAt: recipe.publishedAt?.toISOString(),
    markdown: buildRecipeMarkdown(recipe),
  }))

  return NextResponse.json(raw, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
