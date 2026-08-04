// scripts/realign-keywords.ts
// Koray-style topical map — Phase 1: realign the `keyword` field of recipes
// that were targeted at a collection head-term (GUIDE/IDEAS intent) onto the
// actual dish entity the page contains (RECIPE long-tail intent).
// One-shot script. Run: npx tsx scripts/realign-keywords.ts
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

const REALIGN: Record<number, string> = {
  1: "garlic butter chicken rice bowls for two",
  6: "easy asian beef noodle stir fry for two",
  9: "pan seared steak dinner for two with garlic butter",
  11: "2 quart slow cooker chicken and gravy for two",
  14: "molten chocolate lava cakes for two",
  21: "easy chicken enchiladas for two",
  24: "4 ingredient feta brine chicken breast for two",
  31: "pan seared chicken breast with creamy tomato garlic sauce for two",
  32: "one pan ground beef and tomato rice skillet for two",
  33: "chocolate lava cakes for two",
  38: "sheet pan thanksgiving dinner for two with herb roasted chicken",
  39: "25 minute pan seared chicken with herb butter pan sauce",
  42: "garlic butter chicken bites with blistered tomatoes for two",
  44: "one sheet pan easter dinner for two with herb crusted lamb",
  46: "one pan baked ziti for two",
  47: "30 minute lemon butter chicken pasta for two",
  49: "25 minute one pan garlic herb chicken for two",
  51: "35 minute one skillet chicken and rice for two",
  53: "30 minute one pan lemon garlic chicken for two",
}

async function main() {
  // Import dynamique APRÈS dotenv.config — sinon le Pool de lib/db se construit
  // avec DATABASE_URL vide (les imports ESM statiques sont hoistés avant le code).
  const { db } = await import("../lib/db")
  for (const [id, keyword] of Object.entries(REALIGN)) {
    const [row] = await db
      .update(recipes)
      .set({ keyword })
      .where(eq(recipes.id, Number(id)))
      .returning({ id: recipes.id, slug: recipes.slug, keyword: recipes.keyword })
    if (row) console.log(`✅ #${row.id} ${row.slug} → "${row.keyword}"`)
    else console.warn(`⚠️ #${id} introuvable`)
  }
  console.log("Réalignement terminé.")
}
main().catch((e) => { console.error(e); process.exit(1) })
