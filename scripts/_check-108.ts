import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const log = await db.execute("SELECT workflow_log FROM recipes WHERE id = 108")
  const wl = log.rows[0]?.workflow_log as Array<{message?: string}> ?? []
  for (const e of wl) if ((e.message ?? "").includes("402")) console.log(e.message)
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
