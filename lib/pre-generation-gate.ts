// lib/pre-generation-gate.ts
// Pre-Generation Gate — Anti-duplicate & anti-cannibalization checks
// before Inngest workflow dispatch. Saves tokens by blocking near-duplicate
// keywords BEFORE generation starts.
//
// Architecture:
//   1. Exact slug match     → BLOCK (fastest, most reliable)
//   2. Keyword fuzzy match   → BLOCK (PostgreSQL trigram similarity)
//   3. Semantic neighbor     → WARN  (token overlap > threshold)
//   4. Tag saturation        → WARN  (≥3 articles share predicted tags)
//
// Gate is enabled by default. Set PRE_GEN_GATE_ENABLED=false to disable.
// All checks are readonly — no mutations, no side effects.

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { slugify } from "@/lib/slug"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateResult {
  verdict: "proceed" | "block" | "warn"
  /** Which check triggered the result. null when verdict is "proceed". */
  check: "slug_exact" | "keyword_fuzzy" | "semantic_neighbor" | "tag_saturation" | null
  /** Suggested existing article URL when blocked. */
  suggestion?: string
  /** The existing article that caused the block/warn. */
  existingArticle?: { id: number; slug: string; title: string; keyword: string }
  /** Similarity score 0-100 for fuzzy/semantic matches. */
  similarity?: number
  /** Tags that caused the saturation flag. */
  saturatedTags?: string[]
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENABLED = process.env.PRE_GEN_GATE_ENABLED !== "false"
const FUZZY_THRESHOLD = parseFloat(process.env.PRE_GEN_GATE_FUZZY_THRESHOLD ?? "0.8")
const SEMANTIC_THRESHOLD = parseFloat(process.env.PRE_GEN_GATE_SEMANTIC_THRESHOLD ?? "0.7")
const TAG_SATURATION_MIN = 3  // ≥ this many articles with same tags triggers a flag

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Tokenizes a keyword into meaningful words (no stopwords, min 2 chars).
 */
function tokenize(kw: string): string[] {
  const stopwords = new Set([
    "a", "an", "the", "and", "or", "for", "of", "in", "on", "to", "with",
    "is", "it", "at", "from", "by", "as", "be", "this", "that", "are",
    "was", "were", "been", "best", "easy", "quick", "simple", "homemade",
    "recipe", "recipes", "dinner", "lunch", "breakfast", "meal", "dish",
  ])
  return kw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopwords.has(w))
}

/**
 * Jaccard similarity between two token arrays: |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Predicts likely tags for a keyword based on ingredient/technique keywords.
 * Simple heuristic — not an LLM call.
 */
