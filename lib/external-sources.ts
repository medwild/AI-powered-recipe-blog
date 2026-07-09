// lib/external-sources.ts
// Curated Knowledge Base — Verified Food Science Facts with Sources
//
// Phase A4: External Source Citations for GEO/LLM optimization.
// Deterministic, no API calls, no hallucination risk.
//
// Each entry is a verified scientific or institutional fact that the Strategist
// can match to a recipe/article by topic tags. The Writer inserts 1-2
// matched citations naturally in the article body.
//
// Maintenance: review and expand quarterly. Remove or update any fact
// whose source has been superseded.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExternalSource = {
  /** Unique identifier — kebab-case */
  id: string
  /** The specific, citable fact (1-2 sentences). Must contain a number or named entity. */
  fact: string
  /** Verifiable authority: institution, study, government agency, or recognized expert. */
  source: string
  /** Optional URL to the primary source. */
  sourceUrl?: string
  /** Topic tags for keyword matching (lowercase). */
  tags: string[]
  /** Ready-to-use inline citation format for the Writer. */
  citationFormat: string
}

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export const EXTERNAL_SOURCES: ExternalSource[] = [
  // ── Food Safety (USDA) ──────────────────────────────────────────────────
  {
    id: "usda-poultry-165",
    fact: "Poultry must reach an internal temperature of 165°F (74°C) to eliminate Salmonella and Campylobacter, the two most common pathogens in raw chicken.",
    source: "USDA Food Safety and Inspection Service",
    sourceUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    tags: ["meat", "poultry", "chicken", "turkey", "food-safety", "general"],
    citationFormat: "According to the USDA Food Safety and Inspection Service, poultry must reach 165°F (74°C) to eliminate Salmonella and Campylobacter.",
  },
  {
    id: "usda-ground-meat-160",
    fact: "Ground meats (beef, pork, lamb) must reach 160°F (71°C) internal temperature — harmful bacteria on the surface are mixed throughout during grinding.",
    source: "USDA Food Safety and Inspection Service",
    sourceUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    tags: ["meat", "beef", "pork", "lamb", "food-safety", "general"],
    citationFormat: "The USDA requires ground meats to reach 160°F (71°C) — grinding distributes surface bacteria throughout the meat.",
  },
  {
    id: "usda-rest-time",
    fact: "Whole cuts of beef, pork, veal, and lamb should rest for at least 3 minutes after reaching 145°F (63°C) internal temperature.",
    source: "USDA Food Safety and Inspection Service",
    sourceUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    tags: ["meat", "beef", "pork", "lamb", "food-safety", "general"],
    citationFormat: "Per USDA guidelines, whole cuts of meat should rest at least 3 minutes after reaching 145°F (63°C).",
  },
  {
    id: "usda-leftovers-165",
    fact: "Leftovers and casseroles must be reheated to 165°F (74°C) to ensure any bacteria that grew during storage are destroyed.",
    source: "USDA Food Safety and Inspection Service",
    sourceUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    tags: ["food-safety", "general"],
    citationFormat: "The USDA advises reheating leftovers to 165°F (74°C) to destroy any bacteria that may have grown during storage.",
  },

  // ── Maillard Reaction & Browning ────────────────────────────────────────
  {
    id: "maillard-temperature-threshold",
    fact: "The Maillard reaction — responsible for the brown crust on seared meat and baked bread — begins around 300°F (150°C) and accelerates exponentially above 400°F (200°C).",
    source: "Harold McGee, 'On Food and Cooking: The Science and Lore of the Kitchen'",
    tags: ["meat", "baking", "general", "sauce"],
    citationFormat: "As Harold McGee explains in On Food and Cooking, the Maillard reaction begins around 300°F (150°C) and accelerates dramatically above 400°F.",
  },
  {
    id: "maillard-moisture-barrier",
    fact: "Moisture on the surface of food inhibits the Maillard reaction — water cannot exceed 212°F (100°C) at atmospheric pressure, well below the 300°F threshold needed for browning.",
    source: "Harold McGee, 'On Food and Cooking: The Science and Lore of the Kitchen'",
    tags: ["meat", "general", "vegetables"],
    citationFormat: "In On Food and Cooking, Harold McGee notes that surface moisture inhibits browning because water cannot exceed 212°F — below the Maillard reaction's 300°F threshold.",
  },

  // ── Salt Science ────────────────────────────────────────────────────────
  {
    id: "salt-gluten-strengthening",
    fact: "Salt strengthens the gluten network in dough by tightening the protein bonds — this is why bread dough with salt is less sticky and holds its shape better than unsalted dough.",
    source: "King Arthur Baking Company, 'The Science of Salt in Bread Baking'",
    tags: ["baking", "bread", "sourdough", "fermentation", "general"],
    citationFormat: "According to King Arthur Baking Company, salt tightens gluten protein bonds, making dough less sticky and better at holding its shape.",
  },
  {
    id: "salt-water-pasta",
    fact: "Pasta water should contain 1 tablespoon of kosher salt per 4 quarts of water — the water should taste like seawater. Only about 3% of the salt is actually absorbed by the pasta, but it seasons it from within.",
    source: "Serious Eats / J. Kenji López-Alt, 'The Food Lab'",
    tags: ["pasta", "general"],
    citationFormat: "As J. Kenji López-Alt explains in The Food Lab, only about 3% of the salt in pasta water is absorbed — but it seasons the pasta from within.",
  },

  // ── Fermentation & Sourdough ────────────────────────────────────────────
  {
    id: "sourdough-ph-acid",
    fact: "Sourdough fermentation produces lactic and acetic acids that lower the dough's pH to 3.5-4.5 — this acidity extends the bread's shelf life by naturally inhibiting mold growth.",
    source: "American Society of Baking, 'Sourdough Science'",
    tags: ["sourdough", "fermentation", "baking", "bread"],
    citationFormat: "The American Society of Baking notes that sourdough's pH of 3.5-4.5 naturally inhibits mold growth, extending shelf life without preservatives.",
  },
  {
    id: "fermentation-temperature-window",
    fact: "Lactic acid bacteria in sourdough are most active between 75-85°F (24-29°C), while yeast activity peaks between 80-90°F (27-32°C) — cooler fermentation favors bacteria and produces a more sour loaf.",
    source: "American Society of Baking, 'Sourdough Science'",
    tags: ["sourdough", "fermentation", "baking", "bread"],
    citationFormat: "Per the American Society of Baking, cooler sourdough fermentation (75-82°F) favors lactic acid bacteria over yeast, producing a tangier loaf.",
  },

  // ── Egg Science ─────────────────────────────────────────────────────────
  {
    id: "egg-coagulation-temperatures",
    fact: "Egg whites begin to coagulate at 140-149°F (60-65°C), while yolks set between 149-158°F (65-70°C) — this is why custards thicken at precisely 160-170°F (71-77°C), the point where both white and yolk proteins fully set.",
    source: "Harold McGee, 'On Food and Cooking: The Science and Lore of the Kitchen'",
    tags: ["eggs", "baking", "general"],
    citationFormat: "Harold McGee's On Food and Cooking explains that egg proteins set at different temperatures — whites at 140-149°F, yolks at 149-158°F — which is why custards thicken at 160-170°F.",
  },

  // ── Fat & Oil Science ───────────────────────────────────────────────────
  {
    id: "smoke-points-polyunsaturated",
    fact: "Oils high in polyunsaturated fats (like walnut and flaxseed oil) have lower smoke points and degrade faster when heated — extra-virgin olive oil, predominantly monounsaturated, has a smoke point of 375-410°F (190-210°C) depending on refinement.",
    source: "Modernist Cuisine, 'The Science of Cooking Oils' (Nathan Myhrvold)",
    tags: ["general", "sauce", "meat", "vegetables"],
    citationFormat: "Modernist Cuisine notes that extra-virgin olive oil, being predominantly monounsaturated, has a smoke point of 375-410°F — higher than many home cooks assume.",
  },
  {
    id: "butter-smoke-point",
    fact: "Butter has a smoke point of only 300-350°F (150-177°C) due to its milk solids — clarified butter (ghee) removes those solids, raising the smoke point to 450°F (232°C).",
    source: "Modernist Cuisine, 'The Science of Cooking Oils' (Nathan Myhrvold)",
    tags: ["general", "sauce", "meat", "dairy"],
    citationFormat: "According to Modernist Cuisine, clarifying butter removes the milk solids that burn at 300-350°F, raising the smoke point to 450°F.",
  },

  // ── Gluten & Baking Science ─────────────────────────────────────────────
  {
    id: "gluten-rest-relaxation",
    fact: "Resting dough for 10-30 minutes allows gluten strands to relax, reducing elasticity and making the dough easier to shape — this is why recipes call for resting before rolling or stretching.",
    source: "King Arthur Baking Company, 'Gluten: A Guide to the Hows and Whys of Baking'",
    tags: ["baking", "bread", "pasta", "general"],
    citationFormat: "King Arthur Baking Company explains that resting dough relaxes gluten strands, making the dough more extensible and easier to shape.",
  },
  {
    id: "protein-content-flour",
    fact: "Bread flour contains 12-14% protein, all-purpose flour 10-12%, and cake flour 7-9% — higher protein means more gluten development, yielding chewier textures and better structure for yeast breads.",
    source: "King Arthur Baking Company, 'Flour: A Guide to Choosing the Right Flour'",
    tags: ["baking", "bread", "general"],
    citationFormat: "Per King Arthur Baking Company, bread flour's 12-14% protein content develops more gluten than all-purpose flour's 10-12%, yielding chewier, better-structured loaves.",
  },

  // ── Vegetable & Produce Science ─────────────────────────────────────────
  {
    id: "blanching-enzyme-deactivation",
    fact: "Blanching vegetables for 1-3 minutes in boiling water deactivates enzymes (specifically peroxidase and catalase) that cause loss of color, flavor, and texture during freezing — vegetables frozen without blanching degrade 4× faster.",
    source: "National Center for Home Food Preservation, University of Georgia",
    sourceUrl: "https://nchfp.uga.edu/how/freeze/blanching.html",
    tags: ["vegetables", "general"],
    citationFormat: "The National Center for Home Food Preservation at the University of Georgia recommends blanching vegetables before freezing to deactivate enzymes that degrade color and texture.",
  },
  {
    id: "onion-caramelization-time",
    fact: "Properly caramelized onions require 30-45 minutes of cooking over medium-low heat — any recipe claiming to caramelize onions in under 15 minutes is sautéing them, not caramelizing them.",
    source: "Serious Eats / J. Kenji López-Alt, 'The Food Lab: Caramelized Onions'",
    tags: ["vegetables", "general", "sauce"],
    citationFormat: "J. Kenji López-Alt's testing for Serious Eats found that properly caramelized onions require at least 30-45 minutes — anything under 15 minutes is merely sautéing.",
  },

  // ── Rice & Grains ───────────────────────────────────────────────────────
  {
    id: "rice-water-ratio",
    fact: "White long-grain rice absorbs water at a 1:2 ratio (1 cup rice to 2 cups water), while brown rice requires 2.5:1 due to its bran layer — jasmine and basmati rice absorb slightly less at 1:1.5.",
    source: "America's Test Kitchen, 'The Science of Good Cooking'",
    tags: ["general", "rice", "grains"],
    citationFormat: "America's Test Kitchen's testing confirms that white long-grain rice absorbs water at a 1:2 ratio, while brown rice needs 2.5:1 due to its intact bran layer.",
  },

  // ── Dairy & Cheese ──────────────────────────────────────────────────────
  {
    id: "cheese-melting-ph",
    fact: "Cheese melts best at pH 5.3-5.5 — young cheeses like mozzarella and young cheddar melt smoothly, while aged cheeses (pH below 5.0) become grainy because the protein structure has tightened too much.",
    source: "Harold McGee, 'On Food and Cooking: The Science and Lore of the Kitchen'",
    tags: ["dairy", "cheese", "sauce", "general"],
    citationFormat: "In On Food and Cooking, Harold McGee explains that cheese melts best at pH 5.3-5.5 — aged cheeses fall below this threshold and melt unevenly.",
  },
  {
    id: "cream-fat-content",
    fact: "Heavy cream must contain at least 36% milkfat by USDA definition — this fat content is what allows it to whip into stable peaks and resist curdling in hot sauces.",
    source: "USDA Agricultural Marketing Service, 'Dairy Product Definitions'",
    tags: ["dairy", "sauce", "general"],
    citationFormat: "The USDA defines heavy cream as containing at least 36% milkfat — this fat content enables stable whipped peaks and resistance to curdling in hot preparations.",
  },

  // ── Acid & Marinades ────────────────────────────────────────────────────
  {
    id: "marinade-surface-only",
    fact: "Marinades penetrate only 1-3 millimeters into meat — their primary effect is on the surface, which is why the marinade's flavor compounds matter more than the duration beyond the first 2-4 hours.",
    source: "America's Test Kitchen, 'The Science of Good Cooking: Marinades'",
    tags: ["meat", "general"],
    citationFormat: "America's Test Kitchen found that marinades only penetrate meat 1-3 millimeters deep — flavoring the surface matters more than extended marinating times.",
  },
  {
    id: "acid-tenderizing-myth",
    fact: "Acidic marinades (vinegar, citrus, wine) do NOT tenderize meat in a useful way — extended acid exposure denatures surface proteins but also makes the exterior mushy if left longer than 4-6 hours.",
    source: "Serious Eats / J. Kenji López-Alt, 'The Truth About Marinating'",
    tags: ["meat", "sauce", "general"],
    citationFormat: "According to Serious Eats, acidic marinades don't meaningfully tenderize meat — prolonged exposure actually degrades the surface texture rather than improving it.",
  },

  // ── Resting & Carryover Cooking ─────────────────────────────────────────
  {
    id: "carryover-cooking-temperature-rise",
    fact: "A large roast (3+ pounds) experiences 10-15°F of carryover cooking after leaving the oven — pulling it at 130°F yields a final temperature of 140-145°F after resting.",
    source: "America's Test Kitchen, 'The Science of Good Cooking: Carryover'",
    tags: ["meat", "general"],
    citationFormat: "America's Test Kitchen has measured that large roasts rise 10-15°F during carryover cooking — pulling at 130°F yields a perfect medium-rare 140-145°F.",
  },
  {
    id: "resting-moisture-redistribution",
    fact: "Resting meat after cooking allows muscle fibers to reabsorb moisture — cutting immediately releases up to 30% more liquid than meat rested for 5-10 minutes.",
    source: "Serious Eats / J. Kenji López-Alt, 'The Food Lab: The Importance of Resting Meat'",
    tags: ["meat", "general"],
    citationFormat: "J. Kenji López-Alt's testing at Serious Eats found that un-rested meat loses up to 30% more liquid than meat rested for 5-10 minutes.",
  },

  // ── Emulsions ───────────────────────────────────────────────────────────
  {
    id: "emulsion-temperature-matching",
    fact: "Emulsions (vinaigrettes, mayonnaise, hollandaise) form most reliably when all ingredients are at the same temperature — cold oil and room-temperature egg yolks will separate because the fat cannot disperse evenly.",
    source: "Harold McGee, 'On Food and Cooking: The Science and Lore of the Kitchen'",
    tags: ["sauce", "eggs", "general"],
    citationFormat: "Harold McGee explains in On Food and Cooking that emulsions require all ingredients at the same temperature — mismatched temperatures prevent the fat from dispersing evenly.",
  },

  // ── Baking Soda & Browning ──────────────────────────────────────────────
  {
    id: "baking-soda-browning-alkaline",
    fact: "Baking soda raises the pH of food surfaces above 7.0, accelerating both the Maillard reaction and caramelization — this is why recipes for crispy potatoes and deeply browned onions often call for a pinch of baking soda.",
    source: "Serious Eats / J. Kenji López-Alt, 'The Food Lab: Baking Soda for Browning'",
    tags: ["vegetables", "baking", "general", "meat"],
    citationFormat: "Serious Eats has demonstrated that baking soda's alkaline environment accelerates both Maillard browning and caramelization by raising surface pH above 7.0.",
  },
]

