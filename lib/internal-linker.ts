/**
 * Internal Linker — Post-processing contextual link insertion.
 *
 * Inserts 2-3 natural contextual links into recipe markdown, linking to
 * published recipes. Uses tag-overlap scoring (getRelatedRecipes) for
 * same-cluster priority, falls back to getPublishedRecipes for cross-cluster
 * discovery. Enforces 200-word minimum spacing between links for recipes
 * with 400+ words. Pure post-processing — no AI calls.
 */

import { getPublishedRecipes, getRelatedRecipes } from "@/lib/queries"

interface LinkTarget {
  id: number
  slug: string
  title: string
  tags: string[]
}

/**
 * Extract candidate anchor phrases from markdown.
 * Looks at H2/H3 headings, ingredient/technique mentions, and
 * individual words from body paragraphs (word length > 4 chars).
 */
function extractCandidates(markdown: string): string[] {
  const candidates: string[] = []

  // Extract H2/H3 headings
  const headingMatches = markdown.matchAll(/^#{2,3}\s+(.+?)$/gm)
  for (const m of headingMatches) {
    const text = m[1].trim()
    // Filter out generic headings
    if (
      text.length > 4 &&
      !/^(ingredients|instructions|directions|method|steps|notes|tips|nutrition|faq|why this|equipment)/i.test(text)
    ) {
      candidates.push(text)
    }
  }

  // Extract ingredient names from bullet lists (lines starting with "- ", "• ", or "* ")
  const ingredientMatches = markdown.matchAll(/^[-•*]\s+(.+?)$/gm)
  for (const m of ingredientMatches) {
    const text = m[1].trim()
    // Take the first 2-3 words (ingredient name)
    const words = text.split(/\s+/)
    if (words.length >= 2) {
      const ingredient = words.slice(0, Math.min(3, words.length)).join(" ")
      if (ingredient.length > 5 && !/^\d/.test(ingredient)) {
        candidates.push(ingredient)
      }
    }
  }

  // Extract individual words > 4 chars from body paragraphs
  // This catches ingredient/technique mentions in running text
  const paragraphs = markdown.split("\n\n")
  for (const p of paragraphs) {
    // Skip headings, images, code blocks
    if (/^(#{1,6}\s|!\[|```|<)/.test(p.trim())) continue
    const words = p.match(/\b\w{5,}\b/g)
    if (words) {
      candidates.push(...words)
    }
  }

  // Deduplicate while preserving insertion order
  return [...new Set(candidates)].slice(0, 20) // Max 20 candidates to check
}

/**
 * Find the best link target for a candidate phrase.
 * Returns the recipe slug and the matching phrase, or null.
 */
function findLinkTarget(
  candidate: string,
  publishedRecipes: LinkTarget[],
  currentRecipeId: number,
): { slug: string; phrase: string } | null {
  const normalized = candidate.toLowerCase()

  // Try exact title match first (title contains candidate)
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    if (recipe.title.toLowerCase().includes(normalized)) {
      return { slug: recipe.slug, phrase: candidate }
    }
  }

  // Try title words appearing in candidate
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    const titleWords = recipe.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    for (const word of titleWords) {
      if (normalized.includes(word)) {
        return { slug: recipe.slug, phrase: candidate }
      }
    }
  }

  // Try tag match (recipe tags appearing in candidate)
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    for (const tag of recipe.tags) {
      if (tag.length > 4 && normalized.includes(tag.toLowerCase())) {
        return { slug: recipe.slug, phrase: candidate }
      }
    }
  }

  return null
}

/**
 * Insert contextual internal links into recipe markdown.
 *
 * Algorithm:
 * 1. Extract candidate phrases (dish names, ingredients from headings/bullets, body text)
 * 2. Find matching published recipes (same-cluster priority via getPublishedRecipes)
 * 3. Insert links at first occurrence, max 1 per paragraph, max 3 total
 *
 * @param markdown - The recipe content markdown
 * @param recipeId - Current recipe ID (to avoid self-links)
 * @param tags - Recipe tags (for cluster resolution)
 * @returns Markdown with contextual links inserted
 */
export async function insertContextualLinks(
  markdown: string,
  recipeId: number,
  tags: string[],
): Promise<string> {
  const candidates = extractCandidates(markdown)
  if (candidates.length === 0) return markdown

  // 1. Get same-cluster related recipes (tag-overlap scoring, top 5)
  const relatedRecipes = await getRelatedRecipes(recipeId, tags)

  // 2. Get all published recipes for cross-cluster fallback
  const publishedRecipes = await getPublishedRecipes()

  // 3. Build ordered target list: related first (priority), then others
  const relatedIds = new Set(relatedRecipes.map((r) => r.id))
  const otherRecipes = publishedRecipes.filter(
    (r) => r.id !== recipeId && !relatedIds.has(r.id),
  )

  const allTargets: LinkTarget[] = [
    ...relatedRecipes.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      tags: (r.tags ?? []) as string[],
    })),
    ...otherRecipes.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      tags: (r.tags ?? []) as string[],
    })),
  ]

  if (allTargets.length === 0) return markdown

  // 4. Check word count for spacing enforcement
  const totalWords = markdown.split(/\s+/).filter((w) => w.length > 0).length
  const enforceSpacing = totalWords >= 400

  const paragraphs = markdown.split("\n\n")
  const linkedParagraphs = new Set<number>()
  let linksInserted = 0
  let lastLinkWordPosition = -Infinity

  for (let i = 0; i < paragraphs.length && linksInserted < 3; i++) {
    if (linkedParagraphs.has(i)) continue

    // Skip paragraphs that are headings, images, or code blocks
    if (/^(#{1,6}\s|!\[|```|<)/.test(paragraphs[i].trim())) continue

    // Calculate cumulative word position before this paragraph
    const wordsBefore = paragraphs
      .slice(0, i)
      .reduce(
        (sum, p) => sum + p.split(/\s+/).filter((w) => w.length > 0).length,
        0,
      )

    // Enforce 200-word minimum spacing (skip for short recipes < 400 words)
    if (enforceSpacing && wordsBefore - lastLinkWordPosition < 200) continue

    for (const candidate of candidates) {
      const match = findLinkTarget(candidate, allTargets, recipeId)
      if (!match) continue

      // Check if candidate phrase appears with proper word boundaries.
      // Uses lookbehind/lookahead instead of \b to avoid breaking hyphenated
      // compounds like "green-beans": \b matches between 'n' and '-', but our
      // pattern treats hyphen as a word-internal character so we only match
      // standalone words.
      const escapedPhrase = match.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(
        `(?<=^|[^\\w-])${escapedPhrase}(?=[^\\w-]|$)`,
        "i",
      )

      if (regex.test(paragraphs[i])) {
        // Insert link at first occurrence
        const link = `[${match.phrase}](/recettes/${match.slug})`
        paragraphs[i] = paragraphs[i].replace(regex, link)
        linkedParagraphs.add(i)
        linksInserted++
        lastLinkWordPosition = wordsBefore
        break // One link per paragraph
      }
    }
  }

  return paragraphs.join("\n\n")
}
