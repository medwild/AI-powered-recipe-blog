import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const rows = await db
    .select({ slug: recipes.slug, title: recipes.title, status: recipes.status })
    .from(recipes)
    .where(eq(recipes.status, "published"))
    .limit(3)

  if (rows.length === 0) {
    const drafts = await db
      .select({ slug: recipes.slug, title: recipes.title, status: recipes.status })
      .from(recipes)
      .where(eq(recipes.status, "draft"))
      .limit(3)
    if (drafts.length > 0) {
      console.log(JSON.stringify({ recipe: drafts[0], note: "draft_not_published" }))
    } else {
      console.log(JSON.stringify({ recipe: null, note: "no_recipes" }))
    }
  } else {
    console.log(JSON.stringify({ recipe: rows[0], note: "published" }))
  }
}

main().catch(console.error)
