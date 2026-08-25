/**
 * Legacy recipe slug redirects — source slug → live successor slug.
 *
 * Miroir des redirects `/recipes/{old} → /recipes/{new}` définis dans
 * next.config.mjs. Utilisé par `app/recettes/[slug]/route.ts` pour servir un
 * 308 MONO-SAUT vers le successeur live au lieu de la chaîne historique
 * `/recettes/{old}` → `/recipes/{old}` → `/recipes/{new}` (2 sauts, flag GSC).
 *
 * ⚠️ GARDER SYNCHRONISÉ avec next.config.mjs (redirects recette) :
 * chaque nouvelle entrée `/recipes/{old} → /recipes/{new}` DOIT être reflétée
 * ici, sinon `/recettes/{old}` retombe en 404. Vérif : toutes les cibles sont
 * des recettes live + published (contrôlé en DB le 2026-08-24, 28/28).
 */
export const RECIPE_SLUG_REDIRECTS: Record<string, string> = {
  "simple-dinner-recipes-for-2": "creamy-parmesan-garlic-chicken-orzo-for-two",
  "easy-healthy-dinner-recipes-for-two": "summer-herb-chicken-orzo-with-zucchini-for-two",
  "easy-dinner-for-two-recipes": "white-wine-lemon-chicken-orzo-for-two",
  "dinner-for-two-recipes-healthy": "mediterranean-chicken-orzo-with-feta-olives-for-two",
  "healthy-dinner-recipes-for-2": "salmon-orzo-with-dill-and-capers-for-two",
  "creamy-garlic-chicken": "creamy-parmesan-garlic-chicken-orzo-for-two",
  "easy-chicken-parmesan-for-two-the-double-butter-pan-sauce-method": "creamy-parmesan-garlic-chicken-orzo-for-two",
  "easy-dinner-ideas-for-two": "one-pan-garlic-butter-chicken-tomato-orzo",
  "quick-and-easy-dinner-recipes-for-two": "one-pan-garlic-tomato-chicken-rice",
  "healthy-dinner-ideas-for-two": "one-pan-chicken-vegetable-skillet",
  "romantic-dinner-ideas-for-two": "lemon-butter-chicken-pasta-for-two",
  "easy-meal-ideas-for-two": "one-pan-chicken-tomato-rice",
  "dinner-recipe-ideas-for-two": "one-pan-chicken-rice-garlic-butter-tomato-sauce",
  "slow-cooker-recipes-for-two": "slow-cooker-chicken-rice-for-two",
  "crockpot-recipes-for-two": "slow-cooker-chicken-rice-for-two",
  "easy-recipes-for-two": "one-pan-chicken-rice-for-two",
  "recipes-for-two": "one-pan-chicken-rice-for-two",
  "fast-and-easy-dinner-for-2": "garlic-butter-chicken-pasta-for-two",
  "simple-healthy-dinner-ideas-for-two": "one-pan-chicken-rice-for-two",
  "easy-whole30-recipes": "whole30-chicken-skillet-tomatoes-garlic",
  // 2026-08-25 cannibalization — 3 chicken-rice recettes fusionnées (miroir
  // next.config.mjs). Crockpot & tomato-garlic & dinner absorbés par les survivants.
  "one-pan-chicken-rice-dinner-for-two": "one-pan-chicken-rice-for-two",
  "one-pan-chicken-tomato-garlic-rice": "one-pan-chicken-rice-for-two",
  "crockpot-chicken-tomato-rice-for-two": "slow-cooker-chicken-rice-for-two",
  "one-pot-chicken-pasta-for-two": "garlic-butter-chicken-pasta-for-two",
  "one-pan-garlic-herb-chicken-thighs-for-two-the-cold-pan-secret": "chicken-dinner-for-two",
  "one-pan-chicken-and-rice-for-two": "one-pan-chicken-rice-for-two",
  "one-pan-garlic-tomato-chicken-rice-for-two": "one-pan-garlic-tomato-chicken-rice",
  "easy-beef-ramen-noodles-for-two": "easy-beef-ramen-noodle-recipes",
  "easy-chili-colorado-for-two": "easy-chili-colorado-recipe",
  "easy-lasagna-recipe-for-two": "easy-lasagna-recipe",
  "chicken-enchilada-skillet": "easy-mexican-dinner-recipes",
  "mexican": "easy-mexican-dinner-recipes",
  "2-quart-slow-cooker-chicken-gravy-for-two": "2-qt-slow-cooker-recipes",
  "slow-cooker-chicken-beef-pasta-for-two": "easy-slow-cooker-pasta-recipes",
  "chicken-pot-pie-for-two": "chicken-pot-pie-for-2",
  "easy-whole30-chicken-skillet-for-two": "whole30-chicken-skillet-tomatoes-garlic",
  "one-pan-chicken-vegetable-skillet-for-two": "one-pan-chicken-vegetable-skillet",
  "4-ingredient-feta-brine-chicken-breast": "easy-4-ingredient-chicken-breast-recipes",
  "easy-meal-ideas-for-two-one-pan-chicken-tomato-rice": "one-pan-chicken-tomato-rice",
  "easy-4-ingredient-chicken-breast-recipes-2": "easy-4-ingredient-chicken-breast-recipes",
  "slow-cooker-chicken-and-rice-for-two": "slow-cooker-chicken-rice-for-two",
  "whole30": "whole30-chicken-skillet-tomatoes-garlic",
}
