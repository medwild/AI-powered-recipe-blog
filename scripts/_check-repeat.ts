/**
 * Show before/after of the clean for verification.
 * Usage: npx tsx scripts/_check-repeat.ts
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const collapseWordRepeat = (t: string) => t.replace(/\b(\w+)\s+\1\b/gi, "$1")
const collapseForTwo = (t: string) => t.replace(/(for two\s+){1,}for two/gi, "for two")

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })
  for (const slug of ["garlic-shrimp-orzo-with-cherry-tomatoes-for-two", "chicken-dinner-for-two"]) {
    const r = (await db.select().from(recipes).where(eq(recipes.slug, slug)))[0]
    const ex = r.excerpt ?? ""
    const clean = collapseWordRepeat(collapseForTwo(ex))
    if (ex !== clean) {
      console.log(`\n${slug} EXCERPT:\n  AVANT: ${ex.slice(0, 150)}\n  APRES: ${clean.slice(0, 150)}`)
    }
  }
  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
