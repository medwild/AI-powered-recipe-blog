import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const r = await db.execute(sql`SELECT slug, content_markdown FROM recipes WHERE content_type='recipe' AND status='published' AND (content_markdown ILIKE '%SERP%' OR content_markdown ILIKE '%scan the top%' OR content_markdown ILIKE '%competitor%' OR content_markdown ILIKE '%top ten%' OR content_markdown ILIKE '%top results%' OR content_markdown ILIKE '%first page%') ORDER BY slug`)
  for (const row of r.rows as Array<{ slug: string; content_markdown: string }>) {
    console.log(`\n========== ${row.slug} ==========`)
    const lines = row.content_markdown.split("\n")
    lines.forEach((l, i) => {
      if (/SERP|scan the top|competitor|top ten|top results|first page/i.test(l)) {
        console.log(`[L${i + 1}] ${l.trim()}`)
      }
    })
  }
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
