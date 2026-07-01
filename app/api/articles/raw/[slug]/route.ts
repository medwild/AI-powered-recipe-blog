import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Auth — raw API is internal (dashboard use)
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  try {
    const row = await db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.slug, slug),
          eq(recipes.content_type, "article"),
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
