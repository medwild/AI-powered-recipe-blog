/**
 * Internal Linker v2 — 100% contextual links (no boilerplate fallback).
 *
 * Guidelines (aligned with claude-seo hub-spoke-architecture):
 * - Links MUST appear naturally within body paragraphs, never in "related posts" sections
 * - 3-5 internal links per 1,000 words (target: 3 for our ~1,800-word recipes)
 * - Anchor text diversity: use target keyword, not generic phrases
 * - Same-cluster priority via resolveCluster
 * - Max 1 link per paragraph, ≥150 words apart
 *
 * Algorithm:
 * 1. Build a phrase index from every published recipe (keyword, title chunks, dishes)
 * 2. Scan source content paragraphs for natural occurrences of these phrases
 * 3. Score by phrase length (longer = more specific match) + same-cluster bonus
 * 4. Insert links at first occurrence — quality over quantity
 */

import { getPublishedRecipes } from "@/lib/queries"
import { resolveCluster } from "@/lib/cluster-resolver"
import { db } from "@/lib/db"
import { internalLinkLogs } from "@/lib/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkTarget {
  id: number
  slug: string
  title: string
  keyword: string
  tags: string[]
  /** Search phrases — populated by buildPhrases(). Optional in input, filled by the linker. */
  phrases?: string[]
}

interface PlacedLink {
  paragraphIdx: number
  phrase: string        // the exact text to replace (from the content)
  slug: string          // target recipe slug
  anchor: string        // anchor text to display (target recipe's keyword)
  score: number         // higher = better match
}

// ---------------------------------------------------------------------------
// Phrase index
// ---------------------------------------------------------------------------

/** Words too generic to serve as search phrases, even in combination. */
const STOP_WORDS = /^(the|this|that|these|those|with|from|into|over|your|our|and|for|are|not|but|its|has|have|had|been|was|were|will|would|could|should|can|may|just|also|than|then|now|each|all|any|some|most|other|every|two|per|easy|best|quick|simple|healthy)$/i

/** N-grams that are too generic to be useful anchors (appear in many recipes). */
const GENERIC_PHRASES = new Set([
  "dinner for two", "for two people", "recipe for two", "recipes for two",
  "weeknight dinner", "one pan dinner", "easy dinner", "quick dinner",
  "small batch", "30 minute", "cook for two", "serves two",
  "for two servings", "dinner for 2", "ready in",
])

/**
 * Generate search phrases for a recipe — these are the terms that, if found
 * in another recipe's body text, would justify a contextual link to this recipe.
 */
/**
 * Extract the "dish name" from a recipe title — the actual food being made.
 * Removes prefixes like "One-Pan", "30-Minute", "Easy", "Small-Batch"
 * and suffixes like "for Two", "Recipe", "| ...".
 *
 * "Pan-Seared Steak Dinner for Two with Garlic Butter" → "steak dinner"
 * "Chocolate Lava Cakes for Two" → "chocolate lava cakes"
 * "Stovetop Mac and Cheese for Two" → "mac and cheese"
 */
function extractDishName(title: string): string {
  let t = title.toLowerCase()
  // Remove time prefixes
  t = t.replace(/^\d+[- ]minute\s+/i, "")
  // Remove method/attribute prefixes (keep the dish itself)
  t = t.replace(/^(one.pan|sheet.pan|one.skillet|stovetop|slow.cooker|small.batch|pan.seared|easy|quick|best|simple|creamy|garlic.butter|lemon.herb|lemon.garlic|herb.crusted)\s+/i, "")
  // Remove suffixes
  t = t.replace(/\s+(for two|for 2|recipe|dinner for two|dinner for 2)$/i, "")
  t = t.replace(/\s*[|—-].*$/, "") // remove after pipe/dash
  return t.trim()
}

