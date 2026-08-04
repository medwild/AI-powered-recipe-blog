// scripts/normalize-tags.ts
// Taxonomie contrôlée + fusion des synonymes (P0-3 from SEO audit 2026-08-04).
// Google guidelines: avoid thin/duplicate category pages, one URL = one content.
// 1. Mappe les tags synonymes vers leur forme canonique.
// 2. Réduit les tags à une liste fermée (ALLOWED) — les tags hors liste sont retirés
//    des recettes (plus de prolifération de catégories fines).
// 3. Supprime les doublons dans chaque recette.
// Run: npx tsx scripts/normalize-tags.ts  (dry-run avec --dry)
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

const DRY = process.argv.includes("--dry")

// ── Taxonomie : pas de liste fermée — on GARDE les tags d'entité (ingrédients,
// plats, méthodes) qui servent au silo de liens et au signal sémantique.
// On retire UNIQUEMENT les synonymes (fusionnés ci-dessous) et les doublons.
// Les pages fines (< 3 recettes) seront gérées par le Volet 2 (noindex) —
// c'est le fix anti-scaled-content, pas la liste des tags.

// ── Mappe des synonymes → canonique (les 8 familles identifiées) ───────────
const SYNONYMS: Record<string, string> = {
  // Technique
  "one pan": "one-pan",
  "one-pan dinner": "one-pan",
  "sheet-pan": "sheet pan",
  "sheet pan dinner": "sheet pan",
  "slow-cooker": "slow cooker",
  "crock pot": "crockpot",
  // Ingrédient
  "chicken breast": "chicken",
  "chicken dinner for two": "chicken",
  "chicken recipes for two": "chicken",
  "chicken for two": "chicken",
  "chicken dinners for two": "chicken",
  "salmon orzo": "salmon",
  // Régime
  "dairy free": "lactose free",
  "gluten-free": "gluten free",
  // Occasion / besoin
  "dinner-for-two": "dinner for two",
  "dinners-for-two": "dinner for two",
  "weeknight dinner": "weeknight",
  "weeknight meals": "weeknight",
  "30 minute meals": "30-minute",
  "30 min": "30-minute",
  "quick dinner": "quick",
  "quick recipes for two": "quick",
  "small-batch": "small batch",
  "small batch cooking": "small batch",
  "small batch dessert": "small batch",
  "dessert for two": "dessert",
  "dessert for 2": "dessert",
  "date-night": "date night",
  "romantic dinner": "romantic",
  "romantic dinner for two": "romantic",
  "comfort-food": "comfort food",
  "meal-prep": "meal prep",
  "easy dinner": "easy",
  "easy recipes": "easy",
  "easy meal": "easy",
}

function normalizeTags(tags: string[]): { fixed: string[]; removed: string[] } {
  const seen = new Set<string>()
  const fixed: string[] = []
  const removed: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase()
    if (!tag) continue
    // Fusion GLOBALE des synonymes (entre recettes) : one-pan/one pan → one-pan
    const canonical = SYNONYMS[tag] ?? tag
    if (!seen.has(canonical)) {
      seen.add(canonical)
      fixed.push(canonical)
    } else {
      removed.push(tag)
    }
  }
  return { fixed, removed }
}

async function main() {
  const { db } = await import("../lib/db")
  const rows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.status, "published"))

  let totalRemoved = 0
  let totalFixed = 0
  for (const r of rows) {
    const tags = Array.isArray(r.tags) ? r.tags : []
    if (!tags.length) continue
    const { fixed, removed } = normalizeTags(tags)
    if (removed.length || fixed.join("|") !== tags.map((t) => t.trim().toLowerCase()).join("|")) {
      totalFixed++
      totalRemoved += removed.length
      if (!DRY) {
        await db.update(recipes).set({ tags: fixed }).where(eq(recipes.id, r.id))
      }
      console.log(`${DRY ? "[DRY] " : ""}#${r.id} ${r.slug} — ${removed.length} retirés → [${fixed.join(", ")}]`)
    }
  }
  console.log(`\n${DRY ? "[DRY-RUN] " : ""}${totalFixed} recettes normalisées, ${totalRemoved} tags retirés.`)
  if (DRY) console.log("Lancez sans --dry pour appliquer.")
}

main().catch((e) => { console.error(e); process.exit(1) })
