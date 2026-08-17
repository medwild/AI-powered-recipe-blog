// One-shot: surgical content fixes on recipe #110 (texas-roadhouse-dinner-for-two).
// Scope (user-approved 17/08): broken injected anchor + 4 minor science wobbles.
// Backup: repports/backup-recipe-110-2026-08-17.json (full row).
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const FIXES: Array<[string, string]> = [
  // 1. Broken pipeline-injected anchor: "[for two] minutes" (duration split by link)
  ["sear the fat cap against the hot iron [for two](/recipes/romantic-dinner-for-two-at-home) minutes before",
   "sear the fat cap against the hot iron for two minutes before"],
  // 2. Cinnamon is hydrophobic — it blooms/disperses in fat, it does not hydrate
  ["the cinnamon needs to hydrate in the fat", "the cinnamon needs to bloom in the fat"],
  // 3. Anatomy: the sirloin primal sits behind the short loin, not "under the tenderloin"
  ["Located just under the tenderloin", "Located behind the short loin"],
  // 4. Unverifiable precision
  ["the butterfats seize at exactly 60°F (15°C)", "the butterfats seize at around 60°F (15°C)"],
  // 5-6. "Emulsion" misnomer (whipping honey into butter = aeration/dispersion)
  ["## Mastering the Cinnamon-Honey Butter Emulsion", "## Mastering the Cinnamon-Honey Butter"],
  ["Whipping butter sounds trivial until the emulsion breaks.", "Whipping butter sounds trivial until the mixture splits."],
]

const BANNED = [
  "healthy", "good for you", "nutritious", "better than", "probiotics", "gut health",
  "immune boost", "detox", "anti-inflammatory", "fat-burning", "miracle", "superfood",
  "cleanse", "cure", "heal", "treat", "all-natural", "clinically proven",
  "scientifically proven", "serp", "search results", "first page", "top results",
  "top ten", "top 10", "top-ranked", "top ranked", "competitor", "competing recipe",
  "seo", "ranking", "scan the top", "scroll through", "our angle", "the angle here",
  "my angle here", "that's the angle",
]

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.recipes.findFirst({
    where: eq(recipes.id, 110),
  })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }

  // Backup (full row, before any change)
  const backup = JSON.stringify(row, (k, v) => (v instanceof Date ? v.toISOString() : v), 2)
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-2026-08-17.json", backup)
  console.log("💾 backup: repports/backup-recipe-110-2026-08-17.json")

  const md = row.contentMarkdown ?? ""

  // Apply fixes with exact-once assertions
  let current = md
  for (const [from, to] of FIXES) {
    const count = current.split(from).length - 1
    if (count !== 1) {
      console.error(`❌ ABORT: "${from.slice(0, 60)}…" matched ${count}× (attendu 1) — rien n'a été écrit`)
      process.exit(1)
    }
    current = current.replace(from, to)
    console.log(`✅ "${from.slice(0, 50)}…" → "${to.slice(0, 50)}…"`)
  }

  // Post-fix checks
  const lower = current.toLowerCase()
  const found = BANNED.filter((b) => lower.includes(b))
  if (found.length) { console.error(`❌ ABORT: mots bannis introduits: ${found.join(", ")}`); process.exit(1) }
  if (current.includes("[IMAGE:")) { console.error("❌ ABORT: marqueur [IMAGE:] présent"); process.exit(1) }
  const links = (current.match(/\]\(\/recipes\/[^)]+\)/g) || []).length
  const words = current.split(/\s+/).filter(Boolean).length
  console.log(`🔍 post-fix: ${words} mots (avant ${md.split(/\s+/).filter(Boolean).length}), ${links} liens internes, 0 banni`)

  // Write
  await db.update(recipes).set({ contentMarkdown: current, updatedAt: new Date() }).where(eq(recipes.id, 110))
  console.log("✅ DB update recipe #110 — contentMarkdown corrigé")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
