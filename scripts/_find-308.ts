/**
 * Find stale internal links to old 308-redirecting recipe slugs in contentMarkdown.
 * Usage: npx tsx scripts/_find-308.ts
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const OLD_SLUGS = [
  "dinner-for-two-recipes-healthy",
  "easy-dinner-for-two-recipes",
  "easy-healthy-dinner-recipes-for-two",
  "healthy-dinner-recipes-for-2",
  "simple-dinner-recipes-for-2",
]

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  if (!url) { console.error("❌ DATABASE_URL not found"); process.exit(1) }
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })

  const rows = await db.select().from(recipes).where(eq(recipes.status, "published"))
  let total = 0
  for (const r of rows) {
    if (!r.contentMarkdown) continue
    const hits = OLD_SLUGS.filter((s) => r.contentMarkdown!.includes(`/recipes/${s}`))
    if (hits.length) {
      total += hits.length
      console.log(`${r.slug}: ${hits.join(", ")}`)
    }
  }
  console.log(`\nTOTAL liens 308 dans contentMarkdown: ${total}`)
  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
