/**
 * Tag slug utilities — deterministic, no LLM dependency.
 *
 * Converts recipe tags to URL-safe slugs and back.
 * Used by /recipes/category/[slug] for clean category URLs.
 */

/** Normalize a tag to a URL slug: lowercase, spaces→hyphens, no special chars. */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Match a URL slug back to a tag from a list of known tags.
 * Returns the original tag (with original casing/spacing) or null.
 */
export function slugToTag(slug: string, knownTags: string[]): string | null {
  const normalized = slug.toLowerCase().replace(/-/g, " ")
  // Normalize tags the same way (spaces and hyphens become interchangeable)
  const normTag = (t: string) => t.toLowerCase().replace(/-/g, " ")
  // Exact match first (both normalized)
  const exact = knownTags.find((t) => normTag(t) === normalized)
  if (exact) return exact
  // Fuzzy: check if normalized slug is a substring of any normalized tag
  const fuzzy = knownTags.find((t) => normTag(t).includes(normalized))
  return fuzzy ?? null
}
