import { db } from "@/lib/db"
import {
  recipes,
  selfImprovementLogs,
  imageVariantStats,
  type ImageVariant,
  type NewSelfImprovementLog,
  type WorkflowLogEntry,
} from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { slugify } from "@/lib/slug"
import { getCalibrationStats, logPipelineError } from "@/lib/queries"
import { fetchSerp, type SerpResult } from "@/lib/agents/serp"
import { runImage } from "@/lib/agents/cloudflare"
import { uploadImage } from "@/lib/agents/cloudinary"
import { inngest } from "@/lib/inngest/client"
import { agentImagePromptOptimizer } from "./agents/image-prompt-optimizer"
import { agentStrategist, agentStrategistV2 } from "./agents/strategist"
import { structureSerpData } from "@/lib/agents/serp-structurer"
import { agentWriter } from "./agents/writer"
import type { RecipeDraft } from "./agents/writer"
import { agentAuditor, type AuditReport } from "./agents/auditor"
import { agentEditor, MAX_HUMANIZATION_PASSES } from "./agents/editor"
import { agentQA, type QAReport } from "./agents/qa"
import { agentAorWriter } from "./agents/aor-writer"
import type { AorCategory } from "./agents/aor-writer"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function appendLog(recipeId: number, entry: WorkflowLogEntry) {
  // Atomic append via PostgreSQL jsonb concatenation.
  // Prevents duplicate logs on Inngest step retry (the SELECT→spread→UPDATE
  // pattern is not atomic and would duplicate the "running" entry on replay).
  await db
    .update(recipes)
    .set({
      workflowLog: sql`COALESCE(workflow_log, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, recipeId))
}

function logEntry(
  agent: string,
  status: WorkflowLogEntry["status"],
  message: string,
): WorkflowLogEntry {
  return { agent, status, message, at: new Date().toISOString() }
}

/**
 * Generates synthetic "People Also Ask" questions when Serper returns no PAA.
 *
 * Uses keyword-derived templates covering the 5 most common PAA patterns:
 * method, ingredients, health/nutrition, storage/shelf-life, and technique.
 */
export function generateSyntheticPAA(keyword: string): string[] {
  const q = keyword.trim()
  // Normalize: lowercase first letter for mid-sentence embedding
  const lc = q.charAt(0).toLowerCase() + q.slice(1)

  return [
    `How to make ${lc}?`,
    `What ingredients are needed for ${lc}?`,
    `Is ${lc} healthy?`,
    `Can you freeze ${lc}?`,
    `How long does ${lc} last in the fridge?`,
    `What to serve with ${lc}?`,
    `Common mistakes when making ${lc}?`,
    `How to store ${lc} properly?`,
  ]
}

/**
 * Checks whether an error is transient and should be retried by Inngest
 * rather than triggering the step-level fallback.
 */
function isRecoverableError(err: Error): boolean {
  const msg = err.message
  return (
    msg.includes("No JSON object") ||
    msg.includes("Failed to parse JSON") ||
    msg.includes("aborted") ||
    msg.includes("returned no response") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("403") ||
    msg.includes("408") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  )
}

/** Criterion names matching the Auditor v5.1 skill (8 criteria). */
const SYNTHETIC_CRITERION_NAMES = [
  "EXPERIENCE — First-Hand Familiarity",
  "EXPERTISE — Depth & Accuracy",
  "AUTHORITATIVENESS — Source Quality & Citations",
  "TRUSTWORTHINESS — Verifiability & Accuracy",
  "SEO / GEO OPTIMIZATION",
  "READABILITY & STRUCTURE",
  "ANTI-AI-SLOP DETECTION",
  "VOICE CONSISTENCY — ADAPTIVE v5.1",
]

function buildSyntheticAuditReport(): AuditReport {
  return {
    overallScore: 60,
    verdict: "OK",
    score_ia_estimation: 50,
    factual_corrections: [],
    summary: "Auditor unavailable — auto-pass with default scores.",
    criteria: SYNTHETIC_CRITERION_NAMES.map((name) => ({
      name,
      score: 12,
      issues: [],
      recommendation: "Auditor unavailable — auto-pass",
    })),
  }
}

function buildSyntheticQAReport(): QAReport {
  return {
    qaScore: 70,
    verdict: "PASS",
    summary: "QA skipped — Editor output accepted without cross-agent verification.",
    checks: [],
  }
}

/** Deterministic image prompt fallback — no LLM call needed. */
function buildFallbackImagePrompt(title: string, tags: string[]): string {
  const dish = title || "the dish"
  const cuisine = tags[1] || tags[0] || ""
  const cuisineSuffix = cuisine ? `, ${cuisine} cuisine` : ""
  return [
    `Professional food photography of ${dish}${cuisineSuffix}.`,
    "Overhead shot on rustic wooden table, natural window light,",
    "styled with fresh herbs and ingredients.",
    "4K, shallow depth of field, warm color grading.",
  ].join(" ")
}

// ---------------------------------------------------------------------------
// Inngest function — multi-agent workflow with Human-in-the-Loop
// ---------------------------------------------------------------------------

export const generateRecipeWorkflow = inngest.createFunction(
  {
    id: "generate-recipe",
    triggers: [{ event: "recipe/generate" }],
    concurrency: {
      key: "generate-recipe-active",
      limit: 3,
    },
    throttle: {
      key: "recipe-generation-throttle",
      limit: 2,
      period: "1m",
    },
    retries: 3,
    cancelOn: [
      {
        event: "recipe/cancel",
        match: "data.recipeId",
      },
    ],
  },
  async ({ event, step }) => {
    const { recipeId, keyword, aorCategory, aorAngle } = event.data as {
      recipeId: number
      keyword: string
      aorCategory?: string
      aorAngle?: string
    }

    let degraded = false

    try {
      // =====================================================================
      // Step 1 — SERP Analysis (Critical — no fallback)
      // =====================================================================
      try {
        await step.run("analyze-serp", async () => {
        await appendLog(
          recipeId,
          logEntry("SERP", "running", `Google analysis for "${keyword}"`),
        )
        const result = await fetchSerp(keyword)

        await db
          .update(recipes)
          .set({ serpData: result as unknown as Record<string, unknown> })
          .where(eq(recipes.id, recipeId))

        await appendLog(
          recipeId,
          logEntry(
            "SERP",
            "done",
            `${result.organic.length} results, ${result.relatedQuestions.length} frequently asked questions`,
          ),
        )
      })
    } catch (err) {
      if (!isRecoverableError(err as Error)) {
        await logPipelineError({
          recipeId, stepName: "analyze-serp",
          errorType: "llm_unavailable", message: (err as Error).message,
          severity: "critical",
        })
      }
      throw err // critical — always re-throw
    }
    await step.sleep("sleep-after-serp", "2s")

      // =====================================================================
      // Step 1.5 — Agent 0: SERP Data Structurer (deterministic, no LLM)
      // =====================================================================
      let structuredSerp: Awaited<ReturnType<typeof structureSerpData>>
      try {
        structuredSerp = await step.run("structure-serp-data", async () => {
          const [row] = await db
            .select({ serpData: recipes.serpData })
            .from(recipes)
            .where(eq(recipes.id, recipeId))

          const serp = row?.serpData as SerpResult | undefined
          if (!serp) {
            throw new Error("SERP data not found — workflow may be corrupted.")
          }

          // PAA Fallback
          if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
            const syntheticPAA = generateSyntheticPAA(keyword)
            serp.relatedQuestions = syntheticPAA.map((q) => ({
              question: q,
              snippet: undefined,
              sourceUrl: undefined,
            }))
            await appendLog(
              recipeId,
              logEntry("SERP", "error",
                `No PAA questions — using ${syntheticPAA.length} synthetic PAA fallbacks`),
            )
          }

          await appendLog(
            recipeId,
            logEntry("SERP Structurer", "running",
              `Structuring SERP data — ${serp.organic.length} competitors, ${serp.relatedQuestions.length} questions`),
          )

          const result = structureSerpData(keyword, serp, {
            niche: "recipe",
            audience: "home cooks",
            contentGoal: "organic SEO",
          })

          await appendLog(
            recipeId,
            logEntry("SERP Structurer", "done",
              `${result.normalized_competitors.length} competitors, ${result.user_questions.length} questions, ${result.content_opportunities.length} opportunities, ${result.risks.length} risks`),
          )

          return result
        })
      } catch (err) {
        if (isRecoverableError(err as Error)) throw err
        await logPipelineError({
          recipeId, stepName: "structure-serp-data",
          errorType: "unknown", message: (err as Error).message,
          severity: "warning",
        })
        degraded = true
        // Build minimal StructuredSerp from raw SERP data
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
        await appendLog(recipeId, logEntry(
          "SERP Structurer", "error",
          `Degraded — using synthetic data (${structuredSerp.normalized_competitors.length} competitors, ${structuredSerp.user_questions.length} questions)`,
        ))
      }
      await step.sleep("sleep-after-structurer", "1s")

      // =====================================================================
      // Step 2 — Agent 1: SEO Strategist (V2 — pre-structured SERP) (Critical — no fallback)
      // =====================================================================
      let seoPlan: Awaited<ReturnType<typeof agentStrategistV2>>
      try {
        seoPlan = await step.run("agent-1-strategist", async () => {
        // Load past lessons with full context for relevance filtering.
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

        // Build context-rich lessons for the Strategist
        // Different formatting depending on source and criterion type
        const improvements = pastLogs.map((l) => {
          const sourceLabel = l.source === "qa" ? "[QA]" : l.source === "strategist" ? "[Plan]" : ""
          const scoreLabel = l.criterion === "ai_score"
            ? `AI detection: ${l.score}/100`
            : l.criterion === "qa_verdict"
              ? `QA verdict: ${l.score}/100`
              : `${l.criterion}: ${l.score}/20`
          return `${sourceLabel}[From "${l.keyword}" | ${scoreLabel}] ${l.recommendation}`
        })

        // Load calibration stats and inject them as context for the Strategist
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

        await appendLog(
          recipeId,
          logEntry(
            "SEO Strategist",
            "running",
            `SERP analysis + ${improvements.length} past lessons + calibration data → editorial plan`,
          ),
        )
        const plan = await agentStrategistV2(keyword, structuredSerp, improvements)
        await appendLog(
          recipeId,
          logEntry(
            "SEO Strategist",
            "done",
            `Editorial plan: ${plan.h2Sections.length} H2 sections, ${plan.semanticEntities.length} semantic entities`,
          ),
        )
        return plan
      })
    } catch (err) {
      if (!isRecoverableError(err as Error)) {
        await logPipelineError({
          recipeId, stepName: "agent-1-strategist",
          errorType: "llm_unavailable", message: (err as Error).message,
          severity: "critical",
        })
      }
      throw err
    }
    await step.sleep("sleep-after-strategist", "25s")

      // =====================================================================
      // Step 3 — Agent 2: Writer (Chef Augustin Lefèvre) (Critical — no fallback)
      // =====================================================================
      let draft: RecipeDraft
      try {
        draft = await step.run("agent-2-writer", async () => {
        await appendLog(
          recipeId,
          logEntry("Writer", "running", "Writing as Chef Augustin Lefèvre"),
        )
        const result = await agentWriter(keyword, seoPlan)
        await appendLog(
          recipeId,
          logEntry(
            "Writer",
            "done",
            `Article "${result.title}" written — ${result.ingredients.length} ingredients, ${result.instructions.length} steps`,
          ),
        )
        return result
      })
    } catch (err) {
      if (!isRecoverableError(err as Error)) {
        await logPipelineError({
          recipeId, stepName: "agent-2-writer",
          errorType: "llm_unavailable", message: (err as Error).message,
          severity: "critical",
        })
      }
      throw err
    }
    await step.sleep("sleep-after-writer", "25s")

      // =====================================================================
      // Step 4 — Agent 3: Auditor (7 criteria + AI score)
      // =====================================================================
      let audit: AuditReport
      try {
        audit = await step.run("agent-3-auditor", async () => {
        await appendLog(
          recipeId,
          logEntry("Auditor", "running", "7-criteria evaluation + anti-AI score"),
        )
        const report = await agentAuditor(keyword, draft, seoPlan.semanticEntities)
        await appendLog(
          recipeId,
          logEntry(
            "Auditor",
            "done",
            `Score: ${report.overallScore}/100 | AI: ${report.score_ia_estimation}/100 | Verdict: ${report.verdict}`,
          ),
        )
        return report
      })
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      await logPipelineError({
        recipeId, stepName: "agent-3-auditor",
        errorType: "llm_unavailable", message: (err as Error).message,
        severity: "degraded",
      })
      degraded = true
      audit = buildSyntheticAuditReport()
      await appendLog(recipeId, logEntry(
        "Auditor", "error",
        `Degraded — using synthetic audit (score: ${audit.overallScore}/100)`,
      ))
    }
    await step.sleep("sleep-after-auditor", "2s")

      // =====================================================================
      // Step 5 — Persist draft for human review
      // =====================================================================
      await step.run("persist-draft-for-review", async () => {
        await db
          .update(recipes)
          .set({
            title: draft.title,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            excerpt: draft.excerpt,
            contentMarkdown: draft.contentMarkdown,
            prepTime: draft.prepTime,
            cookTime: draft.cookTime,
            totalTime: draft.totalTime,
            servings: draft.servings,
            difficulty: draft.difficulty,
            ingredients: draft.ingredients,
            instructions: draft.instructions,
            tags: draft.tags,
            status: "draft_review",
            updatedAt: new Date(),
          })
          .where(eq(recipes.id, recipeId))

        await appendLog(
          recipeId,
          logEntry(
            "Human Review",
            "running",
            `Awaiting approval — audit score: ${audit.overallScore}/100 | AI: ${audit.score_ia_estimation}/100 | Verdict: ${audit.verdict}`,
          ),
        )
      })
      await step.sleep("sleep-after-persist-review", "2s")

      // =====================================================================
      // Step 6 — Wait for human approval (up to 7 days)
      // AUTO_APPROVE=true bypasses this step for E2E testing / CI.
      // NOTE: appendLog must be inside step.run() — Inngest replays code
      // outside step.run() on every function resume, causing duplicate logs.
      // =====================================================================
      const autoApprove = process.env.AUTO_APPROVE === "true"

      if (!autoApprove) {
        const approval = await step.waitForEvent("wait-for-approval", {
          event: "recipe/approved",
          timeout: "7d",
          if: `event.data.recipeId == ${recipeId}`,
        })

        if (!approval) {
          await step.run("log-approval-expired", async () => {
            await db
              .update(recipes)
              .set({ status: "expired", updatedAt: new Date() })
              .where(eq(recipes.id, recipeId))
            await appendLog(
              recipeId,
              logEntry(
                "Human Review",
                "error",
                "7-day approval window expired — recipe expired",
              ),
            )
          })
          throw new Error("APPROVAL_TIMEOUT")
        }

        await step.run("log-approval-granted", async () => {
          await appendLog(
            recipeId,
            logEntry(
              "Human Review",
              "done",
              "Recipe approved — launching final editing",
            ),
          )
        })
      } else {
        await step.run("log-auto-approve", async () => {
          await appendLog(
            recipeId,
            logEntry(
              "Human Review",
              "done",
              "Auto-approved (AUTO_APPROVE=true) — launching final editing",
            ),
          )
        })
      }
      await step.sleep("sleep-after-approval", "30s")

      // =====================================================================
      // Step 7 — Agent 4: Editor with feedback loop (max 3 passes)
      // =====================================================================
      let currentDraft = draft
      let currentAudit = audit
      let humanizationPass = 0
      let finalRecipe: RecipeDraft

      while (humanizationPass < MAX_HUMANIZATION_PASSES) {
        // If the previous iteration's re-audit already showed OK, stop.
        // (The first iteration always runs because humanizationPass starts at 0.)
        if (currentAudit.verdict === "OK") break

        humanizationPass++

        try {
          finalRecipe = await step.run(
            `agent-4-editor-pass-${humanizationPass}`,
            async () => {
              await appendLog(
                recipeId,
                logEntry(
                  "Editor",
                  "running",
                  `Pass ${humanizationPass}/${MAX_HUMANIZATION_PASSES} — Correction${currentAudit.verdict === "NEEDS REVISION" && currentAudit.score_ia_estimation >= 20 ? " + anti-AI humanization" : ""}`,
                ),
              )
              const corrected = await agentEditor(
                keyword,
                currentDraft,
                currentAudit,
                humanizationPass,
              )
              await appendLog(
                recipeId,
                logEntry(
                  "Editor",
                  "done",
                  `Pass ${humanizationPass} complete — ${corrected.changes_summary}`,
                ),
              )
              return corrected
            },
          )
        } catch (err) {
          if (isRecoverableError(err as Error)) throw err
          await logPipelineError({
            recipeId, stepName: `agent-4-editor-pass-${humanizationPass}`,
            errorType: "llm_unavailable", message: (err as Error).message,
            severity: "degraded",
          })
          degraded = true
          finalRecipe = currentDraft // keep current draft as-is
          await appendLog(recipeId, logEntry(
            "Editor", "error",
            `Degraded — Editor unavailable, keeping current draft`,
          ))
          break // exit the while loop
        }
        await step.sleep("sleep-after-editor-pass", "2s")

        // Re-audit the corrected draft for the next iteration
        currentDraft = finalRecipe!
        try {
          currentAudit = await step.run(
            `agent-3-re-audit-pass-${humanizationPass}`,
            async () => {
              await appendLog(
                recipeId,
                logEntry(
                  "Auditor",
                  "running",
                  `Re-evaluation after pass ${humanizationPass}`,
                ),
              )
              const report = await agentAuditor(
                keyword,
                currentDraft,
                seoPlan.semanticEntities,
              )
              await appendLog(
                recipeId,
                logEntry(
                  "Auditor",
                  "done",
                  `Score: ${report.overallScore}/100 | AI: ${report.score_ia_estimation}/100 | Verdict: ${report.verdict}`,
                ),
              )
              return report
            },
          )
        } catch (err) {
          if (isRecoverableError(err as Error)) throw err
          await logPipelineError({
            recipeId, stepName: `agent-3-re-audit-pass-${humanizationPass}`,
            errorType: "llm_unavailable", message: (err as Error).message,
            severity: "degraded",
          })
          degraded = true
          currentAudit = buildSyntheticAuditReport()
          await appendLog(recipeId, logEntry(
            "Auditor", "error",
            `Degraded — re-audit unavailable, using synthetic audit`,
          ))
          break
        }
        await step.sleep("sleep-after-re-audit", "2s")
      }

      // If the loop never ran (verdict was OK from the start), use the
      // original draft as the final recipe — no editing was needed.
      if (!finalRecipe!) {
        finalRecipe = draft
      }

      // Post-loop content integrity check — ensure the final content is not
      // truncated or empty (can happen when the LLM token limit is reached).
      if (!finalRecipe!.contentMarkdown || finalRecipe!.contentMarkdown.trim().length < 200) {
        await appendLog(
          recipeId,
          logEntry("Workflow", "error", "Final contentMarkdown is truncated or empty (< 200 chars)"),
        )
        throw new Error("CONTENT_TRUNCATED: Final contentMarkdown is too short after editorial loop.")
      }

      // =====================================================================
      // Step 7.5 — Agent 5: QA (cross-agent verification)
      // =====================================================================
      let qaReport: QAReport
      try {
        qaReport = await step.run("agent-5-qa", async () => {
        await appendLog(
          recipeId,
          logEntry("QA", "running", "Cross-agent verification — 5 checks (factual, voice, structure, JSON, anti-regression)"),
        )
        // `draft` still holds the original Writer output (never reassigned)
        const report = await agentQA(
          keyword,
          seoPlan,
          draft,
          currentAudit,
          finalRecipe!,
        )
        await appendLog(
          recipeId,
          logEntry(
            "QA",
            report.verdict === "PASS" ? "done" : "error",
            `QA Score: ${report.qaScore}/100 | Verdict: ${report.verdict} | ${report.summary}`,
          ),
        )
        return report
      })
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      await logPipelineError({
        recipeId, stepName: "agent-5-qa",
        errorType: "llm_unavailable", message: (err as Error).message,
        severity: "degraded",
      })
      degraded = true
      qaReport = buildSyntheticQAReport()
      await appendLog(recipeId, logEntry(
        "QA", "error",
        `Degraded — QA unavailable, accepting Editor output`,
      ))
    }
    await step.sleep("sleep-after-qa", "2s")

      // QA-NEEDS_FIX feedback loop — max 1 extra Editor pass if QA flags issues
      if (qaReport.verdict === "NEEDS_FIX" && humanizationPass < MAX_HUMANIZATION_PASSES) {
        humanizationPass++
        const qaIssues = qaReport.checks
          .filter((c) => c.status !== "PASS")
          .flatMap((c) => c.issues)
          .join("; ")

        let qaFixedDraft: RecipeDraft | null = null
        try {
          qaFixedDraft = await step.run(
            `agent-4-editor-qa-fix`,
            async () => {
              await appendLog(
                recipeId,
                logEntry(
                  "Editor",
                  "running",
                  `QA fix pass — ${qaIssues.substring(0, 120)}`,
                ),
              )
              // Build a synthetic audit that carries the QA issues as recommendations
              const qaAudit: typeof currentAudit = {
                ...currentAudit,
                verdict: "NEEDS REVISION" as const,
                criteria: currentAudit.criteria.map((c) => ({
                  ...c,
                  issues: qaIssues ? [...c.issues, qaIssues] : c.issues,
                })),
              }
              const corrected = await agentEditor(
                keyword,
                finalRecipe!,
                qaAudit,
                humanizationPass,
              )
              await appendLog(
                recipeId,
                logEntry("Editor", "done", `QA fix pass complete — ${corrected.changes_summary}`),
              )
              return corrected
            },
          )
        } catch (err) {
          if (isRecoverableError(err as Error)) throw err
          await logPipelineError({
            recipeId, stepName: "agent-4-editor-qa-fix",
            errorType: "llm_unavailable", message: (err as Error).message,
            severity: "degraded",
          })
          degraded = true
          await appendLog(recipeId, logEntry(
            "Editor", "error",
            `Degraded — QA fix LLM call failed, continuing with pre-fix recipe`,
          ))
        }
        await step.sleep("sleep-after-editor-qa-fix", "2s")

        if (qaFixedDraft) {
          finalRecipe = qaFixedDraft
        }

        // Re-run QA to verify the fix.
        // NOTE: `currentAudit` is the last audit from the Editor loop — it audited
        // the Editor's output, not the QA-fixed draft. A full re-audit would cost
        // an extra LLM call. Trade-off: accept potential false positives from stale
        // audit data; the QA REJECT/CRITICAL after re-check proceeds with warnings
        // (soft failure) rather than a hard stop.
        let qaReReport: QAReport | null = null
        try {
          qaReReport = await step.run("agent-5-qa-recheck", async () => {
            const report = await agentQA(
              keyword,
              seoPlan,
              draft,
              currentAudit,
              finalRecipe!,
            )
            await appendLog(
              recipeId,
              logEntry(
                "QA",
                report.verdict === "PASS" ? "done" : "error",
                `QA Re-check: ${report.qaScore}/100 | Verdict: ${report.verdict} | ${report.summary}`,
              ),
            )
            return report
          })
        } catch (err) {
          if (isRecoverableError(err as Error)) throw err
          await logPipelineError({
            recipeId, stepName: "agent-5-qa-recheck",
            errorType: "llm_unavailable", message: (err as Error).message,
            severity: "degraded",
          })
          degraded = true
          await appendLog(recipeId, logEntry(
            "QA", "error",
            `Degraded — QA re-check LLM call failed, proceeding with pre-fix recipe`,
          ))
        }
        await step.sleep("sleep-after-qa-recheck", "2s")

        if (qaReReport && (qaReReport.verdict === "REJECT" || qaReReport.verdict === "CRITICAL")) {
          await appendLog(
            recipeId,
            logEntry(
              "QA",
              "error",
              `QA ${qaReReport.verdict} after fix attempt — proceeding with warnings. Issues: ${qaReReport.summary}`,
            ),
          )
        }
      } else if (qaReport.verdict === "REJECT" || qaReport.verdict === "CRITICAL") {
        await appendLog(
          recipeId,
          logEntry(
            "QA",
            "error",
            `QA ${qaReport.verdict} — HARD STOP. ${qaReport.summary}`,
          ),
        )
        throw new Error(
          `QA_${qaReport.verdict}: ${qaReport.summary}`,
        )
      }

      // =====================================================================
      // Step 8 — Image Prompt Optimizer (LLM + food-photography skill)
      // =====================================================================
      let safeImagePrompt: string
      try {
        safeImagePrompt = await step.run("optimize-image-prompt", async () => {
        const optimized = await agentImagePromptOptimizer({
          title: finalRecipe!.title,
          tags: finalRecipe!.tags,
          difficulty: finalRecipe!.difficulty,
          ingredients: finalRecipe!.ingredients,
          keyword,
          imagePrompt: finalRecipe!.imagePrompt,
        })
        const isFallback = !finalRecipe!.imagePrompt?.trim()
        await appendLog(
          recipeId,
          logEntry(
            "Image Prompt",
            "done",
            isFallback
              ? "⚠️ Writer prompt empty — prompt generated via LLM from recipe data"
              : `LLM-optimized prompt (${optimized.length} chars)`,
          ),
        )
        return optimized
      })
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      await logPipelineError({
        recipeId, stepName: "optimize-image-prompt",
        errorType: "llm_unavailable", message: (err as Error).message,
        severity: "degraded",
      })
      degraded = true
      safeImagePrompt = buildFallbackImagePrompt(finalRecipe!.title, finalRecipe!.tags)
      await appendLog(recipeId, logEntry(
        "Image Prompt", "error",
        `Degraded — deterministic fallback prompt (${safeImagePrompt.length} chars)`,
      ))
    }
    await step.sleep("sleep-after-image-optimizer", "1s")

      // =====================================================================
      // Step 9 — Image generation + Cloudinary upload (multi-variant)
      // =====================================================================
      const variantCount = Math.min(
        parseInt(process.env.IMAGE_VARIANT_COUNT ?? "2", 10),
        3,
      )

      const imageVariants: ImageVariant[] = await step.run(
        "generate-and-upload-images",
        async () => {
          const variants: ImageVariant[] = []

          for (let v = 0; v < variantCount; v++) {
            const label = String.fromCharCode(65 + v) // A, B, C
            try {
              // Vary the prompt slightly per variant to produce distinct compositions
              const variantPrompt =
                v === 0
                  ? safeImagePrompt
                  : v === 1
                    ? safeImagePrompt.replace(
                        /overhead top-down|bird's eye|flat lay/gi,
                        "45-degree angle hero shot with a spoon lifting a portion",
                      )
                    : safeImagePrompt.replace(
                        /overhead top-down|bird's eye view/gi,
                        "close-up detail shot focusing on texture and steam",
                      )

              await appendLog(
                recipeId,
                logEntry("Image", "running", `Generating variant ${label}`),
              )
              const buf = await runImage(variantPrompt)
              const url = await uploadImage(
                buf,
                `recipe-${recipeId}-${slugify(keyword)}-${label.toLowerCase()}`,
              )
              variants.push({ label, url, prompt: variantPrompt })
              await appendLog(
                recipeId,
                logEntry("Image", "done", `Variant ${label} uploaded to Cloudinary`),
              )
            } catch (imgErr) {
              await appendLog(
                recipeId,
                logEntry(
                  "Image",
                  "error",
                  `Variant ${label} failed: ${(imgErr as Error).message}`,
                ),
              )
              // Continue to next variant — don't fail the whole batch
            }
          }

          return variants
        },
      )
      await step.sleep("sleep-after-images", "3s")

      // First successful variant becomes heroImageUrl; others are tracked for A/B
      const heroImageUrl: string | null =
        imageVariants.length > 0 ? imageVariants[0].url : null

      // =====================================================================
      // Step 10 — Self-Improvement: closed feedback loop
      // =====================================================================
      try {
        await step.run("self-improvement", async () => {
        const tagList = finalRecipe!.tags ?? []

        // 1. Auditor criteria scoring below threshold (existing behavior, now with source)
        const lessons: NewSelfImprovementLog[] = currentAudit.criteria
          .filter((c) => c.score < 16)
          .map((c) => ({
            keyword,
            criterion: c.name,
            score: String(c.score),
            recommendation: c.recommendation,
            tags: tagList,
            source: "auditor",
          }))

        // 2. AI Score tracking — store the final AI estimation for trend analysis
        if (currentAudit.score_ia_estimation != null) {
          lessons.push({
            keyword,
            criterion: "ai_score",
            score: String(currentAudit.score_ia_estimation),
            recommendation:
              currentAudit.score_ia_estimation < 20
                ? "AI detection score below 20 — anti-AI techniques working well for this recipe type."
                : currentAudit.score_ia_estimation < 40
                  ? `AI score ${currentAudit.score_ia_estimation}/100 — moderate risk. Review burstiness and sentence variety.`
                  : `AI score ${currentAudit.score_ia_estimation}/100 — high detection risk. Escalate humanization passes and reduce predictable transitions.`,
            tags: tagList,
            source: "auditor",
          })
        }

        // 3. QA findings — close the feedback loop with cross-agent verification
        if (qaReport.verdict !== "PASS") {
          const qaIssues = qaReport.checks
            .filter((c) => c.status !== "PASS")
            .map((c) =>
              `[${c.name}] ${c.status}: ${(c.issues ?? []).join("; ") || "no specific issues"}`
            )
            .join(" | ")

          lessons.push({
            keyword,
            criterion: "qa_verdict",
            score: String(qaReport.qaScore),
            recommendation:
              `QA ${qaReport.verdict} (${qaReport.qaScore}/100): ${qaReport.summary} | Issues: ${qaIssues}`,
            tags: tagList,
            source: "qa",
          })
        }

        // 4. Persist all lessons in a single insert
        if (lessons.length > 0) {
          await db.insert(selfImprovementLogs).values(lessons)
        }

        const lessonSummary =
          lessons.length > 0
            ? lessons
                .map((l) => `${l.source}:${l.criterion}=${l.score}/20`)
                .join(", ")
            : "none"

        await appendLog(
          recipeId,
          logEntry(
            "Self-Improvement",
            "done",
            `${lessons.length} lessons saved (${lessonSummary}) | Final pass: ${humanizationPass} | AI Score: ${currentAudit.score_ia_estimation}/100 | QA: ${qaReport.verdict}`,
          ),
        )
      })
    } catch (err) {
      if (isRecoverableError(err as Error)) throw err
      await logPipelineError({
        recipeId, stepName: "self-improvement",
        errorType: "unknown", message: (err as Error).message,
        severity: "warning",
      })
      await appendLog(recipeId, logEntry(
        "Self-Improvement", "error",
        `Warning — self-improvement skipped: ${(err as Error).message}`,
      ))
      // Non-critical — continue without saving lessons
    }
    await step.sleep("sleep-after-self-improvement", "2s")

      // =====================================================================
      // Step 11 — Persist the finished draft in DB (Critical — no fallback)
      // =====================================================================
      try {
        await step.run("persist-draft-final", async () => {
        // -----------------------------------------------------------------
        // Programmatic SEO guards (v5.2) — enforce critical rules in code,
        // not just LLM instructions. These run on the final recipe output.
        // -----------------------------------------------------------------

        // 1. Meta title: enforce 50-60 chars (truncate on word boundary if needed)
        if (finalRecipe!.metaTitle && finalRecipe!.metaTitle.length > 60) {
          finalRecipe!.metaTitle =
            finalRecipe!.metaTitle.substring(0, 57).replace(/\s\S*$/, "") + "…"
        }

        // 2. Meta description: enforce 140-155 chars
        if (finalRecipe!.metaDescription && finalRecipe!.metaDescription.length > 155) {
          finalRecipe!.metaDescription =
            finalRecipe!.metaDescription.substring(0, 152).replace(/\s\S*$/, "") + "…"
        }

        // 3. Word count: warn if below minimum (soft enforcement — logged)
        const wordCount = (finalRecipe!.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
        if (wordCount < 1500) {
          await appendLog(
            recipeId,
            logEntry(
              "Workflow",
              "error",
              `Content length warning: ${wordCount} words (target: 1800-2200). Competitors average 1500-2400 words.`,
            ),
          )
        }

        // Parse FAQ items from markdown for FAQPage schema
        // Matches "**Question?**" followed by answer text (up to next blank line or bold)
        function parseFaqFromMarkdown(md: string): { question: string; answer: string }[] {
          const faq: { question: string; answer: string }[] = []
          // Split on bold questions, capture the answer text that follows
          const blocks = md.split(/\n\n+/)
          for (let i = 0; i < blocks.length; i++) {
            const qMatch = blocks[i].match(/^\*\*(.+?\?)\*\*$/)
            if (qMatch && i + 1 < blocks.length) {
              const answer = blocks[i + 1].replace(/\n/g, " ").trim()
              if (answer.length > 20 && !answer.startsWith("**")) {
                faq.push({ question: qMatch[1].trim(), answer })
              }
            }
          }
          return faq.slice(0, 5) // max 5 FAQ items
        }

        const faqItems = seoPlan.faqItems?.length
          ? seoPlan.faqItems
          : parseFaqFromMarkdown(finalRecipe!.contentMarkdown ?? "")

        // Build enriched JSON-LD @graph (v5.2 SEO pipeline)
        const now = new Date().toISOString()
        const recipeBase = {
          "@type": "Recipe",
          name: finalRecipe!.title,
          description: finalRecipe!.metaDescription || finalRecipe!.excerpt || undefined,
          author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: "https://lecarnetgourmand.fr/about" },
          prepTime: finalRecipe!.prepTime
            ? `PT${(finalRecipe!.prepTime.match(/\d+/) ?? ["0"])[0]}M`
            : "PT0M",
          cookTime: finalRecipe!.cookTime
            ? `PT${(finalRecipe!.cookTime.match(/\d+/) ?? ["0"])[0]}M`
            : "PT0M",
          totalTime: finalRecipe!.totalTime
            ? `PT${(finalRecipe!.totalTime.match(/\d+/) ?? ["0"])[0]}M`
            : "PT0M",
          recipeYield: finalRecipe!.servings ?? "4 servings",
          recipeCategory: finalRecipe!.tags?.[0] ?? "Main Course",
          recipeCuisine: finalRecipe!.tags?.[1] ?? "American",
          keywords: (finalRecipe!.tags ?? []).join(", "),
          recipeIngredient: (finalRecipe!.ingredients ?? []).map(
            (i) => `${i.quantity ? i.quantity + " " : ""}${i.name}`,
          ),
          recipeInstructions: (finalRecipe!.instructions ?? []).map((s, idx) => ({
            "@type": "HowToStep",
            position: idx + 1,
            text: s.text,
          })),
          ...(seoPlan.json_ld_recipe_base?.nutrition
            ? { nutrition: seoPlan.json_ld_recipe_base.nutrition }
            : {}),
        }

        const jsonLd = {
          "@context": "https://schema.org",
          "@graph": [
            recipeBase,
            {
              "@type": "BlogPosting",
              headline: finalRecipe!.title,
              description: finalRecipe!.metaDescription || finalRecipe!.excerpt || undefined,
              author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: "https://lecarnetgourmand.fr/about" },
              datePublished: now,
              dateModified: now,
              keywords: (finalRecipe!.tags ?? []).join(", "),
            },
            ...(faqItems.length > 0
              ? [{
                  "@type": "FAQPage" as const,
                  mainEntity: faqItems.map((f) => ({
                    "@type": "Question" as const,
                    name: f.question,
                    acceptedAnswer: {
                      "@type": "Answer" as const,
                      text: f.answer,
                    },
                  })),
                }]
              : []),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://lecarnetgourmand.fr/" },
                { "@type": "ListItem", position: 2, name: "Recipes", item: "https://lecarnetgourmand.fr/recettes" },
                { "@type": "ListItem", position: 3, name: finalRecipe!.title },
              ],
            },
          ],
        }

        // Differentiate meta title from H1 if identical (SEO best practice)
        let finalMetaTitle = finalRecipe!.metaTitle
        if (
          finalMetaTitle &&
          finalRecipe!.title &&
          finalMetaTitle.trim().toLowerCase() === finalRecipe!.title.trim().toLowerCase()
        ) {
          finalMetaTitle = `${finalRecipe!.title} – Chef Augustin Lefèvre's Recipe`
        }

        await db
          .update(recipes)
          .set({
            title: finalRecipe!.title,
            metaTitle: finalMetaTitle,
            metaDescription: finalRecipe!.metaDescription,
            excerpt: finalRecipe!.excerpt,
            contentMarkdown: finalRecipe!.contentMarkdown,
            prepTime: finalRecipe!.prepTime,
            cookTime: finalRecipe!.cookTime,
            totalTime: finalRecipe!.totalTime,
            servings: finalRecipe!.servings,
            difficulty: finalRecipe!.difficulty,
            ingredients: finalRecipe!.ingredients,
            instructions: finalRecipe!.instructions,
            tags: finalRecipe!.tags,
            heroImageUrl,
            imageVariants,
            jsonLd,
            status: degraded ? "degraded" : "draft",
            updatedAt: new Date(),
          })
          .where(eq(recipes.id, recipeId))

        await appendLog(
          recipeId,
          logEntry(
            "Workflow",
            "done",
            `Draft ready — ${humanizationPass} editorial pass(es) — ${imageVariants.length} image variant(s) — Final verdict: ${currentAudit.verdict} — AI Score: ${currentAudit.score_ia_estimation}/100`,
          ),
        )

        if (degraded) {
          await appendLog(
            recipeId,
            logEntry("Workflow", "error",
              "Pipeline completed in DEGRADED mode — some steps used fallbacks. Review manually before publishing."),
          )
        }
      })
    } catch (err) {
      if (!isRecoverableError(err as Error)) {
        await logPipelineError({
          recipeId, stepName: "persist-draft-final",
          errorType: "unknown", message: (err as Error).message,
          severity: "critical",
        })
      }
      throw err
    }

      // =====================================================================
      // Step 12 — Initialize A/B tracking for image variants
      // =====================================================================
      await step.run("init-variant-stats", async () => {
        if (imageVariants.length > 1) {
          const statsRows = imageVariants.map((_, idx) => ({
            recipeId,
            variantIndex: idx,
            impressions: 0,
            clicks: 0,
          }))
          await db.insert(imageVariantStats).values(statsRows)
          await appendLog(
            recipeId,
            logEntry(
              "A/B Testing",
              "done",
              `Tracking initialized for ${statsRows.length} image variants (${imageVariants.map(v => v.label).join(", ")})`,
            ),
          )
        }
      })
      await step.sleep("sleep-after-variant-stats", "1s")

      // =====================================================================
      // Step 13 — Agent 6: Aor Article (optionnel, warning — non-blocking)
      // =====================================================================
      if (aorCategory) {
        try {
          await step.run("agent-6-aor-article", async () => {
            await appendLog(
              recipeId,
              logEntry("Aor Writer", "running",
                `Generating ${aorCategory} article — angle: ${aorAngle || "auto-deduced"}`),
            )

            const validCategories: AorCategory[] = ["techniques", "guides", "histoire", "equipement"]
            const category = validCategories.includes(aorCategory as AorCategory)
              ? (aorCategory as AorCategory)
              : "techniques"

            // Fetch recipe slug from DB (not available on RecipeDraft type)
            const [recipeRow] = await db
              .select({ slug: recipes.slug })
              .from(recipes)
              .where(eq(recipes.id, recipeId))
            const recipeSlug = recipeRow?.slug || slugify(keyword)

            const recipeUrl = `https://lecarnetgourmand.fr/recettes/${recipeSlug}`

            const aorResult = await agentAorWriter({
              keyword,
              recipeTitle: finalRecipe!.title,
              recipeSlug,
              recipeUrl,
              seoPlan,
              serp: structuredSerp as Record<string, unknown>,
              aorCategory: category,
              aorAngle: aorAngle ?? null,
            })

            // Ensure unique slug within article namespace
            let articleSlug = slugify(aorResult.slug) || slugify(aorResult.title) || "article"
            const baseSlug = articleSlug
            let suffix = 0
            while (true) {
              const existing = await db.query.recipes.findFirst({
                where: (r, { eq, and }) =>
                  and(eq(r.slug, articleSlug), eq(r.content_type, "article")),
              })
              if (!existing) break
              suffix += 1
              articleSlug = `${baseSlug}-${suffix}`
            }

            // Generate hero image via existing pipeline infrastructure
            await appendLog(recipeId, logEntry("Aor Image", "running",
              "Optimizing image prompt for article angle"))
            const imagePrompt = await agentImagePromptOptimizer({
              title: aorResult.title,
              tags: aorResult.tags,
              keyword,
            })
            await appendLog(recipeId, logEntry("Aor Image", "running",
              "Generating article image via FLUX-1-Schnell"))
            const imageBuffer = await runImage(imagePrompt)
            const imageUrl = await uploadImage(imageBuffer, `article-${articleSlug}`)
            await appendLog(recipeId, logEntry("Aor Image", "done",
              "Article image uploaded to Cloudinary"))

            // Enrich JSON-LD with dynamic fields
            const now = new Date().toISOString()
            const enrichedJsonLd = {
              ...aorResult.jsonLd,
              "@graph": ((aorResult.jsonLd["@graph"] as Record<string, unknown>[]) ?? []).map(node => {
                if (node["@type"] === "Article") {
                  return {
                    ...node,
                    datePublished: now,
                    dateModified: now,
                    image: imageUrl,
                    mainEntityOfPage: `https://lecarnetgourmand.fr/${category}/${articleSlug}`,
                  }
                }
                return node
              }),
            }

            // Semantic Linker — inject contextual link into article body
            const linkPhrase = `Cette technique est magnifiquement illustrée dans [${aorResult.anchorText}](/${category === "equipement" ? "equipement" : category}/${aorResult.linkedRecipeSlug || recipeSlug}), où chaque détail compte.`
            const linkedContent = aorResult.contentMarkdown.replace(
              /\n\n(?=## )/,
              `\n\n${linkPhrase}\n\n`,
            )

            // Insert article into DB
            const [articleRow] = await db
              .insert(recipes)
              .values({
                slug: articleSlug,
                keyword,
                title: aorResult.title,
                metaTitle: aorResult.metaTitle,
                metaDescription: aorResult.metaDescription,
                contentMarkdown: linkedContent,
                excerpt: aorResult.excerpt,
                status: "draft",
                content_type: "article",
                category,
                linked_content_id: recipeId,
                heroImageUrl: imageUrl,
                tags: aorResult.tags,
                jsonLd: enrichedJsonLd,
                workflowLog: [],
              })
              .returning({ id: recipes.id })

            // Reverse link — add mention in the recipe pointing to the article
            if (articleRow?.id && finalRecipe) {
              const reverseLink = `\n\n### Pour Aller Plus Loin\n\nPour comprendre la science derrière cette recette, consultez [notre article : ${aorResult.title}](/articles/${articleSlug}).`
              const updatedRecipeContent = (finalRecipe.contentMarkdown ?? "") + reverseLink
              await db
                .update(recipes)
                .set({
                  contentMarkdown: updatedRecipeContent,
                  linked_content_id: articleRow.id,
                })
                .where(eq(recipes.id, recipeId))
            }

            await appendLog(recipeId, logEntry("Aor Writer", "done",
              `Article "${aorResult.title}" published — /${category}/${articleSlug} — linked to recipe #${recipeId}`))

            // Track in self-improvement loop
            await appendLog(recipeId, logEntry("Self-Improvement", "done",
              `Aor article saved: /${category}/${articleSlug}`))
          })
        } catch (err) {
          await logPipelineError({
            recipeId,
            stepName: "agent-6-aor-article",
            errorType: "unknown",
            message: (err as Error).message,
            severity: "warning",
          })
          await appendLog(recipeId, logEntry("Aor Writer", "error",
            `Aor article generation failed (non-blocking): ${(err as Error).message}`))
        }
      }
    } catch (err) {
      const [current] = await db
        .select({ status: recipes.status })
        .from(recipes)
        .where(eq(recipes.id, recipeId))

      if (
        current?.status !== "cancelled" &&
        current?.status !== "expired"
      ) {
        await appendLog(
          recipeId,
          logEntry("Workflow", "error", (err as Error).message),
        )
        await db
          .update(recipes)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(recipes.id, recipeId))
      }
      throw err
    }
  },
)