/**
 * Opportunity Scorer v2 — Pinterest SERP Hijacking
 *
 * Reads raw Pinterest SERP data, applies the 4-factor Opportunity Score v2,
 * and outputs scored keywords with breakdowns.
 *
 * Usage: npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "sourdough discard recipes"
 */

import * as fs from "node:fs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawKeyword {
  keyword: string
  google_position: number
  pinterest_url_type: "pin" | "board"
  competitor_domain: string | null
  competitor_followers: number
  competitor_account_type: "personal" | "generalist" | "semi-specialized" | "very-specialized"
  search_volume?: number
  trending?: boolean
  user_problem?: string
  solution_promise?: string
}

interface ScoreBreakdown {
  domainBeatability: { score: number; level: string; weighted: number }
  engagementGap: { score: number; weighted: number }
  specializationGap: { score: number; weighted: number }
  urlType: { score: number; weighted: number }
}

interface ScoredKeyword extends RawKeyword {
  score: number
  status: "high" | "medium" | "low" | "disqualified"
  breakdown: ScoreBreakdown
  niche_match: boolean
  hypotheses: string[]
  disqualification_reason?: string
}

// ---------------------------------------------------------------------------
// Domain classification table
// ---------------------------------------------------------------------------

const UNBEATABLE_DOMAINS = [
  "allrecipes.com", "delish.com", "foodandwine.com",
  "foodnetwork.com", "bonappetit.com",
]

const VERY_HARD_DOMAINS = [
  "skinnytaste.com", "gimmesomeoven.com", "wellplated.com",
  "cookieandkate.com",
]

const KNOWN_BRANDS = [
  "allrecipes.com", "delish.com", "foodandwine.com",
  "foodnetwork.com", "bonappetit.com", "skinnytaste.com",
  "gimmesomeoven.com", "wellplated.com", "cookieandkate.com",
]

// ---------------------------------------------------------------------------
// Scoring functions (pure, deterministic)
// ---------------------------------------------------------------------------

function scoreDomainBeatability(domain: string | null): { score: number; level: string } {
  if (!domain) return { score: 100, level: "Unknown" }
  const d = domain.toLowerCase()
  if (UNBEATABLE_DOMAINS.some((u) => d.includes(u))) return { score: 0, level: "Unbeatable" }
  if (VERY_HARD_DOMAINS.some((v) => d.includes(v))) return { score: 20, level: "Very Hard" }
  // Heuristic: known TLD but not in lists = medium; no TLD = weak
  if (d.includes(".")) return { score: 60, level: "Medium" }
  return { score: 90, level: "Weak" }
}

function isKnownBrand(domain: string | null): boolean {
  if (!domain) return false
  const d = domain.toLowerCase()
  return KNOWN_BRANDS.some((b) => d.includes(b))
}

function scoreEngagementGap(followers: number, isBrand: boolean): number {
  let score: number
  if (followers < 50) score = 100
  else if (followers <= 200) score = 80
  else if (followers <= 1000) score = 50
  else if (followers <= 5000) score = 20
  else score = 0

  if (isBrand) score = Math.max(0, score - 30)
  return score
}

function scoreSpecializationGap(accountType: string): number {
  switch (accountType) {
    case "personal": return 100
    case "generalist": return 70
    case "semi-specialized": return 40
    case "very-specialized": return 10
    default: return 70 // conservative default
  }
}

function scoreURLType(urlType: string): number {
  switch (urlType) {
    case "pin": return 100
    case "board": return 60 // board — could be small or large, default to medium
    default: return 60
  }
}

