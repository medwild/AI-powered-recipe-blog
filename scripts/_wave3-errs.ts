import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute("SELECT id, keyword, status, (workflow_log->-1->>'message') as last FROM recipes WHERE id >= 73 AND status = 'draft' ORDER BY id")
  for (const row of r.rows) {
    console.log(`#${row.id} [${row.keyword}] → ${(row.last ?? "").substring(0, 120)}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
