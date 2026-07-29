/**
 * POST /api/internal/backfill-links
 *
 * One-shot endpoint to apply internal linking to all published recipes.
 * Called via curl for the initial backfill, then the pipeline handles new recipes.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { insertContextualLinksBatch, logInternalLinks } from "@/lib/internal-linker"

export async function POST() {
  const all = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.status, "published"), eq(recipes.content_type, "recipe")))

  if (all.length <= 1) {
    return NextResponse.json({ error: "Need at least 2 published recipes." }, { status: 400 })
  }

  const linkTargets = all.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    keyword: r.keyword,
    tags: (r.tags ?? []) as string[],
  }))

  const results: Array<{ id: number; slug: string; before: number; after: number; added: number }> = []
  let totalLinks = 0

  for (const recipe of all) {
    const content = recipe.contentMarkdown ?? ""
    if (content.length === 0) {
      results.push({ id: recipe.id, slug: recipe.slug, before: 0, after: 0, added: 0 })
      continue
    }

    const beforeCount = (content.match(/\[.+?\]\(\/recettes\/.+?\)/g) ?? []).length

    const result = insertContextualLinksBatch(
      content,
      recipe.id,
      (recipe.tags ?? []) as string[],
      linkTargets,
    )

    const afterCount = (result.markdown.match(/\[.+?\]\(\/recettes\/.+?\)/g) ?? []).length
    const added = afterCount - beforeCount

    if (added > 0) {
      await db.update(recipes).set({
        contentMarkdown: result.markdown,
        updatedAt: new Date(),
      }).where(eq(recipes.id, recipe.id))

      await logInternalLinks(recipe.id, result.links, "batch")
    }

    results.push({ id: recipe.id, slug: recipe.slug, before: beforeCount, after: afterCount, added })
    totalLinks += added
  }

  const updatedCount = results.filter((r) => r.added > 0).length

  return NextResponse.json({
    totalRecipes: all.length,
    updatedRecipes: updatedCount,
    totalLinksAdded: totalLinks,
    results,
  })
}
