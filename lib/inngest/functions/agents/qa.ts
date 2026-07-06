// Agent 5 — Quality Assurance v1.1 LIGHT
//
// Charge son skill depuis skills/agent-qa.md (v1.1 ULTRA LIGHT) et vérifie
// les corrections de l'Editor en utilisant des RÉSUMÉS STRUCTURÉS au lieu
// des documents complets. Empêche la saturation du contexte LLM tout en
// préservant l'intégrité de la vérification cross-agent.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-qa")     (rôle, 5 checks, verdicts)
//   User prompt   ← buildSummaryPrompt()              (résumés extraits des documents)
//
// Résumés extraits :
//   strategist_summary — H2, entités, PAA, meta (≤500 mots)
//   writer_summary      — anecdotes, sensory, tokens, rythme (≤800 mots)
//   auditor_summary     — corrections, verdict, issues (≤600 mots)
//   editor_output       — RecipeDraft complet (seul document intégral)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import type { SeoPlan } from "./strategist"
import type { RecipeDraft } from "./writer"
import type { AuditReport } from "./auditor"

// ---------------------------------------------------------------------------
// Types (compatibles v1.0 — ajout v1.1)
// ---------------------------------------------------------------------------

export type QACheckStatus = "PASS" | "FAIL" | "NEEDS_REVIEW"

export type QACheck = {
  checkId: number
  name: string
  status: QACheckStatus
  corrections?: {
    correctionId: number
    status: QACheckStatus
    original: string
    expected: string
    foundInEditor: string
    notes: string
  }[]
  details?: Record<string, unknown>
  issues: string[]
}

export type QAVerdict = "PASS" | "NEEDS_FIX" | "REJECT" | "CRITICAL"

export type QAReport = {
  qaScore: number
  verdict: QAVerdict
  checks: QACheck[]
  summary: string
}

// ---------------------------------------------------------------------------
// Summary extraction helpers (v1.1 LIGHT)
// ---------------------------------------------------------------------------

/** Extrait les anecdotes personnelles du markdown (détection heuristique). */
function extractAnecdotes(
  md: string,
): { location: string; summary: string; type: string }[] {
  const anecdotes: { location: string; summary: string; type: string }[] = []
  // Heuristique : phrases avec marqueurs narratifs personnels
  const markers = [
    /(?:I remember|I once|I tried|I failed|I burned|I ruined|I lost|my first|when I was|I learned|I discovered)/gi,
    /(?:one afternoon|one evening|one morning|the first time|it took me)/gi,
    /(?:last week|just last month|in all my years|the first time I|back when I was)/gi,
    /(?:after \d+ years of|I will never forget|let me tell you about)/gi,
    /(?:I made this \d+ times|I've tested this \d+|batch #\d+|I've made this)/gi,
  ]
  const lines = md.split("\n")
  for (const line of lines) {
    for (const marker of markers) {
      if (marker.test(line) && line.length > 30) {
        anecdotes.push({
          location: "content",
          summary: line.trim().substring(0, 120),
          type: /fail|burn|ruin|lost|wrong/i.test(line) ? "failure" : "experience",
        })
        break
      }
    }
    if (anecdotes.length >= 8) break // max 8 anecdotes (was 5 — expanded per Karpathy review)
  }
  return anecdotes
}

/** Extrait les détails sensoriels du markdown. */
function extractSensoryDetails(
  md: string,
): { location: string; detail: string }[] {
  const details: { location: string; detail: string }[] = []
  const sensoryPatterns = [
    /(?:crackl|crunch|sizzl|bubbl|hiss|pop)/gi,
    /(?:velvety|silky|creamy|fluffy|crisp|tender|juicy|moist)/gi,
    /(?:aroma|fragrance|scent|smell|perfume)/gi,
    /(?:golden|bronze|russet|amber|crimson|emerald)/gi,
    /(?:shatter|honeycomb|shaggy|supple|elastic|tacky)/gi,
    /(?:glossy|mahogany|tawny|blonde|caramel)/gi,
    /(?:puff|inflate|billow|dome|bloom)/gi,
    /(?:steam|vapor|wisp)/gi,
    /(?:weight|heft|dense|airy|light as)/gi,
  ]
  const lines = md.split("\n")
  for (const line of lines) {
    for (const pattern of sensoryPatterns) {
      if (pattern.test(line) && line.length > 15) {
        details.push({
          location: "content",
          detail: line.trim().substring(0, 100),
        })
        break
      }
    }
    if (details.length >= 10) break // max 10 sensory details (was 5)
  }
  return details
}

