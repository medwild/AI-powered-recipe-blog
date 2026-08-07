import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq, desc, isNotNull } from "drizzle-orm"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

export async function GET() {
  try {
    const all = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        excerpt: recipes.excerpt,
        heroImageUrl: recipes.heroImageUrl,
        prepTime: recipes.prepTime,
        cookTime: recipes.cookTime,
        totalTime: recipes.totalTime,
        servings: recipes.servings,
        tags: recipes.tags,
        ingredients: recipes.ingredients,
        publishedAt: recipes.publishedAt,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.status, "published"),
          eq(recipes.content_type, "recipe"),
          isNotNull(recipes.heroImageUrl),
        ),
      )
      .orderBy(desc(recipes.publishedAt))

    const pins = all.map((recipe) => ({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      excerpt: recipe.excerpt,
      heroImageUrl: recipe.heroImageUrl,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings,
      tags: recipe.tags,
      ingredients: recipe.ingredients,
      publishedAt: recipe.publishedAt?.toISOString(),
      url: `${SITE_URL}/recipes/${recipe.slug}`,
    }))

    return NextResponse.json(
      {
        status: "ok",
        blogName: "Chef Augustin",
        totalFound: pins.length,
        syncedAt: new Date().toISOString(),
        recipes: pins,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      },
    )
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des recettes" },
      { status: 500 },
    )
  }
}
