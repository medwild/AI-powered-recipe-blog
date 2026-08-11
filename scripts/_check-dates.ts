import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const r = await db.execute(sql`SELECT slug, created_at FROM recipes WHERE content_type='recipe' AND status='published' ORDER BY created_at DESC LIMIT 12`)
  for (const row of r.rows as Array<{ slug: string; created_at: string }>) console.log(`${String(row.created_at ?? "?").slice(0, 10)}  ${row.slug}`)
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
