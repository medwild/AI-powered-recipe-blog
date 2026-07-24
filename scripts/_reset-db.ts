import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { ne } = await import("drizzle-orm")

  // Keep only published recipes, delete everything else
  const result = await db.delete(recipes).where(ne(recipes.status, "published"))
  console.log(`Deleted drafts/generating. Remaining:`)
  const all = await db.select().from(recipes)
  for (const r of all) console.log(`  #${r.id} | ${r.slug} | ${r.status}`)
}

main().catch(console.error)
