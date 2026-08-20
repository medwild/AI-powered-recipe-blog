// lib/hub-content.ts
// Topical map — level 2: category hubs for the 11 collection keywords whose
// SERP intent is GUIDE/IDEAS (verified by SERP research 2026-08-04). Each hub
// curates EXISTING recipes by tags (deterministic — no hallucinated links).
// 10 generic "dinner for two" hubs consolidated into 2 survivors on 2026-08-20
// (cannibalization fix: easy-dinner-ideas-for-two + recipes-for-two retained).

export interface Hub {
  slug: string
  category: "guides" | "idees"
  title: string
  metaTitle: string
  metaDescription: string
  intro: string[]
  /** Tags used to curate existing recipes into this hub (intersection match). */
  curateTags: string[]
  /** Hero image (Cloudinary) — used on collection cards + hub pages. */
  heroImageUrl: string
}

export const HUBS: Hub[] = [
  {
    slug: "easy-dinner-ideas-for-two",
    category: "guides",
    title: "Easy Dinner Ideas for Two",
    metaTitle: "Easy Dinner Ideas for Two (30-Minute Meals)",
    metaDescription:
      "Quick, easy dinner ideas for two people — one-pan meals, 30-minute dinners, and small-batch favorites from Chef Augustin.",
    intro: [
      "Cooking for two doesn't mean cooking twice the work. The best dinners for two are the ones that come together in a single pan, use ingredients you already have, and don't leave you with a week of leftovers.",
      "These are our favorite easy dinner ideas for two — every one of them is a complete meal that scales naturally to two servings, most in 30 minutes or less.",
    ],
    curateTags: ["dinner for two", "easy", "one-pan", "30-minute", "weeknight"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279107/recipes/collections-easy-dinner-ideas-for-two.jpg",
  },
  {
    slug: "romantic-dinner-ideas-for-two",
    category: "idees",
    title: "Romantic Dinner Ideas for Two",
    metaTitle: "Romantic Dinner Ideas for Two",
    metaDescription:
      "Romantic dinners for two to make at home — date-night recipes that feel restaurant-worthy without the stress or the bill.",
    intro: [
      "A romantic dinner at home is about the gesture — a meal made just for the two of you, with a little extra care. These romantic dinner ideas are date-night recipes that feel impressive enough for an occasion and simple enough for a weeknight.",
    ],
    curateTags: ["romantic", "date night", "dinner for two"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279120/recipes/collections-romantic-dinner-ideas-for-two.jpg",
  },
  {
    slug: "slow-cooker-recipes-for-two",
    category: "guides",
    title: "Slow Cooker Recipes for Two",
    metaTitle: "Slow Cooker Recipes for Two (Small-Batch Crockpot Dinners)",
    metaDescription:
      "Slow cooker recipes sized for two — small-batch crockpot dinners that don't drown you in leftovers. Set it and forget it.",
    intro: [
      "A slow cooker is the ultimate hands-off dinner — but most recipes are sized for a family of six. These small-batch slow cooker recipes for two use a 2-quart crockpot so you get perfectly portioned dinners, not a week of leftovers.",
    ],
    curateTags: ["slow cooker", "crockpot", "dinner for two"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279122/recipes/collections-slow-cooker-recipes-for-two.jpg",
  },
  {
    slug: "recipes-for-two",
    category: "guides",
    title: "Recipes for Two",
    metaTitle: "Recipes for Two (Small-Batch Dinner Collection)",
    metaDescription:
      "Our collection of recipes for two — small-batch dinners, desserts, and sides from Chef Augustin, all scaled for two servings.",
    intro: [
      "Welcome to our recipes for two — the full collection of small-batch cooking. Every recipe here is scaled for two servings, tested in a home kitchen, and designed to minimize waste.",
    ],
    curateTags: ["dinner for two", "small batch"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279120/recipes/collections-recipes-for-two.jpg",
  },
  {
    slug: "easy-whole30-recipes",
    category: "guides",
    title: "Easy Whole30 Recipes",
    metaTitle: "Easy Whole30 Recipes (Compliant Dinners for Two)",
    metaDescription:
      "Easy Whole30-compliant recipes — small-batch dinners that follow the Whole30 rules without sacrificing flavor.",
    intro: [
      "Eating Whole30 doesn't mean eating boring. These compliant recipes skip sugar, grains, dairy, and legumes — while still delivering dinners you'll actually look forward to.",
    ],
    curateTags: ["whole30", "dinner for two", "easy"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279114/recipes/collections-easy-whole30-recipes.jpg",
  },
  {
    slug: "easy-carnivore-recipes",
    category: "guides",
    title: "Easy Carnivore Recipes",
    metaTitle: "Easy Carnivore Recipes (Meat-Based Dinners for Two)",
    metaDescription:
      "Easy carnivore diet recipes — meat-based, zero-carb dinners for two that are simple and satisfying.",
    intro: [
      "The carnivore diet is simple by design — meat, salt, water. These recipes keep it interesting with different cuts, cooking methods, and seasonings, all sized for two.",
    ],
    curateTags: ["carnivore", "dinner for two", "easy"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279107/recipes/collections-easy-carnivore-recipes.jpg",
  },
  {
    slug: "easy-low-fodmap-recipes",
    category: "guides",
    title: "Easy Low FODMAP Recipes",
    metaTitle: "Easy Low FODMAP Recipes (IBS-Friendly Dinners for Two)",
    metaDescription:
      "Easy low FODMAP recipes — IBS-friendly dinners for two with ingredients that are gentle on your gut.",
    intro: [
      "Low FODMAP cooking is about choosing the right ingredients, not eating less flavor. These recipes stick to low-FODMAP ingredients and portion sizes that work for two.",
    ],
    curateTags: ["low fodmap", "dinner for two", "easy"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279109/recipes/collections-easy-low-fodmap-recipes.jpg",
  },
  {
    slug: "easy-ibs-dinner-recipes",
    category: "guides",
    title: "Easy IBS Dinner Recipes",
    metaTitle: "Easy IBS Dinner Recipes (Low FODMAP Dinners for Two)",
    metaDescription:
      "Easy dinner recipes for IBS — low FODMAP, gentle-on-the-gut dinners for two that are simple to make.",
    intro: [
      "Living with IBS doesn't mean giving up good dinners. These recipes focus on low-FODMAP ingredients and simple preparation — the kind of meals that are easy on your gut and your schedule.",
    ],
    curateTags: ["low fodmap", "ibs", "dinner for two"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279108/recipes/collections-easy-ibs-dinner-recipes.jpg",
  },
  {
    slug: "easy-lactose-free-dinner-recipes",
    category: "guides",
    title: "Easy Lactose-Free Dinner Recipes",
    metaTitle: "Easy Lactose-Free Dinners for Two",
    metaDescription:
      "Easy lactose-free dinner recipes — dairy-free dinners for two that are creamy, comforting, and completely lactose-free.",
    intro: [
      "Cooking lactose-free doesn't mean cooking without creaminess. These dinners for two swap dairy for smart alternatives — while keeping the texture and flavor you want.",
    ],
    curateTags: ["lactose free", "dairy free", "dinner for two"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279109/recipes/collections-easy-lactose-free-dinner-recipes.jpg",
  },
  {
    slug: "easy-meals-for-beginners",
    category: "guides",
    title: "Easy Meals for Beginners",
    metaTitle: "Easy Meals for Beginners (Simple Cooking for Two)",
    metaDescription:
      "Easy meals for beginner cooks — simple, foolproof recipes for two with clear steps and minimal equipment.",
    intro: [
      "New to cooking for two? Start here. These are the easiest meals to master — short ingredient lists, forgiving techniques, and results that feel like a win even on a first try.",
    ],
    curateTags: ["easy", "beginner", "dinner for two", "one-pan"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279111/recipes/collections-easy-meals-for-beginners.jpg",
  },
  {
    slug: "baking-for-2",
    category: "guides",
    title: "Baking for 2",
    metaTitle: "Baking for 2 (Small-Batch Desserts & Bakes)",
    metaDescription:
      "Baking for 2 — small-batch desserts and bakes scaled for two, from cookies to lava cakes. No leftover cake going stale.",
    intro: [
      "Baking for two is the art of the small batch — a single cookie sheet, a ramekin or two, and recipes that don't assume you're feeding a crowd. These are our favorite small-batch bakes and desserts.",
      "The recipes here are scaled so the bake fits the occasion: chocolate chip cookies in a small batch ready in under 30 minutes, and molten chocolate lava cakes portioned into two ramekins with a 25-minute timeline. No half trays of cake going stale in the fridge.",
      "Small-batch baking changes the math in ways that matter — less butter to cream, ramekins that bake through faster than a full cake pan, and cookie dough measured for two instead of three dozen. Each recipe spells out the pan size and timing so the result comes out right the first time.",
    ],
    curateTags: ["baking", "small batch", "dessert"],
    heroImageUrl: "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/v1786279103/recipes/collections-baking-for-2.jpg",
  },
]

export function getHubBySlug(slug: string): Hub | undefined {
  return HUBS.find((h) => h.slug === slug)
}

/**
 * Reverse mapping: which hub should a recipe link up to (link silo leaf→hub)?
 * Priority by tag — first matching tag wins.
 */
export function getHubForRecipe(tags: string[]): Hub | undefined {
  const priority: Array<[string, string]> = [
    // healthy hub merged into easy-dinner-ideas (2026-08-20 cannibalization
    // consolidation) — healthy-tagged recipes now link to the generic head hub.
    ["healthy", "easy-dinner-ideas-for-two"],
    ["romantic", "romantic-dinner-ideas-for-two"],
    ["date night", "romantic-dinner-ideas-for-two"],
    ["slow cooker", "slow-cooker-recipes-for-two"],
    // crockpot hub merged into slow-cooker (2026-08-20) — same appliance, one page.
    ["crockpot", "slow-cooker-recipes-for-two"],
    ["low fodmap", "easy-low-fodmap-recipes"],
    ["whole30", "easy-whole30-recipes"],
    ["carnivore", "easy-carnivore-recipes"],
    ["beginner", "easy-meals-for-beginners"],
    ["baking", "baking-for-2"],
    ["dessert", "baking-for-2"],
    ["lactose free", "easy-lactose-free-dinner-recipes"],
    ["thanksgiving", "recipes-for-two"],
    ["easter", "recipes-for-two"],
    ["easy", "easy-dinner-ideas-for-two"],
  ]
  const lower = tags.map((t) => t.toLowerCase())
  for (const [tag, slug] of priority) {
    if (lower.some((t) => t.includes(tag))) return getHubBySlug(slug)
  }
  // Fallback : toute recette « for two » / dinner remonte au hub maître
  // (silo leaf→hub garanti — aucune recette sans lien vers un hub).
  if (lower.some((t) => t.includes("dinner") || t.includes("for two") || t.includes("two"))) {
    return getHubBySlug("recipes-for-two")
  }
  return undefined
}

/** Cluster ID → hub slug (one pillar per cluster — topical authority silo). */
const CLUSTER_TO_HUB: Record<string, string> = {
  "chicken-dinners-for-two": "easy-dinner-ideas-for-two",
  "small-batch-slow-cooker": "slow-cooker-recipes-for-two",
  "one-pan-dinners-for-two": "easy-dinner-ideas-for-two",
  "asian-inspired-dinners": "easy-dinner-ideas-for-two",
  // budget-meals + quick-healthy hubs merged into easy-dinner-ideas (2026-08-20).
  "budget-meals-for-two": "easy-dinner-ideas-for-two",
  "quick-healthy-dinners": "easy-dinner-ideas-for-two",
}

/**
 * Hub for a cluster (leaf→pillar link). Falls back to getHubForRecipe
 * so every recipe still has a pillar even if its cluster has no hub.
 */
export function getHubForCluster(clusterId: string, tags: string[]): Hub | undefined {
  const slug = CLUSTER_TO_HUB[clusterId]
  if (slug) return getHubBySlug(slug)
  return getHubForRecipe(tags)
}
