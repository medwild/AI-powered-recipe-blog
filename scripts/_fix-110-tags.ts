// One-shot: topical-map integration for recipe #110 — tags → hub curation.
// Scope (user-approved 17/08): add "dinner for two" + "date night", drop "medium" (duplicate of difficulty field).
// Backup: repports/backup-recipe-110-tags-2026-08-17.json (tags only — full-row backup already exists from content fix).
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const NEW_TAGS = ["american", "steakhouse", "beef", "skillet", "dinner", "dinner for two", "date night"]

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  const { HUBS } = await import("../lib/hub-content")

  const row = await db.query.recipes.findFirst({
    where: eq(recipes.id, 110),
    columns: { slug: true, title: true, tags: true },
  })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }

  const before = (row.tags ?? []) as string[]
  if (JSON.stringify(before) !== JSON.stringify(["american", "steakhouse", "medium", "dinner", "beef", "skillet"])) {
    console.error(`❌ ABORT: tags actuels inattendus: ${JSON.stringify(before)}`)
    process.exit(1)
  }

  // Backup
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-tags-2026-08-17.json", JSON.stringify({
    id: 110, slug: row.slug, title: row.title, tagsBefore: before, tagsAfter: NEW_TAGS, date: "2026-08-17",
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-110-tags-2026-08-17.json")

  // Curation avant/après
  const count = (tags: string[]) => HUBS.filter((h) => tags.some((t) => h.curateTags.includes(t))).length
  const beforeHubs = count(before)
  const afterHubs = count(NEW_TAGS)
  console.log(`🔍 curation hubs: ${beforeHubs} → ${afterHubs}`)
  if (afterHubs <= beforeHubs) { console.error("❌ ABORT: aucun gain de curation"); process.exit(1) }

  await db.update(recipes).set({ tags: NEW_TAGS, updatedAt: new Date() }).where(eq(recipes.id, 110))
  console.log(`✅ tags #110 → ${JSON.stringify(NEW_TAGS)} (${NEW_TAGS.length} tags, fourchette 4-8) — curaté dans ${afterHubs} hubs`)
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
