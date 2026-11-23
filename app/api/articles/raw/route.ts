import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireDashboardAuth } from "@/lib/auth"

export async function GET(req: Request) {
  const authError = await requireDashboardAuth(req)
  if (authError) return authError

  try {
    const rows = await db
      .select()
      .from(recipes)
      .where(eq(recipes.content_type, "article"))
      .orderBy(recipes.id)
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    )
  }
}
