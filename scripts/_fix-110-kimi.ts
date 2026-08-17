// One-shot: recipe #110 — Kimi audit (17/08): (A) metaTitle harmonisé avec le H1 (promesse "45-Minute" en SERP),
// (B) hedge "constant 500°F" → "around 500°F" (règle kit précision) — intro + markdown FAQ + jsonLd FAQ synchronisés.
// Backup: repports/backup-recipe-110-kimi-2026-08-17.json
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const NEW_META_TITLE = "45-Minute Copycat Texas Roadhouse Dinner for Two"

const OLD_500_INTRO = "an industrial flat-top griddle burning at 500°F (260°C) to achieve"
const NEW_500_INTRO = "an industrial flat-top griddle burning around 500°F (260°C) to achieve"

const OLD_500_FAQ = "they cook on heavy steel flat-top griddles that maintain a constant 500°F (260°C) temperature"
const NEW_500_FAQ = "they cook on heavy steel flat-top griddles that hold steady around 500°F (260°C)"

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.recipes.findFirst({ where: eq(recipes.id, 110) })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }

  // ── Assertions exact-once ──────────────────────────────
  if (row.metaTitle !== "Copycat Texas Roadhouse Dinner for Two: Steak Recipe") {
    console.error(`❌ metaTitle inattendu: ${row.metaTitle}`); process.exit(1)
  }
  const md = row.contentMarkdown ?? ""
  for (const [label, s] of [["intro", OLD_500_INTRO], ["FAQ markdown", OLD_500_FAQ]] as Array<[string, string]>) {
    const c = md.split(s).length - 1
    if (c !== 1) { console.error(`❌ ABORT: ${label} matchée ${c}×`); process.exit(1) }
  }
  const faqAnswer = (row.jsonLd?.["@graph"] as any[])?.find((n: any) => n["@type"] === "FAQPage")?.mainEntity
    ?.find((q: any) => q.name === "Why does the restaurant steak taste different than home-cooked?")?.acceptedAnswer?.text
  if (!faqAnswer || !faqAnswer.includes(OLD_500_FAQ)) { console.error("❌ ABORT: FAQ jsonLd 500°F introuvable"); process.exit(1) }
  if (NEW_META_TITLE.length > 60) { console.error(`❌ metaTitle ${NEW_META_TITLE.length} chars > 60`); process.exit(1) }

  // ── Backup ─────────────────────────────────────────────
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-kimi-2026-08-17.json", JSON.stringify({
    id: 110, slug: row.slug, date: "2026-08-17",
    metaTitleBefore: row.metaTitle, metaTitleAfter: NEW_META_TITLE,
    sentencesBefore: [OLD_500_INTRO, OLD_500_FAQ], sentencesAfter: [NEW_500_INTRO, NEW_500_FAQ],
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-110-kimi-2026-08-17.json")

  // ── Apply ──────────────────────────────────────────────
  const newMd = md.replace(OLD_500_INTRO, NEW_500_INTRO).replace(OLD_500_FAQ, NEW_500_FAQ)
  const graph = JSON.parse(JSON.stringify(row.jsonLd?.["@graph"] ?? [])) as any[]
  const q = graph.find((n: any) => n["@type"] === "FAQPage")?.mainEntity
    ?.find((x: any) => x.name === "Why does the restaurant steak taste different than home-cooked?")
  q.acceptedAnswer.text = q.acceptedAnswer.text.replace(OLD_500_FAQ, NEW_500_FAQ)

  const wordsBefore = (row.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
  const wordsAfter = newMd.split(/\s+/).filter(Boolean).length
  const delta = wordsAfter - wordsBefore
  if (Math.abs(delta) > 3) { console.error(`❌ word count changé de ${delta}: ${wordsBefore} → ${wordsAfter}`); process.exit(1) }
  console.log(`🔍 delta mots: ${delta >= 0 ? "+" : ""}${delta} (tolérance ±3 — reformulation FAQ)`)

  await db.update(recipes).set({
    metaTitle: NEW_META_TITLE, contentMarkdown: newMd,
    jsonLd: { "@context": "https://schema.org", "@graph": graph }, updatedAt: new Date(),
  }).where(eq(recipes.id, 110))
  console.log(`✅ metaTitle → "${NEW_META_TITLE}" (${NEW_META_TITLE.length} chars) — harmonisé avec le H1`)
  console.log("✅ 500°F hedgé (intro + FAQ markdown + FAQ jsonLd), mots invariants")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
