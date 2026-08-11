import dotenv from "dotenv"
import { sql } from "drizzle-orm"
dotenv.config({ path: "/home/user/ai-blog-builder/.env.local", override: true })

async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute(sql`
    SELECT slug, title, tags, json_ld->'@graph'->0->'recipeIngredient' AS ingredients
    FROM recipes WHERE content_type='recipe' AND status='published'
  `)
  const rows = r.rows as Array<{ slug: string; title: string; tags: string[]; ingredients: string[] | null }>

  // Végétarien : pas de viande/poisson dans les ingrédients
  const MEAT = /chicken|breast|beef|steak|shrimp|salmon|pork|turkey|bacon|sausage|fish|meat|gravy|broth/i
  const veg = rows.filter((row) => !(row.ingredients ?? []).some((i) => MEAT.test(i)))
  console.log(`== Végétariennes candidates (${veg.length}) ==`)
  for (const v of veg) console.log(`  ${v.slug} — ${v.title}`)

  // Poêle : tags existants liés skillet/pan
  console.log(`\n== Recettes avec tag skillet/pan/one-pan/cast-iron ==`)
  for (const row of rows) {
    const tags = (row.tags ?? []).join(",")
    if (/skillet|one-pan|cast-iron|pan/.test(tags)) console.log(`  ${row.slug} [${tags}]`)
  }
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
