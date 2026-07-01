import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const row = await db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.slug, slug),
          eq(recipes.content_type, "article"),
          eq(recipes.status, "published"),
        ),
      )
      .limit(1)
    if (!row.length) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }
    return NextResponse.json(row[0])
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 },
    )
  }
}
