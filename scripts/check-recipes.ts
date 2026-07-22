import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute("SELECT id, slug, keyword, status, content_type FROM recipes ORDER BY id DESC LIMIT 5")
  console.log("Recent recipes:")
  for (const row of r.rows) console.log(`  #${row.id} | ${row.slug} | ${row.keyword} | ${row.status} | content_type=${row.content_type}`)
}
main()
