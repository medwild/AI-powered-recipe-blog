// Test SEO gate against a real generated rendang recipe
// Usage: npx tsx scripts/test-seo-gate-rendang.ts
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin"
import { runSeoGate } from "../lib/seo/gate"

const KEYWORD = "Beef rendang for two"
const CUISINE = "Indonesian Slow-Cooked Classics for Two"
const INGREDIENTS = "beef chuck, coconut milk, lemongrass, galangal, turmeric, kaffir lime leaves, turmeric leaves, shallots, garlic, dried chilies, tamarind, kerisik"
const TECHNIQUES = "slow braising, spice paste grinding, coconut reduction, low-and-slow simmering"

async function main() {
  console.log("Generating rendang for SEO gate test...\n")
  const article = await agentChefAugustinMega({
    keyword: KEYWORD, cuisine: CUISINE,
    cuisineIngredients: INGREDIENTS, cuisineTechniques: TECHNIQUES,
    serpData: "", citations: "",
  })

  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 100)

  console.log(`Title: ${article.title}`)
  console.log(`Meta:  ${article.metaTitle} (${article.metaTitle.length} chars)`)

  // Debug JSON-LD
  const ld = article.jsonLd as any
  console.log(`\nJSON-LD @graph types: ${ld?.["@graph"]?.map((n: any) => n["@type"])?.join(", ") || "NONE"}`)
  console.log(`JSON-LD keys: ${Object.keys(ld || {}).join(", ")}`)

  const result = await runSeoGate({
    recipeId: 0, title: article.title,
    metaTitle: article.metaTitle, metaDescription: article.metaDescription,
    slug, focusKeyphrase: KEYWORD,
    contentMarkdown: article.contentMarkdown, heroImageUrl: null,
    jsonLd: article.jsonLd as unknown as Record<string, unknown>,
    content_type: "recipe",
  })

  console.log(`Status: ${result.status}  Score: ${result.score}/100`)
  console.log(result.summary)

  if (result.blockingIssues.length > 0) {
    console.log(`\n❌ BLOCK (${result.blockingIssues.length}):`)
    for (const b of result.blockingIssues) console.log(`   ${b.code}: ${b.message}`)
  }
  if (result.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${result.warnings.length}):`)
    for (const w of result.warnings) console.log(`   ${w.code}: ${w.message}`)
  }
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
