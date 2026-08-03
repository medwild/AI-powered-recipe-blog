/**
 * scripts/link-existing-recipes.ts
 *
 * Batch backfill — applies internal linking to all published recipes.
 * Reads every recipe, runs the contextual linker, and updates contentMarkdown
 * in the DB if links were added.
 *
 * Usage: npx tsx scripts/link-existing-recipes.ts
 */

import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

// Dynamic imports — drizzle pool resolves DATABASE_URL at import time,
// so we must load .env BEFORE any drizzle module is imported.
const { db } = await import("@/lib/db")
const { recipes } = await import("@/lib/db/schema")
const { eq, and } = await import("drizzle-orm")
const { insertContextualLinksBatch, logInternalLinks } = await import("@/lib/internal-linker")

interface LinkTarget {
  id: number
  slug: string
  title: string
  keyword: string
  tags: string[]
}

async function main() {
  console.log("🔗 Internal Linker — Batch Backfill")
  console.log("═".repeat(50))

  // 1. Fetch all published recipes
  const all = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.status, "published"), eq(recipes.content_type, "recipe")))

  console.log(`\n📋 ${all.length} published recipes found\n`)

  if (all.length <= 1) {
    console.log("⚠️  Need at least 2 published recipes to create links.")
    process.exit(0)
  }

  // Build the link target list (all recipes except current)
  const linkTargets: LinkTarget[] = all.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    keyword: r.keyword,
    tags: (r.tags ?? []) as string[],
  }))

  let totalLinks = 0
  let updated = 0
  let skipped = 0

  for (const recipe of all) {
    const content = recipe.contentMarkdown ?? ""
    if (content.length === 0) {
      console.log(`  ⏭️  #${recipe.id} ${recipe.slug} — empty content, skipping`)
      skipped++
      continue
    }

    // Count existing links
    const beforeCount = (content.match(/\[.+?\]\(\/(?:recettes|recipes)\/.+?\)/g) ?? []).length

    // Run the linker
    const result = insertContextualLinksBatch(
      content,
      recipe.id,
      (recipe.tags ?? []) as string[],
      linkTargets,
    )

    const afterCount = (result.markdown.match(/\[.+?\]\(\/recipes\/.+?\)/g) ?? []).length
    const added = afterCount - beforeCount

    if (added > 0) {
      // Update the DB
      await db
        .update(recipes)
        .set({ contentMarkdown: result.markdown, updatedAt: new Date() })
        .where(eq(recipes.id, recipe.id))

      // Log links to audit table
      await logInternalLinks(recipe.id, result.links, "batch")

      console.log(`  ✅ #${recipe.id} ${recipe.slug} — ${added} links added (${beforeCount}→${afterCount})`)
      totalLinks += added
      updated++
    } else {
      console.log(`  ⏭️  #${recipe.id} ${recipe.slug} — already has ${beforeCount} links, no new matches`)
      skipped++
    }
  }

  console.log(`\n${"═".repeat(50)}`)
  console.log(`📊 Summary:`)
  console.log(`   Updated: ${updated} recipes`)
  console.log(`   Skipped: ${skipped} recipes`)
  console.log(`   Total links added: ${totalLinks}`)
  console.log(`\n🔍 Verify:`)
  console.log(`   curl -s http://localhost:3000/api/recipes/raw | jq -r '.[].contentMarkdown | scan("\\\\[.+?\\\\]\\\\(/recettes/") | length' | sort | uniq -c`)
  console.log()
}

main().catch((err) => {
  console.error("❌ Batch failed:", err)
  process.exit(1)
})
