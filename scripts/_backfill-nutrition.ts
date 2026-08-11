import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const DRY_RUN = process.argv.includes("--dry-run")
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10)
const GENERATE_TO = process.argv.find((a) => a.startsWith("--generate="))?.split("=")[1] ?? ""
const APPLY_FROM = process.argv.find((a) => a.startsWith("--apply="))?.split("=")[1] ?? ""

interface IngredientItem { name?: string; quantity?: string }
interface RecipeRow { slug: string; title: string; servings: string | null; ingredients: IngredientItem[] | null; json_ld: Record<string, unknown> | null }

const results: Array<{ slug: string; title: string; nutrition: Record<string, unknown>; merged: Record<string, unknown> }> = []

async function main() {
  const { db } = await import("../lib/db")

  // Mode --apply: lit le fichier généré (audité) et écrit les blocs nutrition en base.
  if (APPLY_FROM) {
    const { readFileSync } = await import("fs")
    const { sql } = await import("drizzle-orm")
    const saved = JSON.parse(readFileSync(APPLY_FROM, "utf8")) as Array<{
      slug: string; title: string; nutrition: Record<string, unknown>; merged: Record<string, unknown>
    }>
    console.log(`Apply depuis ${APPLY_FROM} — ${saved.length} recettes`)
    let ok = 0, fail = 0
    for (const row of saved) {
      try {
        // sql helper paramétrize chaque ${} — cast jsonb requis pour la colonne jsonb
        await db.execute(
          sql`UPDATE recipes SET json_ld = ${JSON.stringify(row.merged)}::jsonb WHERE slug = ${row.slug}`,
        )
        ok++
        console.log(`[ok ${row.slug}] ${JSON.stringify(row.nutrition.calories ?? "")}`)
      } catch (e) {
        fail++
        console.error(`[ERR ${row.slug}] ${(e as Error).message.substring(0, 120)}`)
      }
    }
    console.log(`\nApply terminé — ok: ${ok}, échecs: ${fail}`)
    process.exit(0)
  }

  const { runTextAndParseJson } = await import("../lib/agents/provider")

  const rows = (await db.execute(
    "SELECT slug, title, servings, ingredients, json_ld FROM recipes WHERE content_type='recipe' AND status='published'",
  )).rows as unknown as RecipeRow[]

  let missing = rows.filter((r) => !hasNutrition(r.json_ld))
  if (LIMIT > 0) missing = missing.slice(0, LIMIT)
  console.log(`Recettes publiées: ${rows.length} — sans nutrition: ${missing.length}${LIMIT ? ` (limit ${LIMIT})` : ""}`)

  if (DRY_RUN) {
    for (const r of missing) {
      const servings = r.servings ?? "2 servings"
      const ing = (r.ingredients ?? []).map((i) => `${i.quantity ?? ""} ${i.name ?? ""}`.trim()).join(" | ")
      console.log(`\n[${r.slug}] "${r.title}" — ${servings}\n  ${ing.substring(0, 220)}`)
    }
    console.log(`\n${missing.length} recettes à traiter (dry-run — aucune écriture).`)
    process.exit(0)
  }

  const SYSTEM = `You estimate nutrition facts for a recipe. Return ONLY a JSON object (no markdown, no commentary):
{"nutrition": {"@type": "NutritionInformation", "servingSize": "1 serving", "calories": "450 calories", "proteinContent": "32 g", "fatContent": "18 g", "carbohydrateContent": "41 g"}}
Rules: estimate per serving from the ingredients and stated servings. Conservative and realistic — no zero-calorie dishes, no absurd values. Rounded whole numbers, string format "N calories", "N g". These are estimates, not lab values — no unusual precision.`

  let ok = 0, fail = 0
  for (const r of missing) {
    const ing = (r.ingredients ?? []).map((i) => `${i.quantity ?? ""} ${i.name ?? ""}`.trim()).join(" | ")
    const user = `Recipe: "${r.title}"\nServings: ${r.servings ?? "2 servings"}\nIngredients: ${ing}`

    try {
      const out = await runTextAndParseJson<{ nutrition: Record<string, unknown> }>(SYSTEM, user)
      const nutrition = out?.nutrition
      if (!nutrition || typeof nutrition !== "object" || !nutrition.calories) {
        console.warn(`[skip ${r.slug}] sortie invalide: ${JSON.stringify(out)?.substring(0, 100)}`)
        fail++
        continue
      }
      // Merge into the Recipe node of the stored @graph (or flat object)
      const merged = mergeNutrition(r.json_ld, nutrition)
      if (DRY_RUN) {
        console.log(`[ok ${r.slug}] ${JSON.stringify(nutrition)}`)
      } else if (GENERATE_TO) {
        results.push({ slug: r.slug, title: r.title, nutrition, merged })
        ok++
        console.log(`[ok ${r.slug}] ${JSON.stringify(nutrition)}`)
      } else {
        await db.execute(
          "UPDATE recipes SET json_ld = $2::jsonb WHERE slug = $1",
          [r.slug, JSON.stringify(merged)],
        )
        ok++
        console.log(`[ok ${r.slug}] ${JSON.stringify(nutrition)}`)
      }
    } catch (e) {
      fail++
      console.error(`[ERR ${r.slug}] ${(e as Error).message.substring(0, 120)}`)
    }
  }

  if (GENERATE_TO && results.length) {
    const { writeFileSync } = await import("fs")
    writeFileSync(GENERATE_TO, JSON.stringify(results, null, 2))
    console.log(`\nRésultats écrits dans ${GENERATE_TO} (${results.length} recettes) — aucune écriture DB.`)
  }
  console.log(`\nTerminé — ok: ${ok}, échecs: ${fail}${DRY_RUN ? " (dry-run)" : ""}`)
  process.exit(0)
}

function hasNutrition(ld: Record<string, unknown> | null): boolean {
  if (!ld) return false
  const graph = Array.isArray(ld["@graph"]) ? (ld["@graph"] as Record<string, unknown>[]) : [ld]
  return graph.some((n) => n["@type"] === "Recipe" && n.nutrition)
}

function mergeNutrition(ld: Record<string, unknown> | null, nutrition: Record<string, unknown>): Record<string, unknown> {
  if (!ld) return { "@context": "https://schema.org", "@type": "Recipe", nutrition }
  const graph = Array.isArray(ld["@graph"]) ? (ld["@graph"] as Record<string, unknown>[]) : null
  if (graph) {
    for (const n of graph) {
      if (n["@type"] === "Recipe") { n.nutrition = nutrition; break }
    }
    return ld
  }
  if (ld["@type"] === "Recipe") { ld.nutrition = nutrition; return ld }
  return { ...ld, nutrition }
}

main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
