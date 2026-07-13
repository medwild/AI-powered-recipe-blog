// Agent 2 — Judge — Quality Evaluator
//
// Evaluates article quality on 4 dimensions (culinary accuracy, narrative,
// usefulness, structure) and produces a QualityVerdict consumed by the
// Content Loop. Uses Claude Haiku 4.5 for cost efficiency.
//
// Architecture:
//   System prompt ← loadSkillContent("agent-judge")
//   User prompt   ← article + keyword + strategy plan
//   Output        ← QualityVerdict (JSON)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/provider"
import { logAgentTrace } from "../helpers"
import type { ChefAugustinOutput } from "./chef-augustin"
import type { StrategyPlan } from "./strategist"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DimensionScore {
  score: number
  note: string
}

export interface CriticalIssue {
  section: string
  severity: "high" | "medium" | "low"
  description: string
}

export interface QualityVerdict {
  totalScore: number
  verdict: "PUBLISH" | "REVISE" | "REJECT"
  dimensions: {
    culinaryAccuracy: DimensionScore
    narrativeQuality: DimensionScore
    usefulness: DimensionScore
    structureFlow: DimensionScore
  }
  criticalIssues: CriticalIssue[]
  strengths: string[]
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentJudge(params: {
  keyword: string
  output: ChefAugustinOutput
  strategyPlan: StrategyPlan
}): Promise<QualityVerdict> {
  const { keyword, output, strategyPlan } = params

  try {
    const systemPrompt = await loadSkillContent("agent-judge")

    const userPrompt = `Evaluate this recipe article for "${keyword}".

## Strategy Plan (what was intended)
Angle: ${strategyPlan.angle}
H2 Sections: ${strategyPlan.h2Sections.map(h => h.heading).join(" → ")}

## Article Content
Title: ${output.title}
Meta Title: ${output.metaTitle}
Meta Description: ${output.metaDescription}

### Full Markdown:
${(output.contentMarkdown ?? "").substring(0, 8000)}

### Metadata:
Prep: ${output.prepTime} | Cook: ${output.cookTime} | Total: ${output.totalTime}
Servings: ${output.servings} | Difficulty: ${output.difficulty}
Ingredients: ${(output.ingredients ?? []).length} items
Instructions: ${(output.instructions ?? []).length} steps
Tags: ${(output.tags ?? []).join(", ")}

Evaluate according to your system prompt. Output ONLY the JSON object.`

    logAgentTrace("Judge", "input", { chars: systemPrompt.length + userPrompt.length })

    const result = await runTextAndParseJson<QualityVerdict>(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 2048,
      model: "claude-haiku-4-5", // cheaper, faster — sufficient for evaluation
    })

    logAgentTrace("Judge", "output", {
      chars: JSON.stringify(result).length,
      fields: Object.keys(result).length,
    })

    // Sanity defaults if LLM returns incomplete data
    return {
      totalScore: result.totalScore ?? 70,
      verdict: result.verdict ?? "REVISE",
      dimensions: {
        culinaryAccuracy: result.dimensions?.culinaryAccuracy ?? { score: 70, note: "" },
        narrativeQuality: result.dimensions?.narrativeQuality ?? { score: 70, note: "" },
        usefulness: result.dimensions?.usefulness ?? { score: 70, note: "" },
        structureFlow: result.dimensions?.structureFlow ?? { score: 70, note: "" },
      },
      criticalIssues: result.criticalIssues ?? [],
      strengths: result.strengths ?? [],
    }
  } catch (err) {
    // Judge failure is non-fatal — return a neutral verdict
    console.error(`[Judge] LLM call failed: ${(err as Error).message}`)
    return {
      totalScore: 60,
      verdict: "REVISE",
      dimensions: {
        culinaryAccuracy: { score: 60, note: "Judge unavailable — default score" },
        narrativeQuality: { score: 60, note: "Judge unavailable — default score" },
        usefulness: { score: 60, note: "Judge unavailable — default score" },
        structureFlow: { score: 60, note: "Judge unavailable — default score" },
      },
      criticalIssues: [],
      strengths: [],
    }
  }
}
