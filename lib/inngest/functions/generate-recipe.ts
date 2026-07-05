/**
 * generate-recipe workflow — Orchestrator
 *
 * Coordinates 13 pipeline steps delegated to specialized modules.
 * This file only sequences steps and manages cross-cutting concerns
 * (degraded flag, error propagation, logging).
 *
 * Step modules:
 *   serp-phase    → Steps 1 + 1.5  (SERP analysis + data structuring)
 *   agent-phase   → Steps 2 + 3 + 4 (Strategist + Writer + Auditor)
 *   persist-phase → Steps 5 + 6 + 10 + 11 + 12 (persist, approve, self-improve, final)
 *   editor-qa-loop → Steps 7 + 7.5  (Editor feedback loop + QA)
 *   image-phase   → Steps 8 + 9     (Image prompt + generation)
 *   pin-phase     → Step 11         (Pin Designer — 5 Pin drafts per recipe)
 *   aor-phase     → Step 13         (AOR article generation)
 */

import { db } from "@/lib/db"
import { recipes, type ImageVariant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logPipelineError } from "@/lib/queries"
import { inngest } from "@/lib/inngest/client"
import { agentWriter } from "./agents/writer"
import { agentAuditor } from "./agents/auditor"
import { runSerpPhase } from "./steps/serp-phase"
import { runAgentPhase } from "./steps/agent-phase"
import { persistDraftForReview, waitForApproval, runSelfImprovement, persistFinalDraft, initVariantStats } from "./steps/persist-phase"
import { runEditorQaLoop } from "./steps/editor-qa-loop"
import { runImagePhase } from "./steps/image-phase"
import { generateAorArticle } from "./steps/aor-phase"
import { generatePins } from "./steps/pin-phase"
import { appendLog, logEntry, isRecoverableError } from "./helpers"

