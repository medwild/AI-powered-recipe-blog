// Agent 3 — Pre-Publication Content Quality Auditor v6.0
//
// Charge son skill depuis skills/agent-auditor.md (v6.0.0-PREPUB) et évalue
// le brouillon sur 9 dimensions de qualité (Factualité, Validité Recette,
// Originalité, Utilité, Expérience, Cohérence Interne, E-E-A-T/Trust,
// Sur-Optimisation SEO, Signature LLM) avec décision de publication.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-auditor")  (9 dimensions, weighted scoring)
//   User prompt   ← buildUserPrompt()                   (draft, keyword, entités)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/anthropic"
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import type { RecipeDraft } from "./writer"
import type { LinkTarget } from "../steps/link-suggester"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditDecision = "PASS" | "MINOR_FIX" | "MAJOR_REWRITE" | "REJECT"
export type ConfidenceLevel = "low" | "medium" | "high"
export type FixPriority = "must_fix" | "should_fix" | "optional"

export type AuditScores = {
  factualite: number
  validite_recette: number | null
  originalite: number
  utilite: number
  experience: number
  coherence_interne: number
  eeat_trust: number
  sur_optimisation_seo: number
  signature_llm: number
}

export type AuditIssue = {
  criterion: string
  issue: string
  quote?: string
  location?: string
}

export type AuditEvidence = {
  criterion: string
  observation: string
  quote: string
  impact: "positive" | "negative"
}

export type RequiredFix = {
  priority: FixPriority
  description: string
  location?: string
  original?: string
  corrected?: string
}

