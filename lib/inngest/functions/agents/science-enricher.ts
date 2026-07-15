// Agent — Science Enricher
//
// Analyses a recipe article for food science gaps and suggests precise,
// structured enrichments. Uses Claude Sonnet 5 for deep culinary science
// expertise. Does NOT rewrite — outputs enrichment diffs consumed by the
// Chef Augustin Writer on the next Content Loop pass.
//
// Architecture:
//   System prompt ← loadSkillContent("agent-science-enricher")
//   User prompt   ← article markdown + keyword
//   Output        ← ScienceEnrichmentOutput (JSON)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/provider"
import { logAgentTrace } from "../helpers"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnrichmentType =
  | "causal_mechanism"
  | "chemical_process"
  | "physical_principle"
  | "comparative_data"
  | "temperature_science"
  | "technique_naming"

export interface ScienceEnrichment {
  /** The H2 section heading where this enrichment belongs (exact match from article). */
  section: string
  /** Type of food science gap being filled. */
  type: EnrichmentType
  /** A short unique phrase from the article to anchor the insertion point. */
  insert_after: string
  /** 1-3 sentences of enrichment in Chef Augustin's voice. */
  content: string
}

export interface ScienceEnrichmentOutput {
  enrichments: ScienceEnrichment[]
  overall_assessment: string
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentScienceEnricher(params: {
  articleMarkdown: string
  keyword: string
}): Promise<ScienceEnrichmentOutput | null> {
  const { articleMarkdown, keyword } = params

  try {
    const systemPrompt = await loadSkillContent("agent-science-enricher")

    // Truncate article to ~12000 chars to avoid token bloat — the enricher
    // only needs to scan for gaps, not read every word. The full article
    // stays intact for the Writer.
    const truncatedArticle = articleMarkdown.length > 12000
      ? articleMarkdown.substring(0, 12000) + "\n\n[... article continues]"
      : articleMarkdown

    const userPrompt = `Analyze this recipe article for food science gaps.

## Keyword
${keyword}

## Article Content
${truncatedArticle}

Identify specific sections where food science depth can be added. For each gap, provide a precise enrichment with a causal mechanism. Do NOT rewrite the article — output enrichment diffs only.`

    logAgentTrace("ScienceEnricher", "input", {
      chars: systemPrompt.length + userPrompt.length,
    })

    const result = await runTextAndParseJson<ScienceEnrichmentOutput>(
      systemPrompt,
      userPrompt,
      {
        model: "claude-sonnet-5",
        temperature: 0.4,
        maxTokens: 4096,
      },
    )

    logAgentTrace("ScienceEnricher", "output", {
      chars: JSON.stringify(result).length,
      fields: Object.keys(result).length,
    })

    // Validate: must have enrichments array
    if (!result.enrichments || !Array.isArray(result.enrichments)) {
      console.warn("[ScienceEnricher] No enrichments array in output — returning null")
      return null
    }

    // Filter invalid enrichments
    const valid = result.enrichments.filter(
      (e) =>
        e.section?.trim() &&
        e.type &&
        e.insert_after?.trim() &&
        e.content?.trim(),
    )

    if (valid.length === 0) {
      console.warn("[ScienceEnricher] All enrichments invalid — returning null")
      return null
    }

    return {
      enrichments: valid,
      overall_assessment: result.overall_assessment ?? `${valid.length} enrichments generated.`,
    }
  } catch (err) {
    // Science Enricher failure is non-fatal — the loop continues without enrichment
    console.error(
      `[ScienceEnricher] LLM call failed: ${(err as Error).message}`,
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// Feedback formatter
// ---------------------------------------------------------------------------

/**
 * Formats Science Enricher output as structured feedback for injection
 * into the Writer's next-pass user prompt. The Writer receives these as
 * suggestions to integrate, not commands to copy-paste.
 */
export function formatEnrichmentsForWriter(
  output: ScienceEnrichmentOutput,
): string {
  if (!output.enrichments || output.enrichments.length === 0) return ""

  const lines: string[] = [
    "## 🧪 SCIENCE ENRICHMENTS",
    `The following food science enrichments were identified for your article. Integrate them naturally into your next revision — do NOT copy-paste verbatim. Blend them into your voice, in the sections indicated.`,
    "",
  ]

  for (const enrichment of output.enrichments) {
    lines.push(
      `### [${enrichment.type}] → ${enrichment.section}`,
      `**Anchor point**: "...${enrichment.insert_after}..."`,
      `**Enrichment**: ${enrichment.content}`,
      "",
    )
  }

  lines.push(
    `**Assessment**: ${output.overall_assessment}`,
    "",
    "Integrate these enrichments while preserving your authentic voice. If an enrichment doesn't fit naturally, rephrase it until it does — or skip it. Quality over quantity.",
  )

  return lines.join("\n")
}
