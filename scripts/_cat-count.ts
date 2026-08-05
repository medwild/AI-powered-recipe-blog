/**
 * Count recipes per tag (category) — to decide which categories to keep vs merge.
 * Usage: npx tsx scripts/_cat-count.ts
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  if (!url) { console.error("❌ DATABASE_URL not found"); process.exit(1) }
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })

  const rows = await db.execute(sql`
    select tag, count(*) as n
    from recipes, jsonb_array_elements_text(recipes.tags) as tag
    where recipes.status = 'published' and recipes.content_type = 'recipe'
    group by tag
    order by n desc
  `)
  const counts = (rows.rows as { tag: string; n: string }[]).map((r) => ({ tag: r.tag, n: parseInt(r.n, 10) }))
  console.log("TOTAL tags:", counts.length)
  console.log("\nTags avec >=3 recettes (indexables):")
  for (const c of counts.filter((c) => c.n >= 3)) console.log(`  ${c.n}  ${c.tag}`)
  console.log("\nTags avec 1-2 recettes (noindex / fusion):")
  for (const c of counts.filter((c) => c.n < 3)) console.log(`  ${c.n}  ${c.tag}`)

  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
