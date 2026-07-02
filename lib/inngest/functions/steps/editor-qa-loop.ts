/**
 * Steps 7 + 7.5 — Editor feedback loop + QA cross-agent verification.
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logPipelineError } from "@/lib/queries"
import { agentEditor } from "../agents/editor"
import { agentAuditor, type AuditReport } from "../agents/auditor"
import { agentQA, type QAReport } from "../agents/qa"
import type { RecipeDraft } from "../agents/writer"
import type { SeoPlan } from "../agents/strategist"
import {
  appendLog, logEntry, isRecoverableError,
  buildSyntheticAuditReport, buildSyntheticQAReport,
  MAX_EDITOR_PASSES,
} from "../helpers"

export interface EditorQaLoopResult {
  finalRecipe: RecipeDraft
  qaReport: QAReport
  humanizationPass: number
  degraded: boolean
}

export async function runEditorQaLoop(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number,
  keyword: string,
  draft: RecipeDraft,
  initialAudit: AuditReport,
  seoPlan: SeoPlan,
): Promise<EditorQaLoopResult> {
  let degraded = false
  let currentDraft = draft
  let currentAudit = initialAudit
  let humanizationPass = 0
  let qaFixApplied = false
  let finalRecipe: RecipeDraft = draft

  // ── Step 7: Editor loop (max 3 passes) ─────────────────────────────────
  while (humanizationPass < MAX_EDITOR_PASSES) {
    if (currentAudit.verdict === "OK") break
    humanizationPass++

    try {
      finalRecipe = (await step.run(`agent-4-editor-pass-${humanizationPass}`, async () => {
        await appendLog(recipeId, logEntry("Editor", "running",
          `Pass ${humanizationPass}/${MAX_EDITOR_PASSES} — Correction${currentAudit.verdict === "NEEDS REVISION" && currentAudit.score_ia_estimation >= 20 ? " + anti-AI humanization" : ""}`))
        const corrected = await agentEditor(keyword, currentDraft, currentAudit, humanizationPass)
        await appendLog(recipeId, logEntry("Editor", "done",
          `Pass ${humanizationPass} complete — ${corrected.changes_summary}`))
        return corrected
      })) as RecipeDraft
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      await logPipelineError({
        recipeId, stepName: `agent-4-editor-pass-${humanizationPass}`,
        errorType: "llm_unavailable", message: (err as Error).message, severity: "degraded",
      })
      degraded = true
      finalRecipe = currentDraft
      await appendLog(recipeId, logEntry("Editor", "error", "Degraded — Editor unavailable, keeping current draft"))
      break
    }
    await step.sleep("sleep-after-editor-pass", "2s")

    currentDraft = finalRecipe!
    try {
      currentAudit = (await step.run(`agent-3-re-audit-pass-${humanizationPass}`, async () => {
        await appendLog(recipeId, logEntry("Auditor", "running", `Re-evaluation after pass ${humanizationPass}`))
        const report = await agentAuditor(keyword, currentDraft, seoPlan.semanticEntities)
        await appendLog(recipeId, logEntry("Auditor", "done",
          `Score: ${report.overallScore}/100 | AI: ${report.score_ia_estimation}/100 | Verdict: ${report.verdict}`))
        return report
      })) as AuditReport
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      await logPipelineError({
        recipeId, stepName: `agent-3-re-audit-pass-${humanizationPass}`,
        errorType: "llm_unavailable", message: (err as Error).message, severity: "degraded",
      })
      degraded = true
      currentAudit = buildSyntheticAuditReport()
      await appendLog(recipeId, logEntry("Auditor", "error", "Degraded — re-audit unavailable, using synthetic audit"))
      break
    }
    await step.sleep("sleep-after-re-audit", "2s")
  }

  // Content integrity check
  if (!finalRecipe!.contentMarkdown || finalRecipe!.contentMarkdown.trim().length < 200) {
    await appendLog(recipeId, logEntry("Workflow", "error", "Final contentMarkdown is truncated or empty (< 200 chars)"))
    throw new Error("CONTENT_TRUNCATED: Final contentMarkdown is too short after editorial loop.")
  }

  // ── Step 7.5: QA ──────────────────────────────────────────────────────
  let qaReport: QAReport
  try {
    qaReport = (await step.run("agent-5-qa", async () => {
      await appendLog(recipeId, logEntry("QA", "running", "Cross-agent verification — 5 checks"))
      const report = await agentQA(keyword, seoPlan, draft, currentAudit, finalRecipe!)
      await appendLog(recipeId, logEntry("QA", report.verdict === "PASS" ? "done" : "error",
        `QA Score: ${report.qaScore}/100 | Verdict: ${report.verdict} | ${report.summary}`))
      return report
    })) as QAReport
  } catch (err) {
    if (isRecoverableError(err as Error)) throw err
    await logPipelineError({
      recipeId, stepName: "agent-5-qa",
      errorType: "llm_unavailable", message: (err as Error).message, severity: "degraded",
    })
    degraded = true
    qaReport = buildSyntheticQAReport()
    await appendLog(recipeId, logEntry("QA", "error", "Degraded — QA unavailable, accepting Editor output"))
  }
  await step.sleep("sleep-after-qa", "2s")

  // ── QA fix loop ───────────────────────────────────────────────────────
  if (qaReport.verdict === "NEEDS_FIX" && !qaFixApplied) {
    qaFixApplied = true
    humanizationPass++
    const qaIssues = qaReport.checks
      .filter((c) => c.status !== "PASS")
      .flatMap((c) => c.issues)
      .join("; ")

    try {
      const qaFixedDraft = (await step.run("agent-4-editor-qa-fix", async () => {
        await appendLog(recipeId, logEntry("Editor", "running", `QA fix pass — ${qaIssues.substring(0, 120)}`))
        const qaAudit: typeof currentAudit = {
          ...currentAudit,
          verdict: "NEEDS REVISION" as const,
          criteria: currentAudit.criteria.map((c) => ({
            ...c,
            issues: qaIssues ? [...c.issues, qaIssues] : c.issues,
          })),
        }
        return await agentEditor(keyword, finalRecipe!, qaAudit, humanizationPass)
      })) as RecipeDraft

      if (qaFixedDraft) {
        finalRecipe = qaFixedDraft
        await appendLog(recipeId, logEntry("Editor", "done", "QA fix pass complete"))
      }
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      degraded = true
      await appendLog(recipeId, logEntry("Editor", "error", `QA fix pass failed — ${(err as Error).message}`))
    }
    await step.sleep("sleep-after-editor-qa-fix", "2s")

    // QA re-check after fixes
    try {
      qaReport = (await step.run("agent-5-qa-recheck", async () => {
        await appendLog(recipeId, logEntry("QA", "running", "Re-check after QA fix pass"))
        return await agentQA(keyword, seoPlan, draft, currentAudit, finalRecipe!)
      })) as QAReport
    } catch {
      degraded = true
      await appendLog(recipeId, logEntry("QA", "error", "QA re-check failed — continuing with previous verdict"))
    }

    // HARD STOP on REJECT/CRITICAL
    if (qaReport.verdict === "REJECT" || qaReport.verdict === "CRITICAL") {
      await db.update(recipes).set({ status: "failed", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      await appendLog(recipeId, logEntry("Workflow", "error",
        `QA ${qaReport.verdict} — hard stop. Recipe marked as failed.`))
      throw new Error(`QA_${qaReport.verdict}: ${qaReport.summary}`)
    }
  }

  return { finalRecipe, qaReport, humanizationPass, degraded }
}
