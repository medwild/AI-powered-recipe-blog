/**
 * One-shot fix: replace stale internal links to old 308-redirecting slugs
 * with their canonical targets (the recipes they merged into, July 2026).
 * Usage: npx tsx scripts/_fix-308.ts   (--dry for dry run)
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const DRY = process.argv.includes("--dry")

// Old slug -> canonical target (verified live: each old slug 308s to its target)
const SLUG_MAP: Record<string, string> = {
  "dinner-for-two-recipes-healthy": "mediterranean-chicken-orzo-with-feta-olives-for-two",
  "easy-dinner-for-two-recipes": "white-wine-lemon-chicken-orzo-for-two",
  "easy-healthy-dinner-recipes-for-two": "summer-herb-chicken-orzo-with-zucchini-for-two",
  "healthy-dinner-recipes-for-2": "salmon-orzo-with-dill-and-capers-for-two",
  "simple-dinner-recipes-for-2": "creamy-parmesan-garlic-chicken-orzo-for-two",
}

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  if (!url) { console.error("❌ DATABASE_URL not found"); process.exit(1) }
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })

  const rows = await db.select().from(recipes).where(eq(recipes.status, "published"))
  let total = 0
  let fixedCount = 0
  for (const r of rows) {
    if (!r.contentMarkdown) continue
    let md = r.contentMarkdown
    let changed = false
    for (const [oldSlug, target] of Object.entries(SLUG_MAP)) {
      const re = new RegExp(`/recipes/${oldSlug}(?=[)"\\s])`, "g")
      const next = md.replace(re, `/recipes/${target}`)
      if (next !== md) { md = next; changed = true }
    }
    if (changed) {
      total++
      fixedCount++
      console.log(`${DRY ? "[DRY] " : ""}${r.slug}: liens corrigés`)
      if (!DRY) {
        await db.update(recipes).set({ contentMarkdown: md }).where(eq(recipes.id, r.id))
      }
    }
  }
  console.log(`\n${DRY ? "DRY RUN — " : ""}Recettes corrigées: ${fixedCount}, total liens: ${total}`)
  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
