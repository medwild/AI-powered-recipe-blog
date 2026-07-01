import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  // Auth — raw API is internal (dashboard use)
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