function calculateOpportunity(kw: RawKeyword): ScoredKeyword {
  const domainBeatability = scoreDomainBeatability(kw.competitor_domain)

  if (domainBeatability.level === "Unbeatable") {
    return {
      ...kw,
      score: 0,
      status: "disqualified",
      breakdown: {
        domainBeatability: { ...domainBeatability, weighted: 0 },
        engagementGap: { score: 0, weighted: 0 },
        specializationGap: { score: 0, weighted: 0 },
        urlType: { score: 0, weighted: 0 },
      },
      niche_match: true,
      hypotheses: [],
      disqualification_reason: `Unbeatable domain: ${kw.competitor_domain}`,
    }
  }

  const engagement = scoreEngagementGap(kw.competitor_followers, isKnownBrand(kw.competitor_domain))
  const specialization = scoreSpecializationGap(kw.competitor_account_type)
  const urlType = scoreURLType(kw.pinterest_url_type)

  const score =
    domainBeatability.score * 0.35 +
    engagement * 0.30 +
    specialization * 0.20 +
    urlType * 0.15

  const status: ScoredKeyword["status"] =
    score >= 75 ? "high" : score >= 65 ? "medium" : "low"

  // Detect hypotheses (PTRA compliance)
  const hypotheses: string[] = []
  if (!kw.user_problem || kw.user_problem === "HYPOTHESIS") hypotheses.push("user_problem")
  if (!kw.solution_promise || kw.solution_promise === "HYPOTHESIS") hypotheses.push("solution_promise")

  return {
    ...kw,
    score: Math.round(score),
    status,
    breakdown: {
      domainBeatability: { ...domainBeatability, weighted: Math.round(domainBeatability.score * 0.35) },
      engagementGap: { score: engagement, weighted: Math.round(engagement * 0.30) },
      specializationGap: { score: specialization, weighted: Math.round(specialization * 0.20) },
      urlType: { score: urlType, weighted: Math.round(urlType * 0.15) },
    },
    niche_match: true,
    hypotheses,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const inputPath = args.find((a) => a.endsWith(".json"))
  const nicheIdx = args.indexOf("--niche")
  const niche = nicheIdx >= 0 ? args[nicheIdx + 1] : null

  if (!inputPath) {
    console.error("Usage: npx tsx scripts/score-opportunities.ts <input.json> --niche \"micro-niche\"")
    process.exit(1)
  }
  if (!niche) {
    console.warn("⚠️  No --niche provided. PTRA Micro-Niche Lock not enforced.")
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as RawKeyword[]
  const scored = raw.map(calculateOpportunity)

  // Niche validation (PTRA: reject keywords outside micro-niche)
  if (niche) {
    for (const kw of scored) {
      // Simple check: does any niche token appear in the keyword?
      const nicheTokens = niche.toLowerCase().split(/\s+/).filter((t) => t.length > 3)
      const kwLower = kw.keyword.toLowerCase()
      kw.niche_match = nicheTokens.some((t) => kwLower.includes(t))
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Write output
  const outputPath = inputPath.replace(/(?:-?input)?\.json$/, "-scored.json")
  fs.writeFileSync(outputPath, JSON.stringify(scored, null, 2))
  console.log(`Scored data → ${outputPath}\n`)

  // Summary report
  const high = scored.filter((k) => k.status === "high")
  const medium = scored.filter((k) => k.status === "medium")
  const low = scored.filter((k) => k.status === "low")
  const disqualified = scored.filter((k) => k.status === "disqualified")
  const nicheMismatches = scored.filter((k) => !k.niche_match)
  const totalHypotheses = scored.reduce((sum, k) => sum + k.hypotheses.length, 0)

  console.log(`=== Opportunity Scorer v2 ===`)
  console.log(`Micro-niche: ${niche ?? "not specified"}`)
  console.log(`Input: ${raw.length} keywords from ${inputPath}\n`)

  console.log(`Results:`)
  console.log(`  HIGH (≥75):      ${high.length} keywords`)
  console.log(`  MEDIUM (65-74):  ${medium.length} keywords`)
  console.log(`  LOW (<65):       ${low.length} keywords`)
  console.log(`  DISQUALIFIED:    ${disqualified.length} keywords\n`)

  if (high.length > 0) {
    console.log(`Top ${Math.min(5, high.length)}:`)
    for (const kw of high.slice(0, 5)) {
      console.log(`  ${high.indexOf(kw) + 1}. ${kw.keyword} — ${kw.score} (HIGH)`)
    }
    console.log()
  }

  if (nicheMismatches.length > 0) {
    console.log(`Niche mismatches flagged: ${nicheMismatches.length}`)
  }
  if (totalHypotheses > 0) {
    console.log(`Hypotheses to resolve: ${totalHypotheses} fields across ${scored.filter((k) => k.hypotheses.length > 0).length} keywords`)
  }
  if (disqualified.length > 0) {
    console.log(`\nDisqualified:`)
    for (const kw of disqualified) {
      console.log(`  ✕ ${kw.keyword} — ${kw.disqualification_reason}`)
    }
  }

  console.log(`\nNext step → npx tsx scripts/build-clusters.ts ${outputPath}`)
}

main()
