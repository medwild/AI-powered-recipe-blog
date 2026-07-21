import { describe, it, expect } from "vitest"
import { computeQualityScore } from "@/lib/quality-scorer"
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

describe("computeQualityScore", () => {
  it("computes max score with perfect inputs (v13: GEO 60% + Content 25% + Structure 15% = 100)", () => {
    const score = computeQualityScore(mockCitability(100), mockValidation(0, 0))
    // GEO 60 + Content 25 + Structure 15 = 100
    expect(score.total).toBe(100)
    expect(score.geoComponent).toBe(60)
    expect(score.contentComponent).toBe(25)
    expect(score.structureComponent).toBe(15)
  })

  it("penalizes banned words", () => {
    const validation = {
      passed: false,
      errors: [
        { field: "contentMarkdown", severity: "error" as const, message: `Banned word (Tier 1) found: "delve"` },
        { field: "contentMarkdown", severity: "error" as const, message: `Banned word (Tier 1) found: "robust"` },
      ],
    }
    const score = computeQualityScore(mockCitability(70), validation)
    // 2 banned words = 2 errors → contentRaw = max(0, 100 - 30 - 0 - 10) = 60, component = 15
    expect(score.contentComponent).toBeLessThan(20)
    expect(score.total).toBeLessThan(80)
  })

  it("GEO citability dominates the score (60% weight in v13)", () => {
    const lowGeo = computeQualityScore(mockCitability(0), mockValidation(0, 0))
    const highGeo = computeQualityScore(mockCitability(100), mockValidation(0, 0))
    // High GEO: 60 + 25 + 15 = 100. Low GEO: 0 + 25 + 15 = 40. Delta = 60
    expect(highGeo.total).toBeGreaterThan(lowGeo.total)
    expect(highGeo.total - lowGeo.total).toBeGreaterThanOrEqual(50)
  })

  it("errors reduce content and structure components", () => {
    const perfect = computeQualityScore(mockCitability(80), mockValidation(0, 0))
    const withErrors = computeQualityScore(mockCitability(80), mockValidation(3, 2))
    // 3 errors + 2 warnings → contentRaw = 100 - 45 - 10 = 45, component = 11
    // structureRaw = max(0, 100 - 30) = 70, component = 11
    expect(withErrors.total).toBeLessThan(perfect.total)
    expect(withErrors.structureComponent).toBeLessThan(perfect.structureComponent)
  })

  it("computes correct breakdown string", () => {
    const score = computeQualityScore(mockCitability(75), mockValidation(1, 1))
    expect(score.breakdown).toContain("GEO:75/100")
    expect(score.breakdown).toContain("Content:")
    expect(score.breakdown).toContain("Structure:")
    expect(score.breakdown).toContain("= ")
    // v13: no Judge in breakdown
    expect(score.breakdown).not.toContain("Judge")
  })

  it("returns valid score even with all zero inputs", () => {
    const score = computeQualityScore(mockCitability(0), mockValidation(5, 5))
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(typeof score.total).toBe("number")
    expect(typeof score.breakdown).toBe("string")
  })
})
