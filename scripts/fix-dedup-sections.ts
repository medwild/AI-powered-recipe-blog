// scripts/fix-dedup-sections.ts
// One-shot fix for the duplicate "Ingredients"/"Instructions" headings flagged by
// Seobility ("Duplicate heading" on dessert-for-2, 08/04/26): the generated body
// markdown of some recipes contains its own `## Ingredients` / `## Instructions`
// sections, which duplicate the H2 blocks already rendered by the recipe hero.
// This removes those sections from contentMarkdown (hero blocks stay untouched).
// Run: npx tsx scripts/fix-dedup-sections.ts  (dry-run with --dry)
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

const DRY = process.argv.includes("--dry")

// Une section markdown = une ligne de titre + son contenu jusqu'au prochain titre.
// On cible uniquement les titres "Ingredients"/"Instructions" (n'importe quel niveau #).
// IMPORTANT : on ne retire que la 2e occurrence+ (le doublon du hero), jamais la
// première — qui peut être une section éditoriale unique ("Ingredients Notes", etc.).
const SECTION = /^#{1,6}\s+(?:Ingredients|Instructions)[^\n]*\n[\s\S]*?(?=^#{1,6}\s|\Z)/gim

function fixContent(md: string): { fixed: string; removed: number } {
  const matches = md.match(SECTION) ?? []
  if (matches.length <= 1) return { fixed: md, removed: 0 } // pas de doublon

  // Garder la première occurrence, retirer les suivantes
  let removed = 0
  let first = true
  const fixed = md.replace(SECTION, (m) => {
    if (first) {
      first = false
      return m
    }
    removed++
    return ""
  })
  return { fixed, removed }
}

async function main() {
  const { db } = await import("../lib/db")
  const all = await db
    .select({ id: recipes.id, slug: recipes.slug, contentMarkdown: recipes.contentMarkdown })
    .from(recipes)
    .where(eq(recipes.status, "published"))

  let total = 0
  for (const r of all) {
    if (!r.contentMarkdown) continue
    const { fixed, removed } = fixContent(r.contentMarkdown)
    if (removed === 0) continue
    total += removed
    console.log(`\n== ${r.slug} : ${removed} section(s) dupliquée(s)`)
    // Aperçu : première ligne avant/après pour vérifier
    const before = r.contentMarkdown.split("\n").find((l) => /^#{1,6}\s+Ingredients/i.test(l))
    console.log(`   section retirée : "${before?.slice(0, 80) ?? "(titre)"}"`)
    if (!DRY) {
      await db
        .update(recipes)
        .set({ contentMarkdown: fixed })
        .where(eq(recipes.id, r.id))
      console.log(`   ✅ contentMarkdown mis à jour (${r.slug})`)
    }
  }
  console.log(`\n${DRY ? "[DRY-RUN] " : ""}${total} section(s) dupliquée(s) trouvée(s)${DRY ? " (rien appliqué)" : " supprimée(s)"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
