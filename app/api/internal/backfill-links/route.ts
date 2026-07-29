/**
 * POST /api/internal/backfill-links
 *
 * Two-step backfill:
 * 1. Strip ALL old internal links from every recipe (clean slate)
 * 2. Run v2 contextual linker on every recipe
 * 3. Save all recipes (quality over quantity — if 0 natural links, keep 0)
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
    let content = recipe.contentMarkdown ?? ""
    if (content.length === 0) {
      results.push({ id: recipe.id, slug: recipe.slug, before: 0, after: 0, added: 0 })
      continue
    }

    // Step 1: Strip ALL existing internal links — both v1 fallback sections
    // AND v2 contextual links. We want a clean slate.
    let cleaned = content
      // Remove "📖 Related Recipes" fallback section (v1)
      .replace(/\n\n---\n\n## 📖 Related Recipes\n\n[\s\S]*$/, "")
      // Remove any remaining "- Try our [...]" list items at the end
      .replace(/\n- Try our \[.+?\]\(\/recettes\/.+?\)\n?/g, "")
      // Remove ALL existing markdown links to /recettes/ (any format)
      // But preserve the anchor text (remove just the link syntax)
      .replace(/\[(.+?)\]\(\/recettes\/[^)]+\)/g, "$1")

    const beforeCount = (content.match(/\[.+?\]\(\/recettes\/.+?\)/g) ?? []).length

    // Step 2: Run v2 contextual linker
    const result = insertContextualLinksBatch(
      cleaned,
      recipe.id,
      (recipe.tags ?? []) as string[],
      linkTargets,
    )

    const afterCount = (result.markdown.match(/\[.+?\]\(\/recettes\/.+?\)/g) ?? []).length
    const added = afterCount // links after cleanup is count of new links

    // Always save — even if 0 links (clean slate is better than stale v1 links)
    await db.update(recipes).set({
      contentMarkdown: result.markdown,
      updatedAt: new Date(),
    }).where(eq(recipes.id, recipe.id))

    if (added > 0) {
      await logInternalLinks(recipe.id, result.links, "batch")
    }

    results.push({ id: recipe.id, slug: recipe.slug, before: beforeCount, after: afterCount, added })
    totalLinks += added
  }

  const updatedCount = results.filter((r) => r.added > 0).length
  const zeroLinkCount = results.filter((r) => r.added === 0).length

  return NextResponse.json({
    totalRecipes: all.length,
    updatedRecipes: updatedCount,
    zeroLinkRecipes: zeroLinkCount,
    totalLinksAdded: totalLinks,
    results,
  })
}
