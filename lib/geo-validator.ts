// lib/geo-validator.ts
// GEO Validator — Deterministic citation-quality scoring.
//
// Detects citation-worthy claims (numbered facts, quantified comparisons,
// causal claims) and source attributions (named authority, first-person
// testing, personal recommendations). Scores content on "citability" —
// the probability an LLM will extract and cite this content as a source.
//
// Pure functions only — no API calls, no DB access, no side effects.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CitabilityReport = {
  score: number           // 0-100
  claims: {
    count: number
    minRequired: number   // 5 per article
    matches: string[]
  }
  attributions: {
    count: number
    minRequired: number   // 6 per article (≈1/250-300 words)
    matches: string[]
  }
  passed: boolean         // score ≥ 60
  feedback: string
}

// ---------------------------------------------------------------------------
// Claim Detection — 3 patterns
// ---------------------------------------------------------------------------

const CLAIM_PATTERNS: { name: string; regex: RegExp }[] = [
  {
    name: "numberedFact",
    regex: /\b(\d{2,4}°[FC]|\d{1,3}\s*(minutes?|mins?|hours?|seconds?|grams?|ounces?|cups?|tablespoons?|teaspoons?|lbs?|pounds?|ml|liters?|cm|inches?)\b|\d+:\d+\s*ratio|\d{1,3}%\s*(less|more|moisture|tender|fat|protein))/gi,
  },
  {
    name: "quantifiedComparison",
    regex: /\b(unlike|compared to|instead of|rather than|vs\.?)\s+(most|other|traditional|standard|typical)\s[^.!?]*\d+/gi,
  },
  {
    name: "causalClaim",
    regex: /\b(because|which creates|which means|resulting in|preventing|ensuring|this (is why|allows|keeps|prevents|creates|makes))\b/gi,
  },
]

// ---------------------------------------------------------------------------
// Attribution Detection — 5 patterns
// ---------------------------------------------------------------------------

const ATTRIBUTION_PATTERNS: { name: string; regex: RegExp }[] = [
  {
    name: "namedAuthority",
    regex: /Chef Augustin( Lefèvre)?\s+(recommends?|suggests?|advises?|notes?|explains?|insists?|prefers?|swears?\sby|teaches?)/gi,
  },
  {
    name: "firstPersonTesting",
    regex: /I(?:'ve|\shave)\s+(tested|tried|experimented|made|cooked|baked)\s[^.!?]*\d+/gi,
  },
  {
    name: "testingClaim",
    regex: /\b(tested|tried|experimented with)\s[^.!?]*\b(\d+|dozens?|multiple|several|many)\s+(times|batches|ways|temperatures|methods|variations)/gi,
  },
  {
    name: "personalRecommendation",
    regex: /\b(my\s+(go-to|favorite|preferred|recommended|trusted)|I\s+(swear by|recommend|prefer|always (use|reach for)|never (skip|use)))/gi,
  },
  {
    name: "causalAttribution",
    regex: /\b(based on\s+(my\s+)?(testing|experience|experiments|research)|according to\s+(culinary\s+)?(tradition|science|research)|from\s+(my\s+)?(testing|experience|kitchen))/gi,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Splits markdown into paragraphs (separated by double newlines).
 * Used to check that attributions co-occur with claims in the same paragraph.
 */
function splitParagraphs(markdown: string): string[] {
  return markdown.split(/\n\n+/).filter(p => p.trim().length > 0)
}

/**
 * Extracts unique matches from a regex pattern against the full markdown.
 * Returns deduplicated match strings, trimmed to 120 chars max.
 */
function extractMatches(regex: RegExp, text: string): string[] {
  const seen = new Set<string>()
  const matches: string[] = []
  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const trimmed = match[0].trim().substring(0, 120)
    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      matches.push(trimmed)
    }
  }
  return matches
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Scores a markdown document on "citability" — the probability an LLM
 * will extract and cite specific claims from this content.
 *
 * Scoring:
 *   claimsScore (50%)       = min(claims.count / 5, 1.0) × 100
 *   attributionsScore (30%) = min(attributions.count / 6, 1.0) × 100
 *   densityScore (20%)      = min((claims + attributions) / wordCount × 1000, 1.0) × 100
 *
 * Attribution match only counts if a claim is present in the same paragraph.
 * No empty name-dropping.
 *
 * Thresholds:
 *   ≥ 70 → passed
 *   60-69 → passed (warning only)
 *   < 60 → FAILED — blocked
 */
export function checkCitability(markdown: string, wordCount: number): CitabilityReport {
  // 1. Collect all claims (full document)
  const allClaimMatches: string[] = []
  for (const pattern of CLAIM_PATTERNS) {
    allClaimMatches.push(...extractMatches(pattern.regex, markdown))
  }

  // 2. Collect all attribution matches (full document)
  const allAttrMatches: string[] = []
  for (const pattern of ATTRIBUTION_PATTERNS) {
    allAttrMatches.push(...extractMatches(pattern.regex, markdown))
  }

  // 3. Validate: attributions only count if a paragraph also has a claim
  const paragraphs = splitParagraphs(markdown)
  const validAttrMatches: string[] = []

  for (const attr of allAttrMatches) {
    const parentParagraph = paragraphs.find(p => p.includes(attr))
    if (!parentParagraph) {
      validAttrMatches.push(attr)
      continue
    }
    const hasClaim = CLAIM_PATTERNS.some(pattern => {
      pattern.regex.lastIndex = 0
      return pattern.regex.test(parentParagraph)
    })
    if (hasClaim) {
      validAttrMatches.push(attr)
    }
  }

  // 4. Compute scores
  const claimsCount = allClaimMatches.length
  const attributionsCount = validAttrMatches.length
  const minClaims = 5
  const minAttributions = 6

  const claimsScore = Math.min(claimsCount / minClaims, 1.0) * 100
  const attributionsScore = Math.min(attributionsCount / minAttributions, 1.0) * 100
  const densityScore = wordCount > 0
    ? Math.min((claimsCount + attributionsCount) / wordCount * 1000, 1.0) * 100
    : 0

  const score = Math.round(
    claimsScore * 0.50 +
    attributionsScore * 0.30 +
    densityScore * 0.20
  )

  // 5. Build feedback
  const passed = score >= 60
  let feedback: string
  if (score >= 70) {
    feedback = `Strong citability (${score}/100). Content has enough specific claims and source attributions for LLM extraction.`
  } else if (score >= 60) {
    feedback = `Marginal citability (${score}/100). Consider adding more specific claims (numbers, temperatures, ratios) or source attributions (Chef Augustin recommends, I tested).`
  } else {
    const missing: string[] = []
    if (minClaims - claimsCount > 0) missing.push(`${minClaims - claimsCount} more specific claims`)
    if (minAttributions - attributionsCount > 0) missing.push(`${minAttributions - attributionsCount} more source attributions`)
    feedback = `Low citability (${score}/100). Content needs: ${missing.join(" and ")}. Add numbered facts, testing claims, and Chef Augustin attributions.`
  }

  return {
    score,
    claims: {
      count: claimsCount,
      minRequired: minClaims,
      matches: allClaimMatches.slice(0, 10),
    },
    attributions: {
      count: attributionsCount,
      minRequired: minAttributions,
      matches: validAttrMatches.slice(0, 10),
    },
    passed,
    feedback,
  }
}
