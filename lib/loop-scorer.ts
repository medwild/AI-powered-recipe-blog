// lib/loop-scorer.ts
// Pipeline v11 — Composite scoring + structured feedback for the
// Evaluator-Optimizer loop.
//
// Pure functions only — no side effects, no API calls, no DB access.
// The Checker is deterministic: GEO citability + Content validation.
// No LLM in the evaluation path (Maker/Checker split from loop-engineering).

import type { CitabilityReport } from "@/lib/geo-validator"
import type { ValidationResult } from "@/lib/content-validator"
import type { QualityVerdict } from "@/lib/inngest/functions/agents/judge"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoopScore {
  total: number          // 0-100 composite
  geoComponent: number   // GEO citability contribution (max 50)
  contentComponent: number // Content validation contribution (max 30)
  structureComponent: number // Structural completeness contribution (max 20)
  breakdown: string      // Human-readable breakdown for logs
}

// ---------------------------------------------------------------------------
// Composite Scoring
// ---------------------------------------------------------------------------

/**
 * Computes a composite loop score from GEO citability, content validation,
 * and LLM Judge quality evaluation.
 *
 * Weighting (v2 — Judge de-risked):
 *   GEO citability:  50% — claims, attributions, answer nuggets (deterministic)
 *   Judge quality:   20% — culinary accuracy, narrative, usefulness, structure
 *   Content quality: 20% — banned words, health claims, meta, word count
 *   Structure:       10% — ingredients, instructions, tags, image placeholders
 *
 * The Judge (Haiku 4.5) weight was reduced from 40% to 20% to eliminate
 * systemic evaluation distortion from a weak evaluator model. GEO citability
 * (deterministic code) is more reliable and now drives the score.
 *
 * This score drives the stopping decision in the Evaluator-Optimizer loop.
 * Threshold: score >= GEO_BLOCK_THRESHOLD (env, default 70) → break loop.
 */
export function computeLoopScore(
  citability: CitabilityReport,
  validation: ValidationResult,
  judgeVerdict?: QualityVerdict,
): LoopScore {
  // Judge quality: 20% of composite (reduced from 40% — Haiku 4.5 is a weak evaluator)
  const judgeScore = judgeVerdict?.totalScore ?? 0

  // GEO citability: 50% of composite (increased from 30% — deterministic, reliable)
  const geoComponent = Math.round(citability.score * 0.50)

  // Content validation: 20% of composite (unchanged)
  // Each critical error costs 15 points, each warning costs 5
  // Each banned word costs 5 points — penalizes the LLM for producing them
  const errorCount = validation.errors.filter(e => e.severity === "error").length
  const warnCount = validation.errors.filter(e => e.severity === "warning").length
  const bannedWordCount = validation.errors.filter(e => e.message.includes("Banned word")).length
  const contentRaw = Math.max(0, 100 - errorCount * 15 - warnCount * 5 - bannedWordCount * 5)
  const contentComponent = Math.round(contentRaw * 0.20)

  // Structural completeness: 10% of composite (unchanged)
  const structureRaw = errorCount === 0 ? 100 : Math.max(0, 100 - errorCount * 10)
  const structureComponent = Math.round(structureRaw * 0.10)

  // Judge quality: 20% of composite
  const judgeComponent = Math.round(judgeScore * 0.20)

  const total = geoComponent + contentComponent + structureComponent + judgeComponent

  const breakdown =
    `GEO:${citability.score}/100→${geoComponent} ` +
    `Judge:${judgeScore}/100→${judgeComponent} ` +
    `Content:${contentRaw}/100→${contentComponent} ` +
    `Structure:${structureRaw}/100→${structureComponent} ` +
    `= ${total}/100`

  return { total, geoComponent, contentComponent, structureComponent, breakdown }
}

// ---------------------------------------------------------------------------
// Structured Feedback Builder
// ---------------------------------------------------------------------------

/**
 * Builds structured, machine-parseable feedback from validator results.
 *
 * The feedback is injected into the USER prompt of the next Writer pass
 * (not the system prompt — the skill stays immutable). Each line targets
 * a specific, fixable issue with exact counts so the Writer knows what
 * to add.
 *
 * Design rules (from loop-engineering anti-patterns):
 *   - No narrative paragraphs — structured, scannable
 *   - Exact counts ("2/6") not vague ("not enough")
 *   - Actionable ("Add 4 attributions using patterns §5.2") not generic ("improve")
 */