function predictTags(keyword: string): string[] {
  const kw = keyword.toLowerCase()
  const tags: string[] = []

  // Ingredient-based tags
  const ingredientPatterns: [RegExp, string][] = [
    [/chicken|poultry/i, "chicken"],
    [/beef|steak|ground beef/i, "beef"],
    [/pork|bacon|ham/i, "pork"],
    [/salmon|fish|seafood|shrimp|tuna/i, "seafood"],
    [/pasta|spaghetti|penne|bucatini|linguine/i, "pasta"],
    [/rice|risotto|paella/i, "rice"],
    [/lemon|lime|citrus/i, "citrus"],
    [/chocolate|cocoa/i, "chocolate"],
    [/tomato|marinara|pomodoro/i, "tomato"],
    [/cheese|mozzarella|parmesan|burrata/i, "cheese"],
    [/garlic|herb|basil|rosemary|thyme/i, "herbs"],
  ]

  for (const [pattern, tag] of ingredientPatterns) {
    if (pattern.test(kw)) tags.push(tag)
  }

  // Technique-based tags
  const techniquePatterns: [RegExp, string][] = [
    [/one.?pan|sheet.?pan|skillet/i, "one-pan"],
    [/slow.?cook|crockpot|instant.?pot/i, "slow-cooker"],
    [/bake|oven|roast/i, "baked"],
    [/grill|bbq|barbecue/i, "grilled"],
    [/quick|easy|fast|30.?min/i, "quick"],
    [/soup|stew|broth/i, "soup"],
    [/salad/i, "salad"],
  ]

  for (const [pattern, tag] of techniquePatterns) {
    if (pattern.test(kw)) tags.push(tag)
  }

  // Cuisine-based tags
  if (/italian|pasta|risotto|parm/i.test(kw)) tags.push("italian")
  if (/french|provence|lyon/i.test(kw)) tags.push("french")
  if (/asian|stir.?fry|soy|ginger/i.test(kw)) tags.push("asian")
  if (/mexican|taco|quesadilla/i.test(kw)) tags.push("mexican")

  return [...new Set(tags)] // deduplicate
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * Check 1: Exact slug match.
 * Fastest check — a single indexed SELECT by slug.
 */
async function checkExactSlug(slug: string): Promise<GateResult | null> {
  try {
    const [match] = await db
      .select({ id: recipes.id, slug: recipes.slug, title: recipes.title, keyword: recipes.keyword })
      .from(recipes)
      .where(and(eq(recipes.slug, slug), eq(recipes.status, "published")))
      .limit(1)

    if (match) {
      return {
        verdict: "block",
        check: "slug_exact",
        suggestion: `/recettes/${match.slug}`,
        existingArticle: {
          id: match.id,
          slug: match.slug,
          title: match.title ?? match.keyword,
          keyword: match.keyword,
        },
      }
    }
  } catch (err) {
    console.error("[PreGenGate] Slug check failed:", (err as Error).message)
  }
  return null
}

/**
 * Check 2: Keyword fuzzy match using PostgreSQL trigram similarity.
 * Catches near-duplicate keywords like "lemon chicken pasta" vs "chicken lemon pasta".
 */
async function checkKeywordFuzzy(keyword: string): Promise<GateResult | null> {
  try {
    // Use PostgreSQL similarity (requires pg_trgm extension — already available on Neon)
    const matches = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        keyword: recipes.keyword,
        similarity: sql<number>`similarity(${recipes.keyword}, ${keyword})`,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.status, "published"),
          sql`similarity(${recipes.keyword}, ${keyword}) > ${FUZZY_THRESHOLD}`,
        ),
      )
      .orderBy(sql`similarity(${recipes.keyword}, ${keyword}) DESC`)
      .limit(1)

    if (matches.length > 0) {
      const m = matches[0]
      return {
        verdict: "block",
        check: "keyword_fuzzy",
        similarity: Math.round(Number(m.similarity) * 100),
        suggestion: `/recettes/${m.slug}`,
        existingArticle: {
          id: m.id,
          slug: m.slug,
          title: m.title ?? m.keyword,
          keyword: m.keyword,
        },
      }
    }
  } catch (err) {
    console.error("[PreGenGate] Fuzzy check failed:", (err as Error).message)
    // Don't block on DB error — let the generation proceed
  }
  return null
}

/**
 * Check 3: Semantic neighbor using Jaccard token similarity.
 * Catches "chicken dinner for two" vs "easy chicken dinner ideas".
 * Pure JS — no DB call beyond fetching keywords (cached).
 */
async function checkSemanticNeighbor(
  keyword: string,
  publishedKeywords: string[],
): Promise<GateResult | null> {
  try {
    const tokens = tokenize(keyword)
    if (tokens.length < 2) return null // too short to compare meaningfully

    let bestSimilarity = 0
    let bestMatch: typeof publishedKeywords[0] = ""

    for (const pk of publishedKeywords) {
      const pkTokens = tokenize(pk)
      if (pkTokens.length < 2) continue

      const sim = jaccardSimilarity(tokens, pkTokens)
      if (sim > bestSimilarity) {
        bestSimilarity = sim
        bestMatch = pk
      }
    }

    if (bestSimilarity >= SEMANTIC_THRESHOLD && bestMatch) {
      // Fetch the matching article for details
      const [match] = await db
        .select({ id: recipes.id, slug: recipes.slug, title: recipes.title, keyword: recipes.keyword })
        .from(recipes)
        .where(and(eq(recipes.keyword, bestMatch), eq(recipes.status, "published")))
        .limit(1)

      if (match) {
        return {
          verdict: "warn",
          check: "semantic_neighbor",
          similarity: Math.round(bestSimilarity * 100),
          existingArticle: {
            id: match.id,
            slug: match.slug,
            title: match.title ?? match.keyword,
            keyword: match.keyword,
          },
        }
      }
    }
  } catch (err) {
    console.error("[PreGenGate] Semantic check failed:", (err as Error).message)
  }
  return null
}

