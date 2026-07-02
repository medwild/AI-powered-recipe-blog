/**
 * Steps 1 + 1.5 — SERP Analysis + Data Structuring.
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { fetchSerp, type SerpResult } from "@/lib/agents/serp"
import { structureSerpData, type StructuredSerp } from "@/lib/agents/serp-structurer"
import { logPipelineError } from "@/lib/queries"
import { appendLog, logEntry, generateSyntheticPAA, isRecoverableError } from "../helpers"

export interface SerpPhaseResult {
  serp: SerpResult
  structuredSerp: StructuredSerp
  degraded: boolean
}

export async function runSerpPhase(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number,
  keyword: string,
): Promise<SerpPhaseResult> {
  let degraded = false

  // ── Step 1: analyze-serp ────────────────────────────────────────────────
  try {
    await step.run("analyze-serp", async () => {
      await appendLog(recipeId, logEntry("SERP", "running", `Google analysis for "${keyword}"`))
      const result = await fetchSerp(keyword)
      await db
        .update(recipes)
        .set({ serpData: result as unknown as Record<string, unknown> })
        .where(eq(recipes.id, recipeId))
      await appendLog(recipeId, logEntry("SERP", "done",
        `${result.organic.length} results, ${result.relatedQuestions.length} frequently asked questions`))
    })
  } catch (err) {
    if (!isRecoverableError(err as Error)) {
      await logPipelineError({
        recipeId, stepName: "analyze-serp",
        errorType: "llm_unavailable", message: (err as Error).message,
        severity: "critical",
      })
    }
    throw err
  }
  await step.sleep("sleep-after-serp", "2s")

  // ── Step 1.5: structure-serp-data ───────────────────────────────────────
  let structuredSerp: StructuredSerp
  try {
    structuredSerp = (await step.run("structure-serp-data", async () => {
      const [row] = await db
        .select({ serpData: recipes.serpData })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
      const serp = row?.serpData as SerpResult | undefined
      if (!serp) throw new Error("SERP data not found — workflow may be corrupted.")

      if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
        const syntheticPAA = generateSyntheticPAA(keyword)
        serp.relatedQuestions = syntheticPAA.map((q) => ({
          question: q, snippet: undefined, sourceUrl: undefined,
        }))
        await appendLog(recipeId, logEntry("SERP", "error",
          `No PAA questions — using ${syntheticPAA.length} synthetic PAA fallbacks`))
      }

      await appendLog(recipeId, logEntry("SERP Structurer", "running",
        `Structuring SERP data — ${serp.organic.length} competitors, ${serp.relatedQuestions.length} questions`))

      return structureSerpData(keyword, serp, { niche: "recipe", audience: "home cooks", contentGoal: "organic SEO" })
    })) as StructuredSerp
  } catch (err) {
    if (isRecoverableError(err as Error)) throw err
    await logPipelineError({
      recipeId, stepName: "structure-serp-data",
      errorType: "unknown", message: (err as Error).message, severity: "warning",
    })
    degraded = true
    const [row] = await db
      .select({ serpData: recipes.serpData })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
    const serp = row?.serpData as SerpResult | undefined
    const fallbackSerp: SerpResult = {
      organic: serp?.organic ?? [],
      relatedQuestions: generateSyntheticPAA(keyword).map((q) => ({
        question: q, snippet: undefined, sourceUrl: undefined,
      })),
      knowledgeGraph: undefined,
      relatedSearches: [],
    }
    structuredSerp = structureSerpData(keyword, fallbackSerp, { niche: "recipe", audience: "home cooks", contentGoal: "organic SEO" })
    await appendLog(recipeId, logEntry("SERP Structurer", "error",
      `Degraded — using synthetic data (${structuredSerp.normalized_competitors.length} competitors, ${structuredSerp.user_questions.length} questions)`))
  }
  await step.sleep("sleep-after-structurer", "1s")

  return { serp: (await db.select({ serpData: recipes.serpData }).from(recipes).where(eq(recipes.id, recipeId)).then(r => r[0]?.serpData)) as unknown as SerpResult, structuredSerp, degraded }
}
