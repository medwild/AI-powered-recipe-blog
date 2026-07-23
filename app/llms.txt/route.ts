import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { desc, eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"

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
        `- [${r.title}](https://chefaugustin.com/recettes/${r.slug}): ${r.excerpt ?? "Small-batch dinner recipe for two."} (${r.totalTime ?? "N/A"}, ${r.difficulty ?? "N/A"}, ${r.servings ?? 2} servings)`,
    )
    .join("\n")

  const articleList = publishedArticles
    .map(
      (a) =>
        `- [${a.title}](https://chefaugustin.com/${a.category}/${a.slug}): ${a.excerpt ?? "Cooking guide."}`,
    )
    .join("\n")

  const content = `# Chef Augustin — Easy Weeknight Dinners for Two

## About
Chef Augustin is a Pinterest-first recipe blog focused on [Easy Weeknight Dinners for Two](https://chefaugustin.com/).
Small-batch recipes designed for two people — one-pan meals, mini slow cooker dishes, budget-friendly options, and quick 30-minute dinners.

## Key Pages
- [Homepage](https://chefaugustin.com/)
- [All Recipes](https://chefaugustin.com/recettes)
- [Cooking Techniques](https://chefaugustin.com/techniques)
- [Guides](https://chefaugustin.com/guides)
- [About Chef Augustin](https://chefaugustin.com/about)
- [Privacy Policy](https://chefaugustin.com/privacy)

## For LLMs
- [Raw Recipes API](https://chefaugustin.com/api/recipes/raw): All published recipes as JSON with full fields (ingredients, instructions, contentMarkdown).
- [XML Sitemap](https://chefaugustin.com/sitemap.xml)

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
