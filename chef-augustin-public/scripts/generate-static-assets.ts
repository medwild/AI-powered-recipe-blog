/**
 * Generates static API files, feeds, and .htaccess into the out/ directory.
 * Run directly after `next build --webpack`.
 */

import fs from "node:fs"
import path from "node:path"
import { resolveAngles, buildPinVariantPrompt } from "../lib/pin-variants"
import { buildRecipeMarkdown } from "../lib/markdown"
import { HUBS } from "../lib/hub-content"
import { generateHtaccessContent } from "./generate-htaccess"
import type { PublicSnapshotPayload } from "./public-snapshot-schema"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"
const CWD = process.cwd()
const OUT_DIR = path.resolve(CWD, "out")
const SNAPSHOT_PATH = path.resolve(CWD, "data/public-content.json")

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error(`Output directory ${OUT_DIR} does not exist. Run "next build --webpack" first.`)
  }

  const rawDisk = fs.readFileSync(SNAPSHOT_PATH, "utf8")
  const snapshot = JSON.parse(rawDisk) as PublicSnapshotPayload
  const recipes = snapshot.recipes
  const articles = snapshot.articles

  console.log(`[generate-static-assets] Generating static assets for ${recipes.length} recipes and ${articles.length} articles...`)

  // 1. /api/recipes/pins (JSON without extension + .json for compatibility)
  const pinsDir = path.resolve(OUT_DIR, "api/recipes")
  ensureDir(pinsDir)

  const pinRecipes = recipes
    .filter((r) => Boolean(r.heroImageUrl))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      heroImageUrl: r.heroImageUrl,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      totalTime: r.totalTime,
      servings: r.servings,
      tags: r.tags,
      ingredients: r.ingredients,
      publishedAt: r.publishedAt,
      url: `${SITE_URL}/recipes/${r.slug}`,
      pinVariants: resolveAngles(r.tags ?? []).map((angle) => ({
        label: angle.label,
        prompt: buildPinVariantPrompt(r.title, angle),
      })),
    }))

  const pinsPayload = {
    status: "ok",
    blogName: "Chef Augustin",
    totalFound: pinRecipes.length,
    syncedAt: snapshot.sourceUpdatedAt || "2026-11-23T00:00:00.000Z",
    recipes: pinRecipes,
  }

  const pinsJson = JSON.stringify(pinsPayload, null, 2)
  fs.writeFileSync(path.resolve(pinsDir, "pins"), pinsJson, "utf8")
  fs.writeFileSync(path.resolve(pinsDir, "pins.json"), pinsJson, "utf8")

  // 2. /api/recipes/raw (All recipes as raw JSON)
  const rawList = recipes.map((recipe) => ({
    slug: recipe.slug,
    keyword: recipe.keyword,
    title: recipe.title,
    metaTitle: recipe.metaTitle,
    metaDescription: recipe.metaDescription,
    excerpt: recipe.excerpt,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    contentMarkdown: recipe.contentMarkdown,
    imageUrl: recipe.heroImageUrl,
    publishedAt: recipe.publishedAt,
    markdown: buildRecipeMarkdown(recipe),
  }))

  const rawDir = path.resolve(OUT_DIR, "api/recipes/raw")
  ensureDir(rawDir)

  const rawJson = JSON.stringify(rawList, null, 2)
  fs.writeFileSync(path.resolve(OUT_DIR, "api/recipes/raw-index"), rawJson, "utf8")
  // For extensionless /api/recipes/raw
  fs.writeFileSync(path.resolve(pinsDir, "raw"), rawJson, "utf8")
  fs.writeFileSync(path.resolve(pinsDir, "raw.json"), rawJson, "utf8")

  // 3. /api/recipes/raw/[slug]
  for (const r of recipes) {
    const singlePayload = {
      id: r.id,
      slug: r.slug,
      title: r.title,
      metaTitle: r.metaTitle,
      metaDescription: r.metaDescription,
      excerpt: r.excerpt,
      contentMarkdown: r.contentMarkdown,
      heroImageUrl: r.heroImageUrl,
      tags: r.tags,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      totalTime: r.totalTime,
      servings: r.servings,
      difficulty: r.difficulty,
      ingredients: r.ingredients,
      instructions: r.instructions,
      category: r.category,
      content_type: r.content_type,
      publishedAt: r.publishedAt,
      jsonLd: r.jsonLd,
    }
    const singleJson = JSON.stringify(singlePayload, null, 2)
    fs.writeFileSync(path.resolve(rawDir, r.slug), singleJson, "utf8")
    fs.writeFileSync(path.resolve(rawDir, `${r.slug}.json`), singleJson, "utf8")
  }

  // 4. /feed.xml (RSS Feed)
  const itemsXml = recipes
    .map(
      (r) => `
    <item>
      <title><![CDATA[${r.title}]]></title>
      <link>${SITE_URL}/recipes/${r.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/recipes/${r.slug}</guid>
      <description><![CDATA[${r.excerpt || ""}]]></description>
      ${r.heroImageUrl ? `<enclosure url="${r.heroImageUrl}" type="image/jpeg" />` : ""}
      <pubDate>${new Date(r.createdAt).toUTCString()}</pubDate>
    </item>`,
    )
    .join("")

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chef Augustin -- Easy Weeknight Dinners for Two</title>
    <link>${SITE_URL}</link>
    <description>Simple small-batch dinner recipes for two people, with practical weeknight meals, clear serving sizes, and Pinterest-friendly cooking inspiration.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`
  fs.writeFileSync(path.resolve(OUT_DIR, "feed.xml"), feedXml, "utf8")

  // 5. /llms.txt
  const recipeList = recipes
    .map(
      (r) =>
        `- [${r.title}](${SITE_URL}/recipes/${r.slug}): ${r.excerpt ?? "Small-batch dinner recipe for two."} (${r.totalTime ?? "N/A"}, ${r.difficulty ?? "N/A"}, ${r.servings ?? "2 servings"})`,
    )
    .join("\n")

  const articleList = articles
    .map(
      (a) =>
        `- [${a.title}](${SITE_URL}/${a.category}/${a.slug}): ${a.excerpt ?? "Cooking guide."}`,
    )
    .join("\n")

  const hubList = HUBS
    .map(
      (h) =>
        `- [${h.title}](${SITE_URL}/${h.category}/${h.slug}): ${h.metaDescription}`,
    )
    .join("\n")

  const llmsTxt = `# Chef Augustin — Easy Weeknight Dinners for Two

