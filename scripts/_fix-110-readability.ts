// One-shot: recipe #110 — readability retrofit (17/08, 2nd external report, user-delegated):
// (A) split the 6 dense paragraphs (>90 words) at sentence boundaries — ZERO word changes
// (B) bold on 4 key numbers (1 per technical section)
// No content rewrite: word count must be invariant. Intro (98 words) kept — its rhythm was praised.
// Backup: repports/backup-recipe-110-readability-2026-08-17.json
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

// [oldParagraph, newParagraph] — old must match exactly once in contentMarkdown
const REWRITES: Array<[string, string]> = [
  // P#5 thermal mass (110 mots → 3)
  [
    "Why do steakhouses produce such consistent crusts? It comes down to thermal mass. Commercial griddles are thick slabs of steel that do not drop in temperature when cold food is placed on them. Home skillets, especially thin non-stick or cheap aluminum, lose their stored heat immediately. I've tested this with both stainless steel and cast iron. Cast iron wins because it holds 4× more heat, meaning the pan temperature won't crash when cold meat hits it. Stainless steel is fantastic for building a fond to make a pan sauce, but for a dry-rubbed steak where you want a pure, dry sear, the sheer weight of a cast-iron skillet is non-negotiable.",
    "Why do steakhouses produce such consistent crusts? It comes down to thermal mass.\n\nCommercial griddles are thick slabs of steel that do not drop in temperature when cold food is placed on them. Home skillets, especially thin non-stick or cheap aluminum, lose their stored heat immediately.\n\nI've tested this with both stainless steel and cast iron. Cast iron wins because it holds **4× more heat**, meaning the pan temperature won't crash when cold meat hits it. Stainless steel is fantastic for building a fond to make a pan sauce, but for a dry-rubbed steak where you want a pure, dry sear, the sheer weight of a cast-iron skillet is non-negotiable.",
  ],
  // P#6 Maillard (130 mots → 3)
  [
    "Before the meat ever touches the pan, it must be bone-dry. Moisture on the surface of the steak is the enemy of the Maillard reaction—the complex chemical process where amino acids and reducing sugars transform into the deeply browned, savory crust we associate with a great steak. Water evaporates at 212°F (100°C), while the Maillard reaction requires temperatures well above 285°F (140°C). If your steak is wet, the heat energy is spent boiling the water rather than browning the meat. In my kitchen, leaving a steak uncovered in the fridge for 24 hours dries the surface enough to sear violently — you can feel the difference the moment the meat hits the pan. If you don't have 24 hours, pressing the meat aggressively with heavy paper towels is absolutely mandatory.",
    "Before the meat ever touches the pan, it must be bone-dry. Moisture on the surface of the steak is the enemy of the Maillard reaction—the complex chemical process where amino acids and reducing sugars transform into the deeply browned, savory crust we associate with a great steak.\n\nWater evaporates at 212°F (100°C), while the Maillard reaction requires temperatures well above **285°F (140°C)**. If your steak is wet, the heat energy is spent boiling the water rather than browning the meat.\n\nIn my kitchen, leaving a steak uncovered in the fridge for 24 hours dries the surface enough to sear violently — you can feel the difference the moment the meat hits the pan. If you don't have 24 hours, pressing the meat aggressively with heavy paper towels is absolutely mandatory.",
  ],
  // P#12 sel (156 mots → 3)
  [
    "The foundation is salt. I always advise measuring salt by weight — the ingredient list calls for 6 grams per 2 teaspoons, which works out to about 9 grams a tablespoon — whereas fine table salt is roughly twice as heavy, which destroys a dry rub if substituted blindly. Using Diamond Crystal allows you to coat the steak generously without over-salting the interior. To this salt base, we add coarse black pepper for bite, garlic powder and onion powder for a deeply savory undertone, and a touch of smoked paprika. The paprika doesn't add much heat, but it dramatically enhances the color of the crust, giving the steak that signature mahogany hue. The danger here is the garlic powder. Dehydrated garlic burns quickly, turning acrid and bitter. To protect the spices, we rely on a generous coating of neutral oil in the pan, which acts as a buffer and toasts the spices rather than incinerating them.",
    "The foundation is salt. I always advise measuring salt by weight — the ingredient list calls for 6 grams per 2 teaspoons, which works out to **about 9 grams** a tablespoon — whereas fine table salt is roughly twice as heavy, which destroys a dry rub if substituted blindly. Using Diamond Crystal allows you to coat the steak generously without over-salting the interior.\n\nTo this salt base, we add coarse black pepper for bite, garlic powder and onion powder for a deeply savory undertone, and a touch of smoked paprika. The paprika doesn't add much heat, but it dramatically enhances the color of the crust, giving the steak that signature mahogany hue.\n\nThe danger here is the garlic powder. Dehydrated garlic burns quickly, turning acrid and bitter. To protect the spices, we rely on a generous coating of neutral oil in the pan, which acts as a buffer and toasts the spices rather than incinerating them.",
  ],
  // P#15 beurre (119 mots → 2)
  [
    "I learned the hard way that whipping cold honey into softened butter instantly drops the temperature; the butterfats seize at around 60°F (15°C), leaving a grainy mess instead of a smooth emulsion. The key is strict temperature equilibrium. The butter must be softened exactly to room temperature—around 68°F (20°C). At this stage, it will yield to a whisk without melting into a puddle. The honey should also be resting at room temperature. A pinch of kosher salt and a dusting of ground cinnamon complete the mixture. By vigorously whipping air into the butter, you create a microscopic network of fat crystals that suspend the honey and cinnamon, lightening the texture and making it perfectly spreadable over warm yeast rolls.",
    "I learned the hard way that whipping cold honey into softened butter instantly drops the temperature; the butterfats seize at **around 60°F (15°C)**, leaving a grainy mess instead of a smooth emulsion.\n\nThe key is strict temperature equilibrium. The butter must be softened exactly to room temperature—around 68°F (20°C). At this stage, it will yield to a whisk without melting into a puddle. The honey should also be resting at room temperature. A pinch of kosher salt and a dusting of ground cinnamon complete the mixture. By vigorously whipping air into the butter, you create a microscopic network of fat crystals that suspend the honey and cinnamon, lightening the texture and making it perfectly spreadable over warm yeast rolls.",
  ],
  // P#17 équipement (107 mots → 2)
  [
    "Beyond the cast-iron skillet, recreating a roadhouse dinner requires a few basic tools. An instant-read digital thermometer is non-negotiable. Cooking by feel or timing alone is a gamble, especially when steak thicknesses vary wildly from the butcher counter. A heavy set of stainless steel tongs allows you to manipulate the meat without piercing the exterior and losing juices. Finally, a thick wooden cutting board is essential. Resting a hot steak on a cold ceramic plate will draw heat away from the meat too quickly, and slicing on ceramic will instantly dull your chef's knife. Wood retains ambient temperature and provides a forgiving surface for the final carve.",
    "Beyond the cast-iron skillet, recreating a roadhouse dinner requires a few basic tools. An instant-read digital thermometer is non-negotiable. Cooking by feel or timing alone is a gamble, especially when steak thicknesses vary wildly from the butcher counter.\n\nA heavy set of stainless steel tongs allows you to manipulate the meat without piercing the exterior and losing juices. Finally, a thick wooden cutting board is essential. Resting a hot steak on a cold ceramic plate will draw heat away from the meat too quickly, and slicing on ceramic will instantly dull your chef's knife. Wood retains ambient temperature and provides a forgiving surface for the final carve.",
  ],
  // P#20 substitutions (91 mots → 2)
  [
    "Not everyone has access to thick-cut top sirloin on a Tuesday evening. If you cannot find a sirloin, a New York strip is your next best option. The strip has a dense fat cap running along one edge that requires rendering. To compensate, hold the steak vertically with tongs and sear the fat cap against the hot iron for two minutes before laying the steak flat. It changes the initial cooking dynamic slightly, putting more liquid fat in the pan, but it will work beautifully, yielding a slightly richer final bite.",
    "Not everyone has access to thick-cut top sirloin on a Tuesday evening. If you cannot find a sirloin, a New York strip is your next best option.\n\nThe strip has a dense fat cap running along one edge that requires rendering. To compensate, hold the steak vertically with tongs and sear the fat cap against the hot iron for two minutes before laying the steak flat. It changes the initial cooking dynamic slightly, putting more liquid fat in the pan, but it will work beautifully, yielding a slightly richer final bite.",
  ],
]

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.recipes.findFirst({ where: eq(recipes.id, 110), columns: { contentMarkdown: true } })
  if (!row) { console.error("❌ Recipe #110 not found"); process.exit(1) }
  const md = row.contentMarkdown ?? ""
  const wordsBefore = md.split(/\s+/).filter(Boolean).length

  // Exact-once assertions
  let current = md
  for (const [oldP, newP] of REWRITES) {
    const c = current.split(oldP).length - 1
    if (c !== 1) { console.error(`❌ ABORT: paragraphe matché ${c}×: "${oldP.slice(0, 60)}…"`); process.exit(1) }
    current = current.replace(oldP, newP)
    console.log(`✅ split: "${oldP.slice(0, 50)}…" (${oldP.split(/\s+/).length} mots)`)
  }

  // Invariance + checks
  const wordsAfter = current.split(/\s+/).filter(Boolean).length
  if (wordsAfter !== wordsBefore) { console.error(`❌ word count changé: ${wordsBefore} → ${wordsAfter}`); process.exit(1) }
  const parasAfter = current.split(/\n\s*\n/).filter((p) => !p.startsWith("#") && !p.startsWith("[IMAGE") && !p.startsWith("<img") && p.trim().length > 0)
  const denseAfter = parasAfter.filter((p) => p.split(/\s+/).filter(Boolean).length > 90).length
  console.log(`🔍 mots: ${wordsBefore} → ${wordsAfter} (invariant ✓) | paragraphes >90: ${denseAfter} (attendu 1 — l'intro)`)
  const boldCount = (current.match(/\*\*/g) || []).length / 2
  console.log(`🔍 gras: ${boldCount} (attendu 4)`)
  if (current.includes("[IMAGE:")) { console.error("❌ marqueur [IMAGE:]"); process.exit(1) }

  // Backup
  fs.mkdirSync("repports", { recursive: true })
  fs.writeFileSync("repports/backup-recipe-110-readability-2026-08-17.json", JSON.stringify({
    id: 110, slug: "texas-roadhouse-dinner-for-two", date: "2026-08-17",
    contentMarkdownBefore: md,
  }, null, 2))
  console.log("💾 backup: repports/backup-recipe-110-readability-2026-08-17.json")

  await db.update(recipes).set({ contentMarkdown: current, updatedAt: new Date() }).where(eq(recipes.id, 110))
  console.log("✅ DB update — 6 paragraphes splittés, 4 gras, contenu inchangé")
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
