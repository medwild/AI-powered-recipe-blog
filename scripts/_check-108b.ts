import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const log = await db.execute("SELECT workflow_log FROM recipes WHERE id = 108")
  const wl = log.rows[0]?.workflow_log as Array<{message?: string; status?: string}> ?? []
  console.log(`Workflow log (#${wl.length} entrées):`)
  for (const e of wl) console.log(`  [${e.status}] ${(e.message ?? "").substring(0, 250)}`)
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
