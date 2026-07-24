import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  const r = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, 66) })
  if (!r) { console.log("NOT FOUND"); process.exit(1) }
  const md = r.contentMarkdown ?? ""
  const idx = md.search(/ingredients/i)
  console.log("--- Markdown around 'Ingredients' ---")
  console.log(md.substring(Math.max(0, idx - 20), Math.min(md.length, idx + 800)))
  const m = md.match(/^##\s+Ingredients?\b.*?\n([\s\S]*?)(?=^##\s|\Z)/im)
  console.log("\n--- Regex test ---")
  console.log(m ? "MATCH: " + m[1]!.substring(0, 300) : "NO MATCH")
}

main().catch(console.error)
