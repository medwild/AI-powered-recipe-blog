/**
 * generate-recipe workflow — Pipeline v11 Loop-Engineered Orchestrator
 *
 * 5 pipeline steps:
 *   1. serp-phase       — Google SERP analysis (Serper API)
 *   2. content-loop      — Evaluator-Optimizer loop (Writer → Validators → Feedback, max 3 passes)
 *   3. image-phase       — FLUX-1 → Cloudinary
 *   4. persist-phase     — Validation + DB write (double safety net)
 *   5. pin-phase         — Pin Designer (5 pins per recipe)
 *
 * Loop-engineering patterns applied:
 *   - Maker/Checker split: Writer (LLM) vs Validators (deterministic code)
 *   - Evaluator-Optimizer: structured feedback drives quality improvement
 *   - Refexion: self_improvement_logs + STATE.md memory
 *   - Stopping rules: threshold met, diminishing returns, max 3 passes
 */

import { db } from "@/lib/db"
import { recipes, type ImageVariant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logPipelineError } from "@/lib/queries"
import { inngest } from "@/lib/inngest/client"
import { runSerpPhase } from "./steps/serp-phase"
import { runContentLoopPhase } from "./steps/content-loop-phase"
import { persistDraftForReview, waitForApproval, persistFinalDraft, initVariantStats } from "./steps/persist-phase"
import { runImagePhase } from "./steps/image-phase"
import { generatePins } from "./steps/pin-phase"
import { appendLog, logEntry, isRecoverableError } from "./helpers"

export const generateRecipeWorkflow = inngest.createFunction(
  {
    id: "generate-recipe",
    triggers: [{ event: "recipe/generate" }],
    concurrency: { key: "generate-recipe-active", limit: 3 },
    throttle: { key: "recipe-generation-throttle", limit: 2, period: "1m" },
    retries: 2,
    cancelOn: [{ event: "recipe/cancel", match: "data.recipeId" }],
  },
  async ({ event, step }) => {
    const { recipeId, keyword, cuisine, cuisineIngredients, cuisineTechniques, mode } = event.data as {
      recipeId: number; keyword: string;
      cuisine?: string; cuisineIngredients?: string; cuisineTechniques?: string;
      mode?: string;
    }

    const cuisineReplacements = {
      cuisine: cuisine || "Easy Weeknight Dinners for Two",
      cuisine_ingredients: cuisineIngredients || "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs",
      cuisine_techniques: cuisineTechniques || "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling",
    }

    const format = (mode === "pin-first" ? "pin-first" : "google") as "google" | "pin-first"

    let degraded = false

    try {
      // ── Step 1: SERP ───────────────────────────────────────────────────
      const serpResult = await runSerpPhase(step, recipeId, keyword)
      degraded = degraded || serpResult.degraded

      // ── Step 2: Content Loop (Evaluator-Optimizer — Pipeline v11) ────
      const agentResult = await runContentLoopPhase(
        step, recipeId, keyword, serpResult, cuisineReplacements, format,
      )
      degraded = degraded || agentResult.degraded

      // ── Step 3: Persist draft for review ───────────────────────────────
      await persistDraftForReview(step, recipeId, agentResult.output)
      await step.sleep("sleep-after-draft", "2s")

      // ── Step 4: Wait for approval ──────────────────────────────────────
      await waitForApproval(step, recipeId)
      await step.sleep("sleep-after-approval", "5s")

      // ── Step 5: Images ─────────────────────────────────────────────────
      const imageResult = await runImagePhase(step, recipeId, agentResult.output, keyword)
      degraded = degraded || imageResult.degraded

      // ── Step 6: Final persist with validation ──────────────────────────
      await persistFinalDraft(
        step, recipeId, agentResult.output,
        imageResult.heroImageUrl, imageResult.imageVariants as ImageVariant[],
        keyword, format, degraded,
      )

      // ── Step 7: A/B stats ──────────────────────────────────────────────
      try {
        await initVariantStats(step, recipeId, imageResult.imageVariants as ImageVariant[])
      } catch (err) {
        await logPipelineError({
          recipeId, stepName: "init-variant-stats",
          errorType: "unknown", message: (err as Error).message, severity: "warning",
        })
      }

      // ── Step 8: Pin Designer ───────────────────────────────────────────
      try {
        await generatePins(
          step, recipeId, agentResult.output,
          imageResult.heroImageUrl, imageResult.imageVariants as ImageVariant[],
        )
      } catch (err) {
        await logPipelineError({
          recipeId, stepName: "agent-pin-designer",
          errorType: "unknown", message: (err as Error).message, severity: "warning",
        })
      }

      await appendLog(recipeId, logEntry("Workflow", "done", `Pipeline complete — ${format} format`))

    } catch (err) {
      if (isRecoverableError(err as Error)) throw err // Inngest will retry

      await logPipelineError({
        recipeId, stepName: "generate-recipe",
        errorType: "unknown", message: (err as Error).message, severity: "critical",
      })

      await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      await appendLog(recipeId, logEntry("Workflow", "error",
        `Pipeline failed: ${(err as Error).message.substring(0, 300)}`))
    }
  },
)
