import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const r = await db.execute(sql`SELECT slug, content_type, title, content_markdown FROM recipes WHERE slug='about' OR title ILIKE '%about%'`)
  for (const row of r.rows as Array<{ slug: string; content_type: string; title: string; content_markdown: string | null }>) {
    console.log(`--- ${row.slug} (${row.content_type}) ${row.title} ---`)
    if (row.content_markdown) for (const l of row.content_markdown.split("\n")) if (/pinterest/i.test(l)) console.log(l.trim().slice(0, 150))
  }
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
