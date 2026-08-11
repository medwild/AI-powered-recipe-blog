import dotenv from "dotenv"
import path from "path"
import fs from "node:fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

// =============================================================================
// Correctif complet du contenu incohérent (11/08) :
//  1. 50+ phrases keyword-stuffées (ancres de l'ancien linker)
//  2. 8 lignes d'ingrédients cassées ("z each" → quantité reconstruite via JSONB)
//  3. Placeholder "[Video/Image placeholder]" + process-speak restant
//  4. Liens /recipes/{catégorie} → /guides/{catégorie} (308 évités)
//  5. JSONB ingredients corrompus (parse "g arlic", fractions "1½ cups")
// Backup complet AVANT toute modification.
// =============================================================================

const CONTENT_FIXES: Record<string, Array<{ find: string; replace: string }>> = {
  "romantic-dinner-for-two-at-home": [{
    find: "dissolves easy healthy dinner recipes for twoly and seasons evenly",
    replace: "dissolves easily and seasons evenly",
  }],
  "chicken-dinner-for-two": [
    { find: "**[Video/Image placeholder]**\n\n", replace: "" },
    {
      find: "**25-Minute One-Pan Garlic Herb [easy chicken dinners for two](/recipes/easy-chicken-dinners-for-two) for two**",
      replace: "**25-Minute One-Pan Garlic Herb Chicken for Two**",
    },
    {
      find: "you can't just slap a healthy dinner ideas romantic dinner ideas for two for two into a hot pan",
      replace: "you can't just slap a chicken breast into a hot pan",
    },
    { find: "z each), patted dry", replace: "(6–8 oz each), patted dry" },
  ],
  "easy-chicken-rice-bowls-for-two": [
    {
      find: "This [steak dinner ideas for 2](/recipes/steak-dinner-ideas-for-2) easy healthy dinner recipes for two rice bowl is that answer",
      replace: "This rice bowl is that answer",
    },
    {
      find: "**healthy dinner ideas for two** is the lean, fast-cooking protein — but if you only have [easy week of meals](/recipes/easy-week-of-meals), brown 8 oz (225g)",
      replace: "**Chicken breast** is the lean, fast-cooking protein — but if you're using thighs, brown 8 oz (225g)",
    },
    {
      find: "Toss in cooked pasta and you've got a steak dinner ideas for 2 for 2 pasta bowl instead.",
      replace: "Toss in cooked pasta and you've got a pasta bowl instead.",
    },
  ],
  "mac-and-cheese-for-2": [
    {
      find: "This is a easy chicken dinners for two](/recipes/easy-chicken-dinners-for-two) engineered",
      replace: "This is a mac and cheese engineered",
    },
    {
      find: "Reserving a half cup of starchy romantic dinner ideas for two](/recipes/summer-herb-chicken-orzo-with-zucchini-for-two) water",
      replace: "Reserving a half cup of starchy pasta water",
    },
    {
      find: "sear 6 ounces of diced healthy dinner ideas for two to an internal 165°F",
      replace: "sear 6 ounces of diced chicken to an internal 165°F",
    },
  ],
  "easy-mexican-dinner-recipes": [{
    find: "Searing the easy healthy dinner recipes romantic dinner ideas [for two](/recipes/easy-lasagna-recipe) for two matters just as much.",
    replace: "Searing the chicken matters just as much.",
  }],
  "easy-to-make-asian-food-recipes": [
    {
      find: "Most romantic dinner ideas for two](/recipes/summer-herb-chicken-orzo-with-zucchini-for-two) Asian recipes online rush you",
      replace: "Most Asian recipes rush you",
    },
    { find: "Everything scales cleanly romantic dinner ideas for two.", replace: "Everything scales cleanly for two." },
  ],
  "edible-cookie-dough-recipe-for-2": [
    {
      find: "I've designed this one to make exactly enough romantic dinner ideas for two for two generous ramekins",
      replace: "I've designed this one to make exactly enough for two generous ramekins",
    },
    {
      find: "evenly in such a mac and cheese for 2 for 2 for 2 for 2](/recipes/mac-and-cheese-for-2). Regular chips",
      replace: "evenly in such a small batch. Regular chips",
    },
  ],
  "chocolate-lava-cakes-for-two": [
    { find: "romantic dinner ideas for two for two lava cakes, 4 ounces of chocolate", replace: "For two lava cakes, 4 ounces of chocolate" },
    { find: "or a easy healthy dinner recipes for two chocolate ganache poured over ice cream", replace: "or a chocolate ganache poured over ice cream" },
    {
      find: "the one detail almost every chocolate chip cookies for 2 for 2 for 2 for 2](/recipes/chocolate-chip-cookies-for-2) version gets wrong",
      replace: "the one detail almost every lava cake version gets wrong",
    },
  ],
  "easy-chicken-dinners-for-two": [
    { find: "Scrolling past the walls of “20 easy chicken dinners” tells you one thing: volume over precision.", replace: "Most “20 easy chicken dinners” roundups tell you one thing: volume over precision." },
    {
      find: "*A hot pan and dry easy 4 ingredient [thanksgiving dinner for two](/recipes/thanksgiving-dinner-for-two) for two are the difference",
      replace: "*A hot pan and dry chicken are the difference",
    },
    { find: "z / 225g each)", replace: "(8 oz / 225g each)" },
  ],
  "easy-4-ingredient-chicken-breast-recipes": [
    {
      find: "The garlic matters more than it looks — screamy mashed potatoes [for two](/recipes/creamy-parmesan-garlic-chicken-orzo-for-two) romantic dinner ideas for two cloves release more allicin",
      replace: "The garlic matters more than it looks — smashed cloves release more allicin",
    },
    { find: "I keep a small jar in the fridge specifically for [easy meal recipes for 2](/recipes/easy-meal-recipes-for-2) pork", replace: "I keep a small jar in the fridge specifically for pork" },
    { find: "z (340g) total, pounded to even thickness", replace: "about 12 oz (340g) total, pounded to even thickness" },
  ],
  "chicken-pot-pie-for-2": [
    { find: "This is a healthy dinner ideas for two scaled down with intent.", replace: "This is a chicken pot pie scaled down with intent." },
    {
      find: "skinless easy [easy 4 ingredient chicken breast recipes](/recipes/easy-4-ingredient-chicken-breast-recipes) [healthy dinner ideas for two recipes](/recipes/easy-4-ingredient-chicken-breast-recipes) (about 8 oz / 227g)",
      replace: "skinless chicken breast (about 8 oz / 227g)",
    },
    { find: "Fold in the [easy meal recipes for 2](/recipes/easy-meal-recipes-for-2) 1/2 cups frozen mixed vegetables", replace: "Fold in the 1/2 cup frozen mixed vegetables" },
    { find: "a handful of dinner for two recipes healthy-sautéed green beans", replace: "a handful of quick-sautéed green beans" },
  ],
  "easter-dinner-for-two": [
    { find: "and the healthy dinner ideas for two gain a better roast", replace: "and the vegetables gain a better roast" },
    { find: "give the vegetables a easy healthy dinner recipes for two toss in the pan juices", replace: "give the vegetables a quick toss in the pan juices" },
  ],
  "2-qt-slow-cooker-recipes": [{
    find: "I built this [easy meal recipes for 2](/recipes/easy-meal-recipes-for-2) gravy from the pot size backward: two healthy dinner ideas for twos, just enough liquid",
    replace: "I built this gravy from the pot size backward: two chicken breasts, just enough liquid",
  }],
  "lemon-butter-chicken-pasta-for-two": [{
    find: "I’ve learned that the easy healthy dinner recipes for two shape matters more than you’d think.",
    replace: "I’ve learned that the pasta shape matters more than you’d think.",
  }],
  "creamy-parmesan-garlic-chicken-orzo-for-two": [{
    find: "Too many [easy chicken dinners for two](/recipes/easy-chicken-dinners-for-two)-orzo recipes treat that sear",
    replace: "Too many chicken orzo recipes treat that sear",
  }],
  "summer-herb-chicken-orzo-with-zucchini-for-two": [
    { find: "Most [easy chicken dinner](/recipes/easy-chicken-dinners-for-two)s for two and orzo recipes lean on lemon", replace: "Most chicken orzo recipes lean on lemon" },
    { find: "shocks the healthy dinner ideas [for two](/recipes/creamy-parmesan-garlic-chicken-orzo-for-two) slows the cooking process", replace: "shocks the orzo and slows the cooking process" },
  ],
  "easy-and-healthy-dinner-recipes-for-two": [
    { find: "weeknight easy meal recipes for 2 for 2 for 2](/recipes/chicken-dinner-for-two) taste like", replace: "weeknight chicken dinner taste like" },
    { find: "it wilts into just the right amount of greens romantic dinner ideas for two for two.", replace: "it wilts into just the right amount of greens for two." },
    { find: "If you're serving over easy healthy dinner recipes [for two](/recipes/creamy-parmesan-garlic-chicken-orzo-for-two), reserve", replace: "If you're serving this over pasta, reserve" },
  ],
  "easy-week-of-meals": [
    { find: "swap ground turkey or easy healthy dinner recipes romantic dinner ideas for two for two, but those lack", replace: "swap ground turkey or beef, but those lack" },
    { find: "won for [easy lunch recipes](/recipes/easy-chicken-rice-bowls-for-two) simplicity", replace: "won for its simplicity" },
    { find: "z / 170g), diced small", replace: "(6 oz / 170g), diced small" },
  ],
  "creamy-mashed-potatoes-for-two": [{
    find: "makes a Tuesday healthy dinner ideas for two feel like a date-night affair",
    replace: "makes a Tuesday dinner feel like a date-night affair",
  }],
  "easy-meal-recipes-for-2": [
    { find: "washing two pans and a lid for a healthy dinner ideas for two that served only two", replace: "washing two pans and a lid for a dinner that served only two" },
    { find: "Most [easy chicken dinners for two](/recipes/easy-chicken-dinners-for-two)-and-rice recipes end up with", replace: "Most chicken and rice recipes end up with" },
    { find: "z / 227 g each)", replace: "(8 oz / 227 g each)" },
  ],
  "quick-recipes-for-two-for-dinner": [
    { find: "a properly seared healthy dinner ideas [romantic dinner](/recipes/romantic-dinner-ideas-for-two) ideas for two for two, finished with cold butter", replace: "a properly seared chicken breast, finished with cold butter" },
    { find: "z / 170–225 g each), patted very dry", replace: "(6–8 oz / 170–225 g each), patted very dry" },
  ],
  "thanksgiving-dinner-for-two": [
    { find: "will make a whole turkey feel reasonable romantic dinner ideas for two for two people", replace: "will make a whole turkey feel reasonable for two people" },
    { find: "built around two herb-roasted healthy dinner ideas for twos", replace: "built around two herb-roasted chicken breasts" },
    {
      find: "pat the easy [easy 4 ingredient chicken breast recipes](/recipes/easy-4-ingredient-chicken-breast-recipes) [healthy dinner ideas for two recipes](/recipes/easy-4-ingredient-chicken-breast-recipes)s thoroughly dry",
      replace: "pat the chicken breasts thoroughly dry",
    },
    { find: "I've tested this exact sequence on easy mexican dinner recipes two recipes healthys, and", replace: "I've tested this exact sequence on chicken breasts, and" },
    { find: "z each)", replace: "(7–8 oz each)" },
  ],
  "whole30-chicken-skillet-tomatoes-garlic": [{
    find: "The angle here is simple. The top-ranking Whole30 roundups promise “30 minutes” but skip",
    replace: "Most Whole30 recipes promise “30 minutes” but skip",
  }],
  "one-pan-chicken-tomato-garlic-rice": [{
    find: "The best [dinner for](/recipes/easy-mexican-dinner-recipes) two is the one that leaves you with a single pan in the sink.",
    replace: "The best dinner for two is the one that leaves you with a single pan in the sink.",
  }],
  "one-pan-garlic-butter-chicken-tomato-orzo": [{
    find: "The best easy [dinner for](/recipes/easy-mexican-dinner-recipes) two is the one where the pasta cooks",
    replace: "The best easy dinner for two is the one where the pasta cooks",
  }],
  "one-pan-chicken-tomato-rice": [{
    find: "Most easy [dinners for two](/recipes/healthy-dinner-ideas-for-two) die the moment",
    replace: "Most easy dinners for two die the moment",
  }],
  "cooking-for-two": [{ find: "z / 170g each)", replace: "(6 oz / 170g each)" }],
  "garlic-shrimp-orzo-with-cherry-tomatoes-for-two": [{
    find: "they sauté aromatics, add healthy dinner ideas romantic dinner ideas for two liquid, then toss raw shrimp",
    replace: "they sauté aromatics, add liquid, then toss raw shrimp",
  }],
}

