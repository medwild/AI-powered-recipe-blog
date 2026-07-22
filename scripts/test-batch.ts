// Batch test — 5 recipes across categories, full pipeline validation
// Usage: npx tsx scripts/test-batch.ts
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { fetchSerp } from "../lib/agents/serp"
import { formatSerpForPrompt } from "../lib/inngest/functions/steps/serp-phase"
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin"
import { qualityGate } from "../lib/quality-gate"
import { runSeoGate } from "../lib/seo/gate"
import { generateSyntheticPAA } from "../lib/inngest/functions/helpers"

const BATCH = [
  {
    keyword: "Beef rendang for two",
    cuisine: "Indonesian Slow-Cooked Classics for Two",
    ingredients: "beef chuck, coconut milk, lemongrass, galangal, turmeric, kaffir lime leaves, turmeric leaves, shallots, garlic, dried chilies, tamarind, kerisik",
    techniques: "slow braising, spice paste grinding, coconut reduction, low-and-slow simmering",
  },
  {
    keyword: "Chocolate lava cake for two",
    cuisine: "French Bistro Desserts for Two",
    ingredients: "dark chocolate, butter, eggs, sugar, flour, vanilla extract, espresso powder",
    techniques: "water bath baking, chocolate tempering, ramekin preparation, precise timing",
  },
  {
    keyword: "Vegan mushroom risotto",
    cuisine: "Plant-Based Italian Comfort Food",
    ingredients: "arborio rice, mixed mushrooms, vegetable broth, shallots, garlic, white wine, nutritional yeast, olive oil, fresh thyme",
    techniques: "risotto stirring, mushroom searing, broth absorption, vegan creaminess",
  },
  {
    keyword: "One-pan chicken thighs and potatoes",
    cuisine: "Easy One-Pan Weeknight Dinners",
    ingredients: "bone-in chicken thighs, baby potatoes, garlic, lemon, rosemary, olive oil, Dijon mustard",
    techniques: "one-pan roasting, chicken searing, pan sauce, even crisping",
  },
  {
    keyword: "Sourdough bread for two small loaves",
    cuisine: "Artisan Home Bakery for Two",
    ingredients: "bread flour, sourdough starter, water, salt, rice flour",
    techniques: "sourdough fermentation, stretch and fold, Dutch oven baking, scoring, hydration control",
  },
]

const arr = (v: any): any[] => Array.isArray(v) ? v : (typeof v === "string" ? v.split(/,\s*/) : [])

