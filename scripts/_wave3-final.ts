import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute("SELECT id, keyword, status FROM recipes WHERE id >= 96 ORDER BY id")
  console.log("Recettes #96+ :")
  for (const row of r.rows) console.log(`  #${row.id} [${row.keyword}] → ${row.status}`)
  console.log("\nKeywords VAGUE 3 absents (drafts supprimés):")
  const keywords = ["easy carnivore recipes","easy low fodmap recipes","easy ibs dinner recipes","easy lactose free dinner recipes","easy meals for beginners","baking for 2","dinner recipes for two","easy to cook dinner for two"]
  for (const k of keywords) {
    const q = await db.execute("SELECT COUNT(*) as n FROM recipes WHERE keyword = $1", [k])
    console.log(`  ${q.rows[0].n === "0" || q.rows[0].n === 0 ? "❌ ABSENT" : "✅ présent"} — ${k}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
