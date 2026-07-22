// scripts/smoke-test-single.ts
// Smoke test v14 — 1 recette bout en bout (SERP → Mega-Skill → Gate)
// Usage: npx tsx scripts/smoke-test-single.ts

import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
import { fetchSerp } from "../lib/agents/serp"
import { formatSerpForPrompt } from "../lib/inngest/functions/steps/serp-phase"
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin"
import { validateFoodSafety, detectBannedWords } from "../lib/quality-gate"
import { generateSyntheticPAA } from "../lib/inngest/functions/helpers"

const KEYWORD = "Pan-seared salmon for two"
const CUISINE = "Easy Weeknight Dinners for Two"
const INGREDIENTS = "salmon fillets, asparagus, lemon, garlic, olive oil, butter, fresh dill, baby potatoes"
const TECHNIQUES = "pan-searing, oven-finishing, one-pan cooking, sauce making"

async function main() {
  console.log("═".repeat(60))
  console.log(`🔬 PIPELINE V14 — SMOKE TEST`)
  console.log(`   Keyword: "${KEYWORD}"`)
  console.log(`   Model: ${process.env.ANTHROPIC_MODEL || "default"}`)
  console.log("═".repeat(60))

  // ── Step 1: SERP ──────────────────────────────────────────────────────
  console.log("\n📡 Step 1: SERP...")
  const t1 = Date.now()
  let serpText = ""

  try {
    const serp = await fetchSerp(KEYWORD)
    if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
      serp.relatedQuestions = generateSyntheticPAA(KEYWORD).map((q) => ({ question: q }))
    }
    serpText = formatSerpForPrompt(serp)
    console.log(`   ✅ ${serp.organic.length} organic results, ${serp.relatedQuestions.length} PAA (${Date.now() - t1}ms)`)
  } catch (err) {
    console.log(`   ⚠️  SERP failed: ${(err as Error).message} — continuing with synthetic PAA`)
    serpText = `Top 0 Google results.\n\nPeople Also Ask:\n${generateSyntheticPAA(KEYWORD).map((q) => `- ${q}`).join("\n")}`
  }

  // ── Step 2: Mega-Skill ────────────────────────────────────────────────
  console.log("\n🤖 Step 2: Mega-Skill (Claude Sonnet 5 via ZenMux)...")
  const t2 = Date.now()

  let article: any
  try {
    article = await agentChefAugustinMega({
      keyword: KEYWORD,
      cuisine: CUISINE,
      cuisineIngredients: INGREDIENTS,
      cuisineTechniques: TECHNIQUES,
      serpData: serpText,
      citations: "",
    })
    const elapsed = ((Date.now() - t2) / 1000).toFixed(1)
    const words = article.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0
    console.log(`   ✅ Generated: ${words} words in ${elapsed}s`)
  } catch (err) {
    console.log(`   ❌ Mega-skill failed: ${(err as Error).message}`)
    process.exit(1)
  }

  // ── Step 3: Quality Gate (sans DB — pas de check duplicate slug) ──────
  console.log("\n🛡️  Step 3: Quality Gate (offline — skip duplicate check)...")
  const t3 = Date.now()
  const arr = (v: any): any[] => Array.isArray(v) ? v : (typeof v === "string" ? v.split(/,\s*/) : [])

  const allText = [
    ...(Array.isArray(article.instructions) ? article.instructions.map((i: any) => typeof i === "string" ? i : i.text || "") : []),
    article.contentMarkdown,
  ].join(" ")
  const ingredients = arr(article.ingredients)
  const foodSafetyErrors = validateFoodSafety(allText, ingredients)
  const tagsList = arr(article.tags)
  const bannedWords = detectBannedWords(article.contentMarkdown || "")
  const wordCount = (article.contentMarkdown || "").split(/\s+/).filter(Boolean).length
  const minWords = (() => {
    const totalMatch = (article.prepTime + article.cookTime).match(/(\d+)/g)
    const minutes = totalMatch ? totalMatch.reduce((sum: number, n: string) => sum + parseInt(n), 0) : 999
    const isDessert = tagsList.some((t: string) => /dessert|mousse|cake|cookie|tart|pie|pudding/i.test(t))
    if (isDessert) return 600
    if (minutes <= 30) return 800
    return 1200
  })()

  const gatePassed = foodSafetyErrors.length === 0 && bannedWords.length === 0 && wordCount >= minWords
  console.log(`   Food safety: ${foodSafetyErrors.length === 0 ? "✅" : "❌ " + foodSafetyErrors.join("; ")}`)
  console.log(`   Banned words: ${bannedWords.length === 0 ? "✅" : "❌ " + bannedWords.join(", ")}`)
  console.log(`   Word count: ${wordCount}/${minWords} ${wordCount >= minWords ? "✅" : "❌"}`)
  console.log(`   Duplicate slug: ⏭️  skipped (no DB)`)
  console.log(`   Gate: ${gatePassed ? "✅ PASS" : "❌ BLOCK"}`)

  // ── Audit ─────────────────────────────────────────────────────────────
  const md = article.contentMarkdown || ""
  const h2s = md.match(/^## /gm)?.length ?? 0
  const faqs = md.match(/^## .+\?$/gm)?.length ?? 0
  const tips = md.match(/Chef Augustin'?s Tip/gi)?.length ?? 0
  const parens = md.match(/\([^)]+\)/g)?.length ?? 0
  const hasJsonLd = !!article.jsonLd?.["@graph"]

  console.log("\n📊 Audit:")
  console.log(`   Title:      ${article.title?.substring(0, 80)}`)
  console.log(`   Words:      ${wordCount}`)
  console.log(`   H2s:        ${h2s}`)
  console.log(`   FAQs:       ${faqs}`)
  console.log(`   Chef Tips:  ${tips}`)
  console.log(`   Parens:     ${parens}`)
  console.log(`   JSON-LD:    ${hasJsonLd ? "✅" : "❌"} (type: ${typeof article.jsonLd}, keys: ${article.jsonLd ? Object.keys(article.jsonLd).join(",") || "empty" : "null/undefined"})`)
  console.log(`   Tags:       ${arr(article.tags).join(", ") || "none"}`)
  console.log(`   Difficulty: ${article.difficulty}`)
  console.log(`   Times:      prep=${article.prepTime} cook=${article.cookTime} total=${article.totalTime}`)
  console.log(`   Servings:   ${article.servings}`)

  // ── Save preview ──────────────────────────────────────────────────────
  const fs = await import("fs/promises")
  const preview = [
    `# ${article.title}`,
    ``,
    `> ${article.metaDescription}`,
    ``,
    `**Tags:** ${arr(article.tags).join(", ") || "none"} | **Difficulty:** ${article.difficulty}`,
    `**Times:** Prep ${article.prepTime} | Cook ${article.cookTime} | Total ${article.totalTime}`,
    `**Servings:** ${article.servings}`,
    ``,
    `---`,
    ``,
    article.contentMarkdown,
    ``,
    `---`,
    ``,
    `## Image Prompt`,
    article.imagePrompt,
    ``,
    `## Gate Result`,
    `Passed: ${gatePassed}`,
    `Food safety: ${foodSafetyErrors.length === 0 ? "OK" : foodSafetyErrors.join("; ")}`,
    `Banned words: ${bannedWords.length === 0 ? "OK" : bannedWords.join(", ")}`,
    `Word count: ${wordCount}/${minWords}`,
  ].join("\n")

  await fs.writeFile("/tmp/smoke-test-output.md", preview)
  console.log(`\n📄 Preview saved to /tmp/smoke-test-output.md`)

  // ── Final ─────────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - t1) / 1000).toFixed(1)
  console.log(`\n${"═".repeat(60)}`)
  console.log(`${gatePassed ? "✅ SMOKE TEST PASSED" : "⚠️  SMOKE TEST COMPLETED WITH BLOCKS"}`)
  console.log(`   Total time: ${totalTime}s`)
  console.log(`${"═".repeat(60)}`)
}

main().catch((err) => {
  console.error("❌ Smoke test crashed:", err)
  process.exit(1)
})