/** Détecte les voice tokens dans le markdown. */
function detectVoiceTokens(md: string): string[] {
  const tokens: string[] = []
  const patterns: [string, RegExp][] = [
    ["WARM", /(?:comfort|home|family|grandma|memories|cozy|nostalg)/gi],
    ["SHARP", /(?:spotty|doesn't cut it|nope|nah|sorry|not even close)/gi],
    ["WINK", /(?:trust me|I promise|I swear|I mean|you know|believe me)/gi],
    ["GRIT", /(?:fail|burn|ruin|disaster|mess|wrong|mistake|ugly)/gi],
    ["GLOW", /(?:perfect|golden|beautiful|glorious|magnificent|stunning)/gi],
  ]
  for (const [token, pattern] of patterns) {
    if (pattern.test(md)) tokens.push(token)
  }
  return tokens
}

/** Extrait les phrases courtes (≤5 mots) du markdown. */
function extractShortSentences(md: string): string[] {
  // Matches sentences starting with uppercase OR lowercase (fragments like "y'know.")
  const sentences = md.match(/(?:^|[.!?]\s+)[A-Za-z][^.!?]*[.!?]/g) ?? []
  return sentences
    .filter((s) => s.trim().split(/\s+/).length <= 5)
    .slice(0, 5)
    .map((s) => s.trim())
}

/** Extrait les phrases longues (≥25 mots) du markdown. */
function extractLongSentences(md: string): string[] {
  const sentences = md.match(/(?:^|[.!?]\s+)[A-Za-z][^.!?]*[.!?]/g) ?? []
  return sentences
    .filter((s) => s.trim().split(/\s+/).length >= 25)
    .slice(0, 5)
    .map((s) => s.trim())
}

/** Détecte les micro-imperfections intentionnelles. */
function extractMicroImperfections(md: string): string[] {
  const imperfections: string[] = []
  const patterns = [/gonna/gi, /y'know/gi, /I mean\.\.\./gi, /kinda/gi, /sorta/gi, /ain't/gi, /c'mon/gi]
  for (const pattern of patterns) {
    const match = md.match(pattern)
    if (match) imperfections.push(...match)
  }
  return [...new Set(imperfections)].slice(0, 3)
}

// ---------------------------------------------------------------------------
// User prompt builder (v1.1 LIGHT — structured summaries)
// ---------------------------------------------------------------------------

function buildSummaryPrompt(
  keyword: string,
  strategistPlan: SeoPlan,
  writerDraft: RecipeDraft,
  auditorReport: AuditReport,
  editorOutput: RecipeDraft,
  format: "google" | "pin-first" = "google",
): string {
  // --- Strategist Summary (≤500 words) ---
  const h2Sections = strategistPlan.h2Sections ?? []
  const strategistSummary = {
    title: strategistPlan.title,
    metaTitle: strategistPlan.metaTitle,
    metaDescription: strategistPlan.metaDescription,
    h2Structure: h2Sections.map((s) => s.heading),
    semanticEntities: strategistPlan.semanticEntities ?? [],
    paaQuestions: h2Sections.flatMap((s) => s.coverPaa).filter(Boolean),
    targetWordCount: strategistPlan.targetWordCount ?? (format === "pin-first" ? "1200-1500" : "1800-2200"),
    difficulty: strategistPlan.difficulty ?? "Medium",
  }

  // --- Writer Summary (≤800 words) ---
  const writerMd = writerDraft.contentMarkdown ?? ""
  const writerSummary = {
    anecdotes: extractAnecdotes(writerMd),
    sensoryDetails: extractSensoryDetails(writerMd),
    voiceTokens: detectVoiceTokens(writerMd),
    shortSentences: extractShortSentences(writerMd),
    longSentences: extractLongSentences(writerMd),
    microImperfections: extractMicroImperfections(writerMd),
    wordCount: writerMd.split(/\s+/).length,
  }

  // --- Auditor Summary (≤600 words) ---
  const factualCorrections = auditorReport.factual_corrections ?? []
  const criteria = auditorReport.criteria ?? []
  const auditorSummary = {
    verdict: auditorReport.verdict,
    overallScore: auditorReport.overallScore,
    aiScore: auditorReport.score_ia_estimation,
    factualCorrections: factualCorrections.map((c) => ({
      original: c.original,
      corrected: c.corrected,
      location: c.source,
    })),
    issuesByCriterion: criteria.map((c) => ({
      criterion: c.name,
      issues: c.issues,
    })),
    mustFix: factualCorrections.map(
      (c) => `Fix "${c.original}" → "${c.corrected}" because: ${c.reason}`,
    ),
  }

  // --- Editor Output (full JSON — the only complete document) ---
  const editorBlock = `## 4. EDITOR OUTPUT (FULL — the document to verify)
Title: ${editorOutput.title}
MetaTitle: ${editorOutput.metaTitle}
MetaDescription: ${editorOutput.metaDescription}
Tags: ${(editorOutput.tags ?? []).join(", ")}
Times: prep ${editorOutput.prepTime} | cook ${editorOutput.cookTime} | total ${editorOutput.totalTime}
Ingredients: ${(editorOutput.ingredients ?? []).length} items
Instructions: ${(editorOutput.instructions ?? []).length} steps

### Editor contentMarkdown (FULL)
${editorOutput.contentMarkdown ?? ""}
---
`

  return `QA Verification for keyword "${keyword}".

## 1. STRATEGIST SUMMARY (structured — NOT full document)
${JSON.stringify(strategistSummary, null, 2)}

## 2. WRITER SUMMARY (structured — NOT full document)
${JSON.stringify(writerSummary, null, 2)}

## 3. AUDITOR SUMMARY (structured — NOT full document)
${JSON.stringify(auditorSummary, null, 2)}

${editorBlock}
Format: ${format} — ${
    format === "pin-first"
      ? "Pin-first (shorter, visual-focused). Expect 1200-1500 words, 3+ FAQ questions."
      : "Google SEO (long-form). Expect 1800-2200 words, 5 FAQ questions minimum."
  }
Execute the 5 checks defined in your system prompt and return your QA report as JSON.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Quality Assurance agent v1.1 LIGHT — last gate before publication.
 *
 * Uses structured summaries (strategist_summary, writer_summary, auditor_summary)
 * extracted from the full documents to prevent LLM context overflow.
 * Only the editor_output is sent as a full document.
 *
 * @returns QAReport with verdict: PASS → proceed, NEEDS_FIX → re-edit,
 *          REJECT/CRITICAL → HARD STOP (rewrite needed).
 */
export async function agentQA(
  keyword: string,
  strategistPlan: SeoPlan,
  writerDraft: RecipeDraft,
  auditorReport: AuditReport,
  editorOutput: RecipeDraft,
  format: "google" | "pin-first" = "google",
): Promise<QAReport> {
  try {
    const systemPrompt = await loadSkillContent("agent-qa")
    const userPrompt = buildSummaryPrompt(
      keyword,
      strategistPlan,
      writerDraft,
      auditorReport,
      editorOutput,
      format,
    )

    // Temperature 0.1 for deterministic verification
    const report = await runTextAndParseJson<QAReport>(systemPrompt, userPrompt, {
      temperature: 0.1,
      maxTokens: 2048,
    })

    // Contract validation
    const validation = validateContract(report as Record<string, unknown>, AGENT_CONTRACTS.QA)
    if (validation.warnings.length > 0) {
      console.warn("[QA] Contract warnings:", validation.warnings.join("; "))
    }

    // Clamp score to valid range
    report.qaScore = Math.max(0, Math.min(100, report.qaScore))

    // Normalize verdict (with NaN guard)
    if (typeof report.qaScore !== "number" || isNaN(report.qaScore)) {
      report.qaScore = 0
    }
    const validVerdicts: QAVerdict[] = ["PASS", "NEEDS_FIX", "REJECT", "CRITICAL"]
    if (!validVerdicts.includes(report.verdict)) {
      report.verdict =
        report.qaScore <= 20
          ? "CRITICAL"
          : report.qaScore >= 80
            ? "PASS"
            : report.qaScore >= 50
              ? "NEEDS_FIX"
              : "REJECT"
    }

    return report
  } catch (err) {
    throw new Error(
      `[QA] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}
