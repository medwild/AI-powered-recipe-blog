/**
 * Batch Monitor — Check progress of batch-generated recipes.
 *
 * Usage: npx tsx scripts/check-batch.ts <id1> <id2> ...
 */

import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(process.cwd(), ".env.local") })

async function main() {
  const { db } = await import("../lib/db/index")
  const { recipes } = await import("../lib/db/schema")
  const { inArray } = await import("drizzle-orm")

  const ids = process.argv.slice(2).map(Number).filter((n) => !isNaN(n))
  if (ids.length === 0) {
    console.log("Usage: npx tsx scripts/check-batch.ts <id1> <id2> ...")
    process.exit(1)
  }

  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      status: recipes.status,
      content_type: recipes.content_type,
      wordCount: recipes.contentMarkdown,
    })
    .from(recipes)
    .where(inArray(recipes.id, ids))
    .orderBy(recipes.id)

  let done = 0
  let generating = 0
  let failed = 0

  console.log(`\n📊 Batch Progress — ${rows.length} recipes\n`)
  for (const r of rows) {
    const wc = r.wordCount?.split(/\s+/).filter(Boolean).length ?? 0
    const icon = r.status === "published" ? "✅" : r.status === "generating" ? "⏳" : r.status === "draft" ? "⚠️" : "❌"
    console.log(`  ${icon} #${r.id} [${r.status}] ${r.title || "(generating...)"} — ${wc} words`)

    if (r.status === "published") done++
    else if (r.status === "generating" || r.status === "draft_review" || r.status === "approved") generating++
    else failed++
  }

  // Also check for AOR articles linked to these recipes
  const aorRows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      category: recipes.category,
      status: recipes.status,
      linked: recipes.linked_content_id,
    })
    .from(recipes)
    .where(inArray(recipes.linked_content_id, ids))

  if (aorRows.length > 0) {
    console.log(`\n📝 AOR Articles (${aorRows.length}):`)
    for (const a of aorRows) {
      console.log(`  📄 #${a.id} [${a.category}] ${a.title?.slice(0, 80)} (linked to #${a.linked})`)
    }
  }

  console.log(`\n  Done: ${done} | Generating: ${generating} | Failed: ${failed}\n`)
  process.exit(0)
}

main()
