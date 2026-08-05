/**
 * One-shot: clean token-repetition artifacts ("easy easy", "for two for two")
 * from recipe excerpts + contentMarkdown. Mirrors the quality-gate Check 7.
 * Usage: npx tsx scripts/_clean-repeat.ts   (--dry for dry run)
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const DRY = process.argv.includes("--dry")

/** Collapse "word word" → "word" (keep the last occurrence of the pair). */
function collapseWordRepeat(text: string): string {
  return text.replace(/\b(\w+)\s+\1\b/gi, "$1")
}

/** Collapse "for two for two for two" → "for two". */
function collapseForTwo(text: string): string {
  return text.replace(/(for two\s+){1,}for two/gi, "for two")
}

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  if (!url) { console.error("no url"); process.exit(1) }
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })
  const rows = await db.select().from(recipes).where(eq(recipes.status, "published"))

  let fixed = 0
  for (const r of rows) {
    const excerpt = collapseWordRepeat(collapseForTwo(r.excerpt ?? ""))
    const md = collapseWordRepeat(collapseForTwo(r.contentMarkdown ?? ""))
    const changed = excerpt !== r.excerpt || md !== r.contentMarkdown
    if (changed) {
      fixed++
      console.log(`${DRY ? "[DRY] " : ""}${r.slug}: cleaned`)
      if (!DRY) {
        await db
          .update(recipes)
          .set({ excerpt, contentMarkdown: md })
          .where(eq(recipes.id, r.id))
      }
    }
  }
  console.log(`\n${DRY ? "DRY RUN — " : ""}Recettes nettoyées: ${fixed}`)
  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
