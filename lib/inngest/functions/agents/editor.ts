// Agent 4 — Editor & Humanizer
//
// Charge son skill depuis skills/agent-editor.md et applique les corrections
// chirurgicales de l'audit + humanisation anti-détection IA (max 3 passes).
//
// Architecture :
//   System prompt ← loadSkillContent("agent-editor")  (rôle, techniques d'humanisation)
//   User prompt   ← buildUserPrompt()                  (draft, audit, numéro de passe)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import { stripHtmlComments } from "../helpers"
import type { RecipeDraft } from "./writer"
import type { AuditReport } from "./auditor"

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
  const needsHumanization =
    audit.verdict === "NEEDS REVISION" && audit.score_ia_estimation >= 20

  const auditSummary = audit.criteria
    .map(
      (c) =>
        `- [${c.name}] ${c.score}/20\n` +
        `  Issues : ${c.issues.join("; ") || "none"}\n` +
        `  Recommendation : ${c.recommendation || "none"}`,
    )
    .join("\n")

  const factCorrections = audit.factual_corrections.length
    ? "\n## MANDATORY FACTUAL CORRECTIONS\n" +
      audit.factual_corrections
        .map(
          (c) =>
            `- "${c.original}" → "${c.corrected}" (reason : ${c.reason})`,
        )
        .join("\n")
    : ""

  const humanizationBlock = needsHumanization
    ? `\n## Anti-Detection Humanization — Pass ${humanizationPass}/${MAX_HUMANIZATION_PASSES}
Apply ONLY the techniques defined in your system prompt for Pass ${humanizationPass} (see Multi-Pass Escalation). Do not exceed the technique budget for this pass.`
    : ""

  return `Fix "${keyword}" audit defects.
${audit.verdict === "OK" ? "VERDICT OK — factual corrections only." : "VERDICT NEEDS REVISION — fix + humanize."}

## Audit (score: ${audit.overallScore}/100, AI: ${audit.score_ia_estimation}/100)
${auditSummary}
${factCorrections}${humanizationBlock}

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

Respond with the EXACT JSON structure defined in your system prompt — COMPLETE recipe, all fields.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Fixes defects flagged by the Auditor. When verdict is "NEEDS REVISION"
 * with a high AI score, applies a humanization anti-detection pass.
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

    // maxTokens 6144: must regenerate the FULL article (1800-2200 words) + all metadata
    // + corrections. 3072 was too small and caused JSON truncation.
    const result = await runTextAndParseJson<RecipeDraft>(systemPrompt, userPrompt, {
      temperature: 0.8,
      maxTokens: 6144,
    })

    // Safety net: strip any HTML comments that survived the Writer's sanitization
    // (or were re-introduced during editing). Guarantees clean output.
    if (result.contentMarkdown) {
      result.contentMarkdown = stripHtmlComments(result.contentMarkdown)
    }

    result.humanization_pass = humanizationPass
    result.changes_summary = `Pass ${humanizationPass}: ${audit.criteria.reduce((s, c) => s + c.issues.length, 0)} defects corrected${
      audit.verdict === "NEEDS REVISION" && audit.score_ia_estimation >= 20 ? " + anti-AI humanization" : ""
    }`
    return result
  } catch (err) {
    throw new Error(
      `[Editor] LLM call failed for "${keyword}" (pass ${humanizationPass}): ${(err as Error).message}`,
      { cause: err },
    )
  }
}
