import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute("SELECT status, COUNT(*) as n FROM recipes WHERE id >= 73 GROUP BY status ORDER BY status")
  console.log("Statuts #73+ :", JSON.stringify(r.rows))
  const errs = await db.execute("SELECT id, status, keyword FROM recipes WHERE id >= 73 AND status = 'draft'")
  console.log("Drafts:", JSON.stringify(errs.rows))
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
