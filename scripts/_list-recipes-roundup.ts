import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const all = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      totalTime: recipes.totalTime,
      tags: recipes.tags,
      heroImageUrl: recipes.heroImageUrl,
      status: recipes.status,
    })
    .from(recipes)
    .where(eq(recipes.content_type, "recipe"))

  const published = all.filter((r) => r.status === "published")
  console.log(`Recettes publiées: ${published.length}\n`)
  for (const r of published.sort((a, b) => a.id - b.id)) {
    console.log(`#${r.id} | ${r.totalTime ?? "?"} | ${r.title}`)
    console.log(`   tags: ${(r.tags ?? []).join(", ") || "(none)"}`)
    console.log(`   image: ${r.heroImageUrl ? "✅" : "❌"}`)
    console.log()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })