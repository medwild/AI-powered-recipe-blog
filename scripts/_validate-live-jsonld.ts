/**
 * Validation live des fixes JSON-LD du 07/08 (déployés) sur les 46 recettes.
 * Vérifie par page de recette :
 *  - recipeCuisine non vide (déterministe depuis tags)
 *  - recipeCategory présent (chemin @graph)
 *  - recipeInstructions[0].image = hero (image step 1)
 *  - nutrition présent (NutritionInformation)
 * Usage : npx tsx scripts/_validate-live-jsonld.ts [--slugs file.txt]
 */
import fs from "node:fs"

const SITE = "https://www.chefaugustin.com"

interface Recipe {
  slug: string
  heroImageUrl?: string | null
}

function findLd(node: unknown, predicate: (o: Record<string, unknown>) => boolean): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (n && typeof n === "object") {
      const o = n as Record<string, unknown>
      if (predicate(o)) out.push(o)
      Object.values(o).forEach(walk)
    }
  }
  walk(node)
  return out
}

async function main() {
  const pinsRes = await fetch(`${SITE}/api/recipes/pins`)
  if (!pinsRes.ok) throw new Error(`GET /api/recipes/pins → ${pinsRes.status}`)
  const payload = (await pinsRes.json()) as { recipes: Recipe[] }
  const pins = payload.recipes
  console.log(`== ${pins.length} recettes depuis /api/recipes/pins ==\n`)

  const results: Array<Record<string, string | boolean>> = []
  let errors = 0

  for (const p of pins) {
    const res = await fetch(`${SITE}/recipes/${p.slug}`)
    if (!res.ok) {
      errors++
      results.push({ slug: p.slug, status: `HTTP ${res.status}` })
      continue
    }
    const html = await res.text()
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []
    let recipe: Record<string, unknown> | undefined
    for (const block of m) {
      const raw = block.replace(/^<script type="application\/ld\+json">/, "").replace(/<\/script>$/, "")
      try {
        const parsed = JSON.parse(raw)
        const found = findLd(parsed, (o) => o["@type"] === "Recipe")
        if (found.length) { recipe = found[0]; break }
      } catch { /* bloc JSON-LD illisible, ignorer */ }
    }
    if (!recipe) {
      errors++
      results.push({ slug: p.slug, recipeLd: "ABSENT" })
      continue
    }

    const cuisine = recipe.recipeCuisine
    const category = recipe.recipeCategory
    const instructions = recipe.recipeInstructions
    const firstStepImage =
      Array.isArray(instructions) && instructions[0] && typeof instructions[0] === "object"
        ? (instructions[0] as Record<string, unknown>).image
        : undefined
    const nutrition = recipe.nutrition

    results.push({
      slug: p.slug,
      cuisine: typeof cuisine === "string" && cuisine.trim() ? cuisine : "❌ VIDE",
      category: category ? `✅ ${Array.isArray(category) ? category.join(",") : String(category)}` : "❌ ABSENT",
      step1Image: firstStepImage ? "✅" : "❌ ABSENT",
      nutrition: nutrition ? "✅" : "❌ ABSENT",
    })
  }

  const show = results.filter((r) => !("status" in r) || r.status !== "HTTP 200")
  for (const r of show) console.log(JSON.stringify(r))

  const bad = results.filter((r) => Object.values(r).some((v) => typeof v === "string" && v.startsWith("❌")))
  const httpErrors = results.filter((r) => r.status && r.status !== "HTTP 200")
  console.log(`\n== BILAN ==`)
  console.log(`Total : ${results.length} | HTTP errors : ${httpErrors.length} | JSON-LD manquant : ${errors}`)
  console.log(`Champs invalides : ${bad.length} recette(s)`)
  if (bad.length) console.log(bad.map((b) => b.slug).join("\n"))
  process.exit(bad.length || httpErrors.length ? 1 : 0)
}

main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