/**
 * Check 4: Tag saturation.
 * Flags when 3+ articles already share the predicted tags for this keyword.
 */
async function checkTagSaturation(keyword: string): Promise<GateResult | null> {
  try {
    const predictedTags = predictTags(keyword)
    if (predictedTags.length < 2) return null // not enough tags to check

    // Count how many published articles share ≥2 of the predicted tags
    const tagConditions = predictedTags.map((t) =>
      sql`CASE WHEN ${recipes.tags}::text ILIKE ${`%${t}%`} THEN 1 ELSE 0 END`
    )
    const allPublished = await db
      .select({
        id: recipes.id,
        tagMatchScore: sql<number>`${sql.join(tagConditions, sql` + `)}`,
      })
      .from(recipes)
      .where(eq(recipes.status, "published"))

    const saturated = allPublished.filter((a) => Number(a.tagMatchScore) >= 2)

    if (saturated.length >= TAG_SATURATION_MIN) {
      return {
        verdict: "warn",
        check: "tag_saturation",
        saturatedTags: predictedTags,
      }
    }
  } catch (err) {
    console.error("[PreGenGate] Tag saturation check failed:", (err as Error).message)
  }
  return null
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Runs all pre-generation checks in order. Returns the first BLOCK,
 * otherwise accumulates WARNs, otherwise PROCEED.
 *
 * Usage:
 *   const result = await preGenerationGate("one-pan lemon chicken");
 *   if (result.verdict === "block") return Response.json({...}, {status: 409});
 */
export async function preGenerationGate(keyword: string): Promise<GateResult> {
  if (!ENABLED) {
    return { verdict: "proceed", check: null }
  }

  const slug = slugify(keyword)
  console.log(`[PreGenGate] Checking "${keyword}" (slug: ${slug})...`)

  // ── Check 1: Exact slug ──────────────────────────────────────────────
  const exactResult = await checkExactSlug(slug)
  if (exactResult) {
    console.log(`[PreGenGate] BLOCK (slug_exact): "${keyword}" → "${exactResult.existingArticle?.title}"`)
    return exactResult
  }

  // ── Check 2: Keyword fuzzy ───────────────────────────────────────────
  const fuzzyResult = await checkKeywordFuzzy(keyword)
  if (fuzzyResult) {
    console.log(
      `[PreGenGate] BLOCK (keyword_fuzzy): "${keyword}" ~${fuzzyResult.similarity}%→ "${fuzzyResult.existingArticle?.keyword}"`,
    )
    return fuzzyResult
  }

  // ── Check 3: Semantic neighbor ───────────────────────────────────────
  // Fetch all published keywords once (cached for this call)
  let publishedKeywords: string[] = []
  try {
    const rows = await db
      .select({ keyword: recipes.keyword })
      .from(recipes)
      .where(eq(recipes.status, "published"))
    publishedKeywords = rows.map((r) => r.keyword).filter((k) => k !== keyword)
  } catch (err) {
    console.error("[PreGenGate] Failed to fetch published keywords:", (err as Error).message)
  }

  const semanticResult = await checkSemanticNeighbor(keyword, publishedKeywords)
  if (semanticResult) {
    console.log(
      `[PreGenGate] WARN (semantic_neighbor): "${keyword}" ~${semanticResult.similarity}%→ "${semanticResult.existingArticle?.keyword}"`,
    )
  }

  // ── Check 4: Tag saturation ───────────────────────────────────────────
  const tagResult = await checkTagSaturation(keyword)
  if (tagResult) {
    console.log(
      `[PreGenGate] FLAG (tag_saturation): "${keyword}" tags [${tagResult.saturatedTags?.join(", ")}] appear in ≥${TAG_SATURATION_MIN} articles`,
    )
  }

  // ── Final verdict ──────────────────────────────────────────────────────
  // Semantic neighbor is a soft warning — doesn't block. Tag saturation too.
  if (semanticResult || tagResult) {
    return semanticResult ?? tagResult!
  }

  console.log(`[PreGenGate] PROCEED: "${keyword}" passed all checks`)
  return { verdict: "proceed", check: null }
}
