// Compare recipe #42 (gpt-oss-120b) and #43 (gpt-oss-120b) content
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  for (const id of [46, 47]) {
    const r = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, id) })
    if (!r) { console.log(`\n=== Recipe #${id} NOT FOUND ===\n`); continue }

    const wc = (r.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    console.log(`\n${"=".repeat(70)}`)
    console.log(`RECIPE #${id} — ${r.title}`)
    console.log(`${"=".repeat(70)}`)
    console.log(`Status: ${r.status} | Words: ${wc} | Hero: ${r.heroImageUrl ?? "NONE"}`)
    console.log(`Tags: ${(Array.isArray(r.tags) ? r.tags.map(String) : []).slice(0, 10).join(", ")}${(Array.isArray(r.tags) ? r.tags.map(String) : []).length > 10 ? `... (+${r.tags.length - 10} more)` : ""}`)
    console.log(`Difficulty: ${r.difficulty} | Prep: ${r.prepTime} | Cook: ${r.cookTime} | Total: ${r.totalTime}`)
    console.log(`Servings: ${r.servings}`)
    console.log(`Meta title: ${r.metaTitle} (${(r.metaTitle ?? "").length} chars)`)
    console.log(`Meta desc: ${(r.metaDescription ?? "").substring(0, 100)}... (${(r.metaDescription ?? "").length} chars)`)
    console.log(`JSON-LD: ${r.jsonLd ? "✅ present" : "❌ missing"}`)
    console.log(`Ingredients: ${(r.ingredients ?? []).length} items`)

    // Content preview
    console.log(`\n--- Content (first 2000 chars) ---`)
    console.log((r.contentMarkdown ?? "NO CONTENT").substring(0, 2000))
    console.log(`\n--- Last 500 chars ---`)
    const md = r.contentMarkdown ?? ""
    console.log(md.substring(Math.max(0, md.length - 500)))
  }

  console.log(`\n\n=== FULL CONTENT ===`)
  console.log(md)
}

main().catch(console.error)
