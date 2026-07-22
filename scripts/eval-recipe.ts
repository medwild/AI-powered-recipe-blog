// scripts/eval-recipe.ts
// Eval script v14 — generates 10 recipes with the mega-skill and audits
// each section: food safety, human patterns, attributions, FAQ, JSON-LD.
// Logs token usage for cost estimation.
//
// Usage: npx tsx scripts/eval-recipe.ts

import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin"
import { qualityGate } from "../lib/quality-gate"
import { fetchSerp } from "../lib/agents/serp"
import { formatSerpForPrompt } from "../lib/inngest/functions/steps/serp-phase"
import { generateSyntheticPAA } from "../lib/inngest/functions/helpers"

const arr = (v: any): any[] => Array.isArray(v) ? v : (typeof v === "string" ? v.split(/,\s*/) : [])

const KEYWORDS = [
  "Roast chicken for two",
  "Beef bourguignon small batch",
  "Authentic carbonara for two",
  "Pan-seared salmon medium-rare",
  "Vegetarian chickpea curry for two",
  "Caesar salad with homemade dressing",
  "Perfect medium-rare steak for two",
  "Dark chocolate mousse for two",
  "Chicken bacon pasta for two",
  "15-minute garlic shrimp",
]

const CUISINE = "Easy Weeknight Dinners for Two"
const INGREDIENTS = "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, eggs, salmon, shrimp, bacon"
const TECHNIQUES = "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling"

function auditArticle(article: any): Record<string, number | string> {
  const md = article.contentMarkdown || ""
  const tags = arr(article.tags)
  return {
    title: (article.title || "").substring(0, 60),
    wordCount: md.split(/\s+/).filter(Boolean).length,
    h2Count: (md.match(/^## /gm) || []).length,
    faqCount: (md.match(/^## .+\?$/gm) || []).length,
    tipCount: (md.match(/Chef Augustin'?s Tip/gi) || []).length,
    parenCount: (md.match(/\([^)]+\)/g) || []).length,
    tagCount: tags.length,
    jsonLdChars: typeof article.jsonLd === "string" ? article.jsonLd.length : 0,
  }
}

async function main() {
  console.log("═".repeat(70))
  console.log("PIPELINE V14 — EVAL-RECIPE (10 keywords)")
  console.log(`Model: ${process.env.ANTHROPIC_MODEL || "default"}`)
  console.log("═".repeat(70))

  const results: any[] = []
  let passCount = 0
  let blockCount = 0
  const t0 = Date.now()

  for (let i = 0; i < KEYWORDS.length; i++) {
    const keyword = KEYWORDS[i]
    const pad = `[${i + 1}/${KEYWORDS.length}]`
    console.log(`\n${"─".repeat(70)}`)
    console.log(`${pad} 🔬 "${keyword}"`)

    try {
      // ── SERP ──────────────────────────────────────────────────────────
      let serpText = ""
      try {
        const serp = await fetchSerp(keyword)
        if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
          serp.relatedQuestions = generateSyntheticPAA(keyword).map((q) => ({ question: q }))
        }
        serpText = formatSerpForPrompt(serp)
      } catch {
        serpText = `Top 0 Google results.\n\nPeople Also Ask:\n${generateSyntheticPAA(keyword).map((q) => `- ${q}`).join("\n")}`
      }

      // ── Mega-Skill ────────────────────────────────────────────────────
      const t1 = Date.now()
      const article = await agentChefAugustinMega({
        keyword, cuisine: CUISINE, cuisineIngredients: INGREDIENTS,
        cuisineTechniques: TECHNIQUES, serpData: serpText, citations: "",
      })
      const llmTime = ((Date.now() - t1) / 1000).toFixed(1)

      // ── Quality Gate ──────────────────────────────────────────────────
      const origTitle = article.title
      article.title = `${article.title} ${Date.now().toString(36)}` // unique slug
      const gate = await qualityGate(article)
      article.title = origTitle

      // ── Audit ─────────────────────────────────────────────────────────
      const audit = auditArticle(article)
      const icon = gate.status === "PASS" ? "✅" : "❌"
      console.log(`${pad} ${icon} Gate=${gate.status} | ${audit.wordCount}w | ${audit.h2Count}h2 | ${audit.faqCount}faq | ${audit.tipCount}tips | JSON-LD=${audit.jsonLdChars}c | ${llmTime}s`)

      if (gate.status === "PASS") passCount++
      else blockCount++

      results.push({ keyword, ...audit, gateStatus: gate.status, gateReason: gate.reason, llmTime })
    } catch (err) {
      console.log(`${pad} ❌ CRASH: ${(err as Error).message.substring(0, 200)}`)
      blockCount++
      results.push({ keyword, error: (err as Error).message.substring(0, 200) })
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n${"═".repeat(70)}`)
  console.log(`RESULTS: ${passCount}/${KEYWORDS.length} PASS, ${blockCount} BLOCK — ${totalTime}s total`)
  console.log(`${"═".repeat(70)}`)

  // CSV
  console.log("\nkeyword,words,h2,faq,tips,parens,tags,jsonld_chars,gate,time_s")
  for (const r of results) {
    console.log([r.keyword, r.wordCount ?? "ERR", r.h2Count ?? "-", r.faqCount ?? "-",
      r.tipCount ?? "-", r.parenCount ?? "-", r.tagCount ?? "-", r.jsonLdChars ?? "-",
      r.gateStatus ?? "ERROR", r.llmTime ?? "-"].join(","))
  }

  // Save JSON
  const fs = await import("fs/promises")
  await fs.writeFile("/tmp/eval-recipe-results.json", JSON.stringify(results, null, 2))
  console.log(`\n📄 Full results saved to /tmp/eval-recipe-results.json`)
}

main().catch((err) => {
  console.error("❌ eval-recipe crashed:", err)
  process.exit(1)
})
