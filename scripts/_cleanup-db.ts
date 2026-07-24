import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  await db.delete(recipes).where(eq(recipes.id, 36))
  console.log("Deleted recipe #36")

  await db.delete(recipes).where(eq(recipes.status, "generating"))
  console.log("Cleaned up stuck generating recipes")

  const remaining = await db.select().from(recipes)
  console.log(`Remaining recipes: ${remaining.length}`)
  for (const r of remaining) {
    console.log(`  #${r.id} | ${r.slug} | ${r.status}`)
  }
}

main().catch(console.error)
