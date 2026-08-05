import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { desc, eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

export async function GET() {
  const all = await db
    .select({
      slug: recipes.slug,
      title: recipes.title,
      keyword: recipes.keyword,
      tags: recipes.tags,
      difficulty: recipes.difficulty,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      totalTime: recipes.totalTime,
      servings: recipes.servings,
      excerpt: recipes.excerpt,
      publishedAt: recipes.publishedAt,
      content_type: recipes.content_type,
      category: recipes.category,
    })
    .from(recipes)
    .where(eq(recipes.status, "published"))
    .orderBy(desc(recipes.publishedAt))

  const publishedRecipes = all.filter((r) => r.content_type !== "article")
  const publishedArticles = all.filter((r) => r.content_type === "article")

  const recipeList = publishedRecipes
    .map(
      (r) =>
        // servings already reads "2 servings" — avoid "2 servings servings"
        `- [${r.title}](${BASE_URL}/recipes/${r.slug}): ${r.excerpt ?? "Small-batch dinner recipe for two."} (${r.totalTime ?? "N/A"}, ${r.difficulty ?? "N/A"}, ${r.servings ?? "2 servings"})`,
    )
    .join("\n")

  const articleList = publishedArticles
    .map(
      (a) =>
        `- [${a.title}](${BASE_URL}/${a.category}/${a.slug}): ${a.excerpt ?? "Cooking guide."}`,
    )
    .join("\n")

  const content = `# Chef Augustin — Easy Weeknight Dinners for Two

## About
Chef Augustin is a Pinterest-first recipe blog focused on [Easy Weeknight Dinners for Two](${BASE_URL}/).
Small-batch recipes designed for two people — one-pan meals, mini slow cooker dishes, budget-friendly options, and quick 30-minute dinners.

## Key Pages
- [Homepage](${BASE_URL}/)
- [All Recipes](${BASE_URL}/recipes)
- [Cooking Techniques](${BASE_URL}/techniques)
- [Guides](${BASE_URL}/guides)
- [About Chef Augustin](${BASE_URL}/about)
- [Privacy Policy](${BASE_URL}/privacy)

## For LLMs
- [Raw Recipes API](${BASE_URL}/api/recipes/raw): All published recipes as JSON with full fields (ingredients, instructions, contentMarkdown).
- [XML Sitemap](${BASE_URL}/sitemap.xml)

## Published Recipes (${publishedRecipes.length})

${recipeList}

## Published Articles (${publishedArticles.length})

${articleList}
`

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