// ---------------------------------------------------------------------------
// Matching Logic
// ---------------------------------------------------------------------------

/**
 * Matches external sources to a recipe keyword.
 *
 * For each source, checks how many of its topic tags appear as substrings
 * in the keyword. Sources tagged "general" receive a base score of 1 so
 * universally-applicable facts (food safety, Maillard reaction, etc.)
 * are always available at lower priority.
 *
 * @param keyword - The recipe/article keyword (e.g., "sourdough discard flatbread")
 * @param maxResults - Maximum number of sources to return (default 5)
 */
export function getRelevantSources(
  keyword: string,
  maxResults: number = 5,
): ExternalSource[] {
  const keywordLower = keyword.toLowerCase()

  // Score each source by how many of its tags appear in the keyword
  const scored = EXTERNAL_SOURCES.map(source => {
    // Direct tag matches in the keyword (weighted 2×)
    const keywordMatches = source.tags
      .filter(t => t !== "general" && keywordLower.includes(t))
      .length
    // General-tag sources apply to everything at base priority
    const generalBonus = source.tags.includes("general") ? 1 : 0

    return { source, score: keywordMatches * 2 + generalBonus }
  })

  // Return top matches, sorted by relevance
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.source)
}

/**
 * Formats a list of external sources as a string for inclusion in the
 * Strategist user prompt.
 */
export function formatSourcesForPrompt(sources: ExternalSource[]): string {
  if (sources.length === 0) return ""
  return sources.map((s, i) =>
    `${i + 1}. **${s.fact}**\n   Source: ${s.source}${s.sourceUrl ? ` (${s.sourceUrl})` : ""}\n   Suggested citation: "${s.citationFormat}"\n   Tags: ${s.tags.join(", ")}`,
  ).join("\n")
}
