// _watch-recipe.ts — surveillance d'une génération en cours (usage interne)
// Émet une ligne à chaque changement de statut, exit 0 quand le pipeline est terminal.
// Usage: npx tsx scripts/_watch-recipe.ts <recipeId>
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const id = process.argv[2]
const STATE_FILE = `/tmp/watch-recipe-${id}.txt`

async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute(
    `SELECT id, slug, keyword, status, workflow_log FROM recipes WHERE id = ${Number(id)}`,
  )
  const row = r.rows[0]
  if (!row) {
    console.log(`[#${id}] RECIPE NOT FOUND`)
    process.exit(0)
  }
  const log: Array<{ message?: string }> = (row.workflow_log as Array<{ message?: string }>) ?? []
  const last = log.length > 0 ? log[log.length - 1].message ?? "(no message)" : "(no log yet)"

  const cur = `${row.status}|${last}`
  let prev = ""
  try { prev = fs.readFileSync(STATE_FILE, "utf8") } catch { /* first run */ }
  if (cur !== prev) {
    fs.writeFileSync(STATE_FILE, cur)
    console.log(`[#${row.id}] ${row.keyword} — ${row.status} — ${last}`)
  }

  const done =
    last.includes("Pipeline v14 complete") ||
    last.includes("BLOCKED (final)") ||
    last.includes("Pipeline failed")
  process.exit(done ? 0 : 1)
}

main().catch((err) => {
  console.log(`[#${id}] WATCH ERROR: ${(err as Error).message}`)
  process.exit(1)
})
