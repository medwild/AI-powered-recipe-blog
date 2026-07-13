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
  nuggets: {
    count: number
    minRequired: number   // 4 per article (validated question→answer pairs)
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
// Answer Nugget Detection
// ---------------------------------------------------------------------------

/**
 * Detects Answer Nuggets — question-based H2s followed by a direct answer
 * paragraph of 40-80 words containing at least one specific fact (number
 * or named entity). These are blocks that LLMs can extract as standalone
 * answers.
 *
 * Detection rules:
 * 1. Find a heading line matching `## ...?` (question-based H2)
 * 2. Take the first text block after it (until next heading or double newline)
 * 3. Validate: 25-120 words, contains a number OR a capitalized proper noun
 *
 * Target: ≥4 validated nuggets per article (Strategist plans 6/1000 words).
 */
function countAnswerNuggets(markdown: string): { count: number; matches: string[] } {
  const matches: string[] = []
  const lines = markdown.split("\n")
  const headingRegex = /^##\s+.+\?$/    // H2 ending with ?
  const numberRegex = /\d/              // Contains a number
  const entityRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/ // Capitalized multi-word entity

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!headingRegex.test(line)) continue

    // Collect the text block after this heading (until next heading or blank line group)
    const blockLines: string[] = []
    let j = i + 1
    while (j < lines.length) {
      const nextLine = lines[j]
      // Stop at next heading
      if (/^#{1,3}\s/.test(nextLine)) break
      // Stop at double blank line (end of section)
      if (nextLine.trim() === "" && j + 1 < lines.length && lines[j + 1].trim() === "") break
      if (nextLine.trim()) blockLines.push(nextLine.trim())
      j++
    }

    const block = blockLines.join(" ")
    const wordCount = block.split(/\s+/).filter(Boolean).length

    // Validate: 25-120 words, contains a number or a named entity
    if (wordCount >= 25 && wordCount <= 120 && (numberRegex.test(block) || entityRegex.test(block))) {
      const preview = block.substring(0, 100).trim() + (block.length > 100 ? "…" : "")
      matches.push(`[${line.replace(/^##\s+/, "")}] ${preview}`)
    }
  }

  return { count: matches.length, matches }
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Scores a markdown document on "citability" — the probability an LLM
 * will extract and cite specific claims from this content.
 *
 * Scoring:
 *   claimsScore (40%)       = min(claims.count / CLAIMS_MIN, 1.0) × 100
 *   attributionsScore (25%) = min(attributions.count / ATTRIBUTIONS_MIN, 1.0) × 100
 *   nuggetsScore (20%)      = min(nuggets.count / NUGGETS_MIN, 1.0) × 100
 *   densityScore (15%)      = min((claims + attributions + nuggets) / wordCount × 1000 / 3, 1.0) × 100
 *
 * Defaults (Claude Sonnet 4.6): CLAIMS_MIN=6, ATTRIBUTIONS_MIN=4, NUGGETS_MIN=4
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
      // Paragraph not found — skip (do not count unattributed claims)
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

  // 4. Count answer nuggets (question→answer pairs)
  const nuggets = countAnswerNuggets(markdown)

  // 5. Compute scores
  const claimsCount = allClaimMatches.length
  const attributionsCount = validAttrMatches.length
  const nuggetsCount = nuggets.count
  // Thresholds configurable via env — defaults calibrated for Claude Sonnet 4.6.
  // Lower for DeepSeek: GEO_ATTRIBUTIONS_MIN=2, GEO_NUGGETS_MIN=2
  const minClaims = parseInt(process.env.GEO_CLAIMS_MIN ?? "6", 10)
  const minAttributions = parseInt(process.env.GEO_ATTRIBUTIONS_MIN ?? "4", 10)
  const minNuggets = parseInt(process.env.GEO_NUGGETS_MIN ?? "4", 10)

  const claimsScore = Math.min(claimsCount / minClaims, 1.0) * 100
  const attributionsScore = Math.min(attributionsCount / minAttributions, 1.0) * 100
  const nuggetsScore = Math.min(nuggetsCount / minNuggets, 1.0) * 100
  // Target: 3 combined items per 1000 words for max density score.
  // With the 5+6+4=15 minimum items in a 2000-word article → 7.5/1000 words,
  // comfortably hitting the cap while giving genuine discrimination.
  const densityScore = wordCount > 0
    ? Math.min((claimsCount + attributionsCount + nuggetsCount) / wordCount * 1000 / 3, 1.0) * 100
    : 0

  const score = Math.round(
    claimsScore * 0.40 +
    attributionsScore * 0.25 +
    nuggetsScore * 0.20 +
    densityScore * 0.15
  )

  // 6. Build feedback
  const passed = score >= 60
  let feedback: string
  if (score >= 70) {
    feedback = `Strong citability (${score}/100). Claims: ${claimsCount}, Attributions: ${attributionsCount}, Nuggets: ${nuggetsCount}.`
  } else if (score >= 60) {
    feedback = `Marginal citability (${score}/100). Claims: ${claimsCount}/${minClaims}, Attributions: ${attributionsCount}/${minAttributions}, Nuggets: ${nuggetsCount}/${minNuggets}.`
  } else {
    const missing: string[] = []
    if (minClaims - claimsCount > 0) missing.push(`${minClaims - claimsCount} more specific claims`)
    if (minAttributions - attributionsCount > 0) missing.push(`${minAttributions - attributionsCount} more source attributions`)
    if (minNuggets - nuggetsCount > 0) missing.push(`${minNuggets - nuggetsCount} more answer nuggets (question H2 + 25-120 word answer)`)
    feedback = `Low citability (${score}/100). Content needs: ${missing.join("; ")}.`
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
    nuggets: {
      count: nuggetsCount,
      minRequired: minNuggets,
      matches: nuggets.matches.slice(0, 10),
    },
    passed,
    feedback,
  }
}