function buildPhrases(title: string, keyword: string, tags: string[]): string[] {
  const phrases: string[] = []

  // 1. Dish name and its component words (most important)
  const dishName = extractDishName(title)
  if (dishName.length > 4 && dishName.includes(" ")) {
    phrases.push(dishName)
    // Also extract key 2-word chunks from the dish name
    const dishWords = dishName.split(/\s+/)
    for (let i = 0; i <= dishWords.length - 2; i++) {
      const chunk = dishWords.slice(i, i + 2).join(" ")
      if (chunk.length > 5 && !GENERIC_PHRASES.has(chunk)) {
        phrases.push(chunk)
      }
    }
  }

  // 2. The keyword stem (without "for two" suffix)
  if (keyword.length > 4 && keyword.includes(" ")) {
    const stem = keyword.replace(/\s+(for two|for 2|recipe for|recipes for)\s*$/i, "").trim()
    if (stem !== keyword && stem.length > 4 && stem.includes(" ") && !GENERIC_PHRASES.has(stem)) {
      phrases.push(stem.toLowerCase())
    }
  }

  // 3. Distinctive tags (multi-word, specific dish identifiers)
  for (const tag of tags) {
    const t = tag.toLowerCase()
    if (t.includes(" ") && t.length > 5 && !GENERIC_PHRASES.has(t)) {
      phrases.push(t)
    }
    // "chicken-pot-pie" → "chicken pot pie"
    if (t.includes("-") && t.split("-").length >= 2) {
      const unHyphenated = t.replace(/-/g, " ")
      if (unHyphenated.length > 5 && !GENERIC_PHRASES.has(unHyphenated)) {
        phrases.push(unHyphenated)
      }
    }
  }

  // 4. Specific ingredient-based dish identifiers — extract from title
  //    e.g. "chicken breast", "mashed potato", "ground beef", "lamb chop"
  const ingredientPatterns = [
    /(chicken\s+(breast|thigh|wing|dinner|pot\s+pie|parm|orzo|pasta|rice|stir.fry|enchilada))/i,
    /(beef\s+(stew|ramen|wellington|stroganoff|stir.fry|noodle))/i,
    /(steak\s+dinner)/i,
    /(mashed\s+potato)/i,
    /(mac\s+and\s+cheese)/i,
    /(chocolate\s+(chip\s+)?(cook|lav|dessert))/i,
    /(cookie\s+dough)/i,
    /(lava\s+cake)/i,
    /(rice\s+bowl)/i,
    /(pot\s+pie)/i,
    /(lamb\s+chop)/i,
    /(ground\s+(beef|turkey|pork))/i,
    /(baked\s+ziti)/i,
    /(asian\s+(beef|chicken|noodle|stir))/i,
    /(thanksgiving\s+dinner)/i,
    /(easter\s+dinner)/i,
    /(slow\s+cooker)/i,
    /(sheet\s+pan)/i,
    /(garlic\s+butter)/i,
    /(lemon\s+(chicken|butter|herb|garlic))/i,
    /(cookie\s+dough)/i,
  ]
  for (const pattern of ingredientPatterns) {
    const match = title.match(pattern)
    if (match && match[1]) {
      const phrase = match[1].toLowerCase()
      if (!GENERIC_PHRASES.has(phrase) && !phrases.includes(phrase)) {
        phrases.push(phrase)
      }
    }
  }

  // Deduplicate, sort by length descending (longer = more specific)
  const seen = new Set<string>()
  return phrases
    .filter((p) => p.includes(" ") && !seen.has(p) && seen.add(p))
    .sort((a, b) => b.length - a.length)
    .slice(0, 10)
}

// ---------------------------------------------------------------------------
// Paragraph classification
// ---------------------------------------------------------------------------

/** True if the paragraph is eligible for link insertion (not a heading, image, list, etc.). */
function isContentParagraph(text: string): boolean {
  const t = text.trim()
  if (t.length < 40) return false // too short to be meaningful content
  if (/^(#{1,6}\s|!\[|```|<|\[IMAGE:)/.test(t)) return false // headings, images, code
  if (/^[-•*]\s/.test(t)) return false // bullet lists (ingredients)
  if (/^\d+\.\s/.test(t)) return false // numbered lists (instructions)
  if (/^(Ingredients|Instructions|Directions|Method|Steps|Notes|Tips|Nutrition|FAQ|Equipment|Servings|Prep Time|Cook Time|Total Time)/i.test(t)) return false
  return true
}

// ---------------------------------------------------------------------------
// Anchor scanning
// ---------------------------------------------------------------------------

interface ScanMatch {
  phrase: string
  slug: string
  anchor: string
  score: number
  /** Position of the match in the paragraph text (character offset). */
  position: number
}

/**
 * Scan a single paragraph for all possible target phrase matches.
 * Returns matches sorted by score (highest first).
 */
function scanParagraph(
  paragraphText: string,
  targets: LinkTarget[],
  currentId: number,
  sameClusterIds: Set<number>,
): ScanMatch[] {
  const matches: ScanMatch[] = []
  const lower = paragraphText.toLowerCase()

  for (const target of targets) {
    if (target.id === currentId) continue

    for (const phrase of (target.phrases ?? [])) {
      const idx = lower.indexOf(phrase)
      if (idx === -1) continue

      // Score: phrase length + same-cluster bonus
      let score = phrase.length
      if (sameClusterIds.has(target.id)) score += 50

      matches.push({
        phrase,
        slug: target.slug,
        anchor: target.keyword,
        score,
        position: idx,
      })
      break // one phrase match per target per paragraph
    }
  }

  return matches.sort((a, b) => b.score - a.score)
}

// ---------------------------------------------------------------------------
// Link insertion
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Insert contextual links into recipe markdown.
 *
 * @returns Enriched markdown and the list of links created.
 */
export async function insertContextualLinks(
  markdown: string,
  recipeId: number,
  tags: string[],
): Promise<string> {
  const publishedRecipes = await getPublishedRecipes()
  if (publishedRecipes.length <= 1) return markdown

  const linkTargets: LinkTarget[] = publishedRecipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    keyword: r.keyword,
    tags: (r.tags ?? []) as string[],
    phrases: [],
  }))

  return insertContextualLinksBatch(markdown, recipeId, tags, linkTargets).markdown
}

