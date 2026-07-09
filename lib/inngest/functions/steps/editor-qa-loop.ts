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
  /** Signal to the orchestrator that the Writer should retry from scratch. */
  needsRewrite?: boolean
}

export async function runEditorQaLoop(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number,
  keyword: string,
  draft: RecipeDraft,
  initialAudit: AuditReport,
  seoPlan: SeoPlan,
  format: "google" | "pin-first" = "google",
): Promise<EditorQaLoopResult> {
  let degraded = false
  let currentDraft = draft
  let currentAudit = initialAudit
  let humanizationPass = 0
  let qaFixApplied = false
  let finalRecipe: RecipeDraft = draft

  // ── Step 7: Editor loop (max 3 passes for google, 2 for pin-first) ─────
  const effectiveMaxPasses = format === "pin-first" ? 2 : MAX_EDITOR_PASSES
  while (humanizationPass < effectiveMaxPasses) {
    if (currentAudit.decision === "PASS") {
      await appendLog(recipeId, logEntry("Editor Loop", "done",
        `PASS after ${humanizationPass} pass${humanizationPass !== 1 ? "es" : ""} — audit approved, content ready`))
      break
    }
    humanizationPass++

    // Log WHY the loop continues
    const reason = currentAudit.scores.signature_llm >= 30
      ? "structural fix + humanization needed"
      : currentAudit.decision === "MINOR_FIX"
        ? "minor corrections needed"
        : "structural revision needed"
    await appendLog(recipeId, logEntry("Editor Loop", "running",
      `Pass ${humanizationPass}/${effectiveMaxPasses}: decision="${currentAudit.decision}" LLM-sig=${currentAudit.scores.signature_llm}/100 — ${reason}`))

    try {
      finalRecipe = (await step.run(`agent-4-editor-pass-${humanizationPass}`, async () => {
        await appendLog(recipeId, logEntry("Editor", "running",
          `Pass ${humanizationPass}/${MAX_EDITOR_PASSES} — Correction${currentAudit.decision !== "PASS" && currentAudit.scores.signature_llm >= 30 ? " + anti-AI humanization" : ""}`))
        const corrected = await agentEditor(keyword, currentDraft, currentAudit, humanizationPass, format)
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
        const report = await agentAuditor(keyword, currentDraft, seoPlan.semanticEntities, format)
        await appendLog(recipeId, logEntry("Auditor", "done",
          `Readiness: ${report.publication_readiness_score}/100 | LLM Sig: ${report.scores.signature_llm}/100 | Decision: ${report.decision}`))
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

  // Log if max passes exhausted without PASS
  if (humanizationPass >= effectiveMaxPasses && currentAudit.decision !== "PASS") {
    await appendLog(recipeId, logEntry("Editor Loop", "error",
      `Max passes (${effectiveMaxPasses}) exhausted — best effort. Final audit: ${currentAudit.decision}, score: ${currentAudit.publication_readiness_score}/100`))
  }

  // Content integrity check
  if (!finalRecipe!.contentMarkdown || finalRecipe!.contentMarkdown.trim().length < 200) {
    await appendLog(recipeId, logEntry("Workflow", "error", "Final contentMarkdown is truncated or empty (< 200 chars)"))
    throw new Error("CONTENT_TRUNCATED: Final contentMarkdown is too short after editorial loop.")
  }

  // ── Deterministic Pre-Checks (before QA LLM call) ──────────────────────
  // Catch issues that don't need LLM reasoning, so QA can focus on
  // cross-agent semantic verification. 0ms cost, 0 tokens.
  const preCheckIssues: string[] = []
  const preMd = finalRecipe!.contentMarkdown ?? ""

  const wc = preMd.split(/\s+/).filter(Boolean).length
  if (wc < 800) {
    preCheckIssues.push(`Word count: ${wc} (minimum 800)`)
  } else if (wc < 1200) {
    preCheckIssues.push(`Word count: ${wc} below target 1200+`)
  }

  const faqMatches = preMd.match(/\*\*(.+?\?)\*\*/g)
  const faqCount = faqMatches?.length ?? 0
  const requiredFaq = format === "pin-first" ? 3 : 5
  if (faqCount < requiredFaq) {
    preCheckIssues.push(`FAQ count: ${faqCount} (need ${requiredFaq} for ${format} format)`)
  }

  const h2Headings = preMd.match(/^##\s+(.+)/gm) ?? []
  const requiredSections = format === "pin-first"
    ? ["ingredients", "instructions"]
    : ["why this works", "ingredients", "instructions", "tips", "faq"]
  for (const section of requiredSections) {
    if (!h2Headings.some(h => h.toLowerCase().includes(section))) {
      preCheckIssues.push(`Missing required section: "${section}"`)
    }
  }

  if (finalRecipe!.metaTitle && finalRecipe!.metaTitle.length > 60) {
    preCheckIssues.push(`Meta title ${finalRecipe!.metaTitle.length} chars (max 60)`)
  }

  if (preCheckIssues.length > 0) {
    await appendLog(recipeId, logEntry("QA Pre-Check", "error",
      `Deterministic issues (${preCheckIssues.length}): ${preCheckIssues.join("; ")}`))
  }

  // ── Step 7.5: QA ──────────────────────────────────────────────────────
  let qaReport: QAReport
  try {
    qaReport = (await step.run("agent-5-qa", async () => {
      await appendLog(recipeId, logEntry("QA", "running", "Cross-agent verification — 5 checks"))
      const report = await agentQA(keyword, seoPlan, draft, currentAudit, finalRecipe!, format)
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
          decision: "MAJOR_REWRITE" as const,
          critical_issues: [
            ...currentAudit.critical_issues,
            { criterion: "qa", issue: qaIssues || "QA flagged issues requiring fix" },
          ],
        }
        return await agentEditor(keyword, finalRecipe!, qaAudit, humanizationPass, format)
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
        return await agentQA(keyword, seoPlan, draft, currentAudit, finalRecipe!, format)
      })) as QAReport
    } catch {
      degraded = true
      await appendLog(recipeId, logEntry("QA", "error", "QA re-check failed — continuing with previous verdict"))
    }

    // Writer retry on REJECT/CRITICAL
    // The Editor can patch surface issues, but structural problems (wrong H2s,
    // banned vocabulary, missing sections) require a fresh Writer pass.
    // Signal the orchestrator to re-run the Writer + Auditor + Editor loop.
    if (qaReport.verdict === "REJECT" || qaReport.verdict === "CRITICAL") {
      await appendLog(recipeId, logEntry("Workflow", "error",
        `QA ${qaReport.verdict} — signalling Writer retry. ${qaReport.summary}`))
      return { finalRecipe: finalRecipe!, qaReport, humanizationPass, degraded, needsRewrite: true }
    }
  }

  return { finalRecipe: finalRecipe!, qaReport, humanizationPass, degraded }
}
