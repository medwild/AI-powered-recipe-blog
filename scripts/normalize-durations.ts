// scripts/normalize-durations.ts
// P1 fix — incohérence des formats de durée (SEO audit 2026-08-04).
// Google Recipe schema exige ISO 8601 (PT15M, PT4H30M). 4 recettes ont des
// formats invalides (nombres bruts "10" ou texte "10 minutes") → rich snippet
// ignoré. One-shot : convertit tout en ISO 8601.
// Run: npx tsx scripts/normalize-durations.ts  (dry-run avec --dry)
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

const DRY = process.argv.includes("--dry")

/** Convertit "10", "10 minutes", "PT10M" → "PT10M" ; "4H30M" → "PT4H30M". */
function toIso(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value).trim()
  if (!s) return null
  // Déjà ISO
  if (s.startsWith("PT")) return s
  // Nombre brut : minutes
  if (/^\d+$/.test(s)) return `PT${s}M`
  // Texte "10 minutes" ou "1 hour 30 minutes"
  const m = s.match(/(\d+)\s*(hour|hr|h|minute|min|m|s)/gi)
  if (!m) return s // laisser tel quel si non reconnu
  let hours = 0
  let minutes = 0
  for (const part of m) {
    const n = parseInt(part, 10)
    if (/hour|hr|h/i.test(part)) hours += n
    else if (/min|m/i.test(part)) minutes += n
  }
  minutes += hours * 60
  return `PT${minutes}M`
}

async function main() {
  const { db } = await import("../lib/db")
  const rows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.status, "published"))

  let fixed = 0
  for (const r of rows) {
    const prep = toIso(r.prepTime)
    const cook = toIso(r.cookTime)
    const total = toIso(r.totalTime)
    if (prep !== r.prepTime || cook !== r.cookTime || total !== r.totalTime) {
      fixed++
      if (!DRY) {
        await db.update(recipes).set({ prepTime: prep, cookTime: cook, totalTime: total }).where(eq(recipes.id, r.id))
      }
      console.log(`${DRY ? "[DRY] " : ""}#${r.id} ${r.slug}: prep ${JSON.stringify(r.prepTime)}→${prep} | cook ${JSON.stringify(r.cookTime)}→${cook} | total ${JSON.stringify(r.totalTime)}→${total}`)
    }
  }
  console.log(`\n${DRY ? "[DRY-RUN] " : ""}${fixed} recettes normalisées en ISO 8601.`)
  if (DRY) console.log("Lancez sans --dry pour appliquer.")
}

main().catch((e) => { console.error(e); process.exit(1) })
