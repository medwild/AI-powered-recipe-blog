// One-shot: fix the 4 orphaned orzo slugs (Wave-2 keywords now match real content)
// Run: node scripts/fix-orzo-slugs.mjs
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import pg from "pg"

const { Pool } = pg
const updates = [
  [43, "creamy-parmesan-garlic-chicken-orzo-for-two"],
  [45, "summer-herb-chicken-orzo-with-zucchini-for-two"],
  [48, "white-wine-lemon-chicken-orzo-for-two"],
  [50, "mediterranean-chicken-orzo-with-feta-olives-for-two"],
]

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
await pool.query("BEGIN")
for (const [id, slug] of updates) {
  await pool.query("UPDATE recipes SET slug = $1, updated_at = NOW() WHERE id = $2", [slug, id])
}
await pool.query("COMMIT")
const { rows } = await pool.query("SELECT id, slug FROM recipes WHERE id IN (43,45,48,50) ORDER BY id")
console.log(JSON.stringify(rows, null, 1))
await pool.end()