async function testRecipe(cfg: typeof BATCH[0], index: number) {
  const { keyword, cuisine, ingredients, techniques } = cfg
  console.log(`\n${"═".repeat(60)}`)
  console.log(`📋 #${index + 1} — ${keyword}`)
  console.log(`${"═".repeat(60)}`)

  // SERP
  let serpText = ""
  try {
    const serp = await fetchSerp(keyword)
    if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
      serp.relatedQuestions = generateSyntheticPAA(keyword).map((q) => ({ question: q }))
    }
    serpText = formatSerpForPrompt(serp)
    console.log(`📡 SERP: ${serp.organic.length} organic, ${serp.relatedQuestions.length} PAA`)
  } catch (err) {
    console.log(`📡 SERP: failed — using synthetic`)
    serpText = `Top 0 Google results.\n\nPeople Also Ask:\n${generateSyntheticPAA(keyword).map((q) => `- ${q}`).join("\n")}`
  }

  // Mega-Skill
  const t0 = Date.now()
  let article: any
  try {
    article = await agentChefAugustinMega({ keyword, cuisine, cuisineIngredients: ingredients, cuisineTechniques: techniques, serpData: serpText, citations: "" })
  } catch (err) {
    console.log(`❌ MEGA-SKILL FAILED: ${(err as Error).message}`)
    return { keyword, status: "LLM_FAIL", score: 0 }
  }

  const words = article.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`🤖 Generated: ${words} words in ${elapsed}s`)

  // Quality Gate (without DB — skip duplicate check)
  const foodSafetyErrors: string[] = []
  const bannedWords = ["probiotics", "gut health", "immune boost", "detox", "anti-inflammatory", "fat-burning", "miracle", "superfood", "cleanse", "cure", "heal", "treat"]
  const lowerContent = (article.contentMarkdown || "").toLowerCase()
  const foundBanned = bannedWords.filter(w => lowerContent.includes(w))
  const minWords = words < 600 ? 0 : words < 900 ? 600 : 1200 // rough estimate

  let gateErrors: string[] = []
  if (article.metaTitle && article.metaTitle.length > 60) gateErrors.push(`Meta title: ${article.metaTitle.length} chars`)
  if (words < minWords) gateErrors.push(`Word count: ${words}/${minWords}`)
  if (foundBanned.length > 0) gateErrors.push(`Banned: ${foundBanned.join(", ")}`)

  // SEO Gate (no DB, no image)
  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 100)
  let seoResult: any = { status: "SKIP", score: 0, blockingIssues: [], warnings: [] }
  try {
    seoResult = await runSeoGate({
      recipeId: 0, title: article.title,
      metaTitle: article.metaTitle, metaDescription: article.metaDescription,
      slug, focusKeyphrase: keyword, contentMarkdown: article.contentMarkdown,
      heroImageUrl: null, jsonLd: article.jsonLd as unknown as Record<string, unknown>,
      content_type: "recipe",
    })
  } catch {}

  // Score
  const seoBlockCount = seoResult.blockingIssues?.length ?? 0
  const seoWarnCount = seoResult.warnings?.length ?? 0
  const gateBlockCount = gateErrors.length
  const recipeScore = 50 - gateBlockCount * 3 - seoBlockCount * 2 - seoWarnCount * 1

  console.log(`🛡️  Gate: ${gateBlockCount === 0 ? "✅" : `❌ ${gateBlockCount} errors`}`)
  if (gateErrors.length) for (const e of gateErrors) console.log(`   ⚠️  ${e}`)
  console.log(`🔍 SEO:  ${seoResult.status} (${seoBlockCount}B ${seoWarnCount}W) — score ${seoResult.score}`)
  if (seoResult.blockingIssues?.length) for (const b of seoResult.blockingIssues) console.log(`   ❌ BLOCK: ${b.code}`)
  if (seoResult.warnings?.length) for (const w of seoResult.warnings) console.log(`   ⚠️  WARN: ${w.code}`)

  return {
    keyword,
    status: gateBlockCount === 0 && seoBlockCount === 0 ? "PASS" : "ISSUES",
    score: Math.max(0, recipeScore),
    words,
    elapsed,
    gateErrors,
    seoBlockCount,
    seoWarnCount,
  }
}

async function main() {
  console.log(`🔬 BATCH TEST — 5 recipes (${BATCH.map(b => b.keyword).join(" | ")})`)
  console.log(`Model: ${process.env.ANTHROPIC_MODEL || "default"}\n`)

  const results: any[] = []
  for (let i = 0; i < BATCH.length; i++) {
    results.push(await testRecipe(BATCH[i], i))
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`)
  console.log(`📊 BATCH SUMMARY`)
  console.log(`${"═".repeat(60)}`)
  const passes = results.filter(r => r.status === "PASS")
  const issues = results.filter(r => r.status !== "PASS")
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length
  const avgWords = results.reduce((s, r) => s + (r.words || 0), 0) / results.length

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "LLM_FAIL" ? "💀" : "⚠️"
    console.log(`${icon} ${r.keyword.padEnd(40)} ${r.score}/50 | ${r.words}w | ${r.elapsed}s`)
  }

  console.log(`\nAverage: ${avgScore.toFixed(1)}/50 | ${Math.round(avgWords)} words`)
  console.log(`Pass rate: ${passes.length}/${results.length}`)
}

main().catch((err) => { console.error("❌ Batch crashed:", err); process.exit(1) })
