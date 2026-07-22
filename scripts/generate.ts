// Generate a recipe — CLI entry point for the v14 pipeline
// Usage: npx tsx scripts/generate.ts "Sourdough bread for two"
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const keyword = process.argv[2]
if (!keyword) { console.log("Usage: npx tsx scripts/generate.ts \"Your Keyword\""); process.exit(1) }

async function main() {
  // Dynamic imports — ES modules hoist static imports before dotenv
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { slugify } = await import("../lib/slug")
  const { generateRecipe } = await import("../lib/generate-recipe-pure")

  console.log(`\n🔬 Generating: "${keyword}"\n`)

  // Create DB entry
  const base = slugify(keyword) || "recette"
  let slug = base; let suffix = 0
  while (true) {
    const existing = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, slug) })
    if (!existing) break
    slug = `${base}-${++suffix}`
  }

  const [created] = await db.insert(recipes).values({
    slug, keyword, title: keyword, status: "generating", workflowLog: [],
  }).returning({ id: recipes.id })

  console.log(`Recipe #${created.id} created — slug: ${slug}\n`)

  // Run pipeline
  const t0 = Date.now()
  await generateRecipe({ recipeId: created.id, keyword })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`\n✅ Done in ${elapsed}s — Recipe #${created.id}`)
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
