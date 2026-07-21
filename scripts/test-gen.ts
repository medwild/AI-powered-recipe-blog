#!/usr/bin/env tsx
/**
 * End-to-end generation test — v13 Single-Pass (DeepSeek v4 Pro)
 *
 * Flow: Strategist → Chef Augustin → Quality Gate → [Science Enricher retry]
 * No Judge, no buildLoopFeedback — deterministic validators only.
 *
 * Usage: npx tsx scripts/test-gen.ts
 */

import { agentStrategist } from "@/lib/inngest/functions/agents/strategist"
import { agentChefAugustin } from "@/lib/inngest/functions/agents/chef-augustin"
import { agentScienceEnricher, formatEnrichmentsForWriter } from "@/lib/inngest/functions/agents/science-enricher"
import { checkCitability } from "@/lib/geo-validator"
import { validateContent } from "@/lib/content-validator"
import { computeLoopScore } from "@/lib/loop-scorer"

const KEYWORD = process.argv[2] || "garlic butter shrimp for two"
const FORMAT = (process.argv[3] || "pin-first") as "google" | "pin-first"

const CUISINE: Record<string, string> = {
  cuisine: "Easy Weeknight Dinners for Two",
  cuisine_ingredients: "shrimp, garlic, butter, lemon, pasta, olive oil, white wine, parsley",
  cuisine_techniques: "searing, pan sauce, garlic browning, one-pan cooking, shrimp timing, pasta al dente",
}

const MIN_WORDS = FORMAT === "pin-first" ? 800 : 1200

