/**
 * Step 1.5 — Link Suggester
 *
 * Deterministic scoring engine that finds the most relevant internal linking
 * targets for a new piece of content. No LLM — pure tag-overlap + diversity.
 *
 * Scoring (0-100):
 *   Tag overlap .................. 50 pts max
 *   Content-type diversity ...... 30 pts max
 *   Recency (< 30 days) ......... 15 pts max
 *   Hub priority ................  5 pts max
 *
 * Diversity rules:
 *   - Recipe → min 2 articles in top 7
 *   - Article → min 2 recipes in top 7
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq, ne, sql } from "drizzle-orm"

export type LinkTarget = {
  slug: string
  title: string
  contentType: "recipe" | "article"
  /** Article category — needed to build correct URL (/{category}/{slug} vs /{slug}) */
  category: string | null
  score: number
  reason: string
}

function computeTagOverlap(sourceTags: string[], targetTags: string[]): number {
  if (!sourceTags.length || !targetTags.length) return 0
  const targetLower = targetTags.map((t) => t.toLowerCase())
  let matches = 0
  for (const tag of sourceTags) {
    if (targetLower.includes(tag.toLowerCase())) matches++
  }
  return Math.min(1, matches / Math.max(sourceTags.length, 1))
}

function daysSince(date: Date | null): number {
  if (!date) return 999
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
}

const HUB_TAGS = ["essential", "basics", "guide", "beginner", "starter"]

export async function runLinkSuggester(
  step: { run: (name: string, fn: () => Promise<LinkTarget[]>) => Promise<LinkTarget[]> },
  recipeId: number,
  keyword: string,
  tags: string[],
  contentType: "recipe" | "article",
): Promise<LinkTarget[]> {
  return step.run("link-suggester", async () => {
    // Step 1 — Candidate pool
    const candidates = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        contentType: recipes.content_type,
        tags: recipes.tags,
        category: recipes.category,
        publishedAt: recipes.publishedAt,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.status, "published"),
          ne(recipes.id, recipeId),
          sql`${recipes.heroImageUrl} IS NOT NULL`,
        ),
      )

    if (!candidates.length) return []

    // Step 2 — Score each candidate
    const scored = candidates.map((c) => {
      const cTags = (c.tags as string[]) ?? []
      const tagScore = computeTagOverlap(tags, cTags) * 50
      const typeScore = c.contentType !== contentType ? 30 : 0
      const age = daysSince(c.publishedAt)
      const recencyScore = age < 30 ? 15 : Math.max(0, 15 - age * 0.5)
      const hubScore = cTags.some((t) => HUB_TAGS.includes(t.toLowerCase())) ? 5 : 0
      const score = Math.round(tagScore + typeScore + recencyScore + hubScore)

      return {
        slug: c.slug,
        title: c.title,
        contentType: (c.contentType as "recipe" | "article") ?? "recipe",
        category: c.category ?? null,
        score,
        reason: tagScore > 0
          ? `${Math.round(tagScore / 50 * 100)}% tag overlap`
          : typeScore > 0
            ? "Cross-type diversity"
            : recencyScore > 10
              ? "Recently published"
              : "General relevance",
      }
    })

    // Step 3 — Sort by score
    scored.sort((a, b) => b.score - a.score)

    // Step 4 — Apply diversity: ensure min 2 of opposite content type in top 7
    const selected: typeof scored = []
    const oppositeType = contentType === "recipe" ? "article" : "recipe"

    for (const item of scored) {
      if (selected.length >= 7) break
      selected.push(item)
    }

    const oppositeCount = selected.filter((s) => s.contentType === oppositeType).length
    if (oppositeCount < 2 && selected.length >= 7) {
      const extras = scored
        .filter((s) => s.contentType === oppositeType && !selected.includes(s))
        .slice(0, 2 - oppositeCount)
      for (let i = 0; i < extras.length; i++) {
        const lastSameIdx = selected.findLastIndex((s) => s.contentType === contentType)
        if (lastSameIdx >= 0) {
          selected[lastSameIdx] = extras[i]
        } else {
          selected.push(extras[i])
        }
      }
    }

    return selected.slice(0, 7)
  })
}
