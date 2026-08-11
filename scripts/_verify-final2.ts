import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const patterns = [
    "%SERP%", "%scan the top%", "%search results%", "%first page%", "%top results%",
    "%top ten%", "%top 10%", "%competitor%", "%competing recipe%", "%our angle%",
    "%scroll through%", "%top recipes miss%", "%none of the top%", "%nobody in the top%",
    "%Before Writing%", "%SERP Analysis%", "%## Meta%", "%quality gate%", "%quality-gate%",
    "%top-ranked%", "%top ranked%", "%that's the angle%", "%my angle here%", "%the angle:%",
    "%before writing this%",
  ]
  let total = 0
  for (const p of patterns) {
    const r = await db.execute(sql`SELECT slug, title FROM recipes WHERE content_type='recipe' AND status='published' AND content_markdown ILIKE ${p}`)
    for (const row of r.rows as Array<{ slug: string }>) { console.log(`⚠️ ${p} → ${row.slug}`); total++ }
  }
  console.log(total === 0 ? "✅ ZÉRO — aucune référence au process d'écriture" : `⚠️ ${total} restant(s)`)
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
