import { NextResponse } from "next/server"
import { getPublishedRecipes, getPublicSnapshot } from "@/lib/public-data"
import { resolveAngles, buildPinVariantPrompt } from "@/lib/pin-variants"

export const dynamic = "force-static"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

export async function GET() {
  try {
    const [all, snap] = await Promise.all([
      getPublishedRecipes(),
      Promise.resolve(getPublicSnapshot()),
    ])

    const pins = all
      .filter((recipe) => Boolean(recipe.heroImageUrl))
      .map((recipe) => ({
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
        publishedAt: recipe.publishedAt?.toISOString() ?? null,
        url: `${SITE_URL}/recipes/${recipe.slug}`,
        pinVariants: resolveAngles(recipe.tags ?? []).map((angle) => ({
          label: angle.label,
          prompt: buildPinVariantPrompt(recipe.title, angle),
        })),
      }))

    return NextResponse.json(
      {
        status: "ok",
        blogName: "Chef Augustin",
        totalFound: pins.length,
        syncedAt: snap.sourceUpdatedAt ?? new Date("2026-11-24T00:00:00.000Z").toISOString(),
        recipes: pins,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
