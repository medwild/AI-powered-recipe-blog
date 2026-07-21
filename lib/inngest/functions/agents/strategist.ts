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
  /** Required citations from the EXTERNAL_SOURCES bank.
   *  The Strategist selects 1-2 verified facts and assigns each to an H2 section.
   *  The Writer MUST include these exact citationFormat strings in the article. */
  requiredCitations: {
    sourceId: string       // e.g. "usda-poultry-165"
    h2Section: string      // e.g. "Chef's Tips & What I've Learned"
    citationFormat: string // exact citation text to insert
  }[]
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentStrategist(params: {
  keyword: string
  format: "google" | "pin-first"
  serpText: string
  cuisineReplacements: Record<string, string>
}): Promise<StrategyPlan> {
  const { keyword, format, serpText, cuisineReplacements } = params

  try {
    const sources = getRelevantSources(keyword)
    const sourcesText = formatSourcesForPrompt(sources)

    const systemPrompt = await loadSkillContent("agent-strategist", cuisineReplacements)

    let userPrompt = `Plan an article for the keyword "${keyword}" in ${format} format.

## Google SERP Data
${serpText}`

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
      faqQuestions: result.faqQuestions ?? [],
      semanticEntities: result.semanticEntities ?? [],
      competitorGaps: result.competitorGaps ?? [],
      targetWordCount: result.targetWordCount ?? (format === "pin-first" ? "1200-1500" : "1800-2200"),
      contentType: result.contentType ?? "recipe",
      requiredCitations: result.requiredCitations ?? [],
    }
  } catch (err) {
    // Strategist failure is not fatal — return a minimal plan
    console.error(`[Strategist] LLM call failed: ${(err as Error).message}`)
    return {
      angle: `${keyword} — recipe and technique guide`,
      primaryKeyword: keyword,
      secondaryKeywords: [],
      h2Sections: [
        { heading: "Ingredients", purpose: "List all ingredients with precise measurements", coverPaa: [] },
        { heading: "Instructions", purpose: "Step-by-step cooking instructions", coverPaa: [] },
        { heading: "Chef's Tips", purpose: "Insider techniques and common mistakes", coverPaa: [] },
        { heading: "FAQ", purpose: "Answer common questions", coverPaa: [] },
      ],
      faqQuestions: [],
      semanticEntities: [],
      competitorGaps: [],
      targetWordCount: format === "pin-first" ? "1200-1500" : "1800-2200",
      contentType: "recipe",
      requiredCitations: [],
    }
  }
}
