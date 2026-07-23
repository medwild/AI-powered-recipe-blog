/**
 * Fixtures — ChefAugustinOutput mocks for E2E pipeline tests.
 *
 * Each fixture simulates what the LLM returns at a given pass.
 * Designed to exercise different pipeline paths (pass, fail, loop, degraded).
 */

import type { ChefAugustinOutput, StrategyPlan } from "@/lib/pipeline/agents/chef-augustin"
import type { SerpPhaseResult } from "@/lib/pipeline/steps/serp-phase"

// ── Strategy Plan ──────────────────────────────────────────────────────────────

export const MOCK_STRATEGY_PLAN: StrategyPlan = {
  angle: "Swedish Meatballs — creamy, spiced, and better than IKEA. Ready in 45 minutes for two.",
  primaryKeyword: "swedish meatballs recipe",
  secondaryKeywords: ["easy meatball dinner", "cream sauce meatballs", "ikea meatballs copycat"],
  h2Sections: [
    { heading: "Why This Swedish Meatball Recipe Works", purpose: "Hook with unique technique", coverPaa: [] },
    { heading: "Ingredients", purpose: "List with precise measurements", coverPaa: [] },
    { heading: "Instructions", purpose: "Step-by-step method", coverPaa: [] },
    { heading: "The Cream Sauce", purpose: "Detailed sauce technique", coverPaa: [] },
    { heading: "FAQ", purpose: "Answer common questions", coverPaa: ["How to keep meatballs from falling apart?"] },
  ],
  faqQuestions: [
    "How to keep meatballs from falling apart?",
    "Can I make Swedish meatballs ahead of time?",
    "What is the difference between Swedish and Italian meatballs?",
    "How to make the cream sauce thicker?",
  ],
  semanticEntities: ["Swedish meatballs", "allspice", "nutmeg", "cream sauce", "lingonberry jam"],
  competitorGaps: ["Most recipes skip the panade step", "No one explains why allspice matters"],
  targetWordCount: "1800-2200",
  contentType: "recipe",
  requiredCitations: [],
}

// ── SERP Result ────────────────────────────────────────────────────────────────

export const MOCK_SERP_RESULT: SerpPhaseResult = {
  serp: {
    organic: [
      { title: "Swedish Meatballs Recipe - Allrecipes", snippet: "Creamy, tender Swedish meatballs with allspice and nutmeg." },
      { title: "Best Swedish Meatballs - Food Network", snippet: "Learn how to make authentic Swedish meatballs from scratch." },
    ],
    relatedQuestions: [
      { question: "How to keep meatballs from falling apart?" },
      { question: "Can I freeze Swedish meatballs?" },
      { question: "What goes with Swedish meatballs?" },
    ],
    relatedSearches: ["swedish meatballs cream sauce", "ikea meatballs recipe", "easy meatball dinner"],
  },
  degraded: false,
}

// ── Chef Augustin Outputs ──────────────────────────────────────────────────────

/**
 * Pass 1 — Good content that passes validation (score ~78/100).
 * Has enough claims, attributions, nuggets, and clean vocabulary.
 */
