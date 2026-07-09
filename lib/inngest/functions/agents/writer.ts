// Agent 2 — Writer (Chef Augustin Lefèvre)
//
// Charge son skill depuis skills/agent-writer.md et incarne le persona
// du Chef Augustin Lefèvre pour rédiger l'article complet.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-writer")  (persona, règles anti-AI, contrat)
//   User prompt   ← buildUserPrompt()                  (plan SEO, structure H2, entités)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/anthropic"
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import { stripHtmlComments, logAgentTrace } from "../helpers"
import type { SeoPlan } from "./strategist"
import type { Ingredient, Instruction } from "@/lib/db/schema"
import type { LinkTarget } from "../steps/link-suggester"

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

function buildUserPrompt(keyword: string, plan: SeoPlan, format: "google" | "pin-first" = "google", linkTargets: LinkTarget[] = []): string {
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
    ? `\n## FAQ Questions to Answer (${format === "pin-first" ? "3" : "5"} required)
${plan.faqItems.map((q, i) => `Q${i + 1}: ${q.question} → ${q.answer}`).join("\n")}`
    : ""

  const formatRules = format === "pin-first"
    ? `PIN-FIRST FORMAT RULES (NON-NEGOTIABLE — follow these exactly):
- Word count: ${plan.targetWordCount ?? "1200-1500"} words STRICT.
- Recipe card (ingredients + instructions) MUST appear IMMEDIATELY after the intro (50-80 words) — BEFORE any H2 section. This is the #1 rule.
- FAQ: EXACTLY 3 questions, no more. 40-60 word answers each.
- OMIT THESE SECTIONS ENTIRELY — do NOT include them:
  * "Why This Works" summary box
  * "Nutrition Highlights"
  * "What Most Recipes Get Wrong"
- KEEP THESE SECTIONS: Chef's Tips, Variations, Storage & Reheating, FAQ (3 Q&A only).
- JSON-LD: Recipe + BlogPosting + BreadcrumbList ONLY. NO FAQPage.
- Image: 2:3 vertical aspect ratio food photography prompt.`
    : `GOOGLE FORMAT RULES:
- Word count: ${plan.targetWordCount ?? "1800-2200"} words STRICT.
- Include ALL mandatory sections: Why This Works (bold summary box), What Most Recipes Get Wrong, Body H2s, Chef's Tips, Variations, Storage & Reheating, FAQ (5 Q&A), Nutrition Highlights.`

  return `Write recipe "${keyword}" as Chef Augustin Lefèvre.

## Editorial Plan
Title: ${plan.title}
Meta: ${plan.metaTitle} | Desc: ${plan.metaDescription}
Tags: ${plan.tags.join(", ")} | Difficulty: ${plan.difficulty} | Time: ${plan.totalTime}
Target word count: ${plan.targetWordCount ?? "1800-2200"}

${format === "google" ? `## Why This Recipe Works (summary box)
${plan.whyThisWorks ?? "Explain the science/principles behind this recipe's success in a bold 60-80 word summary."}
${competitorBlock}` : ""}
## H2 Structure with PAA Questions
${h2Plan}
${faqBlock}
## Semantic Entities to Weave Naturally
${plan.semanticEntities.join(", ")}

## CRITICAL — Format-Specific Instructions
${formatRules}
- Use the editorial plan's metadata values (title, metaTitle, metaDescription, tags, times, servings, difficulty) exactly as provided — do not regenerate them.
- Answer the PAA questions naturally within their corresponding H2 section prose. Save Q&A format for the FAQ section only.
- Weave the semantic entities into headings and the first paragraph organically.

Follow the rules, persona, section structure, and output format defined in your system prompt.

## HARD GATE — Auto-Rejection Triggers
The ContentValidator will REJECT your article if ANY of these appear:
- Banned AI-slop words: "game-changer", "delve", "unlock", "elevate", "transform", "embark", "robust", "holistic", "leverage", "utilize", "nestled", "bursting with flavor", "melts in your mouth"
- Unsourced health claims: "probiotics", "gut health", "boosts immune", "detox", "anti-inflammatory", "fat-burning", "lowers cholesterol", "prevents cancer"
- Vibe tokens: [WARM], [SHARP], [WINK], [GRIT], [GLOW] or HTML comments <!--...-->
SCAN your final output for these BEFORE returning JSON. Remove every single one.
  ${linkTargets.length > 0 ? `## Internal Linking Targets
Insert 2-3 contextual links within the body text using natural, descriptive anchor text.
Rules:
- Anchor text MUST be descriptive and specific — NEVER use "click here", "read more", "here", "this recipe", "this article"
- Max 1 link per H2 section
- Each link must add real value for the reader at that specific point in the text
- Use standard markdown syntax: [descriptive text](/path)
- Choose targets where the connection feels natural — skip any that don"t fit

Recommended targets (choose 2-3 that fit most naturally):
${linkTargets.slice(0, 7).map(t => {
    const path = t.contentType === "article" && t.category ? `/${t.category}/${t.slug}` : `/${t.slug}`
    return `- ${path} | "${t.title}" | ${t.contentType} | score: ${t.score} | ${t.reason}`
  }).join("\n")}` : ""}`
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
  replacements?: Record<string, string>,
  format: "google" | "pin-first" = "google",
  linkTargets: LinkTarget[] = [],
): Promise<RecipeDraft> {
  try {
    const mergedReplacements = { ...(replacements ?? {}), format } as Record<string, string>
    const systemPrompt = await loadSkillContent("agent-writer", mergedReplacements)
    const userPrompt = buildUserPrompt(keyword, plan, format, linkTargets)

    logAgentTrace("Writer", "input", { chars: systemPrompt.length + userPrompt.length })
    // maxTokens 8192: DeepSeek v4 Pro truncates at limit, causing malformed JSON.
    // 6144 was enough for Claude but DeepSeek's JSON wrapper adds overhead.
    const result = await runTextAndParseJson<RecipeDraft>(systemPrompt, userPrompt, {
      temperature: 0.9,
      maxTokens: 8192,
    })

    // Contract validation (before sanitization — validate raw LLM output)
    const validation = validateContract(result as Record<string, unknown>, AGENT_CONTRACTS.Writer)
    if (validation.warnings.length > 0) {
      console.warn("[Writer] Contract warnings:", validation.warnings.join("; "))
    }
    logAgentTrace("Writer", "output", {
      chars: (result.contentMarkdown ?? "").length + JSON.stringify(result).length,
      fields: Object.keys(result).length,
    })

    // Deterministic sanitization: strip any HTML comments (vibe coding tokens
    // like <!--WARM-->, <!--GLOW--> that the LLM may fail to purge despite
    // skill instructions). Applied BEFORE the content flows downstream.
    if (result.contentMarkdown) {
      result.contentMarkdown = stripHtmlComments(result.contentMarkdown)
    }

    // Structural validation: catch obviously broken drafts early (before
    // expensive Editor passes). Non-blocking — the Editor will fix issues.
    const structuralIssues: string[] = []
    const md = result.contentMarkdown ?? ""
    const h2Count = (md.match(/^## /gm) ?? []).length
    if (h2Count < 3) structuralIssues.push(`Only ${h2Count} H2 headings (target: 5-8)`)
    if ((result.ingredients ?? []).length < 3) structuralIssues.push(`Only ${result.ingredients?.length ?? 0} ingredients (target: 5+)`)
    if ((result.instructions ?? []).length < 3) structuralIssues.push(`Only ${result.instructions?.length ?? 0} instructions (target: 4+)`)
    if (result.metaTitle && result.metaTitle.length > 60) structuralIssues.push(`Meta title ${result.metaTitle.length} chars (max: 60)`)
    if (structuralIssues.length > 0) {
      console.warn(`[Writer] Structural issues for "${keyword}": ${structuralIssues.join("; ")}`)
    }

    return result
  } catch (err) {
    throw new Error(
      `[Writer] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
