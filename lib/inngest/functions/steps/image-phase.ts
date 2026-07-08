/**
 * Steps 8 + 9 — Image prompt optimization + generation with A/B variants.
 */

import { runImage } from "@/lib/agents/ideogram"
import { uploadImage } from "@/lib/agents/cloudinary"
import { agentImagePromptOptimizer } from "../agents/image-prompt-optimizer"
import type { RecipeDraft } from "../agents/writer"
import { appendLog, logEntry, isRecoverableError, buildFallbackImagePrompt } from "../helpers"
import { logPipelineError } from "@/lib/queries"

const IMAGE_VARIANT_COUNT = Math.min(
  parseInt(process.env.IMAGE_VARIANT_COUNT ?? "2", 10) || 2,
  3,
)

export interface ImagePhaseResult {
  heroImageUrl: string | null
  imageVariants: Array<{ label: string; url: string; prompt: string }>
  degraded: boolean
}

export async function runImagePhase(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number,
  finalRecipe: RecipeDraft,
  keyword: string,
): Promise<ImagePhaseResult> {
  let degraded = false

  // ── Step 8: optimize-image-prompt ──────────────────────────────────────
  let imagePrompt: string
  try {
    imagePrompt = (await step.run("optimize-image-prompt", async () => {
      await appendLog(recipeId, logEntry("Image Prompt", "running", "Optimizing food photography prompt"))
      try {
        const result = await agentImagePromptOptimizer({
          title: finalRecipe.title,
          tags: finalRecipe.tags,
          keyword,
          ingredients: finalRecipe.ingredients,
          difficulty: finalRecipe.difficulty,
        })
        await appendLog(recipeId, logEntry("Image Prompt", "done", `Prompt: ${result.length} chars`))
        return result
      } catch {
        const fallback = buildFallbackImagePrompt(finalRecipe.title, finalRecipe.tags)
        await appendLog(recipeId, logEntry("Image Prompt", "error", `LLM failed — using deterministic fallback (${fallback.length} chars)`))
        return fallback
      }
    })) as string
  } catch (err) {
    if (isRecoverableError(err as Error)) throw err
    degraded = true
    imagePrompt = buildFallbackImagePrompt(finalRecipe.title, finalRecipe.tags)
    await appendLog(recipeId, logEntry("Image Prompt", "error", `Degraded — using deterministic fallback`))
  }
  await step.sleep("sleep-after-image-prompt", "2s")

  // ── Step 9: generate-and-upload-images ─────────────────────────────────
  const imageVariants: Array<{ label: string; url: string; prompt: string }> = []
  let heroImageUrl: string | null = null

  for (let vi = 0; vi < IMAGE_VARIANT_COUNT; vi++) {
    try {
      const label = String.fromCharCode(65 + vi) // A, B, C
      const result = (await step.run(`generate-variant-${vi}`, async () => {
        await appendLog(recipeId, logEntry("Image Gen", "running", `Variant ${vi + 1}/${IMAGE_VARIANT_COUNT}`))
        let variantPrompt = imagePrompt
        if (vi === 1) variantPrompt = imagePrompt.replace(/overhead|top.down|bird.?s.?eye|flat.?lay/gi, "45-degree angle")
        if (vi === 2) variantPrompt = imagePrompt.replace(/overhead|top.down|bird.?s.?eye|flat.?lay/gi, "eye-level close-up")

        const buffer = await runImage(variantPrompt)
        const url = await uploadImage(buffer, `recipe-${recipeId}-v${vi}`)
        await appendLog(recipeId, logEntry("Image Gen", "done", `Variant ${vi + 1} uploaded to Cloudinary`))
        return { label, url, prompt: variantPrompt }
      })) as { label: string; url: string; prompt: string }

      if (vi === 0) heroImageUrl = result.url
      imageVariants.push({ label: result.label, url: result.url, prompt: result.prompt })
    } catch (err) {
      const msg = (err as Error).message
      await appendLog(recipeId, logEntry("Image Gen", "error", `Variant ${vi + 1} failed: ${msg}`))
      // Continue to next variant — non-blocking
    }
  }

  if (!heroImageUrl && imageVariants.length === 0) {
    degraded = true
    await appendLog(recipeId, logEntry("Image Gen", "error", "All image variants failed"))
  }

  return { heroImageUrl, imageVariants, degraded }
}