export const RECIPE_OUTPUT_PASS_GOOD: ChefAugustinOutput = {
  title: "Swedish Meatballs with Cream Sauce",
  metaTitle: "Swedish Meatballs — Creamy & Better Than IKEA in 45 Min",
  metaDescription: "Tender Swedish meatballs with allspice, nutmeg, and a velvety cream sauce. Ready in 45 minutes, tested 50+ times for foolproof results.",
  excerpt: "These Swedish meatballs deliver tender spiced meatballs in a rich cream sauce — ready in 45 minutes for two people.",
  contentMarkdown: [
    "## Why This Swedish Meatball Recipe Works",
    "",
    "Most Swedish meatball recipes produce dense, dry results because they skip one critical step: the panade. A panade is a paste of breadcrumbs and cream that keeps the meatballs tender by preventing the proteins from tightening during cooking.",
    "",
    "I have tested this recipe 50 times with different ratios of beef to pork. The 60/40 split of beef chuck to pork shoulder consistently produces meatballs that stay tender and juicy. Chef Augustin Lefèvre recommends chilling the mixture for 15 minutes before shaping — this allows the panade to fully hydrate and the allspice to bloom.",
    "",
    "Unlike Italian meatballs that use Parmesan and oregano, Swedish meatballs use allspice and nutmeg. These two spices are the signature of Scandinavian meatball tradition and create a warm, aromatic flavor that the cream sauce amplifies.",
    "",
    "## Ingredients",
    "",
    "For the meatballs: 250g ground beef chuck, 170g ground pork shoulder, 60ml heavy cream, 40g fresh breadcrumbs, 1 large egg, 25g finely grated onion, 1/2 tsp ground allspice, 1/4 tsp freshly grated nutmeg, 3/4 tsp Diamond Crystal kosher salt, 1/4 tsp black pepper, 15g unsalted butter for frying.",
    "",
    "For the cream sauce: 15g unsalted butter, 15g all-purpose flour, 240ml beef stock, 120ml heavy cream, 1 tsp Worcestershire sauce, 1/2 tsp Dijon mustard, salt and white pepper to taste.",
    "",
    "## Instructions",
    "",
    "1. Make the panade. Combine breadcrumbs and heavy cream in a small bowl. Let it sit for 5 minutes until a paste forms. This step prevents dry meatballs by creating a moisture barrier around each protein strand.",
    "",
    "2. Mix the meatball mixture. Combine the ground beef, pork, hydrated panade, egg, grated onion, allspice, nutmeg, salt, and pepper in a large bowl. Mix gently with your hands for exactly 45 seconds — overmixing creates tough meatballs because it overworks the myosin protein.",
    "",
    "3. Shape and chill. Roll into 16-18 meatballs, each about 30g. Place on a parchment-lined tray and refrigerate for 15 minutes. This firms up the fat and allows the allspice compounds to distribute evenly.",
    "",
    "4. Sear the meatballs. Heat butter in a 30cm stainless steel skillet over medium-high heat (175°C/350°F). Sear meatballs in two batches for 2 minutes per side until browned all over. Remove to a plate. Do not crowd the pan — crowding drops the pan temperature below the Maillard threshold of 140°C/280°F and the meatballs will steam instead of sear.",
    "",
    "5. Make the cream sauce. Reduce heat to medium. Add butter and flour to the same skillet, whisking constantly for 60 seconds to cook out the raw flour taste. Slowly pour in beef stock while whisking to prevent lumps. Add cream, Worcestershire, and Dijon. Simmer for 3-4 minutes until the sauce coats the back of a spoon. At this temperature (82-88°C/180-190°F), the starch granules swell and thicken without the cream breaking.",
    "",
    "6. Finish in the sauce. Return meatballs to the skillet, spoon sauce over them, and simmer gently for 8-10 minutes until the meatballs reach 74°C/165°F internal temperature. The collagen in the pork shoulder converts to gelatin between 71-82°C/160-180°F, adding body to the sauce.",
    "",
    "## FAQ",
    "",
    "**How to keep meatballs from falling apart?**",
    "The panade is your binder — it creates a starch gel that holds the meat together. Also, the egg protein sets during cooking at approximately 63°C/145°F, creating a secondary protein network. Chilling before cooking firms the fat and helps the meatballs hold their shape. If your meatballs still fall apart, check that your breadcrumb-to-cream ratio is correct — too much liquid weakens the binder.",
    "",
    "**Can I make Swedish meatballs ahead of time?**",
    "Yes. Shape the meatballs and refrigerate for up to 24 hours before cooking. You can also freeze shaped, uncooked meatballs on a tray, then transfer to a freezer bag for up to 3 months. Cook from frozen — add 4-5 minutes to the searing time. I have tested this method across 8 freezer-to-pan batches and the texture is indistinguishable from fresh.",
    "",
    "**What is the difference between Swedish and Italian meatballs?**",
    "Swedish meatballs are smaller (about 30g each vs 50-60g for Italian), use a panade instead of dry breadcrumbs, and are spiced with allspice and nutmeg rather than oregano and Parmesan. The sauce is also different — Swedish meatballs are served in a cream-based pan sauce, while Italian meatballs are typically served in tomato sauce. Both traditions trace back to similar 18th-century European köttbullar recipes.",
    "",
    "**How to make the cream sauce thicker?**",
    "The sauce thickens through starch gelatinization from the roux (butter + flour). If your sauce is too thin, continue simmering for 2-3 more minutes to evaporate more water. If it is still thin, the most common cause is adding the stock too quickly — the flour particles need time to swell. For a quick fix, whisk 1 teaspoon of cornstarch with 1 tablespoon of cold water and drizzle it in while whisking.",
    "",
    "## Chef's Tips",
    "",
    "Use a kitchen scale for the meatballs. Portioning by weight (30g each) ensures even cooking. I weighed 200 meatballs across 12 batches and the cooking time variance between a 25g and 35g meatball is approximately 3 minutes — enough to overcook the smaller ones.",
    "",
    "For the best allspice flavor, buy whole allspice berries and grind them yourself. Pre-ground allspice loses 60% of its volatile aromatic compounds within 3 months of opening, based on gas chromatography analysis of ground spices.",
    "",
    "The cream sauce benefits from a splash of lingonberry jam stirred in at the end — the acidity cuts through the richness. If you cannot find lingonberry, cranberry sauce is a reasonable substitute with similar acidity (pH 2.8-3.2 for both).",
    "",
    "## Serving Suggestions",
    "",
    "Serve these Swedish meatballs over buttered egg noodles or creamy mashed potatoes. The starch from the noodles or potatoes absorbs the cream sauce and makes every bite satisfying. A side of quick-pickled cucumbers adds brightness and acidity to balance the richness of the dish.",
    "",
    "For a traditional Swedish presentation, serve with boiled new potatoes tossed in dill butter and a generous spoonful of lingonberry jam on the side. The combination of warm spiced meatballs, velvety cream sauce, sweet-tart lingonberry, and fresh dill potatoes creates a complete meal that honors the Scandinavian tradition while being achievable in a home kitchen on a weeknight.",
    "",
    "A crisp green salad with a simple vinaigrette made from one part apple cider vinegar to three parts cold-pressed rapeseed oil rounds out the meal. The acidity from the vinegar cleanses the palate between bites of the rich cream sauce, making the dish feel lighter than it actually is.",
  ].join("\n"),
  ingredients: [
    { name: "ground beef chuck", quantity: "250g" },
    { name: "ground pork shoulder", quantity: "170g" },
    { name: "heavy cream", quantity: "60ml" },
    { name: "fresh breadcrumbs", quantity: "40g" },
    { name: "large egg", quantity: "1" },
    { name: "onion, finely grated", quantity: "25g" },
    { name: "ground allspice", quantity: "1/2 tsp" },
    { name: "freshly grated nutmeg", quantity: "1/4 tsp" },
    { name: "Diamond Crystal kosher salt", quantity: "3/4 tsp" },
    { name: "black pepper", quantity: "1/4 tsp" },
    { name: "unsalted butter", quantity: "30g" },
    { name: "all-purpose flour", quantity: "15g" },
    { name: "beef stock", quantity: "240ml" },
    { name: "Worcestershire sauce", quantity: "1 tsp" },
    { name: "Dijon mustard", quantity: "1/2 tsp" },
  ],
  instructions: [
    { text: "Make the panade — combine breadcrumbs and heavy cream, let sit 5 minutes until paste forms.", step: 1 },
    { text: "Mix beef, pork, panade, egg, grated onion, allspice, nutmeg, salt, and pepper. Mix gently for 45 seconds.", step: 2 },
    { text: "Shape into 16-18 meatballs (30g each). Chill 15 minutes on parchment-lined tray.", step: 3 },
    { text: "Sear meatballs in butter at 175°C/350°F, 2 minutes per side, in two batches. Do not crowd the pan.", step: 4 },
    { text: "Make the cream sauce — whisk butter and flour 60 seconds, add stock slowly, add cream, Worcestershire, Dijon. Simmer 3-4 minutes.", step: 5 },
    { text: "Return meatballs to skillet. Simmer 8-10 minutes until internal temperature reaches 74°C/165°F.", step: 6 },
  ],
  tags: ["Main Course", "Swedish", "Meatballs", "Comfort Food", "Dinner for Two"],
  prepTime: "20 minutes",
  cookTime: "25 minutes",
  totalTime: "45 minutes",
  servings: "2 servings",
  difficulty: "Medium",
  imagePrompt: "Professional food photography of Swedish meatballs in a creamy sauce, cast iron skillet, natural window light, overhead flat-lay, shallow depth of field, warm tones, 2:3 vertical aspect ratio, editorial food photography, rustic ceramic plate, lingonberry garnish",
  jsonLd: {
    nutrition: { calories: "580 kcal", protein: "42g", fat: "38g", carbs: "18g" },
  },
}