## About
Chef Augustin is a Pinterest-first recipe blog focused on [Easy Weeknight Dinners for Two](${SITE_URL}/).
Small-batch recipes designed for two people — one-pan meals, mini slow cooker dishes, budget-friendly options, and quick 30-minute dinners.

## Key Pages
- [Homepage](${SITE_URL}/)
- [All Recipes](${SITE_URL}/recipes)
- [Cooking Techniques](${SITE_URL}/techniques)
- [Guides](${SITE_URL}/guides)
- [Ideas](${SITE_URL}/idees)
- [About Chef Augustin](${SITE_URL}/about)
- [Privacy Policy](${SITE_URL}/privacy)

## For LLMs
- [Raw Recipes API](${SITE_URL}/api/recipes/raw): All published recipes as JSON with full fields (ingredients, instructions, contentMarkdown).
- [XML Sitemap](${SITE_URL}/sitemap.xml)

## Published Recipes (${recipes.length})

${recipeList}

## Collection Hubs (${HUBS.length})

${hubList}

## Published Articles (${articles.length})

${articleList}
`
  fs.writeFileSync(path.resolve(OUT_DIR, "llms.txt"), llmsTxt, "utf8")

  // 6. .htaccess (Production)
  const htaccess = generateHtaccessContent({ env: "production" })
  fs.writeFileSync(path.resolve(OUT_DIR, ".htaccess"), htaccess, "utf8")

  console.log(`[generate-static-assets] Successfully generated pins (${pinRecipes.length}), raw endpoints (${recipes.length}), feed.xml, llms.txt, and .htaccess into ${OUT_DIR}`)
}

main().catch((err) => {
  console.error("[generate-static-assets] Failed:", err)
  process.exit(1)
})
