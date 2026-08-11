import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

// Régénération des 2 images "Untitled" (pipeline cassé 08/2026) :
// dessert-for-2 et creamy-mashed-potatoes-for-two pointaient vers le MÊME
// fichier générique. Prompts construits avec le template du skill
// skills/ideogram-prompt.md (subject-first, Canon EOS R5, éclairage
// directionnel, humidité, palette hex, négatif).
const TARGETS = [
  {
    slug: "dessert-for-2",
    publicId: "recipes/Lava-Cakes-for-Two-v2",
    prompt:
      "two molten chocolate lava cakes baked in small white ramekins, glossy molten chocolate center spilling out onto the plate, dusted with powdered sugar, a single fresh raspberry on the plate. dark walnut countertop, soft linen napkin. Slightly angled 45-degree shot, f/2.8, shallow depth of field. warm golden-hour backlight glow, side rim light, 3000K. Moisture and texture: glossy molten center catching the light, sugar dusting, silky ganache drip. Canon EOS R5, 85mm, f/2.8, ISO 400. deep chocolate #4B3621, caramel gold #C49A2C, warm cream #F5EFE0. No text, no labels, no logos, no watermarks, no hands, no fingers, no human limbs, no silverware visible.",
  },
  {
    slug: "creamy-mashed-potatoes-for-two",
    publicId: "recipes/Mashed-Potatoes-for-Two-v2",
    prompt:
      "creamy mashed potatoes in a rustic ceramic bowl, a pat of melting butter on top glistening, fresh chives sprinkled, wooden farmhouse table with linen napkin. Slightly angled 45-degree shot, f/2.8, shallow depth of field. warm ambient kitchen light, soft fill, 3000K. Moisture and texture: silky smooth potatoes, glossy melting butter, subtle steam. Canon EOS R5, 85mm, f/2.8, ISO 400. warm cream #F5EFE0, golden butter #E8B04B, herb green #4A7C3F. No text, no labels, no logos, no watermarks, no hands, no fingers, no human limbs, no silverware visible.",
  },
]

async function main() {
  // Imports dynamiques APRÈS dotenv.config : les modules lisent process.env au
  // load (ideogram.ts capture API_KEY, lib/db crée le Pool). Un import statique
  // (hoisté au-dessus de dotenv.config) lirait les variables avant chargement.
  const { runImage } = await import("@/lib/agents/ideogram")
  const { uploadImage } = await import("@/lib/agents/cloudinary")
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  for (const t of TARGETS) {
    console.log(`\n[génération] ${t.slug} — Ideogram v4...`)
    const buffer = await runImage(t.prompt)
    console.log(`  image générée: ${buffer.length} octets`)
    const url = await uploadImage(buffer, t.publicId)
    console.log(`  upload Cloudinary OK: ${url}`)
    await db.update(recipes).set({ heroImageUrl: url }).where(eq(recipes.slug, t.slug))
    console.log(`  DB mise à jour: ${t.slug} → heroImageUrl`)
  }
  console.log("\n✅ TERMINÉ — 2 images régénérées")
}
main().catch((e) => { console.error("ERREUR:", e); process.exit(1) })
