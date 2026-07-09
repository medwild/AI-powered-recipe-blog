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
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import { logAgentTrace } from "../helpers"
import { getRelevantSources, formatSourcesForPrompt, type ExternalSource } from "@/lib/external-sources"
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
    const result = await runTextAndParseJson<SeoPlan>(systemPrompt, userPrompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })
    const validation = validateContract(result as Record<string, unknown>, AGENT_CONTRACTS.Strategist)
    if (validation.warnings.length > 0) {
      console.warn("[Strategist V1] Contract warnings:", validation.warnings.join("; "))
    }
    return result
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
  opportunityScore?: { score: number; status: string; keyword: string },
  externalSources?: ExternalSource[],
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

${pkg.pinterest_intel ? `## Pinterest SERP Intelligence (Hijacking Layer)
The Google SERP for "${keyword}" contains Pinterest URLs. Analyze this data to plan a content hijacking strategy.

- SERP dominated by Pinterest: ${pkg.pinterest_intel.serp_dominated_by_pinterest ? "YES — " + Math.round(pkg.pinterest_intel.density * 100) + "% of page 1 is Pinterest" : "No"}
- Total pins: ${pkg.pinterest_intel.total_pins} | Total boards: ${pkg.pinterest_intel.total_boards}
- Highest-ranking Pinterest: position #${pkg.pinterest_intel.dominant_position}${pkg.pinterest_intel.dominant_account ? ` (${pkg.pinterest_intel.dominant_account})` : ""}
- Pins with empty snippet: ${pkg.pinterest_intel.empty_snippets}/${pkg.pinterest_intel.total_pins + pkg.pinterest_intel.total_boards} (Google ranks these on title/visual alone)
- Most beatable pin: position #${pkg.pinterest_intel.most_beatable_pin_position ?? "n/a"} (beatability score in normalized_competitors)
- User intent signal: ${pkg.pinterest_intel.user_intent_signal}
- Content gaps vs Pinterest: ${pkg.pinterest_intel.content_gaps_vs_pins.join("; ")}
- Recommended hijack strategy: ${pkg.pinterest_intel.hijack_strategy}

**Pin-First Content Rules:**
When Pinterest dominates the SERP, apply these rules:
1. Match the visual hook that made the pin rank (the pin's title IS the user intent signal)
2. Add what the pin structurally CANNOT offer: FAQ, technique depth, internal links, long-form explanations
3. Use 1200-1500 word pin-first format (recipe card above fold, 3 FAQ, no Nutrition Highlights)
4. Target 2:3 vertical images (Pinterest-optimized aspect ratio)
` : ""}

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

${
    externalSources && externalSources.length > 0
      ? `## Authoritative External Sources (Cite 1-2 in the article)
These are verified food-science facts from authoritative sources. Integrate 1-2 of them into your editorial plan — they will be cited in the article body to boost E-E-A-T and LLM citability signals.

Choose sources that are genuinely relevant to "${keyword}". Do not force a source that doesn't fit.

${formatSourcesForPrompt(externalSources)}

`
      : ""
}

## Lessons from Previous Articles (Self-Improvement with Context)
${
    pastImprovements.length > 0
      ? pastImprovements.map((r, i) => `${i + 1}. ${r}`).join("\n") + `\n\nCRITICAL — Contextual Filtering:\n- Each lesson above includes its original recipe keyword and the criterion that triggered it.\n- ONLY apply lessons that are relevant to "${keyword}".\n- A lesson about "baking temperatures" from a cake recipe must IGNORE a soup recipe. A lesson about "sensory descriptors" is universally applicable.\n- If a lesson's original recipe type is incompatible with "${keyword}" (e.g., dessert lesson for a savory dish, baking lesson for a no-cook recipe), SKIP it entirely.\n- Mention which lessons you applied and which you skipped (and why) in your reasoning.`
      : "No lessons yet. This is the first recipe."
}

${
    opportunityScore
      ? `## Opportunity Score Data (Pre-Scored from Discovery)
This keyword was pre-scored during the discovery phase:
- Opportunity Score: ${opportunityScore.score}/100 (${opportunityScore.status})
- Keyword: ${opportunityScore.keyword}

Use this to calibrate your effort:
- **high_priority (≥75)**: Full treatment — comprehensive sections, deep FAQ, detailed competitor exploitation.
- **medium_priority (65-74)**: Focused coverage — cover the most promising angle, standard FAQ.
- **revisit_later (<65)**: Light coverage — essential sections only, minimal FAQ.

`
      : ""
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
  /** Optional pre-scored opportunity data from discovery phase. */
  opportunityScore?: { score: number; status: string; keyword: string },
  /** Optional external sources matched by keyword tags. */
  externalSources?: ExternalSource[],
): Promise<SeoPlan> {
  try {
    // Merge format into replacements so {{format}} resolves in skill template
    const mergedReplacements = { ...(replacements ?? {}), format } as Record<string, string>

    // If opportunity score is available, inject it as a template variable
    if (opportunityScore) {
      mergedReplacements["opportunity_score"] = String(opportunityScore.score)
      mergedReplacements["opportunity_status"] = opportunityScore.status
    }

    const systemPrompt = await loadSkillContent("agent-strategist", mergedReplacements)
    const userPrompt = buildUserPromptV2(keyword, structuredSerp, pastImprovements, opportunityScore, externalSources)
    logAgentTrace("Strategist", "input", { chars: systemPrompt.length + userPrompt.length })
    const result = await runTextAndParseJson<SeoPlan>(systemPrompt, userPrompt, {
      maxTokens: 4096,
      temperature: 0.3,
    })
    logAgentTrace("Strategist", "output", { chars: JSON.stringify(result).length, fields: Object.keys(result).length })
    const validation = validateContract(result as Record<string, unknown>, AGENT_CONTRACTS.Strategist)
    if (validation.warnings.length > 0) {
      console.warn("[Strategist V2] Contract warnings:", validation.warnings.join("; "))
    }
    return result
  } catch (err) {
    throw new Error(
      `[Strategist V2] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
