import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { desc, or, eq } from "drizzle-orm"

async function checkContent() {
  const results = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      contentMarkdown: recipes.contentMarkdown,
      status: recipes.status,
    })
    .from(recipes)
    .where(or(eq(recipes.status, "published"), eq(recipes.status, "draft")))
    .orderBy(desc(recipes.createdAt))
    .limit(1)

  if (results.length === 0) {
    console.log("No recipes found")
    return
  }

  const recipe = results[0]
  console.log("Recipe ID:", recipe.id)
  console.log("Title:", recipe.title)
  console.log("Status:", recipe.status)
  console.log("\nContent Markdown (first 1000 chars):")
  console.log("=" .repeat(60))
  console.log(recipe.contentMarkdown?.substring(0, 1000) || "NULL")
  console.log("=" .repeat(60))
  
  if (recipe.contentMarkdown && recipe.contentMarkdown.includes("###")) {
    console.log("\n✓ Content contains Markdown headers (###)")
  }
}

checkContent()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
