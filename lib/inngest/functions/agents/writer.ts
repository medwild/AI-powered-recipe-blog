// Agent 2 — Writer (Chef Augustin Lefèvre)
//
// Charge son skill depuis skills/agent-writer.md et incarne le persona
// du Chef Augustin Lefèvre pour rédiger l'article complet.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-writer")  (persona, règles anti-AI, contrat)
//   User prompt   ← buildUserPrompt()                  (plan SEO, structure H2, entités)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import type { SeoPlan } from "./strategist"
import type { Ingredient, Instruction } from "@/lib/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecipeDraft = {
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
  ingredients: Ingredient[]
  instructions: Instruction[]
  contentMarkdown: string
  imagePrompt?: string
  humanization_pass?: number
  changes_summary?: string
  // v5.0.0-ULTRA optional fields
  error?: boolean
  errorType?: string
  missingFields?: string[]
  message?: string
  eeatSignals?: {
    experienceCount?: number
    expertiseCount?: number
    trustSignals?: string[]
  }
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(keyword: string, plan: SeoPlan): string {
  const h2Plan = plan.h2Sections
    .map(
      (s, i) =>
        `  Section ${i + 1} : ## ${s.heading}\n` +
        s.subheadings.map((h) => `    Sub-section : ### ${h}`).join("\n") +
        `\n    PAA questions to cover in this section : ${s.coverPaa.join(", ")}`,
    )
    .join("\n")

  const competitorBlock = plan.competitorWeaknessExploitation
    ? `\n## Competitor Weakness Exploitation
Primary exploit (for "What Most Recipes Get Wrong" section): ${plan.competitorWeaknessExploitation.primaryExploit ?? "N/A"}
Secondary exploit (format differentiator): ${plan.competitorWeaknessExploitation.secondaryExploit ?? "N/A"}`
    : ""

  const faqBlock = plan.faqItems?.length
    ? `\n## FAQ Questions to Answer (5 required)
${plan.faqItems.map((q, i) => `Q${i + 1}: ${q.question} → ${q.answer}`).join("\n")}`
    : ""

  return `Write recipe "${keyword}" as Chef Augustin Lefèvre.

## Editorial Plan
Title: ${plan.title}
Meta: ${plan.metaTitle} | Desc: ${plan.metaDescription}
Tags: ${plan.tags.join(", ")} | Difficulty: ${plan.difficulty} | Time: ${plan.totalTime}
Target word count: ${plan.targetWordCount ?? "1800-2200"}

## Why This Recipe Works (summary box)
${plan.whyThisWorks ?? "Explain the science/principles behind this recipe's success in a bold 60-80 word summary."}
${competitorBlock}
## H2 Structure with PAA Questions
${h2Plan}
${faqBlock}
## Semantic Entities to Weave Naturally
${plan.semanticEntities.join(", ")}

## Important
- Target ${plan.targetWordCount ?? "1800-2200"} words total (competitors average 1500-2400).
- Use the editorial plan's metadata values (title, metaTitle, metaDescription, tags, times, servings, difficulty) exactly as provided — do not regenerate them.
- Answer the PAA questions naturally within their corresponding H2 section prose. Save Q&A format for the FAQ section only.
- Include ALL mandatory sections: Why This Works (bold summary box), What Most Recipes Get Wrong, Body H2s, Chef's Tips, Variations, Storage & Reheating, FAQ (5 Q&A), Nutrition Highlights.
- Weave the semantic entities into headings and the first paragraph organically.

Follow the rules, persona, section structure, and output format defined in your system prompt.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Writes the complete recipe draft embodying the Chef Augustin Lefèvre persona,
 * with anti-AI style and sensory richness.
 */
export async function agentWriter(
  keyword: string,
  plan: SeoPlan,
): Promise<RecipeDraft> {
  try {
    const systemPrompt = await loadSkillContent("agent-writer")
    const userPrompt = buildUserPrompt(keyword, plan)

    // maxTokens 6144: the full article (1800-2200 words) + JSON metadata (title, meta,
    // ingredients, instructions, FAQ 5Q, whyThisWorks, nutritionHighlights, jsonLd)
    // needs more output space. 4096 was causing JSON truncation and triggering
    // the Cloudflare fallback instead of using NaraRouter Mistral 3.5 as intended.
    return runTextAndParseJson<RecipeDraft>(systemPrompt, userPrompt, {
      temperature: 0.9,
      maxTokens: 6144,
    })
  } catch (err) {
    throw new Error(
      `[Writer] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
