import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.content_type, "article"),
          eq(recipes.status, "published"),
        ),
      )
      .orderBy(recipes.id)
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    )
  }
}
