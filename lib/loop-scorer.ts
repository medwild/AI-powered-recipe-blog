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
// Composite Scoring (kept for quality logging — no longer drives a loop)
// ---------------------------------------------------------------------------
