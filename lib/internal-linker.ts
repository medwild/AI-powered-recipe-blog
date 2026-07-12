/**
 * Internal Linker — Post-processing contextual link insertion.
 *
 * Inserts 2-3 natural contextual links into recipe markdown, linking to
 * published recipes in the same cluster. Pure post-processing — no AI calls.
 */

import { getPublishedRecipes } from "@/lib/queries"
import { resolveCluster } from "@/lib/cluster-resolver"

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

  const publishedRecipes = await getPublishedRecipes()
  if (publishedRecipes.length <= 1) return markdown

  const linkTargets: LinkTarget[] = publishedRecipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    tags: (r.tags ?? []) as string[],
  }))

  // Resolve cluster for same-cluster priority
  const cluster = resolveCluster(tags)
  let sameClusterRecipes: LinkTarget[] = []
  let otherRecipes: LinkTarget[] = []

  if (cluster) {
    for (const r of linkTargets) {
      if (r.id === recipeId) continue
      const rCluster = resolveCluster(r.tags)
      if (rCluster?.id === cluster.id) {
        sameClusterRecipes.push(r)
      } else {
        otherRecipes.push(r)
      }
    }
  } else {
    otherRecipes = linkTargets.filter((r) => r.id !== recipeId)
  }

  // Prioritize same-cluster recipes
  const orderedTargets = [...sameClusterRecipes, ...otherRecipes]

  const paragraphs = markdown.split("\n\n")
  const linkedParagraphs = new Set<number>()
  let linksInserted = 0

  for (let i = 0; i < paragraphs.length && linksInserted < 3; i++) {
    if (linkedParagraphs.has(i)) continue

    // Skip paragraphs that are headings, images, or code blocks
    if (/^(#{1,6}\s|!\[|```|<)/.test(paragraphs[i].trim())) continue

    for (const candidate of candidates) {
      const match = findLinkTarget(candidate, orderedTargets, recipeId)
      if (!match) continue

      // Check if candidate appears in this paragraph
      const escapedPhrase = match.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`(\\b${escapedPhrase}\\b)`, "i")

      if (regex.test(paragraphs[i])) {
        // Insert link at first occurrence
        const link = `[${match.phrase}](/recettes/${match.slug})`
        paragraphs[i] = paragraphs[i].replace(regex, link)
        linkedParagraphs.add(i)
        linksInserted++
        break // One link per paragraph
      }
    }
  }

  return paragraphs.join("\n\n")
}
