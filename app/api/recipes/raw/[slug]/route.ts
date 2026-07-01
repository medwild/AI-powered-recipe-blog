import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

const PUBLIC_FIELDS = {
  id: recipes.id,
  slug: recipes.slug,
  title: recipes.title,
  metaTitle: recipes.metaTitle,
  metaDescription: recipes.metaDescription,
  excerpt: recipes.excerpt,
  contentMarkdown: recipes.contentMarkdown,
  heroImageUrl: recipes.heroImageUrl,
  tags: recipes.tags,
  prepTime: recipes.prepTime,
  cookTime: recipes.cookTime,
  totalTime: recipes.totalTime,
  servings: recipes.servings,
  difficulty: recipes.difficulty,
  ingredients: recipes.ingredients,
  instructions: recipes.instructions,
  category: recipes.category,
  content_type: recipes.content_type,
  status: recipes.status,
  publishedAt: recipes.publishedAt,
  createdAt: recipes.createdAt,
  updatedAt: recipes.updatedAt,
  jsonLd: recipes.jsonLd,
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const [recipe] = await db
    .select(PUBLIC_FIELDS)
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1)
  if (!recipe) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(recipe)
}
