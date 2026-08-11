import dotenv from "dotenv"
import path from "path"
import fs from "node:fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

interface Replace { find: string; replace: string }

// Réécritures : retirer toute référence au process d'écriture (SERP/competitors/top results)
// en gardant le propos éditorial et les faits. Vue chef, pas vue SEO.
const FIXES: Record<string, Replace[]> = {
  "chicken-dinner-for-two": [{
    find: "### SERP Analysis & Our Angle\n\nThe top recipes for “chicken dinner for two” either lean on slow cookers or call for a dozen ingredients you won’t have on Wednesday night. None really explain why chicken breasts turn out stringy—overcrowding and direct high heat without a buffer. Our angle: a quick sear, then a gentle finish in a garlic-tomato butter sauce that acts as a steam tent, locking in juiciness without overcooking. No brining, no pounding, no oven—just one skillet and 25 minutes.",
    replace: "Most “chicken dinner for two” recipes either lean on slow cookers or call for a dozen ingredients you won’t have on Wednesday night. None really explain why chicken breasts turn out stringy—overcrowding and direct high heat without a buffer. My approach: a quick sear, then a gentle finish in a garlic-tomato butter sauce that acts as a steam tent, locking in juiciness without overcooking. No brining, no pounding, no oven—just one skillet and 25 minutes.",
  }],
  "crockpot-chicken-tomato-rice-for-two": [{
    find: "This one solves the problem the SERP keeps dancing around:",
    replace: "This one solves the problem most “crockpot for two” recipes dance around:",
  }],
  "dessert-for-2": [{
    find: "Scan the top 10 SERP results for “dessert for 2 lava cakes” and you'll notice an odd pattern: almost none of them mention the food-safety reality of a molten center.",
    replace: "Most lava-cake recipes share an odd pattern: almost none of them mention the food-safety reality of a molten center.",
  }],
  "easy-chili-colorado-recipe": [
    {
      find: "Every competitor on the first page of results does one of two things:",
      replace: "Most chili colorado recipes do one of two things:",
    },
    {
      find: "Nobody in the top ten offers that, and it's exactly what a weeknight dinner for two needs.",
      replace: "That's exactly what a weeknight dinner for two needs.",
    },
  ],
  "easy-lasagna-recipe": [
    {
      find: "The angle nobody in the top results covers: they all scale down the *ingredients*",
      replace: "The problem with most small-batch lasagna recipes: they all scale down the *ingredients*",
    },
    {
      find: "The competitors either give you a 30-minute shortcut that skips the browning (and tastes like it) or a full Sunday project.",
      replace: "You either get a 30-minute shortcut that skips the browning (and tastes like it) or a full Sunday project.",
    },
  ],
  "easy-meal-recipes-for-2": [
    {
      find: "Scan the top ten search results for one-skillet chicken and rice and you’ll spot the same problem: too much liquid.",
      replace: "The recurring problem with one-skillet chicken and rice recipes: too much liquid.",
    },
    {
      find: "Every other recipe I found online hikes that to 2 cups, guaranteeing wet rice and a pan that won’t be clean in thirty-five minutes.",
      replace: "Most recipes hike that to 2 cups, guaranteeing wet rice and a pan that won’t be clean in thirty-five minutes.",
    },
  ],
  "one-pan-chicken-tomato-garlic-rice": [{
    find: "Every SERP result for this search hands you a list of thirty recipes and a scroll wheel — nobody actually shows you how to cook *one* thing properly from sear to plate. So that's the angle: not a list, but a complete one-pan method you can repeat by memory within a week.",
    replace: "Most “dinner for two” roundups hand you a list of thirty recipes and a scroll wheel — nobody actually shows you how to cook *one* thing properly from sear to plate. So here's a complete one-pan method you can repeat by memory within a week.",
  }],
  "one-pan-chicken-tomato-rice": [{
    find: "(the SERP is full of those)",
    replace: "(you've seen a hundred variations of those)",
  }],
  "slow-cooker-chicken-rice-for-two": [
    {
      find: "Every competitor on the first page of Google treats \"for two\" as code for \"cook the same big batch and eat it twice.\"",
      replace: "Most “slow cooker for two” recipes treat \"for two\" as code for \"cook the same big batch and eat it twice.\"",
    },
    {
      find: "and the one thing those top results miss — *when* to add the rice so it stays fluffy instead of dissolving — is the whole game.",
      replace: "and the one thing most recipes miss — *when* to add the rice so it stays fluffy instead of dissolving — is the whole game.",
    },
  ],
  "chicken-pot-pie-for-2": [{
    find: "Nearly every result on the first page bakes the pastry directly on top of raw or barely-warm filling,",
    replace: "Nearly every pot pie recipe bakes the pastry directly on top of raw or barely-warm filling,",
  }],
  "chocolate-chip-cookies-for-2": [{
    find: "Here's the angle the top recipes miss: every result on the first page melts the butter or creams it cold, then bakes immediately. Not one of them browns the butter and chills the dough. That's the gap.",
    replace: "Here's the angle most cookie recipes miss: nearly all of them melt the butter or cream it cold, then bake immediately. Almost none brown the butter and chill the dough. That's the gap.",
  }],
  "easy-4-ingredient-chicken-breast-recipes": [{
    find: "Every 4-ingredient chicken recipe on the first page of Google leans on flour, cheese, or a bottle of dressing",
    replace: "Most 4-ingredient chicken recipes lean on flour, cheese, or a bottle of dressing",
  }],
  "easy-beef-ramen-noodle-recipes": [{
    find: "The competitors leaning on hoisin mask this with sweetness, but the texture is still off.",
    replace: "The hoisin-heavy versions mask this with sweetness, but the texture is still off.",
  }],
  "easy-chicken-rice-bowls-for-two": [{
    find: "(My angle here, after scrolling the top results: everyone offers cold make-ahead lunches, but nobody gives you one genuinely *hot* bowl you can cook fresh in one skillet in twenty minutes.)",
    replace: "(My angle: everyone offers cold make-ahead lunches, but nobody gives you one genuinely *hot* bowl you can cook fresh in one skillet in twenty minutes.)",
  }],
  "mac-and-cheese-for-2": [{
    find: "Here's my angle, and it's the one thing the top results miss: every recipe I found either bakes the dish (drying out a portion this small) or leans on a giant pot of pasta water and guesswork.",
    replace: "Here's my angle, and it's the one thing most recipes miss: either they bake the dish (drying out a portion this small) or they lean on a giant pot of pasta water and guesswork.",
  }],
  "mediterranean-chicken-orzo-with-feta-olives-for-two": [{
    find: "If you browse the first page of search results, you’ll notice two patterns: nearly every recipe defaults to chicken thighs, and many call for cooking the orzo separately—more pots, more time.",
    replace: "You’ll notice two patterns in most chicken orzo recipes: nearly every one defaults to chicken thighs, and many call for cooking the orzo separately—more pots, more time.",
  }],
  "one-pan-chicken-rice-dinner-for-two": [{
    find: "The angle the top results miss: almost every \"chicken and rice for two\" recipe cooks the chicken and rice separately, then combines them.",
    replace: "The angle most recipes miss: almost every \"chicken and rice for two\" recipe cooks the chicken and rice separately, then combines them.",
  }],
  "one-pan-chicken-rice-for-two": [{
    find: "Here's my angle, and it's the thing the top results miss: every \"dinner for two\" roundup gives you a *list* of recipes,",
    replace: "Here's my angle: every \"dinner for two\" roundup gives you a *list* of recipes,",
  }],
  "one-pan-garlic-tomato-chicken-rice": [{
    find: "Here's the angle none of the top results bother with: they treat \"one-pan\" as a convenience,",
    replace: "Here's the angle most one-pan recipes miss: they treat \"one-pan\" as a convenience,",
  }],
  "summer-herb-chicken-orzo-with-zucchini-for-two": [{
    find: "Scan the first page of results and you’ll see a theme: lemon, cream, mozzarella, repeat.",
    replace: "Most summer chicken orzo recipes follow a theme: lemon, cream, mozzarella, repeat.",
  }],
  "white-wine-lemon-chicken-orzo-for-two": [{
    find: "Scroll through the top results for lemon [chicken orzo](/recipes/creamy-parmesan-garlic-chicken-orzo-for-two) for two, and you'll notice a pattern: many of them treat the white wine as optional or skip it altogether,",
    replace: "You'll notice a pattern in many lemon chicken orzo recipes: they treat the white wine as optional or skip it altogether,",
  }],
}

