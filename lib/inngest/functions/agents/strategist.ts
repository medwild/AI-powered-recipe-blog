// Agent 1 — SEO Strategist
//
// Charge son skill depuis skills/agent-strategist.md (frontmatter YAML + règles)
// et construit un prompt utilisateur avec les données SERP réelles et les leçons
// d'auto-amélioration.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-strategist")  (rôle, règles, contrat de sortie)
//   User prompt   ← buildUserPrompt()                      (données dynamiques : SERP, leçons)
//
// v5.3 : V2 prompt uses pre-structured SERP data from Agent 0 (serp-structurer)
//        for reduced LLM cognitive load + faster inference.

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import type { SerpResult } from "@/lib/agents/serp"
import type { StructuredSerp } from "@/lib/agents/serp-structurer"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  h2Sections: {
    heading: string
    subheadings: string[]
    coverPaa: string[]
    // v5.0.0-ULTRA optional fields
    answerNugget?: string
    eeatSignals?: string[]
  }[]
  semanticEntities: string[]
  json_ld_recipe_base?: Record<string, unknown>
  // v5.2.0 fields
  targetWordCount?: string
  faqItems?: { question: string; answer: string }[]
  whyThisWorks?: string
  competitorWeaknessExploitation?: {
    primaryExploit?: string
    secondaryExploit?: string
  }
  // v5.0.0-ULTRA optional fields
  gapAnalysis?: {
    primaryGap?: string
    secondaryGap?: string
    competitorWeakness?: string
  }
  citationStrategy?: {
    answerNuggetCount?: number
    featuredSnippetCandidates?: number
    questionBasedH2s?: number
    entityCoverage?: string
  }
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(
  keyword: string,
  serp: SerpResult,
  pastImprovements: string[],
): string {
  return `Analyze the keyword "${keyword}" and produce a detailed SEO editorial plan.

## Google SERP Data
${JSON.stringify(
  {
    competitorTitles: serp.organic.map((o) => o.title),
    snippets: serp.organic.map((o) => o.snippet),
    frequentlyAskedQuestions: serp.relatedQuestions.map((q) => q.question),
    relatedSearches: serp.relatedSearches,
  },
  null,
  2,
)}

## Lessons from Previous Articles (Self-Improvement with Context)
${
  pastImprovements.length > 0
    ? pastImprovements.map((r, i) => `${i + 1}. ${r}`).join("\n") + `

CRITICAL — Contextual Filtering:
- Each lesson above includes its original recipe keyword and the criterion that triggered it.
- ONLY apply lessons that are relevant to "${keyword}".
- A lesson about "baking temperatures" from a cake recipe must IGNORE a soup recipe. A lesson about "sensory descriptors" is universally applicable.
- If a lesson's original recipe type is incompatible with "${keyword}" (e.g., dessert lesson for a savory dish, baking lesson for a no-cook recipe), SKIP it entirely.
- Mention which lessons you applied and which you skipped (and why) in your reasoning.`
    : "No lessons yet. This is the first recipe."
}

Respond with the EXACT JSON structure defined in your system prompt.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Analyzes SERP data + lessons from previous articles
 * to produce a structured editorial plan (H1/H2/H3, entities, PAA, JSON-LD).
 */
export async function agentStrategist(
  keyword: string,
  serp: SerpResult,
  pastImprovements: string[],
  replacements?: Record<string, string>,
): Promise<SeoPlan> {
  try {
    const systemPrompt = await loadSkillContent("agent-strategist", replacements)
    const userPrompt = buildUserPrompt(keyword, serp, pastImprovements)
    // NOTE: V1 is deprecated — V2 is the production path. Keeping V1 aligned
    // with V2 defaults to prevent silent regressions if V1 is ever called.
    return runTextAndParseJson<SeoPlan>(systemPrompt, userPrompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })
  } catch (err) {
    throw new Error(
      `[Strategist V1] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}

// ---------------------------------------------------------------------------
// V2 — Pre-structured SERP input (from Agent 0 serp-structurer)
// ---------------------------------------------------------------------------

