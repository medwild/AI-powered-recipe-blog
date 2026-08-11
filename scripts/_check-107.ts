import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute("SELECT id, status, keyword FROM recipes WHERE id = 107")
  console.log("Status:", JSON.stringify(r.rows))
  const log = await db.execute("SELECT workflow_log FROM recipes WHERE id = 107")
  const wl = log.rows[0]?.workflow_log as Array<{status?: string; message?: string}> ?? []
  for (const e of wl.slice(-5)) console.log(`  [${e.status}] ${(e.message ?? "").substring(0, 150)}`)
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
