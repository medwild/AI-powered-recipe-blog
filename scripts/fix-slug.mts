// Fix slug: remove -2 suffix
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const rows = await db
    .select({ id: recipes.id, slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.slug, "easy-4-ingredient-chicken-breast-recipes-2"))
  console.log("Before:", rows)

  if (rows.length > 0) {
    await db
      .update(recipes)
      .set({ slug: "easy-4-ingredient-chicken-breast-recipes" })
      .where(eq(recipes.id, rows[0].id))
    console.log("✅ Slug renamed")
  } else {
    console.log("⚠️ Recipe not found")
  }

  const after = await db
    .select({ id: recipes.id, slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.slug, "easy-4-ingredient-chicken-breast-recipes"))
  console.log("After:", after)
  process.exit(0)
}
main()
