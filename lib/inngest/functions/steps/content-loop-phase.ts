/**
 * Step 2 — Content Loop Phase (Pipeline v12)
 *
 * Plan-then-Write architecture:
 *   Strategist (LLM) → Plan → Writer (LLM) → Validators (code) → Feedback → Writer → ...
 *
 * The Strategist runs ONCE before the loop, producing a StrategyPlan.
 * The Writer executes the plan in up to LOOP_MAX_PASSES iterations,
 * with deterministic GEO + Content validators providing structured
 * feedback after each pass. Returns the best-scoring content.
 */

import { agentStrategist, type StrategyPlan } from "../agents/strategist"
import { agentChefAugustin, type ChefAugustinOutput } from "../agents/chef-augustin"
import { agentJudge } from "../agents/judge"
import { agentScienceEnricher, formatEnrichmentsForWriter } from "../agents/science-enricher"
import { checkCitability } from "@/lib/geo-validator"
import { validateContent } from "@/lib/content-validator"
import { computeLoopScore, buildLoopFeedback, thresholdMet, isDiminishing } from "@/lib/loop-scorer"
import { startGeneration, updateGenerationProgress, finishGeneration, appendRunLog } from "@/lib/loop-state"
import type { SerpPhaseResult } from "./serp-phase"
import { appendLog, logEntry } from "../helpers"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentLoopResult {
  output: ChefAugustinOutput
  strategyPlan: StrategyPlan
  bestScore: number
  passesUsed: number
  degraded: boolean
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_PASSES = parseInt(process.env.LOOP_MAX_PASSES || "2", 10)
const GEO_BLOCK_THRESHOLD = parseInt(process.env.GEO_BLOCK_THRESHOLD || "70", 10)

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

  // Init STATE.json tracking
  startGeneration(recipeId, keyword, MAX_PASSES)

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

  // ── Step 2.2: Writer Loop — Evaluate-Optimize ─────────────────────────

  let bestScore = -1
  let bestContent: ChefAugustinOutput | null = null
  let bestPass = 0
  let feedback = ""
  let previousScore = -1
  let stagnationCount = 0
  let degraded = serpResult.degraded

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const passLabel = `agent-writer-loop-pass-${pass}`

    const output = await step.run(passLabel, async () => {
      await appendLog(recipeId, logEntry("Writer", "running",
        `Pass ${pass}/${MAX_PASSES}${feedback ? " — with feedback from previous pass" : ""}`))

      // 1. Generate (Writer — LLM call with strategy plan)
      const result = await agentChefAugustin({
        keyword,
        format,
        strategyPlan,
        cuisineReplacements,
        feedback: feedback || undefined,
      })

      // 2. Evaluate — Judge (LLM quality check, non-blocking)
      let judgeVerdict
      try {
        judgeVerdict = await agentJudge({ keyword, output: result, strategyPlan })
      } catch (err) {
        await appendLog(recipeId, logEntry("Judge", "error",
          `Judge evaluation failed: ${(err as Error).message}. Continuing without judge score.`))
        judgeVerdict = undefined
      }

      // 3. Evaluate — Checker (deterministic code, no LLM)
      const wordCount = (result.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
      const citability = checkCitability(result.contentMarkdown ?? "", wordCount)
      const contentValidation = validateContent({
        contentMarkdown: result.contentMarkdown,
        metaTitle: result.metaTitle,
        metaDescription: result.metaDescription,
        title: result.title,
        ingredients: result.ingredients,
        instructions: result.instructions,
        contentType: "recipe",
        format,
      })

      // 4. Score (composite: Judge 40% + GEO 30% + Content 20% + Structure 10%)
      const loopScore = computeLoopScore(citability, contentValidation, judgeVerdict)

      await appendLog(recipeId, logEntry("Writer", "running",
        `Pass ${pass}/${MAX_PASSES} evaluated — score ${loopScore.total}/100 ` +
        `(${loopScore.breakdown}) | ` +
        `Judge: ${judgeVerdict?.totalScore ?? "n/a"}/100 (${judgeVerdict?.verdict ?? "N/A"}) | ` +
        `GEO: claims=${citability.claims.count}, attr=${citability.attributions.count}, nuggets=${citability.nuggets.count} | ` +
        `Content: ${contentValidation.errors.filter(e => e.severity === "error").length} errors, ` +
        `${contentValidation.errors.filter(e => e.severity === "warning").length} warnings | ` +
        `${wordCount} words`))

      return { result, loopScore, citability, contentValidation, wordCount, judgeVerdict }
    }) as { result: ChefAugustinOutput; loopScore: ReturnType<typeof computeLoopScore>; citability: ReturnType<typeof checkCitability>; contentValidation: ReturnType<typeof validateContent>; wordCount: number; judgeVerdict: ReturnType<typeof agentJudge> }

    const { result, loopScore, citability, contentValidation, wordCount, judgeVerdict: judge } = output

    // 4. Track best
    if (loopScore.total > bestScore) {
      bestScore = loopScore.total
      bestContent = result
      bestPass = pass
    }

    updateGenerationProgress(recipeId, pass, loopScore.total)

    // 5. Science Enricher (DeepSeek v4 Pro) — after Pass 1, always
    // Runs even if Pass 1 meets the threshold. If gaps are found,
    // forces a second pass to integrate food science depth.
    //
    // WRAPPED in step.run() — Inngest memoizes the result so the
    // Science Enricher never re-executes on function replay. Before
    // this fix, it ran 4+ times per pass, wasting DeepSeek v4 Pro tokens.
    let enrichedPass1 = false
    if (pass === 1 && process.env.SCIENCE_ENRICHER_ENABLED !== "false") {
      try {
        const enrichmentResult = await step.run("agent-science-enricher-pass-1", async () => {
          await appendLog(recipeId, logEntry("ScienceEnricher", "running",
            "Analysing article for food science gaps with DeepSeek v4 Pro..."))

          const enrichmentOutput = await agentScienceEnricher({
            articleMarkdown: result.contentMarkdown,
            keyword,
          })

          if (enrichmentOutput && enrichmentOutput.enrichments.length > 0) {
            const enrichmentFeedback = formatEnrichmentsForWriter(enrichmentOutput)
            const loopFeedback = buildLoopFeedback(citability, contentValidation, pass + 1, MAX_PASSES)

            await appendLog(recipeId, logEntry("ScienceEnricher", "done",
              `${enrichmentOutput.enrichments.length} science enrichments generated ` +
              `(${enrichmentOutput.enrichments.map(e => e.type).join(", ")}). ` +
              `Forcing Pass 2 to integrate. Assessment: ${enrichmentOutput.overall_assessment}`))

            return { enriched: true, feedback: loopFeedback + "\n\n" + enrichmentFeedback }
          }

          await appendLog(recipeId, logEntry("ScienceEnricher", "done",
            "No enrichment opportunities found — article already science-dense."))
          return { enriched: false, feedback: "" }
        }) as { enriched: boolean; feedback: string }

        if (enrichmentResult.enriched) {
          enrichedPass1 = true
          feedback = enrichmentResult.feedback
        }
      } catch (err) {
        // Enricher failure is non-fatal — the loop continues without enrichment
        await appendLog(recipeId, logEntry("ScienceEnricher", "error",
          `Enrichment failed: ${(err as Error).message}. Continuing without enrichments.`))
      }
    }

    // 6. Check stopping conditions
    // Skip threshold break if Science Enricher found gaps (force Pass 2)
    if (!enrichedPass1 && thresholdMet(loopScore, GEO_BLOCK_THRESHOLD, citability, contentValidation)) {
      await appendLog(recipeId, logEntry("Writer", "done",
        `Threshold met at pass ${pass}/${MAX_PASSES} — score ${loopScore.total}/${GEO_BLOCK_THRESHOLD}. ` +
        `${wordCount} words, ${result.ingredients.length} ingredients, ${result.instructions.length} steps.`))
      break
    }

    if (isDiminishing(loopScore.total, previousScore, stagnationCount)) {
      await appendLog(recipeId, logEntry("Writer", "error",
        `Diminishing returns at pass ${pass}/${MAX_PASSES} — score ${loopScore.total} ≤ previous ${previousScore} (stagnation: ${stagnationCount + 1}). Stopping loop.`))
      break
    }

    if (loopScore.total <= previousScore) {
      stagnationCount++
    } else {
      stagnationCount = 0
    }

    // 7. Build feedback for next pass (skip if already built by Science Enricher)
    previousScore = loopScore.total
    if (!enrichedPass1) {
      feedback = buildLoopFeedback(citability, contentValidation, pass + 1, MAX_PASSES)
    }

    await appendLog(recipeId, logEntry("Writer", "running",
      `Pass ${pass} feedback: ${feedback.substring(0, 250)}...`))
  }

  // ── Post-loop: finalize ──────────────────────────────────────────────

  const durationS = Math.round((Date.now() - startedAt) / 1000)
  const citability = checkCitability(
    bestContent?.contentMarkdown ?? "",
    (bestContent?.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length,
  )

  const outcome = bestScore >= GEO_BLOCK_THRESHOLD ? "published" : "draft"

  finishGeneration(recipeId, keyword, bestScore, bestPass, outcome, GEO_BLOCK_THRESHOLD)

  appendRunLog({
    runId: new Date().toISOString(),
    recipeId,
    keyword,
    passesUsed: bestPass,
    bestScore,
    duration_s: durationS,
    outcome,
    threshold: GEO_BLOCK_THRESHOLD,
  })

  await appendLog(recipeId, logEntry("Content Loop", outcome === "published" ? "done" : "error",
    `${outcome === "published" ? "Passed" : "WARNING"} — best score ${bestScore}/100 ` +
    `(threshold: ${GEO_BLOCK_THRESHOLD}) at pass ${bestPass}/${MAX_PASSES}. ` +
    `Claims: ${citability.claims.count}, Attributions: ${citability.attributions.count}, ` +
    `Nuggets: ${citability.nuggets.count}. Duration: ${durationS}s.`))

  return {
    output: bestContent!,
    strategyPlan,
    bestScore,
    passesUsed: bestPass,
    degraded: degraded || bestScore < GEO_BLOCK_THRESHOLD,
  }
}
