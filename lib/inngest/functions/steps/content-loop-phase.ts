/**
 * Step 2 — Content Generation Phase (Pipeline v13)
 *
 * Single-pass architecture with retry on truncation:
 *   Strategist (LLM) → Writer (LLM, retry once if truncated) → Quality Gate (code) → Deterministic Fixes (code)
 *
 * Karpathy principle: the LLM generates, code enforces quality. The model
 * cannot reliably self-correct — each "pass" is a fresh generation that may
 * lose what worked. Instead, bake all quality requirements into the skill
 * (§4 attributions, §4.3 banned words, §4.6 USDA temps, §5 self-check),
 * make a single LLM call, then let code handle the rest:
 *
 *   - Banned words → deterministic scrubber (persist-phase)
 *   - Meta truncation → smart truncation (persist-phase)
 *   - Food safety violations → REJECT (human review)
 *   - Word count < minimum → retry once, then REJECT if still failing
 *
 * Total LLM calls: 2 (Strategist + Writer), occasionally 3 on truncation retry.
 * Down from 3-5 in v12.
 */

import { agentStrategist, type StrategyPlan } from "../agents/strategist"
import { agentChefAugustin, type ChefAugustinOutput } from "../agents/chef-augustin"
import { checkCitability } from "@/lib/geo-validator"
import { validateContent } from "@/lib/content-validator"
import { computeLoopScore } from "@/lib/loop-scorer"
import { startGeneration, finishGeneration, appendRunLog } from "@/lib/loop-state"
import type { SerpPhaseResult } from "./serp-phase"
import { appendLog, logEntry } from "../helpers"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentLoopResult {
  output: ChefAugustinOutput
  strategyPlan: StrategyPlan
  score: number
  passesUsed: number
  degraded: boolean
}

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