export type AuditReport = {
  decision: AuditDecision
  publication_readiness_score: number
  confidence_level: ConfidenceLevel
  content_type: "recipe" | "article"

  scores: AuditScores

  critical_issues: AuditIssue[]
  major_issues: AuditIssue[]
  minor_issues: AuditIssue[]

  evidence: AuditEvidence[]

  required_fixes: RequiredFix[]
  rewrite_instructions: string[]
  final_recommendation: string
  summary: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_DECISIONS: AuditDecision[] = ["PASS", "MINOR_FIX", "MAJOR_REWRITE", "REJECT"]
const VALID_CONFIDENCE: ConfidenceLevel[] = ["low", "medium", "high"]

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(
  keyword: string,
  draft: RecipeDraft,
  semanticEntities: string[],
  linkTargets?: LinkTarget[],
): string {
  const hasRecipe = !!(draft.ingredients?.length || draft.instructions?.length)
  const validSlugsList = linkTargets?.length
    ? linkTargets.map(t => t.slug).join(", ")
    : "No valid slugs provided for validation"

  return `Evaluate this ${hasRecipe ? "recipe" : "article"} for the keyword "${keyword}".

## Content to Evaluate
- Title : ${draft.title}
- Meta title : ${draft.metaTitle}
- Meta description : ${draft.metaDescription}
- Excerpt : ${draft.excerpt}
- Tags : ${draft.tags.join(", ")}
- Times : prep ${draft.prepTime} | cook ${draft.cookTime} | total ${draft.totalTime}
- Servings : ${draft.servings}
- Difficulty : ${draft.difficulty}
- ${hasRecipe ? `Ingredients : ${draft.ingredients.length} items` : "Type : Article (no recipe structure)"}
- ${hasRecipe ? `Instructions : ${draft.instructions.length} steps` : ""}
- Expected semantic entities : ${semanticEntities.join(", ")}

### Markdown Content (FULL)
${draft.contentMarkdown}

## Link Quality Criteria

In addition to the 9-dimension framework, evaluate these 3 link quality criteria:

9. link_count — Score 0-100
   Count internal markdown links (pattern: [text](/path)) in the article body.
   - 2-4 links: 100
   - 1 link: 50
   - 0 links: 0
   - 5+ links: 80 (over-linking penalty)
   Severity: WARNING if link count is 0 or 1

10. anchor_quality — Score 0-100
    Check EVERY internal link's anchor text.
    Banned anchor texts (case-insensitive, exact match or contains):
    "click here", "read more", "here", "learn more", "this recipe", "this article"
    - All anchors pass (descriptive, varied): 100
    - 1 banned anchor found: 40 → HARD FAIL
    - 2+ banned anchors: 0 → HARD FAIL
    Report which links failed and why.

11. broken_links — Score 0-100
    Verify every linked slug against this list of valid slugs:
    ${validSlugsList}
    - All links match valid slugs: 100
    - ANY link points to a slug not in the list: 0 → HARD FAIL

Evaluate according to the 9-dimension framework and decision rules defined in your system prompt.`
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Formats a snake_case criterion key for display. */
function formatCriterionDisplayName(key: string): string {
  const display: Record<string, string> = {
    factualite: "Factualité",
    validite_recette: "Validité Recette",
    originalite: "Originalité",
    utilite: "Utilité",
    experience: "Expérience",
    coherence_interne: "Cohérence Interne",
    eeat_trust: "E-E-A-T / Trust",
    sur_optimisation_seo: "Sur-Optimisation SEO",
    signature_llm: "Signature LLM",
  }
  return display[key] ?? key
}

export { formatCriterionDisplayName }

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Pre-Publication Content Quality Auditor v6.0.
 *
 * Evaluates drafts on 9 dimensions of content quality (not AI detection).
 * Produces a calibrated report with PASS/MINOR_FIX/MAJOR_REWRITE/REJECT decision.
 *
 * Dimensions:
 *   1. Factualité (20%)        — accuracy, verifiability, no hallucination
 *   2. Validité Recette (15%)  — technical executability (null for articles)
 *   3. Originalité (15%)       — added value vs SERP, editorial angle
 *   4. Utilité (15%)           — reader leaves with clearer decision/action
 *   5. Expérience (10%)        — first-hand testing, observation, preference
 *   6. Cohérence Interne (10%) — no contradictions, promises kept
 *   7. E-E-A-T / Trust (10%)   — author, sources, safety caution
 *   8. Sur-Optimisation SEO (2.5%, INVERTED) — visible SEO at reader's expense
 *   9. Signature LLM (2.5%, INVERTED)        — recognizable LLM patterns
 */
export async function agentAuditor(
  keyword: string,
  draft: RecipeDraft,
  semanticEntities: string[],
  format: "google" | "pin-first" = "google",
  linkTargets?: LinkTarget[],
): Promise<AuditReport> {
  try {
    const mergedReplacements = { format } as Record<string, string>
    const systemPrompt = await loadSkillContent("agent-auditor", mergedReplacements)
    const userPrompt = buildUserPrompt(keyword, draft, semanticEntities, linkTargets)

    // Temperature 0.1 for deterministic, reproducible scoring.
    // maxTokens 6144: the full article (1800-2200 words) + system prompt are
    // massive — Cloudflare fallback models need headroom to avoid "stream of
    // consciousness" token exhaustion before JSON output.
    const report = await runTextAndParseJson<AuditReport>(systemPrompt, userPrompt, {
      temperature: 0.1,
      maxTokens: 6144,
      model: "@cf/google/gemma-4-26b-a4b-it",
    })

    // Contract validation — catches skill/code field name mismatches at runtime.
    const validation = validateContract(report as Record<string, unknown>, AGENT_CONTRACTS.Auditor)
    if (validation.warnings.length > 0) {
      console.warn("[Auditor] Contract warnings:", validation.warnings.join("; "))
    }
    if (validation.aliased.length > 0) {
      console.log("[Auditor] Aliased fields:", validation.aliased.join(", "))
    }

    // ── Normalize arrays ──────────────────────────────────────────────────
    report.critical_issues = report.critical_issues ?? []
    report.major_issues = report.major_issues ?? []
    report.minor_issues = report.minor_issues ?? []
    report.evidence = report.evidence ?? []
    report.required_fixes = report.required_fixes ?? []
    report.rewrite_instructions = report.rewrite_instructions ?? []

    // ── Normalize scores ──────────────────────────────────────────────────
    report.publication_readiness_score =
      typeof report.publication_readiness_score === "number" && !isNaN(report.publication_readiness_score)
        ? Math.max(0, Math.min(100, report.publication_readiness_score))
        : 0

    if (!report.scores) {
      report.scores = {
        factualite: 0, validite_recette: null, originalite: 0, utilite: 0,
        experience: 0, coherence_interne: 0, eeat_trust: 0,
        sur_optimisation_seo: 100, signature_llm: 100,
      }
    } else {
      // Clamp normal scores 0-100
      const normalKeys: (keyof AuditScores)[] = [
        "factualite", "originalite", "utilite", "experience",
        "coherence_interne", "eeat_trust",
      ]
      for (const key of normalKeys) {
        const val = report.scores[key]
        if (typeof val === "number" && !isNaN(val)) {
          (report.scores as Record<string, number>)[key] = Math.max(0, Math.min(100, val))
        } else {
          (report.scores as Record<string, number>)[key] = 0
        }
      }
      // Clamp inverted scores (sur_optimisation_seo, signature_llm) 0-100
      for (const key of ["sur_optimisation_seo", "signature_llm"] as const) {
        const val = report.scores[key]
        if (typeof val === "number" && !isNaN(val)) {
          report.scores[key] = Math.max(0, Math.min(100, val))
        } else {
          report.scores[key] = 100 // default to max risk for inverted scores
        }
      }
      // validite_recette: null for articles, 0-100 for recipes
      if (report.scores.validite_recette !== null) {
        const val = report.scores.validite_recette
        if (typeof val === "number" && !isNaN(val)) {
          report.scores.validite_recette = Math.max(0, Math.min(100, val))
        } else {
          report.scores.validite_recette = null
        }
      }
    }

    // ── Normalize decision ────────────────────────────────────────────────
    if (!VALID_DECISIONS.includes(report.decision as AuditDecision)) {
      // Fallback: derive from publication_readiness_score
      const s = report.publication_readiness_score
      report.decision = s >= 70 ? "MINOR_FIX" : s >= 55 ? "MAJOR_REWRITE" : "REJECT"
    }

    // ── Normalize confidence_level ────────────────────────────────────────
    if (!VALID_CONFIDENCE.includes(report.confidence_level as ConfidenceLevel)) {
      report.confidence_level = "medium"
    }

    // ── Normalize content_type ────────────────────────────────────────────
    if (!["recipe", "article"].includes(report.content_type)) {
      const hasRecipe = !!(draft.ingredients?.length || draft.instructions?.length)
      report.content_type = hasRecipe ? "recipe" : "article"
    }

    // ── Default text fields ───────────────────────────────────────────────
    report.final_recommendation = report.final_recommendation ?? ""
    report.summary = report.summary ?? ""

    return report
  } catch (err) {
    throw new Error(
      `[Auditor] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
