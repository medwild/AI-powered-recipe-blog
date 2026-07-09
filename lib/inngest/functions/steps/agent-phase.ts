/**
 * Steps 2 + 3 + 4 — Strategist → Writer → Auditor.
 */

import { db } from "@/lib/db"
import { selfImprovementLogs } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { getCalibrationStats, logPipelineError } from "@/lib/queries"
import { agentStrategistV2 } from "../agents/strategist"
import { agentWriter, type RecipeDraft } from "../agents/writer"
import { agentAuditor, type AuditReport } from "../agents/auditor"
import type { StructuredSerp } from "@/lib/agents/serp-structurer"
import type { SeoPlan } from "../agents/strategist"
import type { LinkTarget } from "./link-suggester"
import { getRelevantSources } from "@/lib/external-sources"
import { appendLog, logEntry, isRecoverableError, buildSyntheticAuditReport, buildSyntheticSeoPlan } from "../helpers"

export interface AgentPhaseResult {
  seoPlan: SeoPlan
  draft: RecipeDraft
  audit: AuditReport
  degraded: boolean
}

export async function runAgentPhase(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number,
  keyword: string,
  structuredSerp: StructuredSerp,
  cuisineReplacements: Record<string, string>,
  format: "google" | "pin-first" = "google",
  linkTargets?: LinkTarget[],
): Promise<AgentPhaseResult> {
  let degraded = false

  // ── Step 2: agent-1-strategist ──────────────────────────────────────────
  let seoPlan: Awaited<ReturnType<typeof agentStrategistV2>>
  try {
    seoPlan = (await step.run("agent-1-strategist", async () => {
      const pastLogs = await db
        .select({
          keyword: selfImprovementLogs.keyword,
          criterion: selfImprovementLogs.criterion,
          score: selfImprovementLogs.score,
          recommendation: selfImprovementLogs.recommendation,
          tags: selfImprovementLogs.tags,
          source: selfImprovementLogs.source,
          aiScore: selfImprovementLogs.aiScore,
        })
        .from(selfImprovementLogs)
        .orderBy(desc(selfImprovementLogs.createdAt))
        .limit(15)

      const improvements = pastLogs.map((l) => {
        const sourceLabel = l.source === "qa" ? "[QA]" : l.source === "strategist" ? "[Plan]" : ""
        const scoreLabel = l.criterion === "ai_score"
          ? `AI detection: ${l.score}/100`
          : l.criterion === "qa_verdict"
            ? `QA verdict: ${l.score}/100`
            : `${l.criterion}: ${l.score}/20`
        return `${sourceLabel}[From "${l.keyword}" | ${scoreLabel}] ${l.recommendation}`
      })

      const calib = await getCalibrationStats()
      if (calib.calibrationReady) {
        improvements.push(
          `[CALIBRATION v2.0] Average AI Score: ${calib.averageAiScore}/100 across ${calib.totalDataPoints} articles. ` +
          `Recent trend (last 10): ${calib.recentAverageAiScore}/100 — ${calib.averageAiScore > calib.recentAverageAiScore ? "improving" : "watch closely"}. ` +
          `Weakest criteria: ${calib.criteriaAverages.slice(0, 3).map(c => `${c.criterion} (avg ${c.averageScore}/20)`).join(", ") || "none"}. ` +
          `Highest AI risk tags: ${calib.tagAverages.slice(-3).map(t => `${t.tag} (AI score ${t.averageAiScore})`).join(", ") || "none"}.`
        )
      } else if (calib.totalDataPoints > 0) {
        improvements.push(
          `[CALIBRATION v1.0] ${calib.totalDataPoints}/50 data points collected. ` +
          `Average AI Score: ${calib.averageAiScore}/100 (${calib.totalDataPoints} articles). ` +
          `Weakest criteria: ${calib.criteriaAverages.slice(0, 3).map(c => `${c.criterion} (avg ${c.averageScore}/20)`).join(", ") || "none"}.`
        )
      }

      // Match external food-science sources by keyword (substring matching on topic tags)
      const externalSources = getRelevantSources(keyword)

      await appendLog(recipeId, logEntry("SEO Strategist", "running",
        `SERP analysis + ${improvements.length} past lessons + ${externalSources.length} external sources + calibration data → editorial plan`))
      const plan = await agentStrategistV2(keyword, structuredSerp, improvements, cuisineReplacements, format, undefined, externalSources)
      await appendLog(recipeId, logEntry("SEO Strategist", "done",
        `Editorial plan: ${plan.h2Sections.length} H2 sections, ${plan.semanticEntities.length} semantic entities`))
      return plan
    })) as Awaited<ReturnType<typeof agentStrategistV2>>
  } catch (err) {
    if (!isRecoverableError(err as Error)) {
      await logPipelineError({
        recipeId, stepName: "agent-1-strategist",
        errorType: "llm_unavailable", message: (err as Error).message, severity: "degraded",
      })
    }
    // Degraded mode: produce synthetic plan so the pipeline can continue.
    // The Writer can still produce content from a generic scaffold.
    degraded = true
    seoPlan = buildSyntheticSeoPlan(keyword)
    await appendLog(recipeId, logEntry("SEO Strategist", "error",
      `Degraded — LLM unavailable, using synthetic plan. ${(err as Error).message.substring(0, 150)}`))
  }
  await step.sleep("sleep-after-strategist", "25s")

  // ── Step 3: agent-2-writer ─────────────────────────────────────────────
  let draft: RecipeDraft
  try {
    draft = (await step.run("agent-2-writer", async () => {
      await appendLog(recipeId, logEntry("Writer", "running", "Writing as Chef Augustin Lefèvre"))
      const result = await agentWriter(keyword, seoPlan, cuisineReplacements, format, linkTargets ?? [])
      await appendLog(recipeId, logEntry("Writer", "done",
        `Article "${result.title}" written — ${result.ingredients.length} ingredients, ${result.instructions.length} steps`))
      return result
    })) as RecipeDraft
  } catch (err) {
    if (!isRecoverableError(err as Error)) {
      await logPipelineError({
        recipeId, stepName: "agent-2-writer",
        errorType: "llm_unavailable", message: (err as Error).message, severity: "critical",
      })
    }
    throw err
  }
  await step.sleep("sleep-after-writer", "25s")

  // ── Step 4: agent-3-auditor ────────────────────────────────────────────
  let audit: AuditReport
  try {
    audit = (await step.run("agent-3-auditor", async () => {
      await appendLog(recipeId, logEntry("Auditor", "running", "9-dimension pre-publication quality evaluation"))
      const report = await agentAuditor(keyword, draft, seoPlan.semanticEntities, format, linkTargets)
      await appendLog(recipeId, logEntry("Auditor", "done",
        `Readiness: ${report.publication_readiness_score}/100 | LLM Sig: ${report.scores.signature_llm}/100 | Decision: ${report.decision}`))
      return report
    })) as AuditReport
  } catch (err) {
    if (isRecoverableError(err as Error)) throw err
    await logPipelineError({
      recipeId, stepName: "agent-3-auditor",
      errorType: "llm_unavailable", message: (err as Error).message, severity: "degraded",
    })
    degraded = true
    audit = buildSyntheticAuditReport()
    await appendLog(recipeId, logEntry("Auditor", "error",
      `Degraded — LLM call failed: ${(err as Error).message.substring(0, 150)}. Using synthetic audit (decision: ${audit.decision})`))
  }
  await step.sleep("sleep-after-auditor", "2s")

  return { seoPlan, draft, audit, degraded }
}
