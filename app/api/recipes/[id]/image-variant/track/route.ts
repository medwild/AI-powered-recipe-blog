import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { imageVariantStats } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

/**
 * POST /api/recipes/[id]/image-variant/track
 *
 * Records an impression or click on a food photo variant for A/B testing.
 * Requires dashboard authentication.
 *
 * Body: { variantIndex: number, event: "impression" | "click" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Auth check — same as dashboard middleware
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("dashboard_auth")
  const expected = process.env.DASHBOARD_SECRET_TOKEN
  if (!expected || !authCookie || authCookie.value !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 })
  }

  let body: { variantIndex?: number; event?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { variantIndex, event } = body
  if (variantIndex == null || !["impression", "click"].includes(event ?? "")) {
    return NextResponse.json(
      { error: "Required: variantIndex (number) and event (impression|click)." },
      { status: 400 },
    )
  }

  try {
    const [existing] = await db
      .select({ id: imageVariantStats.id })
      .from(imageVariantStats)
      .where(
        and(
          eq(imageVariantStats.recipeId, numericId),
          eq(imageVariantStats.variantIndex, variantIndex),
        ),
      )

    if (existing) {
      if (event === "click") {
        await db
          .update(imageVariantStats)
          .set({ clicks: sql`${imageVariantStats.clicks} + 1` })
          .where(eq(imageVariantStats.id, existing.id))
      } else {
        await db
          .update(imageVariantStats)
          .set({ impressions: sql`${imageVariantStats.impressions} + 1` })
          .where(eq(imageVariantStats.id, existing.id))
      }
    } else {
      // First event for this variant — insert a new row
      await db.insert(imageVariantStats).values({
        recipeId: numericId,
        variantIndex,
        impressions: event === "impression" ? 1 : 0,
        clicks: event === "click" ? 1 : 0,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[image-variant/track] Error:", err)
    return NextResponse.json(
      { error: "Failed to record event." },
      { status: 500 },
    )
  }
}