export function buildLoopFeedback(
  citability: CitabilityReport,
  validation: ValidationResult,
  passNumber: number,
  maxPasses: number,
): string {
  const lines: string[] = [
    `## ⚠️ QUALITY FEEDBACK — Pass ${passNumber}/${maxPasses}`,
    `Score: ${citability.score}/100. Fix ALL issues below before outputting.`,
    "",
  ]

  // ── GEO Citability feedback ──────────────────────────────────────────

  if (citability.attributions.count < citability.attributions.minRequired) {
    const missing = citability.attributions.minRequired - citability.attributions.count
    lines.push(`### ❌ ATTRIBUTIONS: ${citability.attributions.count}/${citability.attributions.minRequired}`)
    lines.push(`Add ${missing} more source attributions using the 4 patterns from §5.2:`)
    lines.push(`1. Named Authority + Claim ("Chef Augustin Lefèvre recommends...")`)
    lines.push(`2. First-Person Testing ("I've tested this [N] times...")`)
    lines.push(`3. Cause-Effect Expertise ("[Claim] because [mechanism]")`)
    lines.push(`4. Comparison Anchoring ("Unlike [common], [ours] because...")`)
    lines.push("Each attribution MUST co-occur with a specific claim (number, entity, or cause-effect) in the same paragraph.")
    lines.push("")
  }

  if (citability.nuggets.count < citability.nuggets.minRequired) {
    const missing = citability.nuggets.minRequired - citability.nuggets.count
    lines.push(`### ❌ ANSWER NUGGETS: ${citability.nuggets.count}/${citability.nuggets.minRequired}`)
    lines.push(`Add ${missing} more self-contained FAQ answers (## Question? header + 25-120 word answer with specific facts/numbers).`)
    lines.push("Each nugget must contain at least one number OR a named entity. No generic answers.")
    lines.push("")
  }

  if (citability.claims.count < citability.claims.minRequired) {
    const missing = citability.claims.minRequired - citability.claims.count
    lines.push(`### ⚠️ SPECIFIC CLAIMS: ${citability.claims.count}/${citability.claims.minRequired}`)
    lines.push(`Add ${missing} more specific claims: numbered facts, quantified comparisons, or causal claims (because/which creates/preventing).`)
    lines.push("")
  }

  // ── Sections without attributions (granular feedback) ──────────────

  if (citability.attributions.count < citability.attributions.minRequired) {
    lines.push("### 💡 ATTRIBUTION TARGETING")
    lines.push("Distribute attributions across H2 sections. Each major section should contain at least one source attribution + claim pair.")
    lines.push("")
  }

  // ── Banned word feedback ──────────────────────────────────────────

  const bannedWordErrors = validation.errors.filter(e => e.message.includes("Banned word"))
  if (bannedWordErrors.length > 0) {
    lines.push("### ❌ BANNED AI VOCABULARY FOUND")
    lines.push("The following AI-telltale words were detected in your content. Replace each with natural, specific language:")
    for (const err of bannedWordErrors) {
      const wordMatch = err.message.match(/"([^"]+)"/)
      if (wordMatch) lines.push(`- Remove "${wordMatch[1]}" — rewrite the entire sentence naturally.`)
    }
    lines.push("These words are instant AI tells. The validator penalizes them and will scrub them if unfixed.")
    lines.push("")
  }

  // ── Meta title feedback ───────────────────────────────────────────

  const metaTitleError = validation.errors.find(e => e.field === "metaTitle" && e.message.includes("too long"))
  if (metaTitleError) {
    lines.push("### ⚠️ META TITLE TOO LONG")
    lines.push("Your meta title exceeds 60 characters. Rewrite it naturally under 60 chars — do NOT mechanically truncate. A truncated fallback will damage SEO if published.")
    lines.push("")
  }

  // ── Content validation feedback ──────────────────────────────────────

  const criticalErrors = validation.errors.filter(e => e.severity === "error")
  const warnings = validation.errors.filter(e => e.severity === "warning")

  if (criticalErrors.length > 0) {
    lines.push("### ❌ CRITICAL ERRORS (Blocking)")
    for (const err of criticalErrors) {
      lines.push(`- **${err.field}**: ${err.message}`)
    }
    lines.push("")
  }

  if (warnings.length > 0) {
    lines.push("### ⚠️ WARNINGS")
    for (const err of warnings) {
      lines.push(`- ${err.field}: ${err.message}`)
    }
    lines.push("")
  }

  // ── Positive signal (if mostly good) ─────────────────────────────────

  if (citability.score >= 50 && criticalErrors.length === 0) {
    lines.push("### ✅ Keep")
    lines.push("Your structure, culinary precision, and overall flow are good. Focus only on adding the missing attributions and nuggets above — do NOT rewrite sections that are working.")
    lines.push("")
  }

  // ── Closing instruction ──────────────────────────────────────────────

  lines.push("---")
  lines.push(`This is pass ${passNumber} of ${maxPasses}. Fix ALL ❌ items. The next pass will re-evaluate and stop if the threshold is met.`)
  lines.push("Output ONLY the JSON object — no markdown fences, no reasoning.")

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Stopping condition helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the loop should stop because the quality threshold is met.
 */
export function thresholdMet(
  score: LoopScore,
  geoBlockThreshold: number,
  citability: CitabilityReport,
  validation: ValidationResult,
): boolean {
  const noErrors = validation.errors.filter(e => e.severity === "error").length === 0
  return score.total >= geoBlockThreshold && citability.passed && noErrors
}

/**
 * Returns true if the score hasn't improved for 2 consecutive passes.
 * Allows one stagnation before declaring diminishing returns.
 */
export function isDiminishing(score: number, previousScore: number, stagnationCount: number): boolean {
  if (score > previousScore) return false
  return stagnationCount >= 1 // Allow 1 stagnation, stop at 2nd consecutive
}
