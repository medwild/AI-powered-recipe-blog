import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { assessCitationReadiness } from "@/lib/citation-readiness"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 })
  }

  const [recipe] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      slug: recipes.slug,
      keyword: recipes.keyword,
      contentMarkdown: recipes.contentMarkdown,
      status: recipes.status,
      publishedAt: recipes.publishedAt,
      updatedAt: recipes.updatedAt,
    })
    .from(recipes)
    .where(eq(recipes.id, numericId))

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 })
  }

  if (!recipe.contentMarkdown) {
    return NextResponse.json({ error: "Recipe has no content to assess." }, { status: 400 })
  }

  const wordCount = recipe.contentMarkdown.split(/\s+/).filter(Boolean).length

  const report = assessCitationReadiness({
    markdown: recipe.contentMarkdown,
    wordCount,
    keyword: recipe.keyword ?? recipe.title,
    publishedAt: recipe.publishedAt,
    updatedAt: recipe.updatedAt,
  })

  return NextResponse.json({
    recipeId: numericId,
    title: recipe.title,
    slug: recipe.slug,
    status: recipe.status,
    ...report,
  })
}
