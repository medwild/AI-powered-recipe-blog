// One-shot: recipe #110 — decisions 17/08 (user-delegated):
// (A) "Copycat" dans title/metaTitle/metaDescription (hygiène marque, keyword intact, slug inchangé)
// (B) Retrait des 2 fausses métriques personnelles (5% water weight, 30% salt) — markdown ET jsonLd FAQ (cohérence dual output)
// Backup: repports/backup-recipe-110-copycat-2026-08-17.json
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const NEW_TITLE = "45-Minute Copycat Texas Roadhouse Dinner for Two"
const NEW_META_TITLE = "Copycat Texas Roadhouse Dinner for Two: Steak Recipe"
const NEW_META_DESC = "Skip the takeout — make this copycat Texas Roadhouse dinner for two at home in 45 minutes. Learn to sear the perfect sirloin and whip the cinnamon butter."

const OLD_5PCT = "I've tracked the moisture loss of beef in my kitchen, and leaving a steak uncovered in the fridge for 24 hours removes up to 5% of its surface water weight, guaranteeing a violent, immediate sear."
const NEW_5PCT = "In my kitchen, leaving a steak uncovered in the fridge for 24 hours dries the surface enough to sear violently — you can feel the difference the moment the meat hits the pan."

const OLD_30PCT = "Restaurants aggressively season their steaks with up to 30% more salt and fat than most home cooks are comfortable using."
const NEW_30PCT = "Restaurants season their steaks far more aggressively than most home cooks are comfortable using."

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.recipes.findFirst({ where: eq(recipes.id, 110) })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }

  // ── Assertions exact-once ──────────────────────────────
  if (row.title !== "45-Minute Texas Roadhouse Dinner for Two") { console.error(`❌ title inattendu: ${row.title}`); process.exit(1) }
  if (row.metaTitle !== "45-Minute Texas Roadhouse Dinner for Two: Steak Recipe") { console.error(`❌ metaTitle inattendu: ${row.metaTitle}`); process.exit(1) }
  if (row.metaDescription !== "Skip the takeout and make this Texas Roadhouse dinner for two at home in 45 minutes. Learn how to sear the perfect sirloin and whip up the cinnamon butter.") { console.error("❌ metaDescription inattendue"); process.exit(1) }
  const md = row.contentMarkdown ?? ""
  for (const [label, s] of [["5%", OLD_5PCT], ["30%", OLD_30PCT]] as Array<[string, string]>) {
    const c = md.split(s).length - 1
    if (c !== 1) { console.error(`❌ ABORT: phrase ${label} matchée ${c}× dans markdown`); process.exit(1) }
  }
  const faqAnswer = (row.jsonLd?.["@graph"] as any[])?.find((n: any) => n["@type"] === "FAQPage")?.mainEntity
    ?.find((q: any) => q.name === "Why does the restaurant steak taste different than home-cooked?")?.acceptedAnswer?.text
  if (!faqAnswer || !faqAnswer.includes(OLD_30PCT)) { console.error("❌ ABORT: FAQ jsonLd 30% introuvable"); process.exit(1) }

  // ── Backup ─────────────────────────────────────────────
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-copycat-2026-08-17.json", JSON.stringify({
    id: 110, slug: row.slug, date: "2026-08-17",
    titleBefore: row.title, titleAfter: NEW_TITLE,
    metaTitleBefore: row.metaTitle, metaTitleAfter: NEW_META_TITLE,
    metaDescriptionBefore: row.metaDescription, metaDescriptionAfter: NEW_META_DESC,
    sentencesBefore: [OLD_5PCT, OLD_30PCT], sentencesAfter: [NEW_5PCT, NEW_30PCT],
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-110-copycat-2026-08-17.json")

  // ── Apply ──────────────────────────────────────────────
  const newMd = md.replace(OLD_5PCT, NEW_5PCT).replace(OLD_30PCT, NEW_30PCT)
  const graph = JSON.parse(JSON.stringify(row.jsonLd?.["@graph"] ?? [])) as any[]
  const faqNode = graph.find((n: any) => n["@type"] === "FAQPage")
  const q = faqNode?.mainEntity?.find((x: any) => x.name === "Why does the restaurant steak taste different than home-cooked?")
  q.acceptedAnswer.text = q.acceptedAnswer.text.replace(OLD_30PCT, NEW_30PCT)

  // ── Post-checks ────────────────────────────────────────
  if (NEW_META_TITLE.length > 60) { console.error(`❌ metaTitle ${NEW_META_TITLE.length} chars > 60`); process.exit(1) }
  if (NEW_META_DESC.length < 150 || NEW_META_DESC.length > 160) { console.error(`❌ metaDescription ${NEW_META_DESC.length} chars hors 150-160`); process.exit(1) }
  const lower = newMd.toLowerCase()
  for (const b of ["healthy", "serp", "ranking", "seo", "competitor"]) {
    if (lower.includes(b)) { console.error(`❌ banni: ${b}`); process.exit(1) }
  }
  const mdAfter = newMd.split(OLD_30PCT).length - 1
  if (mdAfter !== 0) { console.error("❌ 30% encore présent"); process.exit(1) }

  await db.update(recipes).set({
    title: NEW_TITLE, metaTitle: NEW_META_TITLE, metaDescription: NEW_META_DESC,
    contentMarkdown: newMd, jsonLd: { "@context": "https://schema.org", "@graph": graph },
    updatedAt: new Date(),
  }).where(eq(recipes.id, 110))
  console.log("✅ title/meta → Copycat (metaTitle " + NEW_META_TITLE.length + " chars, metaDescription " + NEW_META_DESC.length + " chars)")
  console.log("✅ 5% et 30% retirés (markdown + jsonLd FAQ synchronisés)")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
