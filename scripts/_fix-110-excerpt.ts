// One-shot: recipe #110 — (A) excerpt distinct de la première phrase (rendu triplé par le template),
// (B) poids Diamond Crystal aligné sur la recette elle-même (2 tsp = 6g → ~9g/tbsp, plus "exactly").
// Backup: repports/backup-recipe-110-excerpt-2026-08-17.json
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const OLD_EXCERPT = "The unmistakable aroma of rendered beef fat hitting aggressively seasoned iron is what pulls you into a steakhouse before you even see the menu."
const NEW_EXCERPT = "Two spice-crusted sirloins, warm yeast rolls, and whipped cinnamon-honey butter — the Roadhouse dinner for two, made at home in 45 minutes."

const OLD_SALT = "I always advise measuring salt by weight; I found that 1 tablespoon of Diamond Crystal kosher salt weighs exactly 10 grams, whereas fine table salt is almost 19 grams, which destroys a dry rub if substituted blindly."
const NEW_SALT = "I always advise measuring salt by weight — the ingredient list calls for 6 grams per 2 teaspoons, which works out to about 9 grams a tablespoon — whereas fine table salt is roughly twice as heavy, which destroys a dry rub if substituted blindly."

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.recipes.findFirst({ where: eq(recipes.id, 110), columns: { slug: true, excerpt: true, contentMarkdown: true } })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }

  // Assertions exact-once
  const md = row.contentMarkdown ?? ""
  if ((row.excerpt ?? "") !== OLD_EXCERPT) {
    console.error("❌ ABORT: excerpt inattendu — rien écrit")
    console.error(`  réel: ${(row.excerpt ?? "").slice(0, 80)}…`)
    process.exit(1)
  }
  const saltCount = md.split(OLD_SALT).length - 1
  if (saltCount !== 1) {
    console.error(`❌ ABORT: phrase sel matchee ${saltCount}× (attendu 1) — rien écrit`)
    process.exit(1)
  }

  // Backup
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-excerpt-2026-08-17.json", JSON.stringify({
    id: 110, slug: row.slug, date: "2026-08-17",
    excerptBefore: row.excerpt, excerptAfter: NEW_EXCERPT,
    saltSentenceBefore: OLD_SALT, saltSentenceAfter: NEW_SALT,
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-110-excerpt-2026-08-17.json")

  const newMd = md.replace(OLD_SALT, NEW_SALT)
  if (newMd === md) { console.error("❌ ABORT: remplacement markdown no-op"); process.exit(1) }

  await db.update(recipes).set({ excerpt: NEW_EXCERPT, contentMarkdown: newMd, updatedAt: new Date() }).where(eq(recipes.id, 110))
  console.log("✅ excerpt → hook distinct (fini le rendu triplé)")
  console.log("✅ sel → « about 9 grams » cohérent avec 6g/2tsp de la liste d'ingrédients")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
