import { NextResponse } from "next/server"
import { getPublishedRecipes, getPublishedArticles } from "@/lib/public-data"
import { HUBS } from "@/lib/hub-content"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

export async function GET() {
  const [publishedRecipes, publishedArticles] = await Promise.all([
    getPublishedRecipes(),
    getPublishedArticles(),
  ])

  const recipeList = publishedRecipes
    .map(
      (r) =>
        `- [${r.title}](${BASE_URL}/recipes/${r.slug}): ${r.excerpt ?? "Small-batch dinner recipe for two."} (${r.totalTime ?? "N/A"}, ${r.difficulty ?? "N/A"}, ${r.servings ?? "2 servings"})`,
    )
    .join("\n")

  const articleList = publishedArticles
    .map(
      (a) =>
        `- [${a.title}](${BASE_URL}/${a.category}/${a.slug}): ${a.excerpt ?? "Cooking guide."}`,
    )
    .join("\n")

  const hubList = HUBS
    .map(
      (h) =>
        `- [${h.title}](${BASE_URL}/${h.category}/${h.slug}): ${h.metaDescription}`,
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
- [Ideas](${BASE_URL}/idees)
- [About Chef Augustin](${BASE_URL}/about)
- [Privacy Policy](${BASE_URL}/privacy)

## For LLMs
- [Raw Recipes API](${BASE_URL}/api/recipes/raw): All published recipes as JSON with full fields (ingredients, instructions, contentMarkdown).
- [XML Sitemap](${BASE_URL}/sitemap.xml)

## Published Recipes (${publishedRecipes.length})

${recipeList}

## Collection Hubs (${HUBS.length})

${hubList}

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
