// scripts/test-rendang.ts — Rendang stress test
// v2: save preview BEFORE quality gate so DB failure doesn't hide the recipe
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { fetchSerp } from "../lib/agents/serp"
import { formatSerpForPrompt } from "../lib/pipeline/steps/serp-phase"
import { agentChefAugustinMega } from "../lib/pipeline/agents/chef-augustin"
import { qualityGate } from "../lib/quality-gate"
import { generateSyntheticPAA } from "../lib/pipeline/helpers"

const KEYWORD = "Beef rendang for two"
const CUISINE = "Indonesian Slow-Cooked Classics for Two"
const INGREDIENTS = "beef chuck, coconut milk, lemongrass, galangal, turmeric, kaffir lime leaves, turmeric leaves, shallots, garlic, dried chilies, tamarind, kerisik (toasted grated coconut)"
const TECHNIQUES = "slow braising, spice paste grinding, coconut reduction, kerisik toasting, low-and-slow simmering"
const SLUG_SUFFIX = Date.now().toString(36)

const arr = (v: any): any[] => Array.isArray(v) ? v : (typeof v === "string" ? v.split(/,\s*/) : [])

async function main() {
  console.log("═".repeat(60))
  console.log(`🔬 PIPELINE V14 — RENDANG STRESS TEST`)
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
  console.log("\n🤖 Step 2: Mega-Skill (Opus 4.8 via ZenMux)...")
  const t2 = Date.now()

  let article: any, origTitle: string
  try {
    article = await agentChefAugustinMega({
      keyword: KEYWORD,
      cuisine: CUISINE,
      cuisineIngredients: INGREDIENTS,
      cuisineTechniques: TECHNIQUES,
      serpData: serpText,
      citations: "",
    })
    origTitle = article.title
    const elapsed = ((Date.now() - t2) / 1000).toFixed(1)
    const words = article.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0
    console.log(`   ✅ Generated: ${words} words in ${elapsed}s`)
  } catch (err) {
    console.log(`   ❌ Mega-skill failed: ${(err as Error).message}`)
    process.exit(1)
  }

  // ── Audit (before DB — no crash can hide this) ────────────────────────
  const md = article.contentMarkdown || ""
  const wordCount = (article.contentMarkdown || "").split(/\s+/).filter(Boolean).length
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

  // ── Save preview immediately (before DB) ──────────────────────────────
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
  ].join("\n")
  await fs.writeFile("/tmp/test-rendang-output.md", preview)
  console.log(`📄 Recipe saved to /tmp/test-rendang-output.md`)

  // ── Step 3: Quality Gate (best-effort, DB may be down) ────────────────
  console.log("\n🛡️  Step 3: Quality Gate...")
  article.title = `${article.title} ${SLUG_SUFFIX}`
  try {
    const gate = await qualityGate(article)
    console.log(`   Status: ${gate.status === "PASS" ? "✅ PASS" : "❌ BLOCK"}${gate.reason ? ` (${gate.reason})` : ""}`)
    if (gate.errors?.length) for (const e of gate.errors) console.log(`   ⚠️  ${e}`)
  } catch (err) {
    console.log(`   ⚠️  Gate DB unavailable (non-blocking): ${(err as Error).message.substring(0, 120)}`)
  }
  article.title = origTitle

  // ── Final ─────────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - t1) / 1000).toFixed(1)
  console.log(`\n${"═".repeat(60)}`)
  console.log(`✅ RENDANG TEST COMPLETE — ${wordCount} words in ${totalTime}s`)
  console.log(`   Full recipe: /tmp/test-rendang-output.md`)
  console.log(`${"═".repeat(60)}`)
}

main().catch((err) => {
  console.error("❌ Test crashed:", err)
  process.exit(1)
})
