// Temporary script to check recipe details
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  for (const id of [63]) {
  const r = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, id) })
  if (!r) { console.log(`\n#${id} NOT FOUND`); continue }
  const wc = (r.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
  console.log(`\n=== #${id} | ${r.title} ===`)
  console.log(`Status: ${r.status} | Words: ${wc}`)
  console.log(`Ingredients in DB: ${(r.ingredients ?? []).length} items`)
  if ((r.ingredients ?? []).length > 0) {
    for (const ing of (r.ingredients ?? []).slice(0, 5)) console.log(`  - ${JSON.stringify(ing)}`)
    if ((r.ingredients ?? []).length > 5) console.log(`  ... +${r.ingredients.length - 5} more`)
  }
  console.log(`Instructions in DB: ${(r.instructions ?? []).length} steps`)
  if ((r.instructions ?? []).length > 0) {
    for (const s of (r.instructions ?? []).slice(0, 3)) console.log(`  Step ${s.step}: ${(s.text ?? "").substring(0, 80)}`)
  }
  // Count ingredients mentioned in markdown
  const md = r.contentMarkdown ?? ""
  const mdIngredientLines = md.match(/^[-*•]\s+.+/gm) ?? []
  console.log(`Ingredient lines in markdown: ${mdIngredientLines.length}`)
  if (mdIngredientLines.length > 0) console.log(`  First: ${mdIngredientLines[0]!.substring(0, 80)}`)
  console.log(`H2 headings in markdown: ${md.match(/^## /gm)?.length ?? 0}`)
  if ((r.workflowLog ?? []).length > 0) {
    console.log(`Workflow:`)
    for (const e of r.workflowLog as any[]) console.log(`  [${e.status}] ${e.step}: ${(e.message ?? "").substring(0, 200)}`)
  }
}
}

main().catch(console.error)
