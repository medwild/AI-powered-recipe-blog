import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

interface IngredientItem { name?: string; quantity?: string }

async function main() {
  const { db } = await import("../lib/db")

  console.log("== 1. Recettes publiées sans prepTime ou cookTime ==")
  const t = await db.execute(
    "SELECT slug, title, prep_time, cook_time, total_time FROM recipes WHERE content_type='recipe' AND status='published' AND (prep_time IS NULL OR prep_time='' OR cook_time IS NULL OR cook_time='')",
  )
  console.table(t.rows)

  console.log("== 2. Items recipeIngredient suspects (name ou quantity vide / name trop court) ==")
  const r = await db.execute(
    "SELECT slug, ingredients FROM recipes WHERE content_type='recipe' AND status='published'",
  )
  for (const row of r.rows as Array<{ slug: string; ingredients: unknown }>) {
    const items = (row.ingredients as IngredientItem[] | null) ?? []
    const suspects = items
      .map((i, idx) => ({ idx, name: i.name ?? "", quantity: i.quantity ?? "" }))
      .filter((i) => !i.name.trim() || !i.quantity.trim() || i.name.trim().length < 3)
    if (suspects.length) {
      console.log(`\n[${row.slug}] ${suspects.length} suspect(s):`)
      for (const s of suspects) {
        console.log(`  #${s.idx} quantity=${JSON.stringify(s.quantity)} name=${JSON.stringify(s.name)}`)
      }
    }
  }

  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
