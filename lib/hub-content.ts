// lib/hub-content.ts
// Topical map — level 2: category hubs for the 21 collection keywords whose
// SERP intent is GUIDE/IDEAS (verified by SERP research 2026-08-04). Each hub
// curates EXISTING recipes by tags (deterministic — no hallucinated links).
// A hub is served on /guides/{slug} or /idees/{slug} (see HubListing + routes).

export interface Hub {
  slug: string
  category: "guides" | "idees"
  title: string
  metaTitle: string
  metaDescription: string
  intro: string[]
  /** Tags used to curate existing recipes into this hub (intersection match). */
  curateTags: string[]
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
      "These are our favorite easy dinners for two — every one of them is a complete meal that scales naturally to two servings, most in 30 minutes or less.",
    ],
    curateTags: ["dinner for two", "easy", "one-pan", "30-minute", "weeknight"],
  },
  {
    slug: "quick-and-easy-dinner-recipes-for-two",
    category: "guides",
    title: "Quick & Easy Dinner Recipes for Two",
    metaTitle: "Quick & Easy Dinner Recipes for Two (30 Minutes or Less)",
    metaDescription:
      "Dinner on the table fast — quick and easy recipes for two, from one-pan chicken to 30-minute pasta. No fuss, no leftovers.",
    intro: [
      "Some nights you just need dinner on the table — fast. These quick recipes for two are built around short cook times and minimal cleanup, without cutting corners on flavor.",
    ],
    curateTags: ["quick", "easy", "dinner for two"],
  },
  {
    slug: "healthy-dinner-ideas-for-two",
    category: "idees",
    title: "Healthy Dinner Ideas for Two",
    metaTitle: "Healthy Dinner Ideas for Two (Light & Satisfying)",
    metaDescription:
      "Healthy dinners for two that are actually satisfying — balanced one-pan meals, lean proteins, and vegetable-forward recipes.",
    intro: [
      "Healthy doesn't have to mean boring, and it definitely doesn't mean cooking two separate meals. These dinners for two balance lean protein, vegetables, and flavor — in portions that make sense for two people.",
    ],
    curateTags: ["healthy", "dinner for two", "30-minute"],
  },
  {
    slug: "romantic-dinner-ideas-for-two",
    category: "idees",
    title: "Romantic Dinner Ideas for Two",
    metaTitle: "Romantic Dinner Ideas for Two (Date Night at Home)",
    metaDescription:
      "Romantic dinners for two to make at home — date-night recipes that feel restaurant-worthy without the stress or the bill.",
    intro: [
      "A romantic dinner at home is about the gesture — a meal made just for the two of you, with a little extra care. These date-night recipes are impressive enough for an occasion and simple enough for a weeknight.",
    ],
    curateTags: ["romantic", "date night", "dinner for two"],
  },
  {
    slug: "easy-meal-ideas-for-two",
    category: "idees",
    title: "Easy Meal Ideas for Two",
    metaTitle: "Easy Meal Ideas for Two (Plan a Week of Dinners)",
    metaDescription:
      "Easy meal ideas for two — plan a week of dinners with one-pan meals, skillet dinners, and recipes that use what you have.",
    intro: [
      "The hardest part of cooking for two is often deciding what to make. These easy meal ideas cover a week of dinners — from skillet meals to one-pan bakes — so you can plan ahead and shop once.",
    ],
    curateTags: ["easy", "dinner for two", "meal"],
  },
  {
    slug: "dinner-recipe-ideas-for-two",
    category: "idees",
    title: "Dinner Recipe Ideas for Two",
    metaTitle: "Dinner Recipe Ideas for Two (Browse & Cook Tonight)",
    metaDescription:
      "Dinner recipe ideas for two — browse our collection of small-batch dinners, from pasta to chicken to slow-cooker favorites.",
    intro: [
      "Looking for dinner tonight? Browse our recipe ideas for two — every dish is scaled for two people, tested in a home kitchen, and most come together in one pan.",
    ],
    curateTags: ["dinner for two", "ideas", "easy"],
  },
  {
    slug: "slow-cooker-recipes-for-two",
    category: "guides",
    title: "Slow Cooker Recipes for Two",
    metaTitle: "Slow Cooker Recipes for Two (Small-Batch Crockpot Dinners)",
    metaDescription:
      "Slow cooker recipes sized for two — small-batch crockpot dinners that don't drown you in leftovers. Set it and forget it.",
    intro: [
      "A slow cooker is the ultimate hands-off dinner — but most recipes are sized for a family of six. These slow cooker recipes for two use small batches and 2-quart cookers so you get perfectly portioned dinners, not a week of leftovers.",
    ],
    curateTags: ["slow cooker", "crockpot", "dinner for two"],
  },
  {
    slug: "crockpot-recipes-for-two",
    category: "guides",
    title: "Crockpot Recipes for Two",
    metaTitle: "Crockpot Recipes for Two (Easy Small-Batch Dinners)",
    metaDescription:
      "Easy crockpot recipes for two people — small-batch slow cooker dinners that make weeknights effortless.",
    intro: [
      "The crockpot is the original set-it-and-forget-it tool. These recipes are built for two — small batches, 2-quart-friendly, and ready when you are.",
    ],
    curateTags: ["crockpot", "slow cooker", "dinner for two"],
  },
  {
    slug: "easy-recipes-for-two",
    category: "guides",
    title: "Easy Recipes for Two",
    metaTitle: "Easy Recipes for Two (Simple Small-Batch Cooking)",
    metaDescription:
      "Easy recipes for two — simple, small-batch cooking with one-pan meals, quick pastas, and weeknight chicken dinners.",
    intro: [
      "Simple cooking for two is about scale and technique — a smaller pan, the right portion, and recipes that don't complicate things. These are our easiest recipes for two, made for real weeknights.",
    ],
    curateTags: ["easy", "dinner for two", "one-pan"],
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
  },
  {
    slug: "fast-and-easy-dinner-for-2",
    category: "guides",
    title: "Fast & Easy Dinner for 2",
    metaTitle: "Fast & Easy Dinner for 2 (Ready in 30 Minutes)",
    metaDescription:
      "Fast and easy dinners for 2 — 30-minute meals, one-pan cooking, and quick weeknight recipes sized for two.",
    intro: [
      "When it's 6 PM and you're hungry, 'fast and easy' is the whole brief. These dinners for two are ready in 30 minutes or less, with minimal dishes to wash.",
    ],
    curateTags: ["fast", "easy", "dinner for two", "30-minute"],
  },
  {
    slug: "simple-healthy-dinner-ideas-for-two",
    category: "idees",
    title: "Simple Healthy Dinner Ideas for Two",
    metaTitle: "Simple Healthy Dinner Ideas for Two (Balanced & Easy)",
    metaDescription:
      "Simple, healthy dinner ideas for two — balanced, satisfying, and easy to make on a weeknight.",
    intro: [
      "Healthy dinners for two don't need to be complicated. These simple ideas balance protein, vegetables, and flavor — the kind of meals you can make on autopilot after a long day.",
    ],
    curateTags: ["healthy", "simple", "dinner for two"],
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
  },
  {
    slug: "easy-lactose-free-dinner-recipes",
    category: "guides",
    title: "Easy Lactose-Free Dinner Recipes",
    metaTitle: "Easy Lactose-Free Dinner Recipes (Dairy-Free Dinners for Two)",
    metaDescription:
      "Easy lactose-free dinner recipes — dairy-free dinners for two that are creamy, comforting, and completely lactose-free.",
    intro: [
      "Cooking lactose-free doesn't mean cooking without creaminess. These dinners for two swap dairy for smart alternatives — while keeping the texture and flavor you want.",
    ],
    curateTags: ["lactose free", "dairy free", "dinner for two"],
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
  },
  {
    slug: "baking-for-2",
    category: "guides",
    title: "Baking for 2",
    metaTitle: "Baking for 2 (Small-Batch Desserts & Bakes)",
    metaDescription:
      "Baking for 2 — small-batch desserts and bakes scaled for two, from cookies to lava cakes. No leftover cake going stale.",
    intro: [
      "Baking for two is the art of the small batch — a single cookie sheet, a ramekin or two, and recipes that don't assume you're feeding a crowd. These are our favorite small-batch bakes.",
    ],
    curateTags: ["baking", "small batch", "dessert"],
  },
  {
    slug: "dinner-recipes-for-two",
    category: "idees",
    title: "Dinner Recipes for Two",
    metaTitle: "Dinner Recipes for Two (Our Full Collection)",
    metaDescription:
      "Our full collection of dinner recipes for two — one-pan chicken, pasta, slow-cooker favorites, and more, all scaled for two.",
    intro: [
      "This is the collection hub for all our dinner recipes for two. Browse by what you're craving — chicken, pasta, seafood, slow-cooker — every recipe is scaled for two servings.",
    ],
    curateTags: ["dinner for two", "easy", "one-pan"],
  },
  {
    slug: "easy-to-cook-dinner-for-two",
    category: "idees",
    title: "Easy-to-Cook Dinner for Two",
    metaTitle: "Easy-to-Cook Dinners for Two (Beginner-Friendly)",
    metaDescription:
      "Easy-to-cook dinners for two — beginner-friendly recipes that are simple, quick, and hard to mess up.",
    intro: [
      "Some recipes just want to be cooked. These easy-to-cook dinners for two are forgiving, fast, and perfect when you want a good meal without a project.",
    ],
    curateTags: ["easy", "dinner for two", "beginner"],
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
    ["healthy", "healthy-dinner-ideas-for-two"],
    ["romantic", "romantic-dinner-ideas-for-two"],
    ["date night", "romantic-dinner-ideas-for-two"],
    ["slow cooker", "slow-cooker-recipes-for-two"],
    ["crockpot", "crockpot-recipes-for-two"],
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
  return undefined
}
