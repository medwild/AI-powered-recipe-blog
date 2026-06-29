// Agent 3 — Quality Auditor
//
// Charge son skill depuis skills/agent-auditor.md et évalue le brouillon
// sur 7 critères (SEO, AEO/GEO, readability, humanization, sensory,
// anti-hallucination, anti-AI) avec verdict conditionnel OK / NEEDS REVISION.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-auditor")  (rôle, 7 critères, règles de verdict)
//   User prompt   ← buildUserPrompt()                   (draft, keyword, entités)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import type { RecipeDraft } from "./writer"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditReport = {
  overallScore: number
  criteria: {
    name: string
    score: number
    issues: string[]
    recommendation: string
  }[]
  score_ia_estimation: number
  factual_corrections: {
    original: string
    corrected: string
    reason: string
    source: string
  }[]
  verdict: "OK" | "NEEDS REVISION"
  summary: string
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(
  keyword: string,
  draft: RecipeDraft,
  semanticEntities: string[],
): string {
  return `Evaluate this recipe article for the keyword "${keyword}".

## Article to Evaluate
- Title : ${draft.title}
- Meta title : ${draft.metaTitle}
- Meta description : ${draft.metaDescription}
- Excerpt : ${draft.excerpt}
- Tags : ${draft.tags.join(", ")}
- Times : prep ${draft.prepTime} | cook ${draft.cookTime} | total ${draft.totalTime}
- Servings : ${draft.servings}
- Difficulty : ${draft.difficulty}
- Number of ingredients : ${draft.ingredients.length}
- Number of instructions : ${draft.instructions.length}
- Expected semantic entities : ${semanticEntities.join(", ")}

### Markdown Content (FULL)
${draft.contentMarkdown}

Evaluate according to the criteria and rules defined in your system prompt.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Evaluates the draft on 7 criteria (SEO, AEO/GEO, readability,
 * humanization/persona, sensory richness, anti-hallucination, anti-AI detection)
 * and produces a report with conditional verdict.
 */
export async function agentAuditor(
  keyword: string,
  draft: RecipeDraft,
  semanticEntities: string[],
): Promise<AuditReport> {
  try {
    const systemPrompt = await loadSkillContent("agent-auditor")
    const userPrompt = buildUserPrompt(keyword, draft, semanticEntities)

    // Temperature 0.1 for deterministic, reproducible scoring.
    // maxTokens 6144: the full article (1800-2200 words) + system prompt are
    // massive — Cloudflare fallback models need headroom to avoid "stream of
    // consciousness" token exhaustion before JSON output.
    const report = await runTextAndParseJson<AuditReport>(systemPrompt, userPrompt, {
      temperature: 0.1,
      maxTokens: 6144,
    })

    // Normalize: LLM may return null/undefined for empty arrays
    report.criteria = report.criteria ?? []
    report.factual_corrections = report.factual_corrections ?? []

    // Clamp scores to valid ranges (LLM sometimes returns > max)
    report.overallScore = Math.max(0, Math.min(100, report.overallScore))
    report.score_ia_estimation =
      typeof report.score_ia_estimation === "number" && !isNaN(report.score_ia_estimation)
        ? Math.max(0, Math.min(100, report.score_ia_estimation))
        : 0
    for (const c of report.criteria) {
      c.score = Math.max(0, Math.min(20, c.score))
      c.issues = c.issues ?? []
    }

    return report
  } catch (err) {
    throw new Error(
      `[Auditor] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