async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")

  const slugs = Object.keys(FIXES)
  const rows = (await db.execute(sql`SELECT slug, content_markdown FROM recipes`)).rows as Array<{ slug: string; content_markdown: string }>
  const bySlug = new Map(rows.map(r => [r.slug, r.content_markdown]))

  // Backup complet AVANT modification
  const backup: Record<string, string> = {}
  for (const s of slugs) {
    const md = bySlug.get(s)
    if (md === undefined) { console.error(`✗ ${s}: introuvable en DB`); continue }
    backup[s] = md
  }
  const backupPath = path.resolve(process.cwd(), "repports", `backup-serp-content-2026-08-11.json`)
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`Backup → ${backupPath} (${Object.keys(backup).length} recettes)`)

  const failures: string[] = []
  let updated = 0
  for (const [slug, md] of Object.entries(backup)) {
    let cur = md
    for (const { find, replace } of FIXES[slug]) {
      const n = cur.split(find).length - 1
      if (n !== 1) { failures.push(`${slug}: "${find.slice(0, 60)}…" trouvé ${n}× (attendu 1)`); continue }
      cur = cur.split(find).join(replace)
    }
    if (cur !== md) {
      await db.execute(sql`UPDATE recipes SET content_markdown = ${cur} WHERE slug = ${slug}`)
      updated++
    }
  }
  console.log(`Mises à jour : ${updated}/${Object.keys(backup).length} recettes`)
  if (failures.length) { console.error("ÉCHECS:\n" + failures.join("\n")); process.exit(1) }
  console.log("OK — tous les remplacements appliqués exactement 1×")
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