async function main() {
  const t0 = Date.now()
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║  Pipeline v13 — Single-Pass E2E Test          ║`)
  console.log(`╠══════════════════════════════════════════════╣`)
  console.log(`║  Keyword : ${KEYWORD.padEnd(34)}║`)
  console.log(`║  Format  : ${FORMAT.padEnd(34)}║`)
  console.log(`╚══════════════════════════════════════════════╝\n`)

  // ── Step 1: Strategist ─────────────────────────────────────────────────
  console.log("── Step 1: Strategist ──")
  const plan = await agentStrategist({
    keyword: KEYWORD,
    format: FORMAT,
    serpOrganic: [
      { title: "Garlic Butter Shrimp | 15-Minute Dinner", snippet: "Juicy shrimp in garlic butter sauce with lemon." },
      { title: "Best Shrimp Scampi for Two", snippet: "Classic shrimp scampi recipe perfectly scaled for two people." },
      { title: "Quick Garlic Shrimp Pasta", snippet: "Ready in 20 minutes — perfect weeknight dinner for two." },
    ],
    serpRelatedQuestions: [
      "How do you keep shrimp from getting rubbery?",
      "What sides go with garlic butter shrimp?",
      "Can I use frozen shrimp?",
      "How long does cooked shrimp last in the fridge?",
    ],
    serpRelatedSearches: ["garlic shrimp recipe", "shrimp for two", "date night seafood", "easy shrimp dinner"],
    cuisineReplacements: CUISINE,
  })
  console.log(`  ✓ ${plan.h2Sections.length} H2s, ${plan.faqQuestions.length} FAQs`)
  console.log(`  Angle: "${plan.angle?.substring(0, 100)}..."`)

  // ── Step 2: Writer (Pass 1) ───────────────────────────────────────────
  console.log("\n── Step 2: Writer (Pass 1) ──")
  let out = await agentChefAugustin({
    keyword: KEYWORD, format: FORMAT, strategyPlan: plan, cuisineReplacements: CUISINE,
  })
  let wc = (out.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
  let geo = checkCitability(out.contentMarkdown ?? "", wc)
  let val = validateContent({
    contentMarkdown: out.contentMarkdown,
    metaTitle: out.metaTitle,
    metaDescription: out.metaDescription,
    title: out.title,
    ingredients: out.ingredients,
    instructions: out.instructions,
    contentType: "recipe",
    format: FORMAT,
    prepTime: out.prepTime,
    cookTime: out.cookTime,
    totalTime: out.totalTime,
    servings: out.servings,
  })
  let score = computeLoopScore(geo, val)
  let errs = val.errors.filter(e => e.severity === "error")
  let warns = val.errors.filter(e => e.severity === "warning")

  const hasIngredients = (out.ingredients ?? []).length > 0
  const hasInstructions = (out.instructions ?? []).length > 0
  const meetsMinWords = wc >= MIN_WORDS
  const isTruncated = !hasIngredients || !hasInstructions || !meetsMinWords

  console.log(`  Score : ${score.total}/100 — ${score.breakdown}`)
  console.log(`  Words : ${wc} (min: ${MIN_WORDS})`)
  console.log(`  Title : ${out.title}`)
  console.log(`  GEO   : claims=${geo.claims.count}/${geo.claims.minRequired} attributions=${geo.attributions.count}/${geo.attributions.minRequired} nuggets=${geo.nuggets.count}/${geo.nuggets.minRequired}`)
  console.log(`  Errors: ${errs.length} | Warnings: ${warns.length}`)
  if (errs.length) errs.forEach(e => console.log(`    🔴 ${e.message.substring(0, 120)}`))
  if (warns.length) warns.forEach(w => console.log(`    🟡 ${w.message.substring(0, 120)}`))
  console.log(`  Truncated: ${isTruncated ? "⚠️ YES" : "✅ No"}`)

  let passesUsed = 1

  // ── Step 3: Retry with Science Enricher (if truncated) ────────────────
  if (isTruncated) {
    console.log("\n── Step 3: Science Enricher + Retry ──")

    const scienceEnricherEnabled = process.env.SCIENCE_ENRICHER_ENABLED !== "false"
    let scienceFeedback: string | undefined

    if (scienceEnricherEnabled && out.contentMarkdown) {
      try {
        const enrichment = await agentScienceEnricher({
          articleMarkdown: out.contentMarkdown,
          keyword: KEYWORD,
        })
        if (enrichment && enrichment.enrichments.length > 0) {
          scienceFeedback = formatEnrichmentsForWriter(enrichment)
          console.log(`  ✓ Science Enricher: ${enrichment.enrichments.length} enrichments generated`)
        } else {
          console.log(`  - Science Enricher: no gaps found`)
        }
      } catch (err) {
        console.log(`  ⚠️ Science Enricher failed: ${(err as Error).message}`)
      }
    }

    out = await agentChefAugustin({
      keyword: KEYWORD,
      format: FORMAT,
      strategyPlan: plan,
      cuisineReplacements: CUISINE,
      feedback: scienceFeedback,
    })
    wc = (out.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    geo = checkCitability(out.contentMarkdown ?? "", wc)
    val = validateContent({
      contentMarkdown: out.contentMarkdown,
      metaTitle: out.metaTitle,
      metaDescription: out.metaDescription,
      title: out.title,
      ingredients: out.ingredients,
      instructions: out.instructions,
      contentType: "recipe",
      format: FORMAT,
      prepTime: out.prepTime,
      cookTime: out.cookTime,
      totalTime: out.totalTime,
      servings: out.servings,
    })
    score = computeLoopScore(geo, val)
    errs = val.errors.filter(e => e.severity === "error")
    warns = val.errors.filter(e => e.severity === "warning")
    passesUsed = 2

    console.log(`\n  Pass 2 — Score: ${score.total}/100`)
    console.log(`  Words : ${wc} (min: ${MIN_WORDS})`)
    console.log(`  GEO   : claims=${geo.claims.count} attributions=${geo.attributions.count} nuggets=${geo.nuggets.count}`)
    if (errs.length) errs.forEach(e => console.log(`    🔴 ${e.message.substring(0, 120)}`))
    if (warns.length) warns.forEach(w => console.log(`    🟡 ${w.message.substring(0, 120)}`))
  }

  // ── Step 4: Quality Gate ──────────────────────────────────────────────
  console.log("\n── Step 4: Quality Gate ──")
  const finalTruncated = (out.ingredients ?? []).length === 0
    || (out.instructions ?? []).length === 0
    || wc < MIN_WORDS
  const foodSafetyErrors = errs.filter(e => e.message.includes("CRITICAL Food safety"))
  const blocked = foodSafetyErrors.length > 0 || finalTruncated

  if (blocked) {
    const reasons: string[] = []
    if (foodSafetyErrors.length) reasons.push(`Food safety: ${foodSafetyErrors.length} violations`)
    if (finalTruncated) reasons.push(`Truncated: ${wc}w, ${out.ingredients?.length ?? 0} ing, ${out.instructions?.length ?? 0} steps`)
    console.log(`  ❌ BLOCKED — ${reasons.join(" | ")}`)
  } else {
    console.log(`  ✅ PASSED`)
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const dur = Math.round((Date.now() - t0) / 1000)
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║  Summary                                      ║`)
  console.log(`╠══════════════════════════════════════════════╣`)
  console.log(`║  Score    : ${String(score.total).padEnd(3)}/100 (${score.breakdown.padEnd(24)})║`)
  console.log(`║  Words    : ${String(wc).padEnd(32)}║`)
  console.log(`║  Passes   : ${String(passesUsed).padEnd(32)}║`)
  console.log(`║  Duration : ${String(dur + "s").padEnd(32)}║`)
  console.log(`║  Blocked  : ${String(blocked ? "YES" : "NO").padEnd(32)}║`)
  console.log(`╚══════════════════════════════════════════════╝\n`)

  // Sample output
  console.log("── Content Preview (first 500 chars) ──")
  console.log((out.contentMarkdown ?? "").substring(0, 500))
  console.log("...\n")

  if (!blocked) {
    console.log("✅ E2E test PASSED\n")
    process.exit(0)
  } else {
    console.log("❌ E2E test FAILED — content blocked by Quality Gate\n")
    process.exit(1)
  }
}

main().catch(err => {
  console.error("💥 Fatal:", err.message)
  process.exit(1)
})
