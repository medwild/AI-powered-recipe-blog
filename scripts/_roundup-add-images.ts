import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const SLUG = "15-easy-dinner-recipes-for-two"

async function main() {
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq, inArray } = await import("drizzle-orm")

  // 1) Fetch article content
  const article = await db
    .select({ id: recipes.id, slug: recipes.slug, contentMarkdown: recipes.contentMarkdown })
    .from(recipes)
    .where(eq(recipes.slug, SLUG))
    .limit(1)
  if (!article[0]) throw new Error("Article not found")
  const rowId = article[0].id
  let content = article[0].contentMarkdown ?? ""

  // 2) Fetch all recipes that have a hero image (map slug → {title, heroImageUrl})
  const rows = await db
    .select({ slug: recipes.slug, title: recipes.title, heroImageUrl: recipes.heroImageUrl })
    .from(recipes)
    .where(eq(recipes.content_type, "recipe"))
  const bySlug = new Map(rows.filter((r) => r.heroImageUrl).map((r) => [r.slug, r]))

  // 3) Insert ![Title](heroImageUrl) right after each "## N. [Title](/recipes/slug)" heading
  const lines = content.split("\n")
  const out: string[] = []
  let inserted = 0
  const headingRe = /^##\s+\d+\.\s+\[([^\]]+)\]\(\/recipes\/([^)]+)\)/
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    out.push(line)
    const m = line.match(headingRe)
    if (!m) continue
    const [, title, recipeSlug] = m
    const recipe = bySlug.get(recipeSlug)
    if (!recipe?.heroImageUrl) continue
    // Skip if the next non-empty line already is an image for this recipe (idempotent)
    let j = i + 1
    while (j < lines.length && lines[j].trim() === "") j++
    if (lines[j]?.trim().startsWith("![") && lines[j].includes(recipe.heroImageUrl)) continue
    out.push("", `![${title}](${recipe.heroImageUrl})`)
    inserted++
  }
  content = out.join("\n")

  // 4) Update DB
  await db.update(recipes)
    .set({ contentMarkdown: content, updatedAt: new Date() })
    .where(eq(recipes.id, rowId))
  console.log(`✅ INSERTED ${inserted}/15 images into article #${rowId}`)

  // 5) Verify
  const check = await db
    .select({ contentMarkdown: recipes.contentMarkdown })
    .from(recipes)
    .where(eq(recipes.id, rowId))
  const imgs = check[0].contentMarkdown.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []
  console.log(`   Total image lines in content: ${imgs.length}`)
  const words = check[0].contentMarkdown.trim().split(/\s+/).length
  console.log(`   Words: ${words}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
