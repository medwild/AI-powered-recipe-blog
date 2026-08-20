import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const slug = "15-easy-dinner-recipes-for-two"
  const newMetaTitle = "15 Easy Dinner Recipes for Two"
  const updated = await db.update(recipes)
    .set({ metaTitle: newMetaTitle, updatedAt: new Date() })
    .where(eq(recipes.slug, slug))
    .returning({ id: recipes.id, metaTitle: recipes.metaTitle })
  console.log("updated:", JSON.stringify(updated[0]))
}
main().catch((e) => { console.error(e); process.exit(1) })
