// One-shot: recipe #111 — SEO retarget title/H1 to the dish (best practices: intent matching + corpus precedent).
// Slug, keyword, URL unchanged. Backup: repports/backup-recipe-111-retarget-2026-08-17.json
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const NEW_TITLE = "30-Minute Garlic Butter Shrimp for Two (One-Pan Skillet)"
const NEW_META_TITLE = "30-Minute Garlic Butter Shrimp for Two: Easy One-Pan Dinner"
const OLD_MD_H1 = "# Easy Dinner Recipes for Two: 30-Minute Garlic Butter Shrimp"
const NEW_MD_H1 = `# ${NEW_TITLE}`

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.recipes.findFirst({ where: eq(recipes.id, 111) })
  if (!row) { console.error("❌ Recipe #111 not found"); process.exit(1) }

  // Assertions
  if (row.title !== "Easy Dinner Recipes for Two: 30-Minute Garlic Butter Shrimp") { console.error(`❌ title inattendu: ${row.title}`); process.exit(1) }
  if (row.metaTitle !== "Easy Dinner Recipes for Two: Shrimp Skillet") { console.error(`❌ metaTitle inattendu: ${row.metaTitle}`); process.exit(1) }
  const md = row.contentMarkdown ?? ""
  const h1Count = md.split(OLD_MD_H1).length - 1
  if (h1Count !== 1) { console.error(`❌ H1 markdown matché ${h1Count}×`); process.exit(1) }
  if (NEW_META_TITLE.length > 60) { console.error(`❌ metaTitle ${NEW_META_TITLE.length} > 60`); process.exit(1) }

  // Backup
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-111-retarget-2026-08-17.json", JSON.stringify({
    id: 111, slug: row.slug, date: "2026-08-17",
    titleBefore: row.title, titleAfter: NEW_TITLE,
    metaTitleBefore: row.metaTitle, metaTitleAfter: NEW_META_TITLE,
    mdH1Before: OLD_MD_H1, mdH1After: NEW_MD_H1,
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-111-retarget-2026-08-17.json")

  const newMd = md.replace(OLD_MD_H1, NEW_MD_H1)
  if (newMd === md) { console.error("❌ remplacement H1 no-op"); process.exit(1) }

  await db.update(recipes).set({ title: NEW_TITLE, metaTitle: NEW_META_TITLE, contentMarkdown: newMd, updatedAt: new Date() }).where(eq(recipes.id, 111))
  console.log(`✅ title/H1 → "${NEW_TITLE}" (${NEW_TITLE.length} chars)`)
  console.log(`✅ metaTitle → "${NEW_META_TITLE}" (${NEW_META_TITLE.length} chars)`)
  console.log("✅ slug/keyword/URL inchangés — aucun 301 nécessaire")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
