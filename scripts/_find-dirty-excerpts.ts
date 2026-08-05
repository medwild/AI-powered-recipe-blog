/**
 * Find recipe excerpts with token repetition (garbage like "easy easy mexican
 * dinner recipes recipes two") to clean. Usage: npx tsx scripts/_find-dirty-excerpts.ts
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const REPEAT = /\b(\w+)\s+\1\b/i
const FOR_TWO = /(for two\s+){2,}/i

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  if (!url) { console.error("no url"); process.exit(1) }
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })
  const rows = await db.select().from(recipes).where(eq(recipes.status, "published"))
  let dirty = 0
  for (const r of rows) {
    const excerpt = r.excerpt ?? ""
    const md = r.contentMarkdown ?? ""
    const hits: string[] = []
    if (REPEAT.test(excerpt)) hits.push("EXCERPT repeat")
    if (FOR_TWO.test(excerpt)) hits.push("EXCERPT for-two-repeat")
    if (REPEAT.test(md)) hits.push("MD repeat")
    if (FOR_TWO.test(md)) hits.push("MD for-two-repeat")
    if (hits.length) {
      dirty++
      console.log(`${r.slug}: ${hits.join(", ")}`)
      if (hits.some((h) => h.startsWith("EXCERPT"))) {
        console.log(`   excerpt: ${excerpt.slice(0, 120)}`)
      }
    }
  }
  console.log(`\nTOTAL recettes avec répétitions: ${dirty}`)
  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
