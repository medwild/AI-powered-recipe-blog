// Agent 0 — Strategist — Content Planning
//
// Analyzes SERP data and produces a StrategyPlan that the Writer agent
// executes. Split from the unified Chef Augustin agent for better
// cognitive separation (Plan vs Write).
//
// Architecture:
//   System prompt ← loadSkillContent("agent-strategist")
//   User prompt   ← buildStrategistPrompt()
//   Output        ← StrategyPlan (JSON)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/provider"
import { getRelevantSources, formatSourcesForPrompt } from "@/lib/external-sources"
import { logAgentTrace } from "../helpers"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrategyPlan {
  angle: string
  primaryKeyword: string
  secondaryKeywords: string[]
  h2Sections: {
    heading: string
    purpose: string
    coverPaa: string[]
  }[]
  faqQuestions: string[]
  semanticEntities: string[]
  competitorGaps: string[]
  targetWordCount: string
  contentType: string
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentStrategist(params: {
  keyword: string
  format: "google" | "pin-first"
  serpOrganic: { title: string; snippet: string }[]
  serpRelatedQuestions: string[]
  serpRelatedSearches: string[]
  cuisineReplacements: Record<string, string>
}): Promise<StrategyPlan> {
  const { keyword, format, serpOrganic, serpRelatedQuestions, serpRelatedSearches, cuisineReplacements } = params

  try {
    const sources = getRelevantSources(keyword)
    const sourcesText = formatSourcesForPrompt(sources)

    const systemPrompt = await loadSkillContent("agent-strategist", cuisineReplacements)

    let userPrompt = `Plan an article for the keyword "${keyword}" in ${format} format.

## Google SERP Data
${JSON.stringify({
  competitorTitles: serpOrganic.map(o => o.title).slice(0, 10),
  snippets: serpOrganic.map(o => o.snippet).slice(0, 10),
  frequentlyAskedQuestions: serpRelatedQuestions.slice(0, 8),
  relatedSearches: serpRelatedSearches.slice(0, 8),
}, null, 2)}`

    if (sources.length > 0) {
      userPrompt += `\n\n## Authoritative External Sources (reference in plan where relevant)\n${sourcesText}`
    }

    userPrompt += `\n\nFollow your system prompt exactly. Output ONLY the JSON object — no markdown fences, no reasoning.`

    logAgentTrace("Strategist", "input", { chars: systemPrompt.length + userPrompt.length })

    const result = await runTextAndParseJson<StrategyPlan>(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 4096,
    })

    logAgentTrace("Strategist", "output", {
      chars: JSON.stringify(result).length,
      fields: Object.keys(result).length,
    })

    // Sanity defaults
    return {
      angle: result.angle ?? `${keyword} — comprehensive recipe guide`,
      primaryKeyword: result.primaryKeyword ?? keyword,
      secondaryKeywords: result.secondaryKeywords ?? [],
      h2Sections: result.h2Sections ?? [],
      faqQuestions: result.faqQuestions ?? serpRelatedQuestions.slice(0, 5),
      semanticEntities: result.semanticEntities ?? [],
      competitorGaps: result.competitorGaps ?? [],
      targetWordCount: result.targetWordCount ?? (format === "pin-first" ? "1200-1500" : "1800-2200"),
      contentType: result.contentType ?? "recipe",
    }
  } catch (err) {
    // Strategist failure is not fatal — return a minimal plan from SERP data
    console.error(`[Strategist] LLM call failed: ${(err as Error).message}`)
    return {
      angle: `${keyword} — recipe and technique guide`,
      primaryKeyword: keyword,
      secondaryKeywords: [],
      h2Sections: [
        { heading: "Ingredients", purpose: "List all ingredients with precise measurements", coverPaa: [] },
        { heading: "Instructions", purpose: "Step-by-step cooking instructions", coverPaa: [] },
        { heading: "Chef's Tips", purpose: "Insider techniques and common mistakes", coverPaa: [] },
        { heading: "FAQ", purpose: "Answer common questions", coverPaa: serpRelatedQuestions.slice(0, 3) },
      ],
      faqQuestions: serpRelatedQuestions.slice(0, 5),
      semanticEntities: [],
      competitorGaps: [],
      targetWordCount: format === "pin-first" ? "1200-1500" : "1800-2200",
      contentType: "recipe",
    }
  }
}
