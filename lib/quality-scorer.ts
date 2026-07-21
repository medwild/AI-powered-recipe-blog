// lib/quality-scorer.ts
// Pipeline v13 — Composite quality scoring for the Quality Gate.
// Used for logging and monitoring; no longer drives an iterative loop
// (v13 is single-pass with retry on truncation only).
//
// Pure functions only — no side effects, no API calls, no DB access.
// The checker is deterministic: GEO citability + Content validation.
// No LLM in the evaluation path.

import type { CitabilityReport } from "@/lib/geo-validator"
import type { ValidationResult } from "@/lib/content-validator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityScore {
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
 * Computes a composite quality score from GEO citability and content validation.
 *
 * v13 Single-Pass: no LLM Judge — deterministic validators only.
 * The Judge agent exists for optional external evaluation but is not part
 * of the automated pipeline scoring.
 *
 * Weighting (v13):
 *   GEO citability:  60% — claims, attributions, answer nuggets (deterministic)
 *   Content quality: 25% — banned words, health claims, meta, word count
 *   Structure:       15% — ingredients, instructions, tags, image placeholders
 *
 * This score is used for quality logging and monitoring; it no longer drives
 * an iterative loop (v13 is single-pass with retry on truncation only).
 */
export function computeQualityScore(
  citability: CitabilityReport,
  validation: ValidationResult,
): QualityScore {
  // GEO citability: 60% of composite (deterministic, most reliable signal)
  const geoComponent = Math.round(citability.score * 0.60)

  // Content validation: 25% of composite
  // Each critical error costs 15 points, each warning costs 5
  // Each banned word costs 5 points — penalizes the LLM for producing them
  const errorCount = validation.errors.filter(e => e.severity === "error").length
  const warnCount = validation.errors.filter(e => e.severity === "warning").length
  const bannedWordCount = validation.errors.filter(e => e.message.includes("Banned word")).length
  const contentRaw = Math.max(0, 100 - errorCount * 15 - warnCount * 5 - bannedWordCount * 5)
  const contentComponent = Math.round(contentRaw * 0.25)

  // Structural completeness: 15% of composite
  const structureRaw = errorCount === 0 ? 100 : Math.max(0, 100 - errorCount * 10)
  const structureComponent = Math.round(structureRaw * 0.15)

  const total = geoComponent + contentComponent + structureComponent

  const breakdown =
    `GEO:${citability.score}/100→${geoComponent} ` +
    `Content:${contentRaw}/100→${contentComponent} ` +
    `Structure:${structureRaw}/100→${structureComponent} ` +
    `= ${total}/100`

  return { total, geoComponent, contentComponent, structureComponent, breakdown }
}
