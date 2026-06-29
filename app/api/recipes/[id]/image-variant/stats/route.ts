import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { imageVariantStats, recipes } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import type { ImageVariant } from "@/lib/db/schema"

/**
 * GET /api/recipes/[id]/image-variant/stats
 *
 * Returns A/B testing statistics for all image variants of a recipe.
 * Includes impressions, clicks, CTR, and a confidence indicator.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 })
  }

  try {
    const [recipe] = await db
      .select({ imageVariants: recipes.imageVariants })
      .from(recipes)
      .where(eq(recipes.id, numericId))

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 })
    }

    const variants: ImageVariant[] = (recipe.imageVariants ?? []) as ImageVariant[]

    if (variants.length === 0) {
      return NextResponse.json({ variants: [], active: false, message: "No image variants for this recipe." })
    }

    const statsRows = await db
      .select()
      .from(imageVariantStats)
      .where(eq(imageVariantStats.recipeId, numericId))
      .orderBy(desc(imageVariantStats.impressions))

    const variantStats = variants.map((variant, idx) => {
      const stat = statsRows.find((s) => s.variantIndex === idx)
      const impressions = stat?.impressions ?? 0
      const clicks = stat?.clicks ?? 0
      const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0"

      return {
        label: variant.label,
        url: variant.url,
        impressions,
        clicks,
        ctr: `${ctr}%`,
      }
    })

    const totalImpressions = variantStats.reduce((s, v) => s + v.impressions, 0)
    const winner =
      totalImpressions > 10
        ? variantStats.reduce((best, curr) =>
            parseFloat(curr.ctr) > parseFloat(best.ctr) ? curr : best,
          )
        : null

    return NextResponse.json({
      active: variants.length > 1,
      totalImpressions,
      winner: winner
        ? {
            label: winner.label,
            ctr: winner.ctr,
            confidence:
              totalImpressions > 100
                ? "high"
                : totalImpressions > 30
                  ? "medium"
                  : "low",
          }
        : null,
      variants: variantStats,
    })
  } catch (err) {
    console.error("[image-variant/stats] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch variant stats." },
      { status: 500 },
    )
  }
}
