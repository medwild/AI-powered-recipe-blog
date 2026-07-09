// lib/citation-readiness.ts
// Phase B — Citation Readiness Auditor
//
// Synthesizes all GEO/LLM optimization checks into a single "Citation
// Readiness Scorecard" that predicts how likely each major LLM platform
// is to extract and cite our content.
//
// Deterministic — no external API calls. Runs checks built in Phases A1-A4:
//   - Citability scoring (claims + attributions + nuggets + density)
//   - Content freshness signals (visible update date, template replacement)
//   - External source citations (verified institutional sources)
//   - Answer nugget extraction simulation (what LLMs grab)
//
// Pure functions only.

import { checkCitability } from "@/lib/geo-validator"
import type { ExternalSource } from "@/lib/external-sources"
import { getRelevantSources } from "@/lib/external-sources"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-platform citation likelihood. */
export type PlatformScore = {
  platform: string
  score: number           // 0-100
  verdict: "STRONG" | "ADEQUATE" | "WEAK" | "NONE"
  signalsPresent: string[]
  signalsMissing: string[]
  recommendation: string
}

/** Top-level citation readiness report. */
export type CitationReadinessReport = {
  overallScore: number     // 0-100
  overallVerdict: "READY" | "NEEDS_WORK" | "NOT_READY"
  platforms: PlatformScore[]
  citability: ReturnType<typeof checkCitability>
  matchedSources: ExternalSource[]
  answerNuggets: string[]
  freshness: {
    hasUpdatedDate: boolean
    hasFreshnessMarker: boolean
    templateReplaced: boolean
  }
  issues: { severity: "blocking" | "warning"; message: string }[]
}

// ---------------------------------------------------------------------------
// Platform-specific scoring
// ---------------------------------------------------------------------------

/**
 * Each major LLM platform weights signals differently.
 * These profiles encode what each platform's answer engine values.
 */
