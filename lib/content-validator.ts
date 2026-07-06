/**
 * ContentValidator — Deterministic pre-publication quality checks.
 *
 * Unlike the LLM-driven Auditor and QA agents, these checks are pure code.
 * They catch banned vocabulary, internal token leaks, missing fields, and
 * thin content BEFORE publication — regardless of LLM availability.
 *
 * The validator is the LAST line of defense before a recipe hits the database.
 * If it fails, the recipe is set to "draft" for manual review.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tier 1 banned words from skills/agent-writer.md §7 — instant AI tell. */
const BANNED_WORDS_TIER1 = [
  "delve", "dive into", "unlock", "unleash", "elevate", "transform",
  "embark", "journey", "in today's world", "it's worth noting that",
  "moreover", "furthermore", "robust", "holistic", "paradigm", "synergy",
  "game-changer", "leverage", "utilize", "nestled",
  "bursting with flavor", "melts in your mouth",
]

/** Replacement map for banned words — deterministic safety net before validation. */
const BANNED_WORD_REPLACEMENTS: Record<string, string> = {
  "delve": "explore",
  "dive into": "explore",
  "unlock": "reveal",
  "unleash": "bring out",
  "elevate": "improve",
  "transform": "change",
  "embark": "start",
  "journey": "process",
  "in today's world": "currently",
  "it's worth noting that": "note that",
  "moreover": "",
  "furthermore": "",
  "robust": "reliable",
  "holistic": "complete",
  "paradigm": "approach",
  "synergy": "balance",
  "game-changer": "breakthrough",
  "leverage": "use",
  "utilize": "use",
  "nestled": "tucked",
  "bursting with flavor": "packed with taste",
  "melts in your mouth": "incredibly tender",
}

/** Internal vibe coding tokens from skills/agent-writer.md §1 — must NEVER appear in output. */
const INTERNAL_TOKENS = [
  "[WARM]", "[SHARP]", "[WINK]", "[GRIT]", "[GLOW]",
  "<!--WARM-->", "<!--SHARP-->", "<!--WINK-->", "<!--GRIT-->", "<!--GLOW-->",
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string
  severity: "error" | "warning"
  message: string
}

export interface ValidationResult {
  passed: boolean
  errors: ValidationError[]
}

