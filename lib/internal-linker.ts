/**
 * Internal Linker — Contextual link insertion for Hub & Spokes topical authority.
 *
 * Post-processing only — no AI calls. Inserts 2-3 natural contextual links
 * into recipe markdown, linking to published recipes in the same cluster.
 * Falls back to a "Related Recipes" section when natural anchors are scarce.
 *
 * Strategy:
 * 1. Extract candidate phrases from headings and ingredient mentions
 * 2. Match against published recipe titles/keywords/tags
 * 3. Same-cluster priority (via resolveCluster)
 * 4. Insert at first occurrence, max 1/paragraph, ≥200 words apart, max 3 links
 * 5. Guaranteed minimum: if < 2 natural links, append a Related Recipes section
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
}

interface LinkMatch {
  slug: string
  phrase: string
  /** The anchor text to use — derived from target's keyword/title */
  anchor: string
}

// ---------------------------------------------------------------------------
// Anchor extraction
// ---------------------------------------------------------------------------

/** Words that don't make good anchor text (too generic). */
const STOP_ANCHORS = /^(the|this|that|these|those|with|from|into|over|your|our|recipe|ingredients|instructions|directions|method|steps|notes|tips|nutrition|faq|why this|how to|what you|serving|storage|reheating|variations|substitutions|equipment)$/i

/**
 * Extract candidate anchor phrases from the markdown body.
 * Sources: H2/H3 headings (filtered), ingredient names from bullet lists,
 * and the first sentence of each "Why This Works" section.
 */
function extractCandidates(markdown: string): string[] {
  const candidates: string[] = []

  // 1. H2/H3 headings (excluding generic section headers)
  const headingRe = /^#{2,3}\s+(.+?)$/gm
  for (const m of markdown.matchAll(headingRe)) {
    const text = m[1].trim()
    if (text.length > 6 && !STOP_ANCHORS.test(text)) {
      candidates.push(text)
    }
  }

  // 2. Ingredient names from bullet lists (first 2-3 words)
  const bulletRe = /^[-•*]\s+(.+?)$/gm
  for (const m of markdown.matchAll(bulletRe)) {
    const text = m[1].trim()
    const words = text.split(/\s+/)
    if (words.length >= 2) {
      const phrase = words.slice(0, Math.min(3, words.length)).join(" ")
      if (phrase.length > 5 && !/^\d/.test(phrase) && !STOP_ANCHORS.test(phrase)) {
        candidates.push(phrase)
      }
    }
  }

  // 3. First sentence of Why This Works section (often references the dish generically)
  const whyRe = /^## Why This Works\b[^\n]*\n+([A-Z][^\n.]{30,200}\.)/m
  const whyMatch = markdown.match(whyRe)
  if (whyMatch) {
    candidates.push(whyMatch[1].trim())
  }

  // Deduplicate and limit
  const seen = new Set<string>()
  return candidates
    .map((c) => c.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim())
    .filter((c) => c.length > 5 && !seen.has(c) && seen.add(c))
    .slice(0, 12)
}

// ---------------------------------------------------------------------------
// Link target matching
// ---------------------------------------------------------------------------

/**
 * Find the best published recipe that matches a candidate phrase.
 * Scoring order:
 * 1. Exact: candidate contains the recipe's keyword (strongest signal)
 * 2. Title overlap: significant words from recipe title appear in candidate
 * 3. Tag match: candidate mentions a recipe's tag
 *
 * Returns the match with slug, phrase, and the anchor text to use.
 */
function findLinkTarget(
  candidateLower: string,
  publishedRecipes: LinkTarget[],
  currentRecipeId: number,
): LinkMatch | null {
  // Pass 1: keyword match (strongest)
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    const kw = recipe.keyword.toLowerCase()
    if (kw.length > 4 && candidateLower.includes(kw)) {
      return {
        slug: recipe.slug,
        phrase: candidateLower,
        anchor: recipe.keyword,
      }
    }
  }

  // Pass 2: significant title words (length > 4) appear in candidate
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    const titleWords = recipe.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_ANCHORS.test(w))
    for (const word of titleWords) {
      if (candidateLower.includes(word)) {
        return {
          slug: recipe.slug,
          phrase: candidateLower,
          anchor: recipe.keyword,
        }
      }
    }
  }

  // Pass 3: tag overlap
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    for (const tag of recipe.tags) {
      const tagLower = tag.toLowerCase()
      if (tagLower.length > 4 && candidateLower.includes(tagLower)) {
        return {
          slug: recipe.slug,
          phrase: candidateLower,
          anchor: tag,
        }
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Link insertion
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** Characters that should not be preceded by a link. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Insert contextual links into recipe markdown.
 *
 * @param markdown - Full recipe content
 * @param recipeId - Current recipe ID (to avoid self-links)
 * @param tags - Recipe tags for cluster resolution
 * @returns Markdown with 2-4 contextual links inserted
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
  }))

  return insertContextualLinksBatch(markdown, recipeId, tags, linkTargets).markdown
}

