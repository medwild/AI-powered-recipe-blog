import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const SLUG = "15-easy-dinner-recipes-for-two"
const PUBLIC_ID = "15-easy-dinner-recipes-for-two"

// Prompt construit selon skills/ideogram-prompt.md (subject-first, Canon EOS R5,
// éclairage directionnel, humidité, palette hex, négatif). Concept "collection
// roundup" : table pour deux avec plusieurs plats small-batch.
const PROMPT =
  "a cozy dinner table set for two, a generous spread of small-batch dishes together: " +
  "one pan of garlic butter chicken pasta with glistening sauce, a small skillet of " +
  "pan-seared steak with a herb butter pool, a little dish of creamy stovetop mac and " +
  "cheese with a golden top, a small lasagna portion with a bubbly cheese crust, and a " +
  "salmon fillet with fresh dill on the side, two place settings with folded linen " +
  "napkins, two glasses of red wine, warm candlelight. Slightly angled 45-degree shot " +
  "over the table, f/2.8, shallow depth of field. warm golden-hour side light with a " +
  "soft overhead glow, 3200K. Moisture and texture: glossy pan sauce catching the " +
  "light, bubbling cheese, steam rising gently from the pasta, juicy seared crust on " +
  "the steak. Canon EOS R5, 35mm, f/2.8, ISO 400. warm walnut #5C4033, cream #F5EFE0, " +
  "golden butter #E8B04B, herb green #4A7C3F. No text, no labels, no logos, no " +
  "watermarks, no hands, no fingers, no human limbs, no silverware visible."

async function main() {
  const { runImage } = await import("@/lib/agents/ideogram")
  const { uploadImage } = await import("@/lib/agents/cloudinary")
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  console.log(`[article-image] Génération Ideogram v4 (2:3) pour ${SLUG}...`)
  const buffer = await runImage(PROMPT)
  console.log(`  image générée: ${buffer.length} octets`)

  const url = await uploadImage(buffer, PUBLIC_ID)
  console.log(`  upload Cloudinary OK: ${url}`)

  const updated = await db.update(recipes)
    .set({ heroImageUrl: url, updatedAt: new Date() })
    .where(eq(recipes.slug, SLUG))
    .returning({ id: recipes.id, slug: recipes.slug, heroImageUrl: recipes.heroImageUrl })
  console.log(`  DB #${updated[0]!.id} → heroImageUrl mis à jour`)
  console.log("\n✅ TERMINÉ")
}

main().catch((e) => { console.error("ERREUR:", e); process.exit(1) })
