// Agent Unique — Chef Augustin Unified Content Engine
//
// Replaces Strategist + Writer + Auditor + Editor + QA + Image Optimizer
// with a single LLM call. Handles SERP analysis, pin-first writing,
// self-editing, image prompt generation, and JSON-LD.
//
// Architecture:
//   System prompt ← loadSkillContent("agent-chef-augustin")
//   User prompt   ← buildUserPrompt()
//   Output        ← ChefAugustinOutput (single JSON)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/anthropic"
import { getRelevantSources, formatSourcesForPrompt } from "@/lib/external-sources"
import { logAgentTrace } from "../helpers"
import type { Ingredient, Instruction } from "@/lib/db/schema"

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

// Backward-compatible aliases for files that still reference old type names
export type RecipeDraft = ChefAugustinOutput

export type SeoPlan = {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  difficulty: string
  tags: string[]
  h2Sections: { heading: string; subheadings: string[]; coverPaa: string[] }[]
  semanticEntities: string[]
  faqItems?: { question: string; answer: string }[]
  jsonLd?: Record<string, unknown>
  json_ld_recipe_base?: Record<string, unknown>
  targetWordCount?: string
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(params: {
  keyword: string
  format: "google" | "pin-first"
  serpData: {
    competitorTitles: string[]
    snippets: string[]
    relatedQuestions: string[]
    relatedSearches: string[]
  }
  linkTargets?: { anchorText: string; url: string; context: string }[]
}): string {
  const { keyword, format, serpData, linkTargets } = params

  const linkSection = (linkTargets && linkTargets.length > 0)
    ? `\n## Internal Linking Targets\n${linkTargets.map(t => `- [${t.anchorText}](${t.url}) — ${t.context}`).join("\n")}\n\nInsert 2-3 of these as contextual links where they fit naturally.`
    : ""

  return `Write a complete ${format === "pin-first" ? "pin-first format (1200-1500 words)" : "Google format (1800-2200 words)"} article for the keyword "${keyword}".

## Google SERP Data
${JSON.stringify({
  competitorTitles: serpData.competitorTitles.slice(0, 10),
  snippets: serpData.snippets.slice(0, 10),
  frequentlyAskedQuestions: serpData.relatedQuestions.slice(0, 8),
  relatedSearches: serpData.relatedSearches.slice(0, 8),
}, null, 2)}
${linkSection}

Follow your system prompt exactly. Output ONLY the JSON object — no markdown fences, no reasoning.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentChefAugustin(params: {
  keyword: string
  format: "google" | "pin-first"
  serpOrganic: { title: string; snippet: string }[]
  serpRelatedQuestions: string[]
  serpRelatedSearches: string[]
  cuisineReplacements: Record<string, string>
  linkTargets?: { anchorText: string; url: string; context: string }[]
}): Promise<ChefAugustinOutput> {
  const { keyword, format, serpOrganic, serpRelatedQuestions, serpRelatedSearches, cuisineReplacements, linkTargets } = params

  try {
    // Match external sources by keyword
    const sources = getRelevantSources(keyword)
    const sourcesText = formatSourcesForPrompt(sources)

    // Build system prompt with template replacements
    const mergedReplacements = { ...cuisineReplacements, format } as Record<string, string>
    const systemPrompt = await loadSkillContent("agent-chef-augustin", mergedReplacements)

    // Build user prompt with SERP data + links
    let userPrompt = buildUserPrompt({
      keyword,
      format,
      serpData: {
        competitorTitles: serpOrganic.map(o => o.title),
        snippets: serpOrganic.map(o => o.snippet),
        relatedQuestions: serpRelatedQuestions,
        relatedSearches: serpRelatedSearches,
      },
      linkTargets,
    })

    // Inject external sources into user prompt if available
    if (sources.length > 0) {
      userPrompt += `\n\n## Authoritative External Sources (Cite 1-2 that fit naturally)\n${sourcesText}`
    }

    logAgentTrace("ChefAugustin", "input", { chars: systemPrompt.length + userPrompt.length })

    const result = await runTextAndParseJson<ChefAugustinOutput>(systemPrompt, userPrompt, {
      temperature: 0.8,
      maxTokens: 8192,
    })

    const wordCount = (result.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
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