export const generateRecipeWorkflow = inngest.createFunction(
  {
    id: "generate-recipe",
    triggers: [{ event: "recipe/generate" }],
    concurrency: { key: "generate-recipe-active", limit: 3 },
    throttle: { key: "recipe-generation-throttle", limit: 2, period: "1m" },
    retries: 3,
    cancelOn: [{ event: "recipe/cancel", match: "data.recipeId" }],
  },
  async ({ event, step }) => {
    const { recipeId, keyword, aorCategory, aorAngle, cuisine, cuisineIngredients, cuisineTechniques } = event.data as {
      recipeId: number; keyword: string; aorCategory?: string; aorAngle?: string;
      cuisine?: string; cuisineIngredients?: string; cuisineTechniques?: string;
    }

    const cuisineReplacements = {
      cuisine: cuisine || "Sourdough",
      cuisine_ingredients: cuisineIngredients || "bread flour, rye flour, whole wheat flour, sourdough starter, salt, water, olive oil, honey, butter",
      cuisine_techniques: cuisineTechniques || "autolyse, stretch and fold, coil fold, bulk fermentation, cold retard, bench rest, scoring, steam baking (dutch oven), lamination",
    }

    let degraded = false

    try {
      // ── Phase 1: SERP ─────────────────────────────────────────────────
      const serpResult = await runSerpPhase(step, recipeId, keyword)
      degraded = degraded || serpResult.degraded

      // ── Phase 2: Agents ───────────────────────────────────────────────
      const agentResult = await runAgentPhase(step, recipeId, keyword, serpResult.structuredSerp, cuisineReplacements)
      degraded = degraded || agentResult.degraded

      // ── Phase 3: Persist draft for review ─────────────────────────────
      await persistDraftForReview(step, recipeId, agentResult.draft, agentResult.audit)
      await step.sleep("sleep-after-persist-review", "2s")

      // ── Phase 4: Wait for approval ────────────────────────────────────
      await waitForApproval(step, recipeId)
      await step.sleep("sleep-after-approval", "30s")

      // ── Phase 5: Editor + QA loop ─────────────────────────────────────
      let editResult = await runEditorQaLoop(step, recipeId, keyword, agentResult.draft, agentResult.audit, agentResult.seoPlan)
      degraded = degraded || editResult.degraded

      // Writer retry: QA REJECT/CRITICAL means structural issues the Editor
      // can't fix. Re-run the Writer (fresh LLM sample) + Auditor + Editor loop.
      if (editResult.needsRewrite) {
        await step.run("agent-2-writer-retry", async () => {
          await appendLog(recipeId, logEntry("Writer", "running", "Retry — QA rejected content, regenerating from scratch"))
          const retryDraft = await agentWriter(keyword, agentResult.seoPlan, cuisineReplacements)
          await appendLog(recipeId, logEntry("Writer", "done", `Retry draft: "${retryDraft.title}"`))

          await appendLog(recipeId, logEntry("Auditor", "running", "Re-evaluating retry draft"))
          const retryAudit = await agentAuditor(keyword, retryDraft, agentResult.seoPlan.semanticEntities)
          await appendLog(recipeId, logEntry("Auditor", "done", `Retry score: ${retryAudit.overallScore}/100 | AI: ${retryAudit.score_ia_estimation}/100`))

          const retryEditResult = await runEditorQaLoop(step, recipeId, keyword, retryDraft, retryAudit, agentResult.seoPlan)
          degraded = degraded || retryEditResult.degraded

          if (retryEditResult.needsRewrite) {
            // Writer retry also failed — mark for human review, don't throw
            await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
            await appendLog(recipeId, logEntry("Workflow", "error", "Writer retry also rejected by QA — recipe set to draft for manual review"))
          } else {
            editResult = retryEditResult
          }
        })
      }

      // ── Phase 6: Images ───────────────────────────────────────────────
      const imageResult = await runImagePhase(step, recipeId, editResult.finalRecipe, keyword)
      degraded = degraded || imageResult.degraded

      // ── Phase 7: Self-improvement ─────────────────────────────────────
      try {
        await runSelfImprovement(step, recipeId, keyword, editResult.finalRecipe, agentResult.audit, editResult.qaReport, editResult.humanizationPass)
      } catch (err) {
        if (isRecoverableError(err as Error)) throw err
        await logPipelineError({ recipeId, stepName: "self-improvement", errorType: "unknown", message: (err as Error).message, severity: "warning" })
      }
      await step.sleep("sleep-after-self-improvement", "2s")

      // ── Phase 8: Final persist ────────────────────────────────────────
      await persistFinalDraft(step, recipeId, editResult.finalRecipe, agentResult.seoPlan, imageResult.heroImageUrl, imageResult.imageVariants as ImageVariant[], keyword)

      // ── Phase 9: A/B stats ────────────────────────────────────────────
      try {
        await initVariantStats(step, recipeId, imageResult.imageVariants as ImageVariant[])
      } catch (err) {
        await logPipelineError({ recipeId, stepName: "init-variant-stats", errorType: "unknown", message: (err as Error).message, severity: "warning" })
      }

      // ── Phase 11: Pin Designer ────────────────────────────────────────────
      await generatePins(
        step,
        recipeId,
        editResult.finalRecipe,
        agentResult.seoPlan,
        imageResult.heroImageUrl,
        imageResult.imageVariants as ImageVariant[],
      )

      // ── Phase 13: AOR article ─────────────────────────────────────────────
      if (aorCategory) {
        try {
          await generateAorArticle(step, recipeId, keyword, editResult.finalRecipe, agentResult.seoPlan, serpResult.structuredSerp, aorCategory, aorAngle ?? null)
        } catch (err) {
          if (isRecoverableError(err as Error)) throw err
          await logPipelineError({ recipeId, stepName: "agent-6-aor-article", errorType: "unknown", message: (err as Error).message, severity: "warning" })
        }
      }

    } catch (err) {
      await logPipelineError({ recipeId, stepName: "workflow", errorType: "llm_unavailable", message: (err as Error).message, severity: "critical" })
      throw err
    }
  },
)