export interface ValidatableDraft {
  contentMarkdown?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  title?: string | null
  ingredients?: unknown[] | null
  instructions?: unknown[] | null
  contentType?: string | null  // "recipe" | "article" — articles skip ingredient/instruction checks
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Runs all deterministic checks on a recipe draft.
 * Returns `passed: false` if any error-severity issue is found.
 * Warnings do not block publication.
 */
export function validateContent(draft: ValidatableDraft): ValidationResult {
  const errors: ValidationError[] = []
  const md = draft.contentMarkdown ?? ""

  // 1. Banned vocabulary scan (case-insensitive)
  for (const word of BANNED_WORDS_TIER1) {
    if (md.toLowerCase().includes(word.toLowerCase())) {
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Banned word (Tier 1) found: "${word}"`,
      })
    }
  }

  // 2. Internal token leak detection
  for (const token of INTERNAL_TOKENS) {
    if (md.includes(token)) {
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Internal vibe token leaked into content: ${token}`,
      })
    }
  }

  // 3. Word count check (minimum threshold)
  const wordCount = md.split(/\s+/).filter(Boolean).length
  if (wordCount < 1000) {
    errors.push({
      field: "contentMarkdown",
      severity: "error",
      message: `Content too short: ${wordCount} words (minimum: 1000)`,
    })
  } else if (wordCount < 1200) {
    errors.push({
      field: "contentMarkdown",
      severity: "warning",
      message: `Content below target: ${wordCount} words (target: 1200-2200)`,
    })
  }

  // 4. Metadata length checks
  if (!draft.title?.trim()) {
    errors.push({
      field: "title",
      severity: "error",
      message: "Title is empty — required for SEO and JSON-LD",
    })
  }
  if (draft.metaTitle && draft.metaTitle.length > 60) {
    errors.push({
      field: "metaTitle",
      severity: "warning",
      message: `Meta title too long: ${draft.metaTitle.length} chars (max: 60)`,
    })
  }
  if (draft.metaDescription) {
    if (draft.metaDescription.length < 120) {
      errors.push({
        field: "metaDescription",
        severity: "warning",
        message: `Meta description too short: ${draft.metaDescription.length} chars (min: 120)`,
      })
    }
    if (draft.metaDescription.length > 160) {
      errors.push({
        field: "metaDescription",
        severity: "warning",
        message: `Meta description too long: ${draft.metaDescription.length} chars (max: 160)`,
      })
    }
  }

  // 5. Unsourced health/nutrition/probiotic claims — block publication
  const healthClaimPatterns = [
    /\bprobiotics?\b/i,
    /\bimproves?\s+digest(?:ion|ibility)\b/i,
    /\b(gut|digestive)\s+health\b/i,
    /\b(boosts?|strengthens?)\s+(the\s+)?immune\s+system\b/i,
    /\bdetox(?:ifying|es)?\b/i,
    /\banti-?inflammatory\b/i,
    /\bfat-?burning\b/i,
    /\blowers?\s+(blood\s+pressure|cholesterol)\b/i,
    /\bprevents?\s+(cancer|heart\s+disease|diabetes)\b/i,
  ]
  for (const pattern of healthClaimPatterns) {
    if (pattern.test(md)) {
      const match = md.match(pattern)?.[0] ?? ""
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Unsourced health claim detected: "${match}". Health/probiotic/digestibility claims require a credible external source (university extension, peer-reviewed paper, or official food science documentation). Either cite a source or remove the claim.`,
      })
    }
  }

  // 6. Required fields (recipes only — articles are exempt from ingredient/instruction requirements)
  const isRecipe = !draft.contentType || draft.contentType === "recipe"
  if (isRecipe) {
    if (!draft.ingredients?.length) {
      errors.push({
        field: "ingredients",
        severity: "error",
        message: "No ingredients — recipe schema requires at least one ingredient",
      })
    }
    if (!draft.instructions?.length) {
      errors.push({
        field: "instructions",
        severity: "error",
        message: "No instructions — recipe schema requires at least one step",
      })
    }
  }

  const criticalErrors = errors.filter((e) => e.severity === "error")
  return { passed: criticalErrors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Banned Word Scrubbing — Deterministic safety net
// ---------------------------------------------------------------------------

/**
 * Strips Tier 1 banned words from markdown content using deterministic replacements.
 * This is a LAST-RESORT safety net — the Editor should have already removed these.
 * Each replacement is logged so we can track Editor misses.
 *
 * Returns the scrubbed markdown and a list of replacements made.
 */
export function scrubBannedWords(markdown: string): { scrubbed: string; replacements: string[] } {
  const log: string[] = []
  let result = markdown

  for (const [banned, replacement] of Object.entries(BANNED_WORD_REPLACEMENTS)) {
    // Case-insensitive global replace with word boundaries for single words
    if (banned.includes(" ")) {
      // Multi-word phrase — case-insensitive replace
      const escaped = banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(escaped.replace(/ /g, "\\s+"), "gi")
      const newRegex = new RegExp(regex.source, "gi") // fresh for .test()
      if (newRegex.test(result)) {
        const count = (result.match(regex) || []).length
        result = result.replace(regex, replacement)
        log.push(`"${banned}" → "${replacement}" (${count}x)`)
      }
    } else {
      // Single word — case-insensitive with word boundaries, exact match only
      // Suffix variants (e.g. "transforms", "transforming") are the Editor's job to handle
      const escaped = banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`\\b${escaped}\\b`, "gi")
      const newRegex = new RegExp(regex.source, "gi") // fresh for .test()
      if (newRegex.test(result)) {
        const count = (result.match(regex) || []).length
        result = result.replace(regex, replacement)
        log.push(`"${banned}" → "${replacement}" (${count}x)`)
      }
    }
  }

  return { scrubbed: result, replacements: log }
}

// ---------------------------------------------------------------------------
// Originality Score — Koray GÜBÜR §6 / Pavel Klimanov
// ---------------------------------------------------------------------------

/**
 * Computes a basic originality score based on n-gram uniqueness.
 * Higher score = more unique content relative to common patterns.
 *
 * This is a heuristic proxy for AI-content detectability:
 * - AI-generated content tends to reuse common n-grams
 * - Human content has higher bigram/trigram uniqueness
 *
 * Returns a score from 0 (fully templated) to 100 (highly original).
 */
export function computeOriginalityScore(markdown: string): number {
  const text = markdown.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 100) return 0

  // Extract bigrams (2-word sequences)
  const bigrams = new Map<string, number>()
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1)
  }

  // Count unique bigrams (appearing only once) vs total
  const uniqueBigrams = [...bigrams.values()].filter((c) => c === 1).length
  const totalBigrams = bigrams.size

  if (totalBigrams === 0) return 0

  // Score: percentage of bigrams that are unique, scaled to 0-100
  const uniqueness = (uniqueBigrams / totalBigrams) * 100

  // Penalize if the text is too short (less reliable)
  const lengthFactor = Math.min(1, words.length / 1200)

  return Math.round(uniqueness * lengthFactor)
}
