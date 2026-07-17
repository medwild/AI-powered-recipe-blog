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
 * The Judge weight was reduced from 40% to 20% to eliminate
 * systemic evaluation distortion from a weaker evaluator model. GEO citability
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
  // Judge quality: 20% of composite
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
 * Builds surgical feedback from validator results for the next Writer pass.
 *
 * Karpathy rule: simplicity first. DeepSeek regresses when feedback exceeds
 * ~500 chars — it tries to rewrite everything and loses what worked. This
 * version reports ONLY the top 2 blocking issues as imperative one-liners,
 * with explicit instructions to preserve everything else.
 *
 * Priority order (only top 2 are emitted):
 *   1. Food safety violations (CRITICAL — USDA temps, unsafe practices)
 *   2. Banned words (instant AI tell, deterministic scrubber will catch)
 *   3. Missing attributions (GEO citability, second-most impactful)
 *   4. Missing answer nuggets (GEO structure)
 *   5. Meta length / other warnings
 *
 * Design constraints:
 *   - Max 500 chars total
 *   - One imperative sentence per issue
 *   - "DO NOT rewrite working sections" is the first instruction
 *   - No praise, no narrative, no § references
 */
export function buildLoopFeedback(
  citability: CitabilityReport,
  validation: ValidationResult,
  passNumber: number,
  maxPasses: number,
): string {
  const issues: string[] = []

  // ── Priority 1: Food safety (CRITICAL — blocks publication) ─────────

  const foodSafetyErrors = validation.errors.filter(
    e => e.severity === "error" && e.message.includes("food safety"),
  )
  for (const err of foodSafetyErrors) {
    // Extract the wrong temperature and the correct one
    const tempMatch = err.message.match(/Found (\d+°F)/)
    const correctMatch = err.message.match(/USDA minimum is (\d+°F)/)
    if (tempMatch && correctMatch) {
      issues.push(`Replace "${tempMatch[1]}" with "${correctMatch[1]}" (USDA minimum for poultry). Do not mention any temperature below 165°F for chicken.`)
    } else {
      issues.push(`Fix food safety: ${err.message.split(".")[0]}.`)
    }
  }

  // ── Priority 2: Banned words ───────────────────────────────────────

  const bannedWordErrors = validation.errors.filter(e => e.message.includes("Banned word"))
  for (const err of bannedWordErrors) {
    const wordMatch = err.message.match(/"([^"]+)"/)
    if (wordMatch) {
      issues.push(`Replace the word "${wordMatch[1]}" with a concrete description of what you see.`)
    }
  }

  // ── Priority 3: Missing attributions (GEO) ──────────────────────────

  if (citability.attributions.count < citability.attributions.minRequired) {
    const missing = citability.attributions.minRequired - citability.attributions.count
    issues.push(
      `Insert ${missing} first-person attribution${missing > 1 ? "s" : ""} (e.g. "I've tested this", "my go-to method", "Chef Augustin recommends") into existing paragraphs — each paired with a specific fact or number. Do NOT add new sections.`,
    )
  }

  // ── Priority 4: Missing answer nuggets ──────────────────────────────

  if (citability.nuggets.count < citability.nuggets.minRequired) {
    const missing = citability.nuggets.minRequired - citability.nuggets.count
    issues.push(
      `Add ${missing} FAQ H2${missing > 1 ? "s" : ""} (## Question?) with a 25-120 word answer containing a specific number or fact.`,
    )
  }

  // ── Priority 5: Meta title too long ─────────────────────────────────

  const metaTitleError = validation.errors.find(
    e => e.field === "metaTitle" && e.message.includes("too long"),
  )
  if (metaTitleError) {
    issues.push("Shorten metaTitle to under 60 characters without truncating mid-word.")
  }

  // ── Assemble: top 2 issues only, boxed with preservation directive ──

  const topIssues = issues.slice(0, 2)

  if (topIssues.length === 0) {
    return `## ✅ Pass ${passNumber}/${maxPasses} — No blocking issues. Output the same JSON unchanged.`
  }

  const lines: string[] = [
    `## 🔧 PASS ${passNumber}/${maxPasses} — SURGICAL FIXES ONLY`,
    `CRITICAL: Do NOT rewrite the article. Keep every paragraph, sentence, and word that is NOT mentioned below. Only fix these ${topIssues.length} issue${topIssues.length > 1 ? "s" : ""}:`,
    "",
  ]

  for (let i = 0; i < topIssues.length; i++) {
    lines.push(`${i + 1}. ${topIssues[i]}`)
  }

  lines.push("")
  lines.push("Output the complete JSON with ONLY these fixes applied. Everything else stays exactly as it was.")

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