export async function runContentLoopPhase(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number,
  keyword: string,
  serpResult: SerpPhaseResult,
  cuisineReplacements: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<ContentLoopResult> {

  const startedAt = Date.now()

  // Init STATE.json tracking (single pass — was MAX_PASSES in v12)
  startGeneration(recipeId, keyword, 1)

  // ── Step 2.1: Strategist — Plan once ──────────────────────────────────

  let strategyPlan: StrategyPlan
  try {
    strategyPlan = await step.run("agent-strategist", async () => {
      await appendLog(recipeId, logEntry("Strategist", "running",
        `Planning article structure for "${keyword}" in ${format} format`))

      const plan = await agentStrategist({
        keyword,
        format,
        serpOrganic: serpResult.serp.organic.map(o => ({ title: o.title, snippet: o.snippet ?? "" })),
        serpRelatedQuestions: serpResult.serp.relatedQuestions.map(q => q.question),
        serpRelatedSearches: serpResult.serp.relatedSearches,
        cuisineReplacements,
      })

      await appendLog(recipeId, logEntry("Strategist", "done",
        `Plan ready: "${plan.angle?.substring(0, 80)}..." — ${plan.h2Sections.length} H2s, ${plan.faqQuestions.length} FAQs, ${plan.competitorGaps.length} gaps`))

      return plan
    }) as StrategyPlan
  } catch (err) {
    // Strategist failure is non-fatal — degraded mode with minimal plan
    await appendLog(recipeId, logEntry("Strategist", "error",
      `Planning failed: ${(err as Error).message}. Using fallback plan.`))
    strategyPlan = {
      angle: `${keyword} — recipe and technique guide`,
      primaryKeyword: keyword,
      secondaryKeywords: [],
      h2Sections: [
        { heading: "Ingredients", purpose: "List all ingredients with precise measurements", coverPaa: [] },
        { heading: "Instructions", purpose: "Step-by-step cooking instructions", coverPaa: [] },
        { heading: "Chef's Tips", purpose: "Insider techniques and common mistakes", coverPaa: [] },
        { heading: "FAQ", purpose: "Answer common questions", coverPaa: serpResult.serp.relatedQuestions.map(q => q.question).slice(0, 3) },
      ],
      faqQuestions: serpResult.serp.relatedQuestions.map(q => q.question).slice(0, 5),
      semanticEntities: [],
      competitorGaps: [],
      targetWordCount: format === "pin-first" ? "1200-1500" : "1800-2200",
      contentType: "recipe",
    }
  }

  // ── Step 2.2: Writer — Single pass with retry on truncation ──────────
  //
  // DeepSeek occasionally produces truncated JSON (valid but incomplete —
  // missing ingredients, instructions, or < minimum words). When that happens,
  // retry once. The second attempt virtually always succeeds.

  const minWords = format === "pin-first" ? 800 : 1200
  let result: ChefAugustinOutput | null = null
  let loopScore: ReturnType<typeof computeLoopScore> | null = null
  let citability: ReturnType<typeof checkCitability> | null = null
  let contentValidation: ReturnType<typeof validateContent> | null = null
  let wordCount = 0
  let attempts = 0

  for (let attempt = 1; attempt <= 2; attempt++) {
    const stepName = attempt === 1 ? "agent-writer" : "agent-writer-retry"

    const output = await step.run(stepName, async () => {
      await appendLog(recipeId, logEntry("Writer", "running",
        `Generating article for "${keyword}" in ${format} format${attempt > 1 ? " (retry after truncation)" : ""}`))

      const res = await agentChefAugustin({
        keyword,
        format,
        strategyPlan,
        cuisineReplacements,
      })

      const wc = (res.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
      const geo = checkCitability(res.contentMarkdown ?? "", wc)
      const val = validateContent({
        contentMarkdown: res.contentMarkdown,
        metaTitle: res.metaTitle,
        metaDescription: res.metaDescription,
        title: res.title,
        ingredients: res.ingredients,
        instructions: res.instructions,
        contentType: "recipe",
        format,
      })
      const score = computeLoopScore(geo, val)

      const errors = val.errors.filter(e => e.severity === "error")
      const warnings = val.errors.filter(e => e.severity === "warning")

      await appendLog(recipeId, logEntry("Writer", "done",
        `${attempt > 1 ? "[retry] " : ""}Generated — score ${score.total}/100 ` +
        `(${score.breakdown}) | ` +
        `${wc} words | ` +
        `${errors.length} errors, ${warnings.length} warnings | ` +
        `GEO: claims=${geo.claims.count}, attr=${geo.attributions.count}, nuggets=${geo.nuggets.count}`))

      return { res, score, geo, val, wc }
    }) as {
      res: ChefAugustinOutput
      score: ReturnType<typeof computeLoopScore>
      geo: ReturnType<typeof checkCitability>
      val: ReturnType<typeof validateContent>
      wc: number
    }

    result = output.res
    loopScore = output.score
    citability = output.geo
    contentValidation = output.val
    wordCount = output.wc
    attempts = attempt

    // Check if output is structurally complete
    const hasIngredients = (result.ingredients ?? []).length > 0
    const hasInstructions = (result.instructions ?? []).length > 0
    const meetsMinWords = wordCount >= minWords
    const hasContent = (result.contentMarkdown ?? "").length > 500

    if (hasIngredients && hasInstructions && meetsMinWords && hasContent) {
      break // Output is complete — no retry needed
    }

    if (attempt < 2) {
      await appendLog(recipeId, logEntry("Writer", "error",
        `Truncated output — ${wordCount}w, ${result.ingredients?.length ?? 0} ingredients, ` +
        `${result.instructions?.length ?? 0} instructions. Retrying once.`))
    }
  }

  // Safe: at least one attempt completed
  const finalResult = result!
  const finalScore = loopScore!
  const finalCitability = citability!
  const finalValidation = contentValidation!

  // ── Quality Gate: CRITICAL errors only ──────────────────────────────────
  //
  // Only food safety and catastrophically short content block publication.
  // Everything else (banned words, meta length, GEO score, attributions,
  // nuggets) is fixed deterministically in persist-phase or logged for
  // quality monitoring.

  const foodSafetyErrors = finalValidation.errors.filter(
    e => e.severity === "error" && e.message.toLowerCase().includes("food safety"),
  )
  const tooShort = wordCount < minWords
  const blocked = foodSafetyErrors.length > 0 || tooShort

  if (blocked) {
    const reasons: string[] = []
    if (foodSafetyErrors.length > 0) {
      reasons.push(`Food safety: ${foodSafetyErrors.map(e => e.message).join("; ")}`)
    }
    if (tooShort) {
      reasons.push(`Word count: ${wordCount} < ${minWords} minimum (after ${attempts} attempt${attempts > 1 ? "s" : ""})`)
    }
    await appendLog(recipeId, logEntry("Writer", "error",
      `BLOCKED — ${reasons.join(" | ")}`))
  }

  // ── Finalize ───────────────────────────────────────────────────────────

  const durationS = Math.round((Date.now() - startedAt) / 1000)
  const passed = !blocked
  const outcome = passed ? "published" : "draft"

  finishGeneration(recipeId, keyword, finalScore.total, attempts, outcome, 70)

  appendRunLog({
    runId: new Date().toISOString(),
    recipeId,
    keyword,
    passesUsed: attempts,
    bestScore: finalScore.total,
    duration_s: durationS,
    outcome,
    threshold: 70,
  })

  await appendLog(recipeId, logEntry("Content Gen", passed ? "done" : "error",
    `${passed ? "Published" : "DRAFT (blocked)"} — score ${finalScore.total}/100. ` +
    `${wordCount} words (${attempts} attempt${attempts > 1 ? "s" : ""}). ` +
    `Claims: ${finalCitability.claims.count}, Attributions: ${finalCitability.attributions.count}, ` +
    `Nuggets: ${finalCitability.nuggets.count}. Duration: ${durationS}s.`))

  return {
    output: finalResult,
    strategyPlan,
    score: finalScore.total,
    passesUsed: attempts,
    degraded: serpResult.degraded || !passed,
  }
}
