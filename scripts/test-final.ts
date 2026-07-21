#!/usr/bin/env tsx
/**
 * Pipeline v13 Final Test — max_tokens 16384 + skill équilibré (~200 lignes)
 * 3 articles, single pass + retry, quality gate.
 */
import { agentStrategist } from "@/lib/inngest/functions/agents/strategist"
import { agentChefAugustin } from "@/lib/inngest/functions/agents/chef-augustin"
import { checkCitability } from "@/lib/geo-validator"
import { validateContent } from "@/lib/content-validator"
import { computeLoopScore } from "@/lib/loop-scorer"

const TESTS = [
  { k: "garlic butter shrimp for two", f: "google" as const },
  { k: "creamy mushroom pasta for two", f: "pin-first" as const },
  { k: "one-pan lemon chicken for two", f: "google" as const },
]

const C = {
  cuisine: "Easy Weeknight Dinners for Two",
  cuisine_ingredients: "shrimp, chicken breast, pasta, garlic, mushrooms, cream, parmesan, butter, lemon, olive oil, wine, herbs",
  cuisine_techniques: "searing, pan sauce, one-pan cooking, pasta al dente, emulsion, deglazing, browning, portion scaling",
}

async function run(t: { k: string; f: "google" | "pin-first" }) {
  const t0 = Date.now()
  console.log(`\n── ${t.k} (${t.f}) ──`)

  // Strategist
  let plan
  try {
    plan = await agentStrategist({
      keyword: t.k, format: t.f,
      serpOrganic: [{ title: `${t.k} recipe`, snippet: "Delicious recipe." }],
      serpRelatedQuestions: ["How long does it take?", "Can I substitute the protein?", "What sides go with this?"],
      serpRelatedSearches: [t.k.replace("for two", "recipe")],
      cuisineReplacements: C,
    })
  } catch (err) {
    console.log(`  ❌ Strategist: ${(err as Error).message}`)
    return { ok: false, score: 0, attrs: 0, nuggets: 0, wc: 0, dur: 0, retries: 0 }
  }
  console.log(`  Plan: ${plan.h2Sections.length} H2s | ${plan.faqQuestions.length} FAQs`)

  // Writer (retry on truncation)
  const minWords = t.f === "pin-first" ? 800 : 1200
  let result: Awaited<ReturnType<typeof agentChefAugustin>> | null = null
  let attempts = 0

  for (let a = 1; a <= 2; a++) {
    attempts = a
    try {
      result = await agentChefAugustin({ keyword: t.k, format: t.f, strategyPlan: plan, cuisineReplacements: C })
    } catch (err) {
      console.log(`  ❌ Writer a${a}: ${(err as Error).message}`)
      if (a < 2) continue
      return { ok: false, score: 0, attrs: 0, nuggets: 0, wc: 0, dur: Math.round((Date.now()-t0)/1000), retries: a }
    }
    const wc = (result.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    const ok = (result.ingredients ?? []).length > 0 && (result.instructions ?? []).length > 0 && wc >= minWords
    if (ok) break
    if (a < 2) console.log(`  ⚠️ Truncated (${wc}w) — retrying`)
  }

  // Evaluate
  const wc = (result!.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
  const geo = checkCitability(result!.contentMarkdown ?? "", wc)
  const val = validateContent({
    contentMarkdown: result!.contentMarkdown, metaTitle: result!.metaTitle,
    metaDescription: result!.metaDescription, title: result!.title,
    ingredients: result!.ingredients, instructions: result!.instructions,
    contentType: "recipe", format: t.f,
  })
  const score = computeLoopScore(geo, val)
  const errs = val.errors.filter(e => e.severity === "error")
  const foodSafety = errs.filter(e => e.message.includes("food safety"))
  const blocked = foodSafety.length > 0 || wc < minWords

  console.log(`  Score: ${score.total}/100 | GEO ${geo.score} | ${errs.length}e(${foodSafety.length}fs) | ${wc}w`)
  console.log(`  GEO: ${geo.claims.count}c | ${geo.attributions.count}a | ${geo.nuggets.count}n`)
  console.log(`  ${result!.title}`)
  if (errs.length) errs.slice(0, 2).forEach(e => console.log(`  🔴 ${e.message.substring(0, 90)}`))

  const dur = Math.round((Date.now() - t0) / 1000)
  console.log(`  ${blocked ? '🚫' : '✅'} ${attempts}LLM ${dur}s`)
  return { ok: !blocked, score: score.total, attrs: geo.attributions.count, nuggets: geo.nuggets.count, wc, dur, retries: attempts - 1 }
}

async function main() {
  console.log("═══ v13 Final — max_tokens 16384 + skill équilibré ═══\n")
  const results = []
  for (const t of TESTS) results.push(await run(t))

  const allOk = results.every(r => r.ok)
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
  const avgAttrs = (results.reduce((s, r) => s + r.attrs, 0) / results.length).toFixed(1)
  const avgNuggets = (results.reduce((s, r) => s + r.nuggets, 0) / results.length).toFixed(1)
  const totalRetries = results.reduce((s, r) => s + r.retries, 0)
  const totalDur = results.reduce((s, r) => s + r.dur, 0)

  console.log(`\n═══ ${allOk ? '✅' : '❌'} ${results.filter(r=>r.ok).length}/${results.length} passed | Avg ${avgScore}/100 | ${avgAttrs} attrs | ${avgNuggets} nuggets | ${totalRetries} retries | ${totalDur}s ═══`)
  process.exit(allOk ? 0 : 1)
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1) })
