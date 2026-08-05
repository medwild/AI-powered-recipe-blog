// Generate 5 Pinterest pins per recipe using the hero image as reference:
// Pin 1 = existing hero image; Pins 2-5 = 4 image-to-image prompts (different
// photo angles) to paste into Ideogram chat with the hero as reference.
// Usage: npx tsx scripts/pin-variants.ts <recipeId|slug>
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type * as schema from "../lib/db/schema"

async function main() {
  // Dynamic import AFTER dotenv.config(): static imports are hoisted above
  // this call, and lib/db creates the Pool at import time — DATABASE_URL must
  // be set first or pg defaults to localhost:5432 (pitfall in pin-brief.ts).
  const { db }: { db: NodePgDatabase<typeof schema> } = await import("../lib/db")
  const target = process.argv[2]
  if (!target) {
    console.log("Usage: npx tsx scripts/pin-variants.ts <recipeId|slug>")
    process.exit(1)
  }

  const isId = /^\d+$/.test(target)
  const recipe = isId
    ? await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, parseInt(target)) })
    : await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, target) })

  if (!recipe) { console.error(`Recipe not found: ${target}`); process.exit(1) }
  if (!recipe.heroImageUrl) {
    console.error("⚠️ Génère la hero image d'abord — elle sert de référence")
    process.exit(1)
  }

  const title = recipe.title || recipe.keyword || "Untitled"
  const tags = (recipe.tags ?? []) as string[]

  // TODO: print pin 1 (hero URL) + pins 2-5 (4 prompts)
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
