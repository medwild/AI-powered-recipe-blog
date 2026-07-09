// Agent 5 — Image Prompt Optimizer
//
// Charge son skill depuis skills/food-photography.md et utilise un LLM
// pour transformer les données de la recette en un prompt d'image optimisé
// selon l'architecture 10 couches (style → sujet → contexte → cadrage →
// éclairage → composition → palette → technique → format → exclusions).
//
// Architecture :
//   System prompt ← loadSkillContent("food-photography")  (rôle, 10 couches, vocabulaire)
//   User prompt   ← buildUserPrompt()                      (données dynamiques de la recette)
//   Output         ← string (prompt prêt pour FLUX-1-Schnell)
//
// Fallback : si le LLM échoue ou retourne une string vide, le prompt est
// reconstruit programmatiquement via buildDefaultPrompt() (lib/skills.ts).

import { loadSkillContent, buildDefaultPrompt } from "@/lib/skills"
import { runText } from "@/lib/agents/nararouter"
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import type { Ingredient } from "@/lib/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImagePromptSource = {
  title?: string | null
  tags?: string[] | null
  difficulty?: string | null
  ingredients?: { name: string; quantity?: string }[] | null
  keyword?: string | null
  imagePrompt?: string | null
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(source: ImagePromptSource): string {
  const dishName = source.title ?? source.keyword ?? "delicious homemade dish"
  const tagList = (source.tags ?? []).join(", ")
  const difficulty = source.difficulty ?? "Medium"
  const mainIngredients = (source.ingredients ?? [])
    .slice(0, 6)
    .map((i) => `${i.quantity ?? ""} ${i.name}`.trim())
    .filter(Boolean)
    .join(", ")

  // Writer's raw prompt (may be empty or low quality)
  const writerPrompt = source.imagePrompt?.trim() || "(no prompt provided by Writer)"

  return `Optimize an image prompt for this recipe:

## Recipe Data
- Dish: ${dishName}
- Tags: ${tagList || "none"}
- Difficulty: ${difficulty}
- Key Ingredients: ${mainIngredients || "not specified"}

## Writer's Draft Prompt (improve this)
${writerPrompt}

## Instructions
1. Analyze the dish type, tags, and ingredients to determine the best visual style
2. Apply the 10-layer architecture defined in your system prompt
3. Extract colors from the actual ingredients for the palette layer
4. Choose the optimal framing based on the dish type (see Quick-Reference map)
5. If the Writer's prompt is decent, enhance it with all missing layers
6. If the Writer's prompt is empty/poor, build from scratch

CRITICAL: Output ONLY the raw prompt text. No markdown fences, no "Prompt:" prefix, no commentary, no analysis. Just the prompt string, nothing else. Start directly with the first word of the prompt.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Optimizes an image prompt using an LLM armed with the food-photography skill.
 *
 * Flow:
 * 1. Load the food-photography skill as system prompt
 * 2. Build a user prompt with recipe data + Writer's draft
 * 3. Call Cloudflare LLM to produce an optimized prompt
 * 4. Fall back to buildDefaultPrompt() if the LLM fails or returns junk
 */
export async function agentImagePromptOptimizer(
  source: ImagePromptSource,
): Promise<string> {
  try {
    const systemPrompt = await loadSkillContent("food-photography")
    const userPrompt = buildUserPrompt(source)

    const optimized = await runText(systemPrompt, userPrompt, {
      maxTokens: 1024,
      temperature: 0.7,
    })

    // Strip any markdown fences, leading/trailing prose the LLM may have added
    let cleaned = optimized.trim()
    const fenceMatch = cleaned.match(/```(?:[a-z]*)\s*([\s\S]*?)```/)
    if (fenceMatch) cleaned = fenceMatch[1].trim()
    // Remove common prefixes like "Prompt:" or "Here is the prompt:"
    cleaned = cleaned.replace(/^(?:Prompt|Here is the optimized prompt|Output):\s*/i, "").trim()

    // Contract validation — wrap string in object for the { prompt } contract
    const contractValidation = validateContract({ prompt: cleaned }, AGENT_CONTRACTS.ImagePromptOptimizer)
    if (contractValidation.warnings.length > 0) {
      console.warn("[ImagePromptOptimizer] Contract warnings:", contractValidation.warnings.join("; "))
    }

    // Validate: must be a non-empty string of reasonable length
    if (cleaned.length >= 50) {
      console.log(`[ImagePromptOptimizer] Prompt (${cleaned.length} chars): ${cleaned.substring(0, 120)}...`)
      return cleaned
    }

    console.warn(
      "[ImagePromptOptimizer] LLM returned short/invalid prompt. Falling back to buildDefaultPrompt().",
    )
    return buildDefaultPrompt(source)
  } catch (err) {
    console.warn(
      `[ImagePromptOptimizer] LLM call failed: ${(err as Error).message}. Falling back to buildDefaultPrompt().`,
    )
    return buildDefaultPrompt(source)
  }
}

/** Re-export for convenience */
export { buildDefaultPrompt }
