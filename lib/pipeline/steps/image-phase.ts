/**
 * Step 3 — Image generation (single image, no A/B variants).
 *
 * Generates one hero image per recipe via Ideogram v4 Turbo.
 * Uses the image prompt from the unified Chef Augustin mega-skill,
 * falling back to a deterministic template if no prompt is provided.
 *
 * Non-blocking: failure degrades gracefully (recipe published without image).
 */

import { runImage } from "@/lib/agents/ideogram"
import { uploadImage } from "@/lib/agents/cloudinary"
import { optimizeImagePrompt } from "@/lib/skills"
import { appendLog, logEntry } from "../helpers"
import { logPipelineError } from "@/lib/queries"

export interface ImagePhaseResult {
  heroImageUrl: string | null
  /** Single-variant array kept for backward compatibility with existing DB reads */
  imageVariants: Array<{ label: string; url: string; prompt: string }>
  degraded: boolean
}

export async function runImagePhase(
  recipeId: number,
  recipe: { title: string; tags: string[]; imagePrompt?: string },
  keyword: string,
): Promise<ImagePhaseResult> {
  const imagePrompt = optimizeImagePrompt({
    title: recipe.title,
    tags: recipe.tags,
    imagePrompt: recipe.imagePrompt,
    keyword,
  })

  await appendLog(recipeId, logEntry("Image Prompt", "done", `Using image prompt (${imagePrompt.length} chars)`))
  await new Promise((r) => setTimeout(r, 2000)) // rate-limit pause for Ideogram API

  try {
    const buffer = await runImage(imagePrompt)
    await appendLog(recipeId, logEntry("Image Gen", "done", `Generated — ${buffer.length} bytes`))

    const imageUrl = await uploadImage(buffer, recipe.title)
    await appendLog(recipeId, logEntry("Image Upload", "done", `Uploaded to Cloudinary`))

    return {
      heroImageUrl: imageUrl,
      imageVariants: [{ label: "Variant 1", url: imageUrl, prompt: imagePrompt }],
      degraded: false,
    }
  } catch (err) {
    await logPipelineError({
      recipeId,
      stepName: "image-phase",
      errorType: "unknown",
      message: (err as Error).message,
      severity: "warning",
    })
    return { heroImageUrl: null, imageVariants: [], degraded: true }
  }
}
