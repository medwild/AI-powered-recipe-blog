// Agent 1 — Chef Augustin Writer
//
// Executes a StrategyPlan (from Strategist agent) to produce the complete
// article: content markdown, ingredients, instructions, metadata, image
// prompt, and JSON-LD. Focuses exclusively on writing quality.
//
// Architecture:
//   System prompt ← loadSkillContent("agent-chef-augustin")
//   User prompt   ← buildUserPrompt() with strategyPlan + SERP data
//   Output        ← ChefAugustinOutput (single JSON)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/provider"
import { getRelevantSources, formatSourcesForPrompt } from "@/lib/external-sources"
import { logAgentTrace } from "../helpers"
import type { Ingredient, Instruction } from "@/lib/db/schema"
import type { StrategyPlan } from "./strategist"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChefAugustinOutput = {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  contentMarkdown: string
  ingredients: Ingredient[]
  instructions: Instruction[]
  tags: string[]
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  difficulty: string
  imagePrompt: string
  jsonLd: Record<string, unknown>
}

// Backward-compatible alias
export type RecipeDraft = ChefAugustinOutput

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(params: {
  keyword: string
  format: "google" | "pin-first"
  strategyPlan: StrategyPlan
  linkTargets?: { anchorText: string; url: string; context: string }[]
  feedback?: string
}): string {
  const { keyword, format, strategyPlan, linkTargets, feedback } = params

  const linkSection = (linkTargets && linkTargets.length > 0)
    ? `\n## Internal Linking Targets\n${linkTargets.map(t => `- [${t.anchorText}](${t.url}) — ${t.context}`).join("\n")}\n\nInsert 2-3 of these as contextual links where they fit naturally.`
    : ""

  // Build the strategy plan section
  const planSection = `
## Strategy Plan (Pre-Planned — Follow Exactly)

**Angle**: ${strategyPlan.angle}
**Primary Keyword**: ${strategyPlan.primaryKeyword}
**Secondary Keywords**: ${strategyPlan.secondaryKeywords.join(", ")}
**Target Word Count**: ${strategyPlan.targetWordCount}

### H2 Sections (in order):
${strategyPlan.h2Sections.map((h, i) => `${i + 1}. **${h.heading}** — Purpose: ${h.purpose}${h.coverPaa.length ? ` (cover: ${h.coverPaa.join("; ")})` : ""}`).join("\n")}

### FAQ Questions:
${strategyPlan.faqQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

### Competitor Gaps to Exploit:
${strategyPlan.competitorGaps.map(g => `- ${g}`).join("\n")}

### Semantic Entities:
${strategyPlan.semanticEntities.join(", ")}
`

  let userPrompt = `Write a complete ${format === "pin-first" ? "pin-first format (1200-1500 words)" : "Google format (1800-2200 words)"} article for the keyword "${keyword}".
${planSection}
${linkSection}`

  // Inject loop feedback from previous Evaluator pass
  if (feedback) {
    userPrompt += `\n\n${feedback}`
  }

  userPrompt += `\n\nFollow the strategy plan exactly. Output ONLY the JSON object — no markdown fences, no reasoning.`

  return userPrompt
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentChefAugustin(params: {
  keyword: string
  format: "google" | "pin-first"
  strategyPlan: StrategyPlan
  cuisineReplacements: Record<string, string>
  linkTargets?: { anchorText: string; url: string; context: string }[]
  feedback?: string
}): Promise<ChefAugustinOutput> {
  const { keyword, format, strategyPlan, cuisineReplacements, linkTargets, feedback } = params

  try {
    const sources = getRelevantSources(keyword)
    const sourcesText = formatSourcesForPrompt(sources)

    const mergedReplacements = { ...cuisineReplacements, format } as Record<string, string>
    const systemPrompt = await loadSkillContent("agent-chef-augustin", mergedReplacements)

    let userPrompt = buildUserPrompt({
      keyword,
      format,
      strategyPlan,
      linkTargets,
      feedback,
    })

    if (sources.length > 0) {
      userPrompt += `\n\n## Authoritative External Sources (Cite 1-2 that fit naturally)\n${sourcesText}`
    }

    logAgentTrace("ChefAugustin", "input", { chars: systemPrompt.length + userPrompt.length })

    const result = await runTextAndParseJson<ChefAugustinOutput>(systemPrompt, userPrompt, {
      temperature: 0.8,
      maxTokens: 8192,
    })

    logAgentTrace("ChefAugustin", "output", {
      chars: JSON.stringify(result).length,
      fields: Object.keys(result).length,
    })

    return result
  } catch (err) {
    throw new Error(
      `[ChefAugustin] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
