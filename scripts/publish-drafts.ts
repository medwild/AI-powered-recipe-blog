import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  // Publish all draft recipes from today
  await db.update(recipes).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.status, "draft"))
  console.log("✅ All draft recipes published")
}
main()
