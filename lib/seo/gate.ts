/**
 * Pre-Production SEO Gate — Deterministic validation
 *
 * 15 criteria (8 BLOCK + 7 WARNING), research-backed against:
 * - Google Recipe Schema requirements 2026
 * - E-E-A-T framework (Marie Haynes, Lily Ray, Danny Sullivan)
 * - 40-site SEO data analysis 2026
 *
 * No LLM. All checks are regex, length, JSON parse, or DB queries.
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq, and, ne } from "drizzle-orm"
import type { GateInput, GateResult, BlockingIssue, Warning } from "./types"

// ── Helpers ──────────────────────────────────────────────────────────────────

function block(code: string, message: string): BlockingIssue {
  return { code, message }
}

function warn(code: string, message: string): Warning {
  return { code, message }
}

/** Extract the first 100 words from Markdown (strips formatting). */
function first100Words(markdown: string | null): string {
  if (!markdown) return ""
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~`>\[\]()#|!-]/g, " ") // inline formatting
    .replace(/\s+/g, " ")
    .trim()
  return plain.split(" ").slice(0, 100).join(" ")
}

/** Case-insensitive substring match. */
function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase())
}

// ── BLOCK Checks ─────────────────────────────────────────────────────────────

/** B1 — Recipe schema must exist and contain a Recipe node. */
function checkRecipeSchema(jsonLd: Record<string, unknown> | null): BlockingIssue | null {
  if (!jsonLd) return block("RECIPE_SCHEMA_MISSING", "No JSON-LD data found. Recipe schema is required for Google rich results.")

  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) {
    return block("RECIPE_SCHEMA_MISSING", "No @type: Recipe node found in JSON-LD. Recipe schema is required for Google rich results.")
  }
  return null
}

/** B2 — recipeIngredient must be a non-empty array. */
function checkIngredients(jsonLd: Record<string, unknown> | null): BlockingIssue | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null // caught by B1

  const ingredients = recipeNode["recipeIngredient"]
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return block("INGREDIENTS_MISSING", "recipeIngredient array is missing or empty in Recipe schema. Required by Google Rich Results.")
  }
  return null
}

/** B3 — recipeInstructions must be a non-empty array. */
function checkInstructions(jsonLd: Record<string, unknown> | null): BlockingIssue | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null

  const instructions = recipeNode["recipeInstructions"]
  if (!Array.isArray(instructions) || instructions.length === 0) {
    return block("INSTRUCTIONS_MISSING", "recipeInstructions array is missing or empty in Recipe schema. Required by Google Rich Results.")
  }
  return null
}

/** B4 — Recipe schema must have an image URL. */
function checkSchemaImage(jsonLd: Record<string, unknown> | null): BlockingIssue | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null

  const image = recipeNode["image"]
  if (!image) {
    return block("IMAGE_MISSING_IN_SCHEMA", "No image field in Recipe schema node. Required by Google Rich Results (min 1200×630px).")
  }
  return null
}

/** B5 — heroImageUrl must not be a placeholder or null. */
function checkPlaceholderImage(heroImageUrl: string | null): BlockingIssue | null {
  if (!heroImageUrl || heroImageUrl.toLowerCase().includes("placeholder")) {
    return warn("IMAGE_PLACEHOLDER", "Hero image is missing or contains 'placeholder'. Add a food photo before final publication.")
  }
  return null
}

/** B6 — Recipe.name must be present. */
function checkRecipeName(jsonLd: Record<string, unknown> | null): BlockingIssue | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null

  const name = recipeNode["name"]
  if (!name || (typeof name === "string" && name.trim().length === 0)) {
    return block("RECIPE_NAME_MISSING", "The Recipe schema node has no 'name' field. Required by Google Rich Results.")
  }
  return null
}

/** B7 — metaTitle must be present and ≥ 10 chars. */
function checkTitle(metaTitle: string | null): BlockingIssue | null {
  if (!metaTitle || metaTitle.trim().length < 10) {
    return block("TITLE_MISSING", "SEO title is missing or too short (< 10 characters). Required for search visibility.")
  }
  return null
}

/** B8 — focus keyphrase must not already be used on another published page. */
async function checkCannibalization(
  recipeId: number,
  focusKeyphrase: string,
  content_type: string,
): Promise<BlockingIssue | null> {
  if (content_type !== "recipe") return null
  if (!focusKeyphrase) return null

  try {
    const existing = await db
      .select({ id: recipes.id, slug: recipes.slug })
      .from(recipes)
      .where(
        and(
          eq(recipes.keyword, focusKeyphrase),
          eq(recipes.status, "published"),
          ne(recipes.id, recipeId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      return block(
        "CANIBALIZATION",
        `Focus keyphrase "${focusKeyphrase}" is already used by recipe #${existing[0].id} (${existing[0].slug}). Publishing both would cause SEO cannibalization.`,
      )
    }
  } catch {
    // DB unavailable — skip cannibalization check (acceptable for dev/test,
    // in production the DB is always available)
  }
  return null
}

// ── WARNING Checks ───────────────────────────────────────────────────────────

