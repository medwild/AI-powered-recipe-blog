/**
 * generate-recipe workflow — Simplified v10 Orchestrator
 *
 * 4 pipeline steps:
 *   1. serp-phase       — Google SERP analysis (Serper API)
 *   2. unified-agent    — Chef Augustin (single DeepSeek call)
 *   3. image-phase      — FLUX-1 → Cloudinary
 *   4. persist-phase    — Validation + DB write
 *   5. pin-phase        — Pin Designer (5 pins per recipe)
 */

import { db } from "@/lib/db"
import { recipes, type ImageVariant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logPipelineError } from "@/lib/queries"
import { inngest } from "@/lib/inngest/client"
import { runSerpPhase } from "./steps/serp-phase"
import { runUnifiedAgentPhase } from "./steps/unified-agent-phase"
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

      // ── Step 2: Unified Agent (1 LLM call) ─────────────────────────────
      const agentResult = await runUnifiedAgentPhase(
        step, recipeId, keyword, serpResult, cuisineReplacements, format,
      )
      degraded = degraded || agentResult.degraded

      // ── Step 3: Persist draft for review ───────────────────────────────
      // Build a minimal audit-like object for persistDraftForReview compatibility
      const placeholderAudit = {
        publication_readiness_score: 70,
        scores: {
          signature_llm: 0, sur_optimisation_seo: 0,
          factualite: 70, originalite: 70, utilite: 70, experience: 70,
          coherence_interne: 70, eeat_trust: 70,
        },
        required_fixes: [] as { description: string }[],
        final_recommendation: "",
        decision: "PASS" as const,
      }
      await persistDraftForReview(step, recipeId, agentResult.output, placeholderAudit)
      await step.sleep("sleep-after-draft", "2s")

      // ── Step 4: Wait for approval ──────────────────────────────────────
      await waitForApproval(step, recipeId)
      await step.sleep("sleep-after-approval", "5s")

      // ── Step 5: Images ─────────────────────────────────────────────────
      const imageResult = await runImagePhase(step, recipeId, agentResult.output, keyword)
      degraded = degraded || imageResult.degraded

      // ── Step 6: Final persist with validation ──────────────────────────
      // Build minimal SeoPlan for persistFinalDraft compatibility
      const placeholderPlan = {
        h2Sections: [] as { heading: string; subheadings: string[]; coverPaa: string[] }[],
        semanticEntities: [] as string[],
        tags: agentResult.output.tags,
        title: agentResult.output.title,
        metaTitle: agentResult.output.metaTitle,
        metaDescription: agentResult.output.metaDescription,
        excerpt: agentResult.output.excerpt,
        prepTime: agentResult.output.prepTime,
        cookTime: agentResult.output.cookTime,
        totalTime: agentResult.output.totalTime,
        servings: agentResult.output.servings,
        difficulty: agentResult.output.difficulty,
      }
      await persistFinalDraft(
        step, recipeId, agentResult.output, placeholderPlan,
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
        // Build minimal plan for Pin Designer
        const pinPlan = {
          semanticEntities: [] as string[],
          tags: agentResult.output.tags,
          h2Sections: [] as { heading: string; subheadings: string[]; coverPaa: string[] }[],
          title: agentResult.output.title,
          metaTitle: agentResult.output.metaTitle,
          metaDescription: agentResult.output.metaDescription,
          excerpt: agentResult.output.excerpt,
          prepTime: agentResult.output.prepTime,
          cookTime: agentResult.output.cookTime,
          totalTime: agentResult.output.totalTime,
          servings: agentResult.output.servings,
          difficulty: agentResult.output.difficulty,
          faqItems: [] as { question: string; answer: string }[],
        }
        await generatePins(
          step, recipeId, agentResult.output, pinPlan,
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
