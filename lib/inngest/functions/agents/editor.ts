// Agent 4 — Editor & Humanizer
//
// Charge son skill depuis skills/agent-editor.md et applique les corrections
// chirurgicales de l'audit + humanisation (max 3 passes).
//
// Architecture :
//   System prompt ← loadSkillContent("agent-editor")  (rôle, techniques d'humanisation)
//   User prompt   ← buildUserPrompt()                  (draft, audit, numéro de passe)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/anthropic"
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import { stripHtmlComments, stripBracketTokens } from "../helpers"
import type { RecipeDraft } from "./writer"
import type { AuditReport } from "./auditor"
import { formatCriterionDisplayName } from "./auditor"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mirrors helpers.ts:MAX_EDITOR_PASSES — used only in the user prompt builder. */
const MAX_HUMANIZATION_PASSES = 3

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(
  keyword: string,
  draft: RecipeDraft,
  audit: AuditReport,
  humanizationPass: number,
): string {
  const needsRewrite = audit.decision === "MAJOR_REWRITE" || audit.decision === "REJECT"
  const needsHumanization =
    needsRewrite && audit.scores.signature_llm >= 30

  // Build scores summary from the scores object
  const scoreLines = (Object.entries(audit.scores) as [string, number | null][])
    .filter(([key]) => key !== "validite_recette" || audit.scores.validite_recette !== null)
    .map(([key, value]) => `- [${formatCriterionDisplayName(key)}] ${value}/100`)
    .join("\n")

  // Collect all issues (critical first, then major, then minor)
  const allIssues = [
    ...audit.critical_issues.map(i => `[CRITICAL] [${i.criterion}] ${i.issue}${i.location ? ` (${i.location})` : ""}`),
    ...audit.major_issues.map(i => `[MAJOR] [${i.criterion}] ${i.issue}${i.location ? ` (${i.location})` : ""}`),
    ...audit.minor_issues.map(i => `[MINOR] [${i.criterion}] ${i.issue}${i.location ? ` (${i.location})` : ""}`),
  ].join("\n")

  // Extract must-fix items from required_fixes
  const mustFixes = audit.required_fixes
    .filter(f => f.priority === "must_fix")
    .map(f => {
      const originalPart = f.original ? `"${f.original}" → ` : ""
      const correctedPart = f.corrected ? `"${f.corrected}"` : ""
      const actionText = originalPart || correctedPart
        ? `${originalPart}${correctedPart} — ${f.description}`
        : f.description
      return `- ${actionText}${f.location ? ` [Location: ${f.location}]` : ""}`
    })
    .join("\n")

  const mustFixBlock = mustFixes
    ? `\n## MANDATORY FIXES\n${mustFixes}`
    : ""

  const humanizationBlock = needsHumanization
    ? `\n## Anti-Detection Humanization — Pass ${humanizationPass}/${MAX_HUMANIZATION_PASSES}
Apply ONLY the techniques defined in your system prompt for Pass ${humanizationPass} (see Multi-Pass Escalation). Do not exceed the technique budget for this pass.`
    : ""

  const decisionLabel =
    audit.decision === "PASS" ? "DECISION: PASS — polish only, no structural changes needed." :
    audit.decision === "MINOR_FIX" ? "DECISION: MINOR_FIX — limited corrections, keep changes minimal." :
    audit.decision === "MAJOR_REWRITE" ? "DECISION: MAJOR_REWRITE — significant revision required. Fix structural issues." :
    "DECISION: REJECT — content needs fundamental rewriting. Focus on the most critical issues first."

  return `Fix "${keyword}" audit defects.
${decisionLabel}

## Pre-Publication Audit (readiness: ${audit.publication_readiness_score}/100)
${scoreLines}

## Issues Detected
${allIssues || "No issues detected."}
${mustFixBlock}${humanizationBlock}

## Draft Metadata
${JSON.stringify({
  title: draft.title,
  metaTitle: draft.metaTitle,
  metaDescription: draft.metaDescription,
  excerpt: draft.excerpt,
  prepTime: draft.prepTime,
  cookTime: draft.cookTime,
  totalTime: draft.totalTime,
  servings: draft.servings,
  difficulty: draft.difficulty,
  tags: draft.tags,
  ingredients: draft.ingredients,
  instructions: draft.instructions,
})}

## Draft contentMarkdown (FULL — edit the complete content)
${draft.contentMarkdown ?? ""}

${audit.rewrite_instructions.length ? `## Rewrite Instructions from Auditor\n${audit.rewrite_instructions.map((ri, i) => `${i + 1}. ${ri}`).join("\n")}` : ""}

Respond with the EXACT JSON structure defined in your system prompt — COMPLETE recipe, all fields.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Fixes defects flagged by the Pre-Publication Auditor. When the decision is
 * MAJOR_REWRITE/REJECT with high LLM signature risk, applies a humanization pass.
 * Produces the final version ready for image generation and publication.
 */
export async function agentEditor(
  keyword: string,
  draft: RecipeDraft,
  audit: AuditReport,
  humanizationPass: number,
  format: "google" | "pin-first" = "google",
): Promise<RecipeDraft> {
  try {
    const mergedReplacements = { format } as Record<string, string>
    const systemPrompt = await loadSkillContent("agent-editor", mergedReplacements)
    const userPrompt = buildUserPrompt(keyword, draft, audit, humanizationPass)

    // maxTokens 8192: must regenerate the FULL article (1800-2200 words) + all metadata
    // + corrections. DeepSeek v4 Pro needs extra headroom for JSON wrapper.
    const result = await runTextAndParseJson<RecipeDraft>(systemPrompt, userPrompt, {
      temperature: 0.8,
      maxTokens: 8192,
    })

    // Contract validation (Editor outputs a RecipeDraft — reuse Writer contract)
    const validation = validateContract(result as Record<string, unknown>, AGENT_CONTRACTS.Writer)
    if (validation.warnings.length > 0) {
      console.warn("[Editor] Contract warnings:", validation.warnings.join("; "))
    }

    // Safety net: strip any HTML comments that survived the Writer's sanitization
    // (or were re-introduced during editing). Guarantees clean output.
    if (result.contentMarkdown) {
      result.contentMarkdown = stripBracketTokens(stripHtmlComments(result.contentMarkdown))
    }

    const totalIssues =
      audit.critical_issues.length + audit.major_issues.length + audit.minor_issues.length

    result.humanization_pass = humanizationPass
    result.changes_summary = `Pass ${humanizationPass}: ${totalIssues} issues addressed${
      audit.decision === "MAJOR_REWRITE" || audit.decision === "REJECT"
        ? audit.scores.signature_llm >= 30
          ? " + anti-AI humanization"
          : " + structural revision"
        : audit.decision === "MINOR_FIX"
          ? " — minor corrections"
          : " — polish only"
    }`
    return result
  } catch (err) {
    throw new Error(
      `[Editor] LLM call failed for "${keyword}" (pass ${humanizationPass}): ${(err as Error).message}`,
      { cause: err },
    )
  }
}