/**
 * Sync version that accepts pre-fetched recipe list. Used by batch scripts
 * to avoid N DB round-trips.
 */
export function insertContextualLinksBatch(
  markdown: string,
  recipeId: number,
  tags: string[],
  allRecipes: LinkTarget[],
): { markdown: string; links: Array<{ targetSlug: string; anchor: string }> } {
  const links: Array<{ targetSlug: string; anchor: string }> = []

  if (allRecipes.length <= 1) return { markdown, links }

  // 1. Extract candidates
  const candidates = extractCandidates(markdown)
  if (candidates.length === 0) {
    return { markdown: appendRelatedSection(markdown, recipeId, tags, allRecipes, 0), links }
  }

  // 2. Order targets: same-cluster first, then others
  const cluster = resolveCluster(tags)
  const sameCluster: LinkTarget[] = []
  const otherCluster: LinkTarget[] = []

  if (cluster) {
    for (const r of allRecipes) {
      if (r.id === recipeId) continue
      const rCluster = resolveCluster(r.tags)
      if (rCluster?.id === cluster.id) {
        sameCluster.push(r)
      } else {
        otherCluster.push(r)
      }
    }
  } else {
    otherCluster.push(...allRecipes.filter((r) => r.id !== recipeId))
  }

  const orderedTargets = [...sameCluster, ...otherCluster]

  // 3. Try to insert links naturally
  const paragraphs = markdown.split("\n\n")
  const linkedParagraphs = new Set<number>()
  let lastLinkWordPosition = -999

  for (let i = 0; i < paragraphs.length && links.length < 3; i++) {
    if (linkedParagraphs.has(i)) continue

    const p = paragraphs[i]

    // Skip headings, images, code, empty lines, ingredient lists, instruction steps
    if (/^(#{1,6}\s|!\[|```|<|\[IMAGE:)/.test(p.trim())) continue
    if (/^[-•*]\s/.test(p.trim())) continue // bullet lists (ingredients)
    if (/^\d+\.\s/.test(p.trim())) continue // numbered lists (instructions)

    // Calculate word position
    const wordsBefore = paragraphs.slice(0, i).reduce((sum, par) => sum + wordCount(par), 0)

    // Enforce 200-word spacing
    if (wordsBefore - lastLinkWordPosition < 200 / 3) continue // allow denser for short articles

    // Try each candidate against this paragraph
    for (const candidate of candidates) {
      const match = findLinkTarget(candidate, orderedTargets, recipeId)
      if (!match) continue

      const escaped = escapeRegex(match.phrase)
      const regex = new RegExp(`(${escaped})`, "i")

      if (regex.test(p)) {
        const linkMd = `[${match.anchor}](/recettes/${match.slug})`
        paragraphs[i] = p.replace(regex, linkMd)
        linkedParagraphs.add(i)
        links.push({ targetSlug: match.slug, anchor: match.anchor })
        lastLinkWordPosition = wordsBefore
        break // one link per paragraph
      }
    }
  }

  // 4. Fallback: if < 2 natural links, append Related Recipes section
  const enriched = paragraphs.join("\n\n")
  const finalMd = links.length < 2
    ? appendRelatedSection(enriched, recipeId, tags, allRecipes, links.length)
    : enriched

  return { markdown: finalMd, links }
}

// ---------------------------------------------------------------------------
// Related Recipes fallback
// ---------------------------------------------------------------------------

/**
 * Complementary relationship rules for the fallback section.
 * Prevents linking to near-duplicate dishes.
 */
const COMPLEMENTARY_PAIRS: Array<{ source: RegExp; target: RegExp; relation: string }> = [
  { source: /chicken|poultry/i, target: /steak|beef/i, relation: "For red meat lovers, try our" },
  { source: /steak|beef/i, target: /chicken|poultry/i, relation: "Prefer poultry? Make our" },
  { source: /pasta|orzo|mac and cheese|ziti|lasagna|carbonara/i, target: /steak|beef|chicken breast/i, relation: "Pair this pasta with our" },
  { source: /chicken|beef|steak|meat|pork|lamb/i, target: /vegetarian|veggie|side dish|mashed potato/i, relation: "Complete your meal with our" },
  { source: /dessert|cookie|cake|chocolate|sweet/i, target: /chicken|beef|steak|pasta|dinner/i, relation: "Before dessert, try our" },
  { source: /side dish|mashed potato|vegetable/i, target: /chicken|beef|steak|pasta|dinner|main dish/i, relation: "Serve alongside our" },
  { source: /slow.cooker|crockpot/i, target: /one.pan|skillet|sheet.pan|quick|30.minute/i, relation: "Short on time? Try our" },
  { source: /one.pan|skillet|sheet.pan|quick|30.minute/i, target: /slow.cooker|crockpot/i, relation: "Prefer set-and-forget? Make our" },
]

function findComplementary(
  currentTags: string[],
  currentTitle: string,
  allRecipes: LinkTarget[],
  currentId: number,
  excludeSlugs: Set<string>,
  needed: number,
): LinkMatch[] {
  const results: LinkMatch[] = []
  const titleLower = currentTitle.toLowerCase()
  const tagsLower = currentTags.map((t) => t.toLowerCase()).join(" ")

  for (const recipe of allRecipes) {
    if (recipe.id === currentId) continue
    if (excludeSlugs.has(recipe.slug)) continue
    if (results.length >= needed) break

    for (const rule of COMPLEMENTARY_PAIRS) {
      if (rule.source.test(titleLower) || rule.source.test(tagsLower)) {
        const rTitleLower = recipe.title.toLowerCase()
        const rTagsLower = recipe.tags.map((t) => t.toLowerCase()).join(" ")
        if (rule.target.test(rTitleLower) || rule.target.test(rTagsLower)) {
          results.push({
            slug: recipe.slug,
            phrase: "",
            anchor: recipe.title.length < 60 ? recipe.title : recipe.keyword,
          })
          excludeSlugs.add(recipe.slug)
          break
        }
      }
    }
  }

  // If not enough matches, fill with top same-cluster recipes
  if (results.length < needed) {
    for (const recipe of allRecipes) {
      if (results.length >= needed) break
      if (recipe.id === currentId) continue
      if (excludeSlugs.has(recipe.slug)) continue
      results.push({
        slug: recipe.slug,
        phrase: "",
        anchor: recipe.keyword,
      })
      excludeSlugs.add(recipe.slug)
    }
  }

  return results.slice(0, needed)
}

function appendRelatedSection(
  markdown: string,
  recipeId: number,
  tags: string[],
  allRecipes: LinkTarget[],
  existingLinkCount: number,
): string {
  const needed = 3 - existingLinkCount
  if (needed <= 0) return markdown

  const currentRecipe = allRecipes.find((r) => r.id === recipeId)
  const currentTitle = currentRecipe?.title ?? ""

  const excludeSlugs = new Set<string>()
  const complementary = findComplementary(tags, currentTitle, allRecipes, recipeId, excludeSlugs, needed)

  if (complementary.length === 0) return markdown

  const lines = complementary.map((c) =>
    `- Try our [${c.anchor}](/recettes/${c.slug})`,
  )

  // Add after the last paragraph, before any trailing whitespace
  const section = `\n\n---\n\n## 📖 Related Recipes\n\n${lines.join("\n")}\n`
  return markdown.trimEnd() + section
}

// ---------------------------------------------------------------------------
// Link logging
// ---------------------------------------------------------------------------

/**
 * Log internal links to the audit table for tracking.
 */
export async function logInternalLinks(
  sourceRecipeId: number,
  links: Array<{ targetSlug: string; anchor: string }>,
  source: "pipeline" | "batch" = "pipeline",
): Promise<void> {
  if (links.length === 0) return

  try {
    // Resolve slugs to IDs
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
    // Non-blocking — link insertion succeeded even if logging fails
    console.warn(`[internal-linker] Failed to log links for recipe #${sourceRecipeId}:`, (err as Error).message)
  }
}
