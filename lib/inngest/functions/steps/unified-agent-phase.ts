/**
 * Step 2 — Unified Agent Phase
 *
 * Replaces the old multi-agent chain (Strategist → Writer → Auditor)
 * with a single LLM call that produces the complete article, image prompt,
 * and JSON-LD in one pass.
 */

import { agentChefAugustin, type ChefAugustinOutput } from "../agents/chef-augustin"
import type { SerpPhaseResult } from "./serp-phase"
import { appendLog, logEntry } from "../helpers"

export interface UnifiedAgentResult {
  output: ChefAugustinOutput
  degraded: boolean
}

export async function runUnifiedAgentPhase(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number,
  keyword: string,
  serpResult: SerpPhaseResult,
  cuisineReplacements: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<UnifiedAgentResult> {

  const output = await step.run("agent-2-chef-augustin", async () => {
    await appendLog(recipeId, logEntry("Chef Augustin", "running",
      `Generating complete ${format} article — SERP analysis + writing + self-editing + image prompt + JSON-LD in one pass`))

    const result = await agentChefAugustin({
      keyword,
      format,
      serpOrganic: serpResult.serp.organic.map(o => ({ title: o.title, snippet: o.snippet ?? "" })),
      serpRelatedQuestions: serpResult.serp.relatedQuestions.map(q => q.question),
      serpRelatedSearches: serpResult.serp.relatedSearches,
      cuisineReplacements,
    })

    const wordCount = (result.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    await appendLog(recipeId, logEntry("Chef Augustin", "done",
      `Article "${result.title}" — ${wordCount} words, ${result.ingredients.length} ingredients, ${result.instructions.length} steps, image prompt ready`))

    return result
  }) as ChefAugustinOutput

  return { output, degraded: serpResult.degraded }
}
