// One-shot: remove the 2 weak pipeline-injected anchors ("for two" → whole30, lasagna) on recipe #110.
// Scope (user-approved 17/08): weak generic anchors with low topical relevance — removed, plain text restored.
// Backup: repports/backup-recipe-110-links-2026-08-17.json (contentMarkdown before).
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const FIXES: Array<[string, string]> = [
  // Weak anchor "for two" → whole30 (irrelevant target mid-steak paragraph)
  ["cooking a meal [for two](/recipes/whole30-chicken-skillet-tomatoes-garlic), the margin",
   "cooking a meal for two, the margin"],
  // Weak anchor "for two" → lasagna (irrelevant target in the shopping paragraph)
  ["When shopping [for two](/recipes/easy-lasagna-recipe), I prefer",
   "When shopping for two, I prefer"],
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

  const row = await db.query.recipes.findFirst({ where: eq(recipes.id, 110), columns: { contentMarkdown: true } })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }

  const md = row.contentMarkdown ?? ""

  // Apply with exact-once assertions
  let current = md
  for (const [from, to] of FIXES) {
    const count = current.split(from).length - 1
    if (count !== 1) {
      console.error(`❌ ABORT: "${from.slice(0, 60)}…" matched ${count}× (attendu 1) — rien n'a été écrit`)
      process.exit(1)
    }
    current = current.replace(from, to)
    console.log(`✅ "${from.slice(0, 55)}…" → "${to.slice(0, 55)}…"`)
  }

  // Backup (before state)
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-links-2026-08-17.json", JSON.stringify({
    id: 110, slug: "texas-roadhouse-dinner-for-two", date: "2026-08-17",
    contentMarkdownBefore: md,
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-110-links-2026-08-17.json")

  // Post-fix checks
  const lower = current.toLowerCase()
  const found = BANNED.filter((b) => lower.includes(b))
  if (found.length) { console.error(`❌ ABORT: mots bannis: ${found.join(", ")}`); process.exit(1) }
  const links = (current.match(/\]\(\/recipes\/[^)]+\)/g) || []).map((l) => l.replace("](/", "").replace(")", ""))
  console.log(`🔍 post-fix: ${current.split(/\s+/).filter(Boolean).length} mots, liens restants: ${JSON.stringify(links)}`)

  await db.update(recipes).set({ contentMarkdown: current, updatedAt: new Date() }).where(eq(recipes.id, 110))
  console.log("✅ DB update — 2 ancres faibles retirées")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