/**
 * Sync version with pre-fetched recipe list. Used by batch scripts.
 */
export function insertContextualLinksBatch(
  markdown: string,
  recipeId: number,
  tags: string[],
  allRecipes: LinkTarget[],
): { markdown: string; links: Array<{ targetSlug: string; anchor: string }> } {
  const links: Array<{ targetSlug: string; anchor: string }> = []

  if (allRecipes.length <= 1) return { markdown, links }
  if (!markdown || markdown.trim().length === 0) return { markdown, links }

  // 1. Build phrase index for all target recipes
  const targets: LinkTarget[] = allRecipes
    .filter((r) => r.id !== recipeId)
    .map((r) => ({
      ...r,
      phrases: buildPhrases(r.title, r.keyword, r.tags),
    }))

  if (targets.length === 0) return { markdown, links }

  // 2. Resolve same-cluster IDs for priority
  const cluster = resolveCluster(tags)
  const sameClusterIds = new Set<number>()
  if (cluster) {
    for (const r of allRecipes) {
      if (r.id !== recipeId && resolveCluster(r.tags)?.id === cluster.id) {
        sameClusterIds.add(r.id)
      }
    }
  }

  // 3. Scan all paragraphs for natural anchor occurrences
  const paragraphs = markdown.split("\n\n")
  const totalWords = wordCount(markdown)

  // Determine link budget: aim for 2-3 per recipe, density ~3 per 1000 words
  const densityTarget = Math.round(totalWords / 1000) * 3
  const maxLinks = Math.max(1, Math.min(3, densityTarget))

  const placements: PlacedLink[] = []
  const usedSlugs = new Set<string>()

  for (let i = 0; i < paragraphs.length && placements.length < maxLinks; i++) {
    if (!isContentParagraph(paragraphs[i])) continue

    // Enforce spacing: at least 150 words from the last link
    const wordsBefore = paragraphs.slice(0, i).reduce((sum, p) => sum + wordCount(p), 0)
    if (placements.length > 0) {
      const lastWordsBefore = paragraphs.slice(0, placements[placements.length - 1].paragraphIdx)
        .reduce((sum, p) => sum + wordCount(p), 0)
      if (wordsBefore - lastWordsBefore < 150) continue
    }

    // Find the best match for this paragraph
    const matches = scanParagraph(paragraphs[i], targets, recipeId, sameClusterIds)

    for (const match of matches) {
      if (usedSlugs.has(match.slug)) continue

      placements.push({
        paragraphIdx: i,
        phrase: match.phrase,
        slug: match.slug,
        anchor: match.anchor,
        score: match.score,
      })
      usedSlugs.add(match.slug)
      break // max 1 link per paragraph
    }
  }

  // 4. Insert links (iterate in reverse order within each paragraph to preserve positions)
  // Since we have max 1 per paragraph, order doesn't matter — just apply them
  for (const placement of placements) {
    const p = paragraphs[placement.paragraphIdx]
    const escaped = escapeRegex(placement.phrase)
    // Match the phrase as a whole word/phrase, case-insensitive
    const regex = new RegExp(`(${escaped})`, "i")
    if (regex.test(p)) {
      paragraphs[placement.paragraphIdx] = p.replace(
        regex,
        `[${placement.anchor}](/recipes/${placement.slug})`,
      )
      links.push({ targetSlug: placement.slug, anchor: placement.anchor })
    }
  }

  return { markdown: paragraphs.join("\n\n"), links }
}

// ---------------------------------------------------------------------------
// Link logging
// ---------------------------------------------------------------------------

export async function logInternalLinks(
  sourceRecipeId: number,
  links: Array<{ targetSlug: string; anchor: string }>,
  source: "pipeline" | "batch" = "pipeline",
): Promise<void> {
  if (links.length === 0) return

  try {
    const targetSlugs = links.map((l) => l.targetSlug)
    const targets = await db.query.recipes.findMany({
      where: (r, { inArray }) => inArray(r.slug, targetSlugs),
      columns: { id: true, slug: true },
    })
    const slugToId = new Map(targets.map((t) => [t.slug, t.id]))

    for (const link of links) {
      const targetId = slugToId.get(link.targetSlug)
      await db.insert(internalLinkLogs).values({
        sourceContentId: sourceRecipeId,
        targetSlug: link.targetSlug,
        targetContentId: targetId ?? null,
        anchorText: link.anchor,
        action: "created",
        source,
        score: null,
        createdAt: new Date(),
      })
    }
  } catch (err) {
    console.warn(`[internal-linker] Failed to log links for recipe #${sourceRecipeId}:`, (err as Error).message)
  }
}
