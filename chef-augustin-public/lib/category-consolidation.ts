// lib/category-consolidation.ts
// Category consolidation map (2026-08-05) — thin 1-2 recipe categories 301 to
// their canonical parent. Used by:
//   - app/sitemap.ts (exclude merged slugs from the sitemap)
//   - next.config.mjs redirects (source -> destination, kept in sync manually)
// Canonicals are the tags with >=3 published recipes (deep enough to index).

export const CATEGORY_REDIRECTS: Record<string, string> = {
  // Time family
  "30-minute-meals": "quick",
  "30-minute-dinner": "quick",
  "30-minute-meal": "quick",
  "35-minute-meal": "quick",
  "quick-dinner": "quick",
  "quick-dinner-for-two": "quick",
  "quick-shrimp-recipe": "quick",
  // Chicken family
  "chicken-breast-recipes": "chicken",
  "chicken-dinner-for-two": "chicken",
  "chicken-pot-pie": "chicken",
  "herb-chicken": "chicken",
  "easy-chicken-recipes": "chicken",
  "easy-chicken-dinner": "chicken",
  "mediterranean-chicken": "chicken",
  // One-pan family
  "one-pan-meal": "one-pan",
  "one-pan-dinner": "one-pan",
  "one-pan-pasta": "one-pan",
  "one-pot": "one-pan",
  "sheet-pan-dinner": "one-pan",
  skillet: "one-pan",
  "skillet-meal": "one-pan",
  "cast-iron": "one-pan",
  stovetop: "one-pan",
  "pan-seared": "one-pan",
  "one-pan-chicken": "one-pan",
  "one-pan-chicken-dinner": "one-pan",
  // Easy family
  "easy-dinner": "easy",
  "easy-weeknight": "easy",
  "easy-lunch-recipes": "easy",
  "meal-prep": "easy",
  "gluten-free": "easy",
  vegetarian: "easy",
  "side-dish": "easy",
  "mac-and-cheese": "easy",
  "mashed-potatoes-for-two": "easy",
  "creamy-mashed-potatoes": "easy",
  // Dessert/baking family -> small-batch (closest deep tag)
  dessert: "small-batch",
  "dessert-for-2": "small-batch",
  "dessert-for-two": "small-batch",
  chocolate: "small-batch",
  "chocolate-lava-cake": "small-batch",
  "cookie-dough-for-two": "small-batch",
  "edible-cookie-dough": "small-batch",
  "egg-free-cookie-dough": "small-batch",
  "small-batch-dessert": "small-batch",
  "no-bake-dessert": "small-batch",
  "lava-cake": "small-batch",
  "puff-pastry": "small-batch",
  gravy: "small-batch",
  "quick-dessert": "small-batch",
  "easy-dessert": "small-batch",
  // For-two / occasion family
  "for-two": "dinner-for-two",
  "dinners-for-two": "dinner-for-two",
  "cooking-for-two": "dinner-for-two",
  "lunch-for-two": "dinner-for-two",
  "easter-dinner-for-two": "dinner-for-two",
  "thanksgiving-for-two": "dinner-for-two",
  "small-thanksgiving": "dinner-for-two",
  "easy-to-cook-dinner-for-two": "dinner-for-two",
  beef: "dinner-for-two",
  // "ground-beef" promoted to canonical 2026-08-06 (4 recipes) — removed from redirects.
  // Date-night family
  "romantic-dinner": "date-night",
  "romantic-dinner-for-two-at-home": "date-night",
  "steak-dinner-for-two": "date-night",
  // Orzo family (ingredient-based, all deep orzo recipes)
  lemon: "orzo",
  "lemon-butter": "orzo",
  parmesan: "orzo",
  feta: "orzo",
  "feta-brine": "orzo",
  olives: "orzo",
  capers: "orzo",
  dill: "orzo",
  "white-wine": "orzo",
  "spring-vegetables": "orzo",
  zucchini: "orzo",
  salmon: "orzo",
  "shrimp-orzo": "orzo",
  "garlic-shrimp": "orzo",
  seafood: "orzo",
  // Rice / asian family -> one-pan (closest deep tag).
  // "rice" promoted to canonical 2026-08-06 (5 recipes) — removed from redirects.
  "rice-bowl": "one-pan",
  "rice-recipe": "one-pan",
  "stir-fry": "one-pan",
  asian: "one-pan",
  "easy-to-make-asian-food-recipes": "one-pan",
  // Cuisine family -> easy
  italian: "easy",
  "italian-american": "easy",
  "italian-inspired": "easy",
  mexican: "easy",
  // Misc
  "quick-sauces": "easy",
  "summer-dinner": "weeknight",
  "small-batch-cooking": "small-batch",
  "small-batch-recipe": "small-batch",
  // "slow-cooker" promoted to canonical 2026-08-06 (4 recipes) — removed from redirects.
  "quick-and-easy-dinner-recipes-for-two": "quick",
  "simple-healthy-dinner-ideas-for-two": "easy",
}

/** Tags that are canonical (deep, kept) — everything else redirects. */
export const CANONICAL_CATEGORIES = new Set([
  "dinner for two",
  // "weeknight dinner" removed 2026-08-10 — thin variant (2 recipes) that
  // 301s to "weeknight" (next.config.mjs); listing it here put a redirecting
  // URL in the sitemap (GSC "Page with redirection" notice 2026-08-09).
  "easy",
  "small batch",
  "date night",
  "weeknight",
  "orzo",
  "quick",
  "comfort food",
  // chicken + one-pan REMOVED 2026-08-08 (audit P2-6): their categories merged
  // into the clusters (301 → /recipes/collections/*) which are the pillars now.
  // Promoted 2026-08-06 (Semrush audit — all have ≥3 published recipes,
  // distinct real intents): ground beef, pasta, chicken breast, slow cooker, rice
  "ground beef",
  "pasta",
  "chicken breast",
  "slow cooker",
  "rice",
])

/**
 * Keep only the canonical category tags — used by navigation surfaces
 * (Browse by category) so they only link indexable category pages. The raw
 * tag list (138 tags from the DB) is still used by generateStaticParams,
 * slug resolution, the sitemap filter, and client-side search filters.
 */
export function canonicalCategories(tags: string[]): string[] {
  return tags.filter((t) => CANONICAL_CATEGORIES.has(t.toLowerCase()))
}
