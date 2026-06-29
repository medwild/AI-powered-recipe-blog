import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
  })
  if (!recipe) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(recipe)
}