const PLATFORM_PROFILES: {
  platform: string
  description: string
  signals: { name: string; weight: number; check: (r: CitationReadinessReport) => boolean }[]
}[] = [
  {
    platform: "ChatGPT / Bing (OpenAI)",
    description: "Weights direct answers, named sources, and freshness. Favors inverted-pyramid structure.",
    signals: [
      { name: "Inverted pyramid intro (direct answer in first sentence)", weight: 25, check: r => r.citability.nuggets.count >= 2 },
      { name: "Named authority attributions (Chef Augustin + claim)", weight: 20, check: r => r.citability.attributions.count >= 3 },
      { name: "Specific numbered claims (temps, ratios, grams)", weight: 20, check: r => r.citability.claims.count >= 5 },
      { name: "External verified sources cited", weight: 15, check: r => r.matchedSources.length >= 1 },
      { name: "Content freshness signal (visible update date)", weight: 10, check: r => r.freshness.hasUpdatedDate || r.freshness.hasFreshnessMarker },
      { name: "Question-based H2s with extractable answers", weight: 10, check: r => r.answerNuggets.length >= 4 },
    ],
  },
  {
    platform: "Google AI Overviews (Gemini)",
    description: "Weights E-E-A-T, direct experience, factual precision. Favors original research signals.",
    signals: [
      { name: "First-person testing claims (quantified)", weight: 25, check: r => r.citability.claims.count >= 5 },
      { name: "Specific causal claims (because, which creates)", weight: 20, check: r => r.citability.claims.count >= 3 },
      { name: "External institutional sources (USDA, universities)", weight: 20, check: r => r.matchedSources.length >= 1 },
      { name: "Nutrition/safety data with source attribution", weight: 15, check: r => r.matchedSources.some(s => s.tags.includes("food-safety")) },
      { name: "Original observations (sensory, technique)", weight: 10, check: r => r.citability.attributions.count >= 3 },
      { name: "Content freshness (updated date)", weight: 10, check: r => r.freshness.hasUpdatedDate },
    ],
  },
  {
    platform: "Perplexity (Claude + multi-model)",
    description: "Weights source diversity, fact density, answer nuggets. Favors structured Q&A.",
    signals: [
      { name: "Extractable answer nuggets (question H2 + concise answer)", weight: 30, check: r => r.answerNuggets.length >= 4 },
      { name: "External verified sources (institutional)", weight: 25, check: r => r.matchedSources.length >= 1 },
      { name: "Specific numbered claims (density)", weight: 20, check: r => r.citability.claims.count >= 5 },
      { name: "Comparison/contrast claims (unlike, vs, compared to)", weight: 15, check: r => r.citability.claims.count >= 2 },
      { name: "Named authority attributions", weight: 10, check: r => r.citability.attributions.count >= 2 },
    ],
  },
  {
    platform: "Claude (Anthropic)",
    description: "Weights thoroughness, factual accuracy, balanced viewpoint. Favors depth over breadth.",
    signals: [
      { name: "Detailed technique explanations with mechanisms", weight: 25, check: r => r.citability.claims.count >= 5 },
      { name: "External verified sources", weight: 20, check: r => r.matchedSources.length >= 1 },
      { name: "Specific numbered claims", weight: 20, check: r => r.citability.claims.count >= 4 },
      { name: "Balanced/contrast claims (unlike, compared to)", weight: 15, check: r => r.citability.claims.count >= 2 },
      { name: "Answer nuggets (extractable Q&A)", weight: 10, check: r => r.answerNuggets.length >= 3 },
      { name: "Attribution density", weight: 10, check: r => r.citability.attributions.count >= 4 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Answer Nugget Extraction Simulation
// ---------------------------------------------------------------------------

/**
 * Simulates what an LLM answer engine would extract from the article
 * by finding question-based H2s with concise answer blocks.
 * This mirrors the countAnswerNuggets() logic in geo-validator.ts
 * but exposes the extracted text for the report.
 */
function simulateNuggetExtraction(markdown: string): string[] {
  const nuggets: string[] = []
  const lines = markdown.split("\n")
  const headingRegex = /^##\s+.+\?$/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!headingRegex.test(line)) continue

    const blockLines: string[] = []
    let j = i + 1
    while (j < lines.length) {
      const nextLine = lines[j]
      if (/^#{1,3}\s/.test(nextLine)) break
      if (nextLine.trim() === "" && j + 1 < lines.length && lines[j + 1].trim() === "") break
      if (nextLine.trim()) blockLines.push(nextLine.trim())
      j++
    }

    const block = blockLines.join(" ")
    const wordCount = block.split(/\s+/).filter(Boolean).length

    if (wordCount >= 25 && wordCount <= 120) {
      nuggets.push(`${line.replace(/^##\s+/, "")} → ${block.substring(0, 120)}…`)
    }
  }

  return nuggets
}

// ---------------------------------------------------------------------------
// Freshness Signal Detection
// ---------------------------------------------------------------------------

function checkFreshness(
  markdown: string,
  updatedAt: Date | null,
  publishedAt: Date | null,
): CitationReadinessReport["freshness"] {
  const hasFreshnessMarker = /tested (and|&) (perfected|updated|re-tested)/i.test(markdown) ||
    /updated (and|&) (re-tested|perfected)/i.test(markdown) ||
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/.test(markdown)
  const hasUpdatedDate = updatedAt != null && publishedAt != null &&
    (updatedAt.getTime() - publishedAt.getTime()) > 7 * 24 * 60 * 60 * 1000
  const templateReplaced = !markdown.includes("{{current_month_year}}")

  return { hasUpdatedDate, hasFreshnessMarker, templateReplaced }
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function assessCitationReadiness(params: {
  markdown: string
  wordCount: number
  keyword: string
  publishedAt: Date | null
  updatedAt: Date | null
}): CitationReadinessReport {
  const { markdown, wordCount, keyword, publishedAt, updatedAt } = params

  // 1. Run citability check
  const citability = checkCitability(markdown, wordCount)

  // 2. Match external sources
  const matchedSources = getRelevantSources(keyword)

  // 3. Simulate answer nugget extraction
  const answerNuggets = simulateNuggetExtraction(markdown)

  // 4. Check freshness signals
  const freshness = checkFreshness(markdown, updatedAt, publishedAt)

  // 5. Collect issues
  const issues: CitationReadinessReport["issues"] = []
  if (citability.score < 60) {
    issues.push({ severity: "blocking", message: `Citability score ${citability.score}/100 — below publication threshold (60)` })
  } else if (citability.score < 70) {
    issues.push({ severity: "warning", message: `Citability score ${citability.score}/100 — marginal (target ≥70)` })
  }
  if (!freshness.templateReplaced) {
    issues.push({ severity: "blocking", message: "Template variable {{current_month_year}} not replaced — freshness signal broken" })
  }
  if (!freshness.hasFreshnessMarker && !freshness.hasUpdatedDate) {
    issues.push({ severity: "warning", message: "No visible freshness signal — add 'Tested and updated [month year]' or ensure updatedAt differs from publishedAt" })
  }
  if (matchedSources.length === 0) {
    issues.push({ severity: "warning", message: "No external sources matched for keyword — consider expanding the knowledge base" })
  }
  if (answerNuggets.length < 4) {
    issues.push({ severity: "warning", message: `Only ${answerNuggets.length} extractable answer nuggets (target ≥4) — add more question-based H2s` })
  }

  // 6. Build base report (platforms will be scored against it)
  const baseReport: CitationReadinessReport = {
    overallScore: 0,
    overallVerdict: "NOT_READY",
    platforms: [],
    citability,
    matchedSources,
    answerNuggets,
    freshness,
    issues,
  }

  // 7. Score each platform
  const platformScores: PlatformScore[] = PLATFORM_PROFILES.map(profile => {
    const present: string[] = []
    const missing: string[] = []
    let weightedScore = 0
    let totalWeight = 0

    for (const signal of profile.signals) {
      totalWeight += signal.weight
      if (signal.check(baseReport)) {
        present.push(signal.name)
        weightedScore += signal.weight
      } else {
        missing.push(signal.name)
      }
    }

    const score = Math.round((weightedScore / totalWeight) * 100)
    const verdict = score >= 75 ? "STRONG" : score >= 50 ? "ADEQUATE" : score >= 25 ? "WEAK" : "NONE"

    let recommendation: string
    if (verdict === "STRONG") {
      recommendation = "Content is well-optimized for this platform. Monitor actual citation rates."
    } else if (verdict === "ADEQUATE") {
      recommendation = `Strengthen: ${missing.slice(0, 2).join("; ")}.`
    } else if (verdict === "WEAK") {
      recommendation = `Address missing signals before expecting citations: ${missing.slice(0, 3).join("; ")}.`
    } else {
      recommendation = "Content lacks basic citation signals. Run the GEO checklist before publishing."
    }

    return { platform: profile.platform, score, verdict, signalsPresent: present, signalsMissing: missing, recommendation }
  })

  // 8. Compute overall score
  const avgPlatformScore = platformScores.length > 0
    ? Math.round(platformScores.reduce((sum, p) => sum + p.score, 0) / platformScores.length)
    : 0
  // Blend platform scores (60%) with citability score (40%)
  const overallScore = Math.round(avgPlatformScore * 0.60 + citability.score * 0.40)

  const blockingIssues = issues.filter(i => i.severity === "blocking").length
  const overallVerdict = blockingIssues > 0
    ? "NOT_READY"
    : overallScore >= 70 ? "READY" : "NEEDS_WORK"

  return { overallScore, overallVerdict, platforms: platformScores, citability, matchedSources, answerNuggets, freshness, issues }
}
