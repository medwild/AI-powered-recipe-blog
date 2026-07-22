// scripts/smoke-test-single.ts
// Smoke test v14 — 1 recette bout en bout (SERP → Mega-Skill → Gate → DB)
// Usage: npx tsx scripts/smoke-test-single.ts

import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
import { fetchSerp } from "../lib/agents/serp"
import { formatSerpForPrompt } from "../lib/inngest/functions/steps/serp-phase"
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin"
import { qualityGate } from "../lib/quality-gate"
import { generateSyntheticPAA } from "../lib/inngest/functions/helpers"

const KEYWORD = "Pan-seared salmon for two"
const CUISINE = "Easy Weeknight Dinners for Two"
const INGREDIENTS = "salmon fillets, asparagus, lemon, garlic, olive oil, butter, fresh dill, baby potatoes"
const TECHNIQUES = "pan-searing, oven-finishing, one-pan cooking, sauce making"
// Unique slug suffix to avoid duplicate on reruns
const SLUG_SUFFIX = Date.now().toString(36)

const arr = (v: any): any[] => Array.isArray(v) ? v : (typeof v === "string" ? v.split(/,\s*/) : [])

async function main() {
  console.log("═".repeat(60))
  console.log(`🔬 PIPELINE V14 — SMOKE TEST (FULL — with DB)`)
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
    console.log(`   ✅ ${serp.organic.length} organic, ${serp.relatedQuestions.length} PAA (${Date.now() - t1}ms)`)
  } catch (err) {
    console.log(`   ⚠️  SERP failed: ${(err as Error).message}`)
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

  // ── Step 3: Quality Gate (full — with DB) ─────────────────────────────
  console.log("\n🛡️  Step 3: Quality Gate (full — with DB)...")
  const t3 = Date.now()

  // Hack title to avoid duplicate slug on reruns
  const origTitle = article.title
  article.title = `${article.title} ${SLUG_SUFFIX}`
  let gate: any
  try {
    gate = await qualityGate(article)
  } catch (err) {
    console.log(`   ❌ Gate DB error: ${(err as Error).message}`)
    process.exit(1)
  }
  article.title = origTitle

  const wordCount = (article.contentMarkdown || "").split(/\s+/).filter(Boolean).length
  console.log(`   Status: ${gate.status === "PASS" ? "✅ PASS" : "❌ BLOCK"}${gate.reason ? ` (${gate.reason})` : ""}`)
  if (gate.errors?.length) for (const e of gate.errors) console.log(`   ⚠️  ${e}`)

  // ── Audit ─────────────────────────────────────────────────────────────
  const md = article.contentMarkdown || ""
  const h2s = md.match(/^## /gm)?.length ?? 0
  const faqs = md.match(/^## .+\?$/gm)?.length ?? 0
  const tips = md.match(/Chef Augustin'?s Tip/gi)?.length ?? 0
  const parens = md.match(/\([^)]+\)/g)?.length ?? 0
  const jsonLdType = typeof article.jsonLd
  const jsonLdLen = jsonLdType === "string" ? article.jsonLd.length : 0

  console.log("\n📊 Audit:")
  console.log(`   Title:      ${origTitle?.substring(0, 80)}`)
  console.log(`   Words:      ${wordCount}`)
  console.log(`   H2s:        ${h2s}`)
  console.log(`   FAQs:       ${faqs}`)
  console.log(`   Chef Tips:  ${tips}`)
  console.log(`   Parens:     ${parens}`)
  console.log(`   JSON-LD:    ${jsonLdLen > 10 ? "✅" : "❌"} (${jsonLdType}, ${jsonLdLen} chars)`)
  console.log(`   Tags:       ${arr(article.tags).join(", ") || "none"}`)
  console.log(`   Difficulty: ${article.difficulty}`)
  console.log(`   Times:      prep=${article.prepTime} cook=${article.cookTime} total=${article.totalTime}`)

  // ── Save preview ──────────────────────────────────────────────────────
  const fs = await import("fs/promises")
  const preview = [
    `# ${origTitle}`, ``,
    `> ${article.metaDescription}`, ``,
    `**Tags:** ${arr(article.tags).join(", ") || "none"} | **Difficulty:** ${article.difficulty}`,
    `**Times:** Prep ${article.prepTime} | Cook ${article.cookTime} | Total ${article.totalTime}`,
    `**Servings:** ${article.servings}`, ``,
    `---`, ``,
    article.contentMarkdown, ``,
    `---`, ``,
    `## Image Prompt`, article.imagePrompt, ``,
    `## Gate`, `Status: ${gate.status}${gate.reason ? ` (${gate.reason})` : ""}`,
    ...(gate.errors?.length ? [`Errors: ${gate.errors.join("; ")}`] : []),
  ].join("\n")
  await fs.writeFile("/tmp/smoke-test-output.md", preview)
  console.log(`\n📄 Preview saved to /tmp/smoke-test-output.md`)

  // ── Final ─────────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - t1) / 1000).toFixed(1)
  console.log(`\n${"═".repeat(60)}`)
  console.log(`${gate.status === "PASS" ? "✅ SMOKE TEST PASSED" : "⚠️  SMOKE TEST COMPLETED"}`)
  console.log(`   Total time: ${totalTime}s (${(Date.now() - t2) / 1000}s LLM)`)
  console.log(`${"═".repeat(60)}`)
}

main().catch((err) => {
  console.error("❌ Smoke test crashed:", err)
  process.exit(1)
})
