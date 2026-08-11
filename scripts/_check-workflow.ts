import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const r = await db.execute(sql`SELECT workflow_log FROM recipes WHERE slug='one-pan-chicken-tomato-garlic-rice'`)
  const log = (r.rows[0] as { workflow_log: unknown }).workflow_log
  console.log(JSON.stringify(log, null, 1).slice(0, 2000))
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
