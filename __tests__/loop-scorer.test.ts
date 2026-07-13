import { describe, it, expect } from "vitest"
import { computeLoopScore, thresholdMet, isDiminishing, buildLoopFeedback } from "@/lib/loop-scorer"
import type { CitabilityReport } from "@/lib/geo-validator"
import type { ValidationResult } from "@/lib/content-validator"

function mockCitability(score: number): CitabilityReport {
  return {
    score,
    claims: { count: 6, minRequired: 6, matches: [] },
    attributions: { count: 4, minRequired: 4, matches: [] },
    nuggets: { count: 4, minRequired: 4, matches: [] },
    passed: score >= 60,
    feedback: "OK",
  }
}

function mockValidation(errors: number, warnings: number): ValidationResult {
  const errs = [
    ...Array(errors).fill({ field: "test", severity: "error" as const, message: "error" }),
    ...Array(warnings).fill({ field: "test", severity: "warning" as const, message: "warning" }),
  ]
  return { passed: errors === 0, errors: errs }
}

describe("computeLoopScore", () => {
  it("computes max score with perfect inputs and judge (v2: GEO 50%, Judge 20%)", () => {
    const score = computeLoopScore(mockCitability(100), mockValidation(0, 0), { totalScore: 100, verdict: "PUBLISH", dimensions: {} as any, criticalIssues: [], strengths: [] })
    // GEO 50 + Judge 20 + Content 20 + Structure 10 = 100
    expect(score.total).toBeGreaterThanOrEqual(85)
  })

  it("penalizes banned words", () => {
    const validation = {
      passed: false,
      errors: [
        { field: "contentMarkdown", severity: "error" as const, message: `Banned word (Tier 1) found: "delve"` },
        { field: "contentMarkdown", severity: "error" as const, message: `Banned word (Tier 1) found: "robust"` },
      ],
    }
    const score = computeLoopScore(mockCitability(70), validation)
    // With 2 banned words, content component should be reduced
    expect(score.total).toBeLessThan(80)
  })

  it("judge score contributes 20% (reduced from 40% — Haiku de-risking)", () => {
    const withJudge = computeLoopScore(mockCitability(70), mockValidation(0, 0), { totalScore: 90, verdict: "PUBLISH", dimensions: {} as any, criticalIssues: [], strengths: [] })
    const withoutJudge = computeLoopScore(mockCitability(70), mockValidation(0, 0))
    // Judge should still contribute but less than before — difference should be ≤18 (20% of 90)
    expect(withJudge.total).toBeGreaterThan(withoutJudge.total)
    expect(withJudge.total - withoutJudge.total).toBeLessThanOrEqual(18)
  })

  it("GEO citability dominates the score (50% weight)", () => {
    const lowGeo = computeLoopScore(mockCitability(0), mockValidation(0, 0), { totalScore: 100, verdict: "PUBLISH", dimensions: {} as any, criticalIssues: [], strengths: [] })
    const highGeo = computeLoopScore(mockCitability(100), mockValidation(0, 0), { totalScore: 0, verdict: "REJECT", dimensions: {} as any, criticalIssues: [], strengths: [] })
    // High GEO + bad Judge should significantly outscore low GEO + good Judge
    expect(highGeo.total).toBeGreaterThan(lowGeo.total)
    // Difference: highGeo gets 50 (GEO) + 0 (Judge) + 20 (Content) + 10 (Struct) = 80
    // lowGeo gets 0 (GEO) + 20 (Judge) + 20 (Content) + 10 (Struct) = 50
    // Delta = 30
    expect(highGeo.total - lowGeo.total).toBeGreaterThanOrEqual(30)
  })
})

describe("thresholdMet", () => {
  it("returns true when all conditions met", () => {
    const citability = mockCitability(80)
    const validation = mockValidation(0, 0)
    const score = computeLoopScore(citability, validation)
    expect(thresholdMet(score, 70, citability, validation)).toBe(true)
  })

  it("returns false when errors exist", () => {
    const citability = mockCitability(80)
    const validation = mockValidation(1, 0)
    const score = computeLoopScore(citability, validation)
    expect(thresholdMet(score, 70, citability, validation)).toBe(false)
  })
})

describe("isDiminishing", () => {
  it("returns false when score improves", () => {
    expect(isDiminishing(70, 60, 1)).toBe(false)
  })

  it("returns true after 2 stagnations", () => {
    expect(isDiminishing(60, 60, 1)).toBe(true)
  })

  it("returns false on first stagnation", () => {
    expect(isDiminishing(60, 60, 0)).toBe(false)
  })
})

describe("buildLoopFeedback", () => {
  it("includes attribution feedback when below minimum", () => {
    const citability: CitabilityReport = {
      score: 40,
      claims: { count: 6, minRequired: 6, matches: [] },
      attributions: { count: 2, minRequired: 4, matches: [] },
      nuggets: { count: 4, minRequired: 4, matches: [] },
      passed: false,
      feedback: "test",
    }
    const feedback = buildLoopFeedback(citability, mockValidation(0, 0), 2, 3)
    expect(feedback).toContain("ATTRIBUTIONS")
    expect(feedback).toContain("2/4")
  })

  it("includes banned word feedback", () => {
    const validation = {
      passed: false,
      errors: [{ field: "contentMarkdown", severity: "error" as const, message: `Banned word (Tier 1) found: "delve"` }],
    }
    const feedback = buildLoopFeedback(mockCitability(60), validation, 2, 3)
    expect(feedback).toContain("delve")
  })
})
