import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const all = await db.select({ contentType: recipes.content_type, status: recipes.status })
    .from(recipes)
  const recipesPub = all.filter(r => r.contentType === "recipe" && r.status === "published").length
  const articlesPub = all.filter(r => r.contentType === "article" && r.status === "published").length
  const drafts = all.filter(r => r.status !== "published").length
  console.log(`Recettes publiées: ${recipesPub}`)
  console.log(`Articles publiés: ${articlesPub}`)
  console.log(`Drafts/non-publiés: ${drafts}`)
  console.log(`Total: ${all.length}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
