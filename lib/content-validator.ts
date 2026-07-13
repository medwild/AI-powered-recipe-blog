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
// Imports
// ---------------------------------------------------------------------------

import { checkCitability } from "@/lib/geo-validator"
import { validateCulinary } from "@/lib/culinary-validator"

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
  format?: "google" | "pin-first"  // optional — pin-first adds structural rules
}

export interface Ingredient {
  name?: string
  quantity?: string
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

  // 3.5 GEO Citability check (warning-only here — blocking logic in persist-phase)
  const citability = checkCitability(md, wordCount)
  if (citability.score < 70) {
    errors.push({
      field: "contentMarkdown",
      severity: citability.score < 60 ? "error" : "warning",
      message: `GEO Citability: ${citability.feedback}`,
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

  // 5.5 Ingredient-content cross-match (recipes only)
  if (isRecipe && draft.ingredients?.length && md) {
    const ingredientErrors = validateIngredientContentMatch(draft.ingredients as Ingredient[], md)
    errors.push(...ingredientErrors)
  }

  // 5.6 Food safety — USDA temperature validation (CRITICAL: blocks in autopilot)
  const safetyErrors = validateFoodSafety(md)
  errors.push(...safetyErrors)

  // 5.7 Sentence rhythm — deterministic checks moved from skill (warning-only)
  const rhythmErrors = validateSentenceRhythm(md)
  errors.push(...rhythmErrors)

  // 5.8 Culinary validation — ingredient ratios, cook times, temperatures (warning-only)
  const culinaryErrors = validateCulinary({
    ingredients: (draft.ingredients as Ingredient[]) ?? null,
    instructions: (draft.instructions as { text?: string }[]) ?? null,
    prepTime: null, // not available at validation time — checked in persist-phase
    cookTime: null,
    totalTime: null,
    servings: null,
  })
  errors.push(...culinaryErrors)

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

  // 7. Pin-First structural rules (only when format is specified)
  if (draft.format === "pin-first") {
    // 7a. Prohibited sections
    const prohibitedSections = [
      "## Nutrition Highlights",
      "## What Most Recipes Get Wrong",
      "**Why This Works**",
    ]
    for (const section of prohibitedSections) {
      if (md.includes(section)) {
        errors.push({
          field: "contentMarkdown",
          severity: "error",
          message: `Pin-First format prohibits section: "${section}". Remove it.`,
        })
      }
    }

    // 7b. Recipe card position — must appear within 500 chars of content start.
    // The intro target is 50-80 words (~300-480 chars), so 500 chars gives
    // enough room for a well-crafted intro while keeping the recipe above the fold.
    const first500 = md.substring(0, 500).toLowerCase()
    const hasRecipeCardEarly =
      first500.includes("ingredient") ||
      first500.includes("## ingredient") ||
      (draft.ingredients && draft.ingredients.length > 0 &&
       (first500.includes("cup") || first500.includes("tablespoon") || first500.includes("teaspoon") ||
        first500.includes("ounce") || first500.includes("pound") || first500.includes("gram")))
    if (!hasRecipeCardEarly) {
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Pin-First format requires recipe card (ingredients) within the first 500 characters (intro is ${first500.length}+ chars without recipe).`,
      })
    }

    // 7c. Intro length — warn if >80 words before the recipe card
    const recipeCardMatch = md.match(/## Ingredients|## ingredients|INGREDIENTS/)
    const introEnd = recipeCardMatch ? recipeCardMatch.index! : 80
    const introText = md.substring(0, introEnd)
    const introWords = introText.split(/\s+/).filter(w => w.length > 0).length
    if (introWords > 80) {
      errors.push({
        field: "contentMarkdown",
        severity: "warning",
        message: `Pin-First intro is ${introWords} words (target: 50-80 words). Consider shortening.`,
      })
    }

    // 7d. Process shot placeholders — warn if <4 [IMAGE: markers
    const imagePlaceholders = (md.match(/\[IMAGE:/gi) ?? []).length
    if (imagePlaceholders < 4) {
      errors.push({
        field: "contentMarkdown",
        severity: "warning",
        message: `Pin-First format expects 4-6 [IMAGE:] placeholders. Found ${imagePlaceholders}.`,
      })
    }

    // 7e. Pin-First word count floor: 1000 (vs 1500 for google)
    if (wordCount < 1000) {
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Pin-First article is ${wordCount} words — minimum is 1000.`,
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
// Content Similarity — Cross-recipe duplicate detection
// ---------------------------------------------------------------------------

/**
 * Computes Jaccard similarity between a new markdown document and existing
 * published content, using bigram overlap. Returns matches with >50% similarity.
 *
 * This catches near-duplicate content (e.g., "chicken stir fry for two" vs
 * "quick chicken stir fry for two") before publication.
 */
export function checkContentSimilarity(
  newMarkdown: string,
  existingContent: { id: number; slug: string; title: string; contentMarkdown: string | null }[],
): { similar: boolean; matches: { id: number; slug: string; title: string; similarity: number }[] } {
  const newBigrams = extractBigrams(newMarkdown)
  if (newBigrams.size === 0) return { similar: false, matches: [] }

  const matches: { id: number; slug: string; title: string; similarity: number }[] = []

  for (const existing of existingContent) {
    if (!existing.contentMarkdown) continue
    const existingBigrams = extractBigrams(existing.contentMarkdown)
    if (existingBigrams.size === 0) continue

    // Jaccard similarity: |A ∩ B| / |A ∪ B|
    let intersection = 0
    for (const bigram of newBigrams) {
      if (existingBigrams.has(bigram)) intersection++
    }
    const union = newBigrams.size + existingBigrams.size - intersection
    const similarity = intersection / union

    if (similarity > 0.5) {
      matches.push({ id: existing.id, slug: existing.slug, title: existing.title, similarity: Math.round(similarity * 100) })
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity)
  const similar = matches.some((m) => m.similarity > 60)
  return { similar, matches: matches.slice(0, 5) }
}

function extractBigrams(text: string): Set<string> {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  const words = cleaned.split(/\s+/).filter(Boolean)
  const bigrams = new Set<string>()
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`)
  }
  return bigrams
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

// ---------------------------------------------------------------------------
// Ingredient ↔ Content Cross-Validation
// ---------------------------------------------------------------------------

/**
 * Validates that ingredients listed in the JSON array appear in the markdown
 * content, and vice versa. Prevents "phantom ingredients" (in list but not
 * mentioned in content) and "orphan ingredients" (mentioned in content but
 * missing from the list).
 *
 * Returns validation errors for critical mismatches.
 */
export function validateIngredientContentMatch(
  ingredients: Ingredient[] | null | undefined,
  contentMarkdown: string | null | undefined,
): ValidationError[] {
  const errors: ValidationError[] = []
  if (!ingredients?.length || !contentMarkdown) return errors

  const md = contentMarkdown.toLowerCase()
  let matchedCount = 0

  for (const ing of ingredients) {
    const name = ing.name?.toLowerCase().trim()
    if (!name || name.length < 2) continue
    if (md.includes(name)) {
      matchedCount++
    }
    // Common ingredient aliases: "chicken breasts" in content vs "chicken breast" in list
    // Simple singular/plural check
    else if (name.endsWith("s") && md.includes(name.slice(0, -1))) {
      matchedCount++
    } else if (!name.endsWith("s") && md.includes(name + "s")) {
      matchedCount++
    }
  }

  const matchRate = matchedCount / ingredients.length
  if (matchRate < 0.5) {
    errors.push({
      field: "ingredients",
      severity: "error",
      message: `Only ${matchedCount}/${ingredients.length} ingredients mentioned in content (${Math.round(matchRate * 100)}%). Minimum 50% required.`,
    })
  } else if (matchRate < 0.8) {
    errors.push({
      field: "ingredients",
      severity: "warning",
      message: `Only ${matchedCount}/${ingredients.length} ingredients mentioned in content (${Math.round(matchRate * 100)}%). Target: 80%+.`,
    })
  }

  return errors
}

// ---------------------------------------------------------------------------
// Food Safety Validation — USDA minimum internal temperatures
// ---------------------------------------------------------------------------

const FOOD_SAFETY_RULES: { pattern: RegExp; food: string; minTempF: number; message: string }[] = [
  { pattern: /\b(chicken|poultry|turkey|duck)\b.*?(\d{3})\s*°?\s*F/gi, food: "poultry", minTempF: 165, message: "USDA minimum for poultry is 165°F" },
  { pattern: /\b(ground\s*(beef|meat|pork|chicken|turkey)|burger)\b.*?(\d{3})\s*°?\s*F/gi, food: "ground meat", minTempF: 160, message: "USDA minimum for ground meat is 160°F" },
  { pattern: /\b(steak|roast|chop)\b.*?(\d{3})\s*°?\s*F/gi, food: "steak/roast", minTempF: 145, message: "USDA minimum for whole cuts (beef, pork, lamb) is 145°F" },
  { pattern: /\b(pork)\b.*?(\d{3})\s*°?\s*F/gi, food: "pork", minTempF: 145, message: "USDA minimum for pork is 145°F" },
  { pattern: /\b(fish|salmon|tuna|tilapia|cod)\b.*?(\d{3})\s*°?\s*F/gi, food: "fish", minTempF: 145, message: "USDA minimum for fish is 145°F" },
  { pattern: /\b(reheat|leftover)\b.*?(\d{3})\s*°?\s*F/gi, food: "reheated", minTempF: 165, message: "USDA minimum for reheating leftovers is 165°F" },
]

/**
 * Scans markdown content for cooking temperature mentions and flags any
 * that fall below USDA minimum safe temperatures. Warning-only — the LLM
 * may be referring to a different context (ambient temp, water temp, etc.).
 */
export function validateFoodSafety(contentMarkdown: string | null | undefined): ValidationError[] {
  const errors: ValidationError[] = []
  if (!contentMarkdown) return errors

  for (const rule of FOOD_SAFETY_RULES) {
    // Create a fresh regex for each rule (global regex has state)
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(contentMarkdown)) !== null) {
      // match[2] or match[3] is the temperature depending on groups
      const tempStr = match[match.length - 1]
      const temp = parseInt(tempStr, 10)
      if (!isNaN(temp) && temp < rule.minTempF && temp > 50) { // >50 to skip non-temperature numbers
        errors.push({
          field: "contentMarkdown",
          severity: "error",
          message: `CRITICAL Food safety: "${match[0].trim()}" — ${rule.message}. Found ${temp}°F. USDA minimum is ${rule.minTempF}°F. This blocks publication even in autopilot mode.`,
        })
      }
    }
  }

  return errors
}

// ---------------------------------------------------------------------------
// Sentence Rhythm Validation — Deterministic checks moved from skill
// ---------------------------------------------------------------------------

/**
 * Validates sentence rhythm patterns that were previously in the LLM skill.
 * The LLM cannot count adverbs or sentence lengths reliably — these checks
 * are now deterministic code. All are warning-only.
 */
function validateSentenceRhythm(contentMarkdown: string | null | undefined): ValidationError[] {
  const errors: ValidationError[] = []
  if (!contentMarkdown) return errors

  // Strip markdown formatting for sentence analysis
  const plainText = contentMarkdown
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\[IMAGE:.*?\]/gi, "") // image placeholders
    .replace(/[*_~`>\[\]()#|!-]/g, "") // inline formatting
    .replace(/\n{2,}/g, ". ") // paragraph breaks → sentence separators
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // Split into sentences
  const sentences = plainText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 3)

  if (sentences.length < 10) return errors

  // Check 1: Consecutive sentences starting with the same word
  let consecutiveSame = 0
  for (let i = 1; i < sentences.length; i++) {
    const prevFirst = sentences[i - 1].split(/\s+/)[0]?.toLowerCase()
    const currFirst = sentences[i].split(/\s+/)[0]?.toLowerCase()
    if (prevFirst && currFirst && prevFirst === currFirst) {
      consecutiveSame++
      if (consecutiveSame >= 2) {
        errors.push({
          field: "contentMarkdown",
          severity: "warning",
          message: `Rhythm: ${consecutiveSame + 1} consecutive sentences start with "${prevFirst}". Vary sentence openings.`,
        })
        break
      }
    } else {
      consecutiveSame = 0
    }
  }

  // Check 2: -ly adverbs per paragraph
  const paragraphs = contentMarkdown
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0 && !p.startsWith("#") && !p.startsWith("```"))
  for (let i = 0; i < paragraphs.length; i++) {
    const lyMatches = paragraphs[i].match(/\b\w+ly\b/gi)
    const lyCount = lyMatches ? lyMatches.length : 0
    if (lyCount > 2) {
      errors.push({
        field: "contentMarkdown",
        severity: "warning",
        message: `Rhythm: Paragraph ${i + 1} has ${lyCount} -ly adverbs (max 2 recommended). Replace some with concrete descriptions.`,
      })
      break
    }
  }

  // Check 3: Presence of short sentences (≤5 words)
  const shortCount = sentences.filter(s => s.split(/\s+/).length <= 5).length
  if (shortCount < 3 && sentences.length >= 20) {
    errors.push({
      field: "contentMarkdown",
      severity: "warning",
      message: `Rhythm: Only ${shortCount} short sentence(s) (≤5 words) found. Aim for ≥3 for pacing variety.`,
    })
  }

  // Check 4: Presence of long sentences (≥25 words)
  const longCount = sentences.filter(s => s.split(/\s+/).length >= 25).length
  if (longCount < 2 && sentences.length >= 20) {
    errors.push({
      field: "contentMarkdown",
      severity: "warning",
      message: `Rhythm: Only ${longCount} long sentence(s) (≥25 words) found. Aim for ≥2 for depth and flow.`,
    })
  }

  return errors
}
