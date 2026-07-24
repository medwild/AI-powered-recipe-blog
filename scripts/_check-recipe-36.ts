// Temporary script to check recipe details
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  for (const id of [59, 62]) {
  const r = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, id) })
  if (!r) { console.log(`\n#${id} NOT FOUND`); continue }
  const wc = (r.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
  console.log(`\n=== #${id} | ${r.title} ===`)
  console.log(`Status: ${r.status} | Words: ${wc} | Hero: ${r.heroImageUrl ?? "NONE"}`)
  console.log(`JSON-LD: ${r.jsonLd ? "✅" : "❌"} | Tags: ${(Array.isArray(r.tags) ? r.tags.map(String) : []).join(", ")}`)
  if (r.workflowLog) for (const e of r.workflowLog as any[]) console.log(`  [${e.status}] ${e.step}: ${(e.message ?? "").substring(0, 150)}`)
  if (wc > 0) console.log(`\nContent preview: ${(r.contentMarkdown ?? "").substring(0, 300)}`)
}
}

main().catch(console.error)