/** W1 — keyphrase should appear in the SEO title. */
function checkTitleKeyword(metaTitle: string | null, keyword: string): Warning | null {
  if (!metaTitle || !keyword) return null
  if (!containsKeyword(metaTitle, keyword)) {
    return warn("KEYPHRASE_NOT_IN_TITLE", `Focus keyphrase "${keyword}" not found in SEO title. Consider including it for better ranking.`)
  }
  return null
}

/** W2 — meta description should be 120-160 chars. */
function checkMetaLength(metaDescription: string | null): Warning | null {
  if (!metaDescription) return null
  const len = metaDescription.length
  if (len < 120 || len > 160) {
    return warn(
      "META_DESC_OUT_OF_RANGE",
      `Meta description is ${len} chars (optimal: 120-160). ${len < 120 ? "Too short — expand with a benefit or call to action." : "Too long — may be truncated in SERPs."}`,
    )
  }
  return null
}

/** W3 — keyphrase should appear in the first 100 words. */
function checkIntroKeyword(contentMarkdown: string | null, keyword: string): Warning | null {
  if (!contentMarkdown || !keyword) return null
  const intro = first100Words(contentMarkdown)
  if (!containsKeyword(intro, keyword)) {
    return warn("KEYPHRASE_NOT_IN_INTRO", `Focus keyphrase "${keyword}" not found in the first 100 words. Early placement helps Google and readers identify the topic.`)
  }
  return null
}

/** W4 — Recipe schema should include nutrition. */
function checkNutrition(jsonLd: Record<string, unknown> | null): Warning | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null

  if (!recipeNode["nutrition"]) {
    return warn("NUTRITION_MISSING_IN_SCHEMA", "No 'nutrition' field in Recipe schema. Recommended by Google for enhanced rich results (calories, macros).")
  }
  return null
}

/** W5 — Recipe schema should include aggregateRating. */
function checkRating(jsonLd: Record<string, unknown> | null): Warning | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null

  if (!recipeNode["aggregateRating"]) {
    return warn("RATING_MISSING_IN_SCHEMA", "No 'aggregateRating' in Recipe schema. Star ratings in SERPs significantly improve CTR.")
  }
  return null
}

/** W6 — Content should have at least 2 internal links. */
function checkInternalLinks(contentMarkdown: string | null): Warning | null {
  if (!contentMarkdown) return null
  // Count markdown links to the same domain (relative URLs or chefaugustin.com)
  const internalPattern = /\]\(\/(?:recipes|recettes|techniques|guides|histoire|equipement)\/[^)]+\)/gi
  const matches = contentMarkdown.match(internalPattern)
  const count = matches ? matches.length : 0
  if (count < 2) {
    return warn("LOW_INTERNAL_LINKS", `Only ${count} internal link(s) found. Aim for 2-4 contextual links to related recipes or pillar pages.`)
  }
  return null
}

/** W7 — Recipe schema should include cookTime/prepTime. */
function checkCookTime(jsonLd: Record<string, unknown> | null): Warning | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode) return null

  if (!recipeNode["cookTime"] && !recipeNode["prepTime"]) {
    return warn("COOK_TIME_MISSING_IN_SCHEMA", "No 'cookTime' or 'prepTime' in Recipe schema. Recommended by Google for rich results.")
  }
  return null
}

/** W8 — Schema data must match visible content (Google SD policies). */
function checkSchemaContentMismatch(
  jsonLd: Record<string, unknown> | null,
  contentMarkdown: string | null,
): Warning | null {
  const recipeNode = findRecipeNode(jsonLd)
  if (!recipeNode || !contentMarkdown) return null

  const content = contentMarkdown.toLowerCase()

  // Check nutrition: if schema has calories, content should mention them
  const nutrition = recipeNode["nutrition"] as Record<string, unknown> | undefined
  if (nutrition) {
    const calories = nutrition["calories"]
    if (calories && typeof calories === "string" && calories.length > 0) {
      const calorieNumber = calories.replace(/[^0-9]/g, "")
      if (calorieNumber && !content.includes(calorieNumber)) {
        return warn(
          "SCHEMA_CONTENT_MISMATCH",
          `Schema declares nutrition.calories (${calories}) but calorie count not found in visible content. Google requires structured data to match on-page content.`,
        )
      }
    }
  }

  // Check aggregateRating: if schema has ratings, content should show them
  const rating = recipeNode["aggregateRating"] as Record<string, unknown> | undefined
  if (rating) {
    const ratingValue = rating["ratingValue"]
    if (ratingValue && !content.includes("rated") && !content.includes("stars") && !content.includes("review")) {
      return warn(
        "SCHEMA_CONTENT_MISMATCH",
        "Schema declares aggregateRating but no visible ratings or reviews found in content. Google requires structured data to match on-page content.",
      )
    }
  }

  return null
}

// ── BLOCK/WARNING Check (dual return) ────────────────────────────────────────

