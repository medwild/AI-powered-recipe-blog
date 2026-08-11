import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

// User-confirmed fix (2026-08-07): remove the 3 prose items (#14-#16) that the LLM
// inserted into the ingredient list of romantic-dinner-for-two-at-home.
async function main() {
  const { db } = await import("../lib/db")

  // Before state
  const before = await db.execute(
    "SELECT ingredients FROM recipes WHERE slug='romantic-dinner-for-two-at-home'",
  )
  const itemsBefore = (before.rows[0]?.ingredients as Array<{ name?: string }>) ?? []
  console.log(`Total items avant: ${itemsBefore.length}`)

  // Apply: remove indices 16, 15, 14 (descending so indices stay valid)
  const res = await db.execute(
    "UPDATE recipes SET ingredients = ingredients - 16 - 15 - 14 WHERE slug='romantic-dinner-for-two-at-home' RETURNING slug, jsonb_array_length(ingredients) AS n",
  )
  console.log(`UPDATE appliqué — items après: ${res.rows[0]?.n}`)

  // After state (verification)
  const after = await db.execute(
    "SELECT ingredients FROM recipes WHERE slug='romantic-dinner-for-two-at-home'",
  )
  const items = (after.rows[0]?.ingredients as Array<{ name?: string }>) ?? []
  for (let i = 0; i < items.length; i++) {
    console.log(`  #${i}: ${String(items[i].name ?? "").substring(0, 60)}`)
  }

  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