function buildUserPromptV2(
  keyword: string,
  s: StructuredSerp,
  pastImprovements: string[],
): string {
  const pkg = s.strategist_agent_input_package

  // Keep the V1 format as base — the system prompt is calibrated for it.
  // Append structured intel as additional context blocks.
  return `Analyze the keyword "${keyword}" and produce a detailed SEO editorial plan.

## Google SERP Data
${JSON.stringify(
  {
    competitorTitles: s.normalized_competitors.map((c) => `#${c.position} ${c.domain}: ${c.title}`),
    snippets: s.normalized_competitors.map((c) => c.snippet),
    frequentlyAskedQuestions: pkg.faq_candidates,
    relatedSearches: s.topic_clusters
      .filter((t) => t.cluster_type === "longtail")
      .flatMap((t) => t.items),
  },
  null,
  2,
)}

## SERP Intelligence (Agent 0 pre-analysis)
Intent: ${pkg.intent_summary}
Recommended direction: ${pkg.recommended_article_direction}
Primary gap: ${pkg.gap_analysis_input?.primary_gap ?? "unknown"} — ${pkg.gap_analysis_input?.competitor_aggregated_weakness ?? ""}
Secondary gap: ${pkg.gap_analysis_input?.secondary_gap ?? "unknown"}

### Competitor weaknesses to exploit:
${s.normalized_competitors.filter(c => c.potential_weakness).map(c => `- #${c.position} ${c.domain}: ${c.potential_weakness}`).join("\n")}

### Content opportunities (detected from SERP):
${s.content_opportunities.map(o => `- [${o.type}:${o.confidence}%] ${o.opportunity}`).join("\n")}

### E-E-A-T signals to incorporate:
${s.eeat_signals.slice(0, 4).map(e => `- ${e.signal} (${e.recommended_use})`).join("\n")}

### Schema requirements:
${pkg.schema_opportunities.join("; ")}

### MUST VERIFY:
${pkg.must_verify.map((v) => `- ⚠️ ${v}`).join("\n")}

### MUST AVOID:
${pkg.must_avoid.map((v) => `- 🚫 ${v}`).join("\n")}

## Lessons from Previous Articles (Self-Improvement with Context)
${
    pastImprovements.length > 0
      ? pastImprovements.map((r, i) => `${i + 1}. ${r}`).join("\n") + `\n\nCRITICAL — Contextual Filtering:\n- Each lesson above includes its original recipe keyword and the criterion that triggered it.\n- ONLY apply lessons that are relevant to "${keyword}".\n- A lesson about "baking temperatures" from a cake recipe must IGNORE a soup recipe. A lesson about "sensory descriptors" is universally applicable.\n- If a lesson's original recipe type is incompatible with "${keyword}" (e.g., dessert lesson for a savory dish, baking lesson for a no-cook recipe), SKIP it entirely.\n- Mention which lessons you applied and which you skipped (and why) in your reasoning.`
      : "No lessons yet. This is the first recipe."
}

Respond with the EXACT JSON structure defined in your system prompt.`
}

/**
 * V2 Strategist — receives pre-structured SERP data from Agent 0
 * (serp-structurer) instead of raw Serper.dev JSON.
 *
 * The pre-structuring reduces LLM cognitive load by ~60%:
 * intent, competitors, topics, questions, opportunities, and E-E-A-T
 * signals are already extracted. The LLM only needs to produce the
 * editorial plan (SeoPlan) from pre-digested intelligence.
 */
export async function agentStrategistV2(
  keyword: string,
  structuredSerp: StructuredSerp,
  pastImprovements: string[],
  replacements?: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<SeoPlan> {
  try {
    // Merge format into replacements so {{format}} resolves in skill template
    const mergedReplacements = { ...(replacements ?? {}), format } as Record<string, string>
    const systemPrompt = await loadSkillContent("agent-strategist", mergedReplacements)
    const userPrompt = buildUserPromptV2(keyword, structuredSerp, pastImprovements)
    return runTextAndParseJson<SeoPlan>(systemPrompt, userPrompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })
  } catch (err) {
    throw new Error(
      `[Strategist V2] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