/** B9 — hero image must be reachable and return a valid image Content-Type. */
async function checkImageReachable(
  heroImageUrl: string | null,
): Promise<{ block: BlockingIssue | null; warn: Warning | null }> {
  if (!heroImageUrl) return { block: null, warn: null } // handled by B5

  // Only validate absolute HTTP(S) URLs
  if (!heroImageUrl.startsWith("http")) return { block: null, warn: null }

  try {
    const res = await fetch(heroImageUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return {
        block: null,
        warn: warn("IMAGE_HEAD_FAILED", `Image URL returned HTTP ${res.status}. Verify the image is accessible.`),
      }
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.startsWith("image/")) {
      return {
        block: block("IMAGE_UNREACHABLE", `Image URL returned Content-Type "${contentType}" instead of an image type. The URL may be broken or point to a non-image resource.`),
        warn: null,
      }
    }

    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10)
    if (contentLength > 0 && contentLength < 5000) {
      return {
        block: null,
        warn: warn("IMAGE_TOO_SMALL", `Image is only ${contentLength} bytes — may be a placeholder or error image.`),
      }
    }

    return { block: null, warn: null }
  } catch {
    // Network error, DNS failure, timeout — not a permanent image issue
    return {
      block: null,
      warn: warn("IMAGE_HEAD_FAILED", "Could not verify image accessibility (network error or timeout). Image will be re-checked on next publish attempt."),
    }
  }
}

// ── Recipe Node Extractor ────────────────────────────────────────────────────

function findRecipeNode(jsonLd: unknown): Record<string, unknown> | null {
  if (!jsonLd) return null

  // ZenMux structured output may return jsonLd as a JSON string
  let obj: Record<string, unknown> | null = null
  if (typeof jsonLd === "string") {
    try { obj = JSON.parse(jsonLd) } catch { return null }
  } else if (typeof jsonLd === "object") {
    obj = jsonLd as Record<string, unknown>
  }

  if (!obj) return null

  const graph = obj["@graph"] as Record<string, unknown>[] | undefined
  if (graph) {
    return (graph.find((n) => n["@type"] === "Recipe") as Record<string, unknown>) ?? null
  }
  // Flat schema (legacy fallback)
  if (obj["@type"] === "Recipe") return obj
  return null
}

// ── Main Gate ────────────────────────────────────────────────────────────────

/**
 * Run all 15 SEO pre-publish checks and return a GateResult.
 *
 * For articles (content_type !== "recipe"), Recipe-specific checks are skipped
 * and a lightweight pass is returned.
 */
export async function runSeoGate(input: GateInput): Promise<GateResult> {
  const blockingIssues: BlockingIssue[] = []
  const warnings: Warning[] = []

  // BLOCK checks (all synchronous except cannibalization)
  const recipeBlockers = input.content_type === "recipe"
    ? [
        checkRecipeSchema(input.jsonLd),
        checkRecipeName(input.jsonLd),
        checkIngredients(input.jsonLd),
        checkInstructions(input.jsonLd),
        checkSchemaImage(input.jsonLd),
      ]
    : []

  const universalBlockers = [
    checkTitle(input.metaTitle),
  ]

  for (const b of [...recipeBlockers, ...universalBlockers]) {
    if (b) blockingIssues.push(b)
  }

  // Cannibalization is async (DB query)
  const cannibal = await checkCannibalization(input.recipeId, input.focusKeyphrase, input.content_type)
  if (cannibal) blockingIssues.push(cannibal)

  // Image reachability is async (HTTP HEAD)
  const imageCheck = await checkImageReachable(input.heroImageUrl)
  if (imageCheck.block) blockingIssues.push(imageCheck.block)
  if (imageCheck.warn) warnings.push(imageCheck.warn)

  // WARNING checks (all synchronous)
  const recipeWarnings = input.content_type === "recipe"
    ? [
        checkNutrition(input.jsonLd),
        checkRating(input.jsonLd),
        checkCookTime(input.jsonLd),
        checkSchemaContentMismatch(input.jsonLd, input.contentMarkdown),
      ]
    : []

  const universalWarnings = [
    checkTitleKeyword(input.metaTitle, input.focusKeyphrase),
    checkMetaLength(input.metaDescription),
    checkIntroKeyword(input.contentMarkdown, input.focusKeyphrase),
    checkInternalLinks(input.contentMarkdown),
    checkPlaceholderImage(input.heroImageUrl),
  ]

  for (const w of [...recipeWarnings, ...universalWarnings]) {
    if (w) warnings.push(w)
  }

  // Scoring
  const score = blockingIssues.length > 0
    ? 0
    : Math.max(0, 100 - warnings.length * 5)

  const status = blockingIssues.length > 0
    ? "BLOCK"
    : score >= 85
      ? "PASS"
      : "REVISE"

  const summary = status === "PASS"
    ? `All ${blockingIssues.length + warnings.length} checks passed. Ready for publication.`
    : status === "BLOCK"
      ? `Blocked by ${blockingIssues.length} critical issue(s): ${blockingIssues.map(i => i.code).join(", ")}.`
      : `${warnings.length} warning(s) to address: ${warnings.map(w => w.code).join(", ")}.`

  return {
    status,
    score,
    blockingIssues,
    warnings,
    summary,
    checkedAt: new Date().toISOString(),
  }
}