/**
 * Pass 1 — Weak content that will fail validation and need a second pass.
 * Missing sufficient claims, attributions, and nuggets.
 */
export const RECIPE_OUTPUT_PASS_WEAK: ChefAugustinOutput = {
  title: "Swedish Meatballs",
  metaTitle: "Easy Swedish Meatballs Recipe",
  metaDescription: "A simple recipe for Swedish meatballs.",
  excerpt: "Easy Swedish meatballs for dinner.",
  contentMarkdown: [
    "## Swedish Meatballs",
    "",
    "This is a delicious Swedish meatball recipe. It is very tasty and easy to make. You will love how simple this recipe is.",
    "",
    "The meatballs are tender and flavorful. The cream sauce is rich and satisfying. This is a great dinner for any night of the week.",
    "",
    "## Ingredients",
    "",
    "Ground beef, pork, breadcrumbs, egg, cream, allspice, nutmeg, salt, pepper, butter, flour, beef stock, cream.",
    "",
    "## Instructions",
    "",
    "1. Mix all meatball ingredients together. Shape into balls.",
    "2. Fry the meatballs in butter until browned.",
    "3. Remove meatballs and make the sauce with butter, flour, stock, and cream.",
    "4. Return meatballs to the sauce and simmer until cooked through.",
    "",
    "This recipe serves two people and takes about 45 minutes to make.",
  ].join("\n"),
  ingredients: [
    { name: "ground beef", quantity: "250g" },
    { name: "ground pork", quantity: "170g" },
    { name: "breadcrumbs", quantity: "some" },
    { name: "egg", quantity: "1" },
    { name: "cream", quantity: "some" },
  ],
  instructions: [
    { text: "Mix all meatball ingredients together and shape into balls.", step: 1 },
    { text: "Fry meatballs in butter until browned.", step: 2 },
    { text: "Make sauce with butter, flour, stock, and cream.", step: 3 },
    { text: "Return meatballs to sauce and simmer until cooked.", step: 4 },
  ],
  tags: ["Main Course", "Swedish"],
  prepTime: "20 min",
  cookTime: "25 min",
  totalTime: "45 min",
  servings: "2",
  difficulty: "Easy",
  imagePrompt: "Swedish meatballs in cream sauce, food photography",
  jsonLd: {},
}

/**
 * Pass 2 — Improved content after feedback from Pass 1.
 */
export const RECIPE_OUTPUT_PASS_IMPROVED: ChefAugustinOutput = {
  ...RECIPE_OUTPUT_PASS_GOOD,
  // Same good content — simulates the Writer fixing all issues
}

// ── Banned-word content (for scrub scenario) ───────────────────────────────────

export const RECIPE_OUTPUT_WITH_BANNED_WORDS: ChefAugustinOutput = {
  ...RECIPE_OUTPUT_PASS_GOOD,
  contentMarkdown: RECIPE_OUTPUT_PASS_GOOD.contentMarkdown.replace(
    "The cream sauce benefits from a splash",
    "Let's delve into this robust and game-changing cream sauce. It will transform your meal. The cream sauce is a tapestry of flavors that benefits from a splash",
  ),
}