// Liens catégories : /recipes/{cat} → /guides/{cat} (cibles qui 308 vers les hubs)
const CATEGORY_LINK_SWAPS = [
  "romantic-dinner-ideas-for-two",
  "easy-recipes-for-two",
  "dinner-recipe-ideas-for-two",
  "recipes-for-two",
  "easy-dinner-ideas-for-two",
  "healthy-dinner-ideas-for-two",
  "easy-meal-ideas-for-two",
]

async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")

  const rows = (await db.execute(sql`SELECT slug, content_markdown, ingredients FROM recipes WHERE content_type='recipe' AND status='published'`)).rows as Array<{ slug: string; content_markdown: string; ingredients: unknown }>
  const bySlug = new Map(rows.map(r => [r.slug, r]))

  // ---------- BACKUP COMPLET ----------
  const backupPath = path.resolve(process.cwd(), "repports", "backup-content-fix-2026-08-11.json")
  const backup: Record<string, { content_markdown: string; ingredients: unknown }> = {}
  for (const row of rows) backup[row.slug] = { content_markdown: row.content_markdown, ingredients: row.ingredients }
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`Backup → ${backupPath} (${Object.keys(backup).length} recettes)`)

  // ---------- 1. PHRASES ----------
  const failures: string[] = []
  let contentUpdated = 0
  for (const [slug, fixes] of Object.entries(CONTENT_FIXES)) {
    const row = bySlug.get(slug)
    if (!row) { failures.push(`${slug}: introuvable`); continue }
    let cur = row.content_markdown
    for (const { find, replace } of fixes) {
      const n = cur.split(find).length - 1
      if (n !== 1) { failures.push(`${slug}: "${find.slice(0, 55)}…" trouvé ${n}× (attendu 1)`); continue }
      cur = cur.split(find).join(replace)
    }
    // Swaps de liens catégorie (globaux)
    for (const cat of CATEGORY_LINK_SWAPS) {
      cur = cur.split(`](/recipes/${cat})`).join(`](/guides/${cat})`)
    }
    if (cur !== row.content_markdown) {
      await db.execute(sql`UPDATE recipes SET content_markdown = ${cur} WHERE slug = ${slug}`)
      contentUpdated++
    }
  }
  console.log(`Contenu corrigé : ${contentUpdated} recettes`)

  // ---------- 2. JSONB INGREDIENTS ----------
  let jsonbFixed = 0
  for (const row of rows) {
    const ings = (row.ingredients ?? []) as Array<{ name: string; quantity: string }>
    let changed = false
    const next = ings.map(ing => {
      const name = (ing.name ?? "").trim()
      const q = (ing.quantity ?? "").trim()
      // "g arlic" → "garlic" (parse "g" comme unité de gramme)
      if (/^arlic/.test(name) && /^\d+\s*g$/.test(q)) {
        changed = true
        return { quantity: q.replace(/\s*g$/, ""), name: "g" + name }
      }
      // "1" + "½ cups (200g) X, Y" → "1½ cups (200g)" + "X, Y"
      if (q === "1" && /^[¼½¾⅓⅔⅛⅜⅝⅞]/.test(name)) {
        const m = name.match(/^([¼½¾⅓⅔⅛⅜⅝⅞]+)\s+((?:cups?|teaspoons?|tablespoons?|ounces?|ozs?|pounds?|lbs?|grams?|gs?|mls?|liters?|pieces?|slices?|cloves?|pinches?|dashes?|bags?|cans?|jars?|bunches?)\b(?:\([^)]*\))?)\s*,?\s*(.*)$/i)
        if (m) {
          changed = true
          return { quantity: "1" + m[1] + " " + m[2], name: m[3] }
        }
      }
      return ing
    })
    if (changed) {
      await db.execute(sql`UPDATE recipes SET ingredients = ${JSON.stringify(next)}::jsonb WHERE slug = ${row.slug}`)
      jsonbFixed++
    }
  }
  console.log(`JSONB corrigé : ${jsonbFixed} recettes`)

  if (failures.length) { console.error("ÉCHECS:\n" + failures.join("\n")); process.exit(1) }
  console.log("OK — tous les remplacements appliqués exactement 1×")
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
