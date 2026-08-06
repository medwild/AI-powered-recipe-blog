/**
 * Topical Authority Map — Data Structures & Cluster Presets
 *
 * Based on the Entity-Attribute-Value (E-A-V) model from the Koray Gübür framework.
 * Each cluster maps to a pillar page + spoke pages targeting specific keywords.
 */

// ---- Types ----

export interface EAVTriple {
  entity: string
  attribute: string
  values: string[]
}

export interface TopicNode {
  title: string
  keyword: string
  volume: number
  kd: number
  intent: "informational" | "commercial" | "transactional"
  requiredEntities: string[]
  wordCountRange: { min: number; max: number }
  type: "pillar" | "spoke" | "article"
}

export interface Cluster {
  id: string
  name: string
  cuisine: string
  section: "core" | "outer"
  pillarPage: TopicNode
  spokes: TopicNode[]
  coverageContribution: number
  kdAvg: number
  totalVolume: number
  description: string        // Used on hub pages
  siblings: string[]         // Cross-link target cluster IDs
}

export interface CoverageReport {
  clusterId: string
  clusterName: string
  targetTopics: number
  publishedTopics: number
  coveragePercent: number
  gaps: TopicNode[]
}

// ---- Dinners-for-Two Preset ----

export const DINNERS_FOR_TWO_PRESET = {
  name: "Easy Weeknight Dinners for Two",
  ingredients: "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs, cheese, soy sauce, ginger, bell peppers",
  techniques: "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, batch prep, portion scaling, stir-frying, pan-roasting",
}

// ---- Dinners-for-Two Clusters ----

export const SLOW_COOKER_CLUSTER: Cluster = {
  id: "small-batch-slow-cooker",
  name: "Small-Batch Slow Cooker Dinners for Two",
  cuisine: "Small-Batch Slow Cooker",
  section: "core",
  kdAvg: 5,
  totalVolume: 12_500,
  coverageContribution: 25,
  description:
    "Set-and-forget dinners perfectly portioned for two. Hearty stews, tender meats, and comforting soups made simple in a small slow cooker.\n\n" +
    "These recipes are built around a 2-quart cooker, the size that fits two servings without burying you in leftovers. Slow cooker chicken and gravy, a chicken and ground beef ragu, chicken and rice, and a crockpot chicken and tomato rice all follow the same small-batch logic: liquid ratios that don't drown two portions, cook times tuned to a smaller vessel, and proteins that come out tender instead of dried out.\n\n" +
    "If you've only ever cooked in a full-size crock pot, the two-quart difference is real — food cooks faster and reduces harder, so the recipes here spell out the adjustments. Load the pot, set the time, and dinner is done when you are.",
  siblings: ["budget-meals-for-two", "one-pan-dinners-for-two", "chicken-dinners-for-two"],
  pillarPage: {
    title: "Small-Batch Slow Cooker Dinners for Two — The Complete Guide",
    keyword: "slow cooker recipes for two",
    volume: 2400,
    kd: 8,
    intent: "informational",
    requiredEntities: ["slow_cooker", "small_batch", "dinner_for_two", "meal_prep"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "2-Quart Slow Cooker vs 6-Quart — What You Actually Need for Two",
      keyword: "2 quart slow cooker recipes",
      volume: 1600, kd: 4, intent: "informational",
      requiredEntities: ["slow_cooker", "small_kitchen_appliance", "portion_size"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Mini Crockpot Chicken Dinners for Two",
      keyword: "mini crockpot chicken recipes",
      volume: 2100, kd: 5, intent: "informational",
      requiredEntities: ["slow_cooker", "chicken", "small_batch"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Small-Batch Slow Cooker Beef Stew for Two",
      keyword: "slow cooker beef stew for two",
      volume: 1300, kd: 4, intent: "informational",
      requiredEntities: ["slow_cooker", "beef_stew", "small_batch", "comfort_food"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const ONE_PAN_CLUSTER: Cluster = {
  id: "one-pan-dinners-for-two",
  name: "One-Pan Dinners for Two",
  cuisine: "One-Pan Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 18_200,
  coverageContribution: 25,
  description:
    "Minimal cleanup, maximum flavor — all-in-one sheet pan and skillet dinners for two. Perfect for busy weeknights without the mountain of dishes.\n\n" +
    "The collection runs the full range of single-vessel cooking: a chicken enchilada skillet, lasagna built in one skillet from stove to oven, a pan-seared steak dinner with blistered green beans, salmon orzo with dill and capers, beef ramen noodles in 25 minutes, garlic shrimp orzo, ground beef and tomato rice, and a sheet-pan Easter dinner with lamb chops and spring vegetables.\n\n" +
    "What ties them together is technique written for a smaller pan: sauces reduce correctly on a 10-inch surface instead of scorching, proteins are cut for two and pulled at the right moment, and each recipe follows one order of operations so nothing sits waiting. The payoff is a layered dinner with a single pan to wash.",
  siblings: ["chicken-dinners-for-two", "quick-healthy-dinners", "small-batch-slow-cooker"],
  pillarPage: {
    title: "One-Pan Dinners for Two — Minimal Cleanup, Maximum Flavor",
    keyword: "one pan dinners for two",
    volume: 3600,
    kd: 6,
    intent: "informational",
    requiredEntities: ["one_pan_cooking", "sheet_pan", "easy_cleanup", "weeknight_dinner"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Sheet Pan Chicken and Vegetables for Two",
      keyword: "sheet pan chicken dinner for two",
      volume: 2900, kd: 5, intent: "informational",
      requiredEntities: ["sheet_pan", "chicken", "roasted_vegetables"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "One-Skillet Ground Beef Dinner for Two",
      keyword: "one skillet ground beef dinner for two",
      volume: 1400, kd: 4, intent: "informational",
      requiredEntities: ["skillet", "ground_beef", "one_pan_meal"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "One-Pan Lemon Garlic Salmon with Asparagus for Two",
      keyword: "one pan salmon dinner for two",
      volume: 2200, kd: 5, intent: "informational",
      requiredEntities: ["salmon", "asparagus", "sheet_pan", "healthy_dinner"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const BUDGET_CLUSTER: Cluster = {
  id: "budget-meals-for-two",
  name: "Budget Meals for Two",
  cuisine: "Budget Dinners",
  section: "core",
  kdAvg: 4,
  totalVolume: 9_800,
  coverageContribution: 20,
  description:
    "Delicious dinners for two that won't break the bank. Smart swaps, pantry staples, and affordable ingredients for every night of the week.\n\n" +
    "The recipes here keep the grocery bill small by building around pantry staples and one main ingredient: a chicken and tomato rice skillet, ground beef and tomato rice, easy beef ramen noodles, and slow cooker chicken and rice are all built from ingredients that cover a whole week of dinners.\n\n" +
    "Budget cooking for two comes with its own constraints — no family-pack portions to use up, no half a tray of leftovers — and these recipes are written for exactly two servings, so the ingredients you buy are the ingredients you use. Most are one-pan dinners that turn a small list into a full meal in 25 to 40 minutes.",
  siblings: ["chicken-dinners-for-two", "small-batch-slow-cooker", "one-pan-dinners-for-two"],
  pillarPage: {
    title: "Budget-Friendly Dinners for Two — Eat Well for Less",
    keyword: "budget dinners for two",
    volume: 2900,
    kd: 5,
    intent: "informational",
    requiredEntities: ["budget_cooking", "affordable_meals", "meal_planning", "grocery_savings"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "$5 Ground Beef Dinners for Two",
      keyword: "cheap ground beef dinners for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["ground_beef", "budget_meal", "affordable_protein"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Pantry Staple Dinners for Two — No Extra Grocery Trip",
      keyword: "pantry staple dinners for two",
      volume: 1200, kd: 3, intent: "informational",
      requiredEntities: ["pantry_cooking", "shelf_stable", "emergency_meals"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const CHICKEN_CLUSTER: Cluster = {
  id: "chicken-dinners-for-two",
  name: "Chicken Dinners for Two",
  cuisine: "Chicken Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 15_600,
  coverageContribution: 20,
  description:
    "Practical chicken recipes for two — quick weeknight dinners, sheet-pan meals, and stir-fries.\n\n" +
    "This is the deepest collection on the site, with 20+ chicken dinners covering the full weeknight range: white wine lemon chicken orzo, one-pan chicken and rice, garlic butter chicken pasta, a sheet-pan Thanksgiving dinner for two, chicken pot pie with a puff pastry lid, slow cooker chicken and gravy, and 25-minute pan-seared chicken with herb-butter sauce.\n\n" +
    "Every recipe is tested at two-serving scale, where the real challenge is keeping a small chicken breast juicy: pan size, heat, and resting time are spelled out for each method. Whatever style you're in the mood for — one-pan, slow cooker, pasta, or pot pie — there's a chicken dinner here that fits a Tuesday night.",
  siblings: ["one-pan-dinners-for-two", "quick-healthy-dinners", "budget-meals-for-two"],
  pillarPage: {
    title: "Chicken Dinners for Two — Practical Recipes for Small Households",
    keyword: "chicken dinners for two",
    volume: 4400,
    kd: 7,
    intent: "informational",
    requiredEntities: ["chicken", "small_batch_cooking", "weeknight_dinner", "poultry"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Pan-Seared Chicken Breast for Two — Juicy Every Time",
      keyword: "pan seared chicken breast for two",
      volume: 2400, kd: 5, intent: "informational",
      requiredEntities: ["chicken_breast", "pan_searing", "cooking_technique"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Chicken Thigh Sheet Pan Dinner for Two",
      keyword: "chicken thigh sheet pan dinner for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["chicken_thighs", "sheet_pan", "roasted_vegetables"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "15-Minute Chicken Stir-Fry for Two",
      keyword: "quick chicken stir fry for two",
      volume: 3200, kd: 6, intent: "informational",
      requiredEntities: ["chicken", "stir_fry", "quick_meal", "wok"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const ASIAN_CLUSTER: Cluster = {
  id: "asian-inspired-dinners",
  name: "Asian-Inspired Dinners for Two",
  cuisine: "Asian-Inspired Dinners",
  section: "outer",
  kdAvg: 5,
  totalVolume: 8_400,
  coverageContribution: 10,
  description:
    "Better-than-takeout Asian-inspired dinners for two. Quick stir-fries, rice bowls, and noodles packed with authentic flavor for easy weeknights.\n\n" +
    "The collection opens with an easy Asian beef noodle stir-fry that's on the table in 25 minutes — seared beef, noodles, and a soy-sesame sauce built in one skillet, sized for two servings with the takeout urge covered without the delivery fee.\n\n" +
    "The guiding idea is that good stir-fry is a technique, not a cuisine you need a wok for: a hot pan, ingredients prepped before the heat goes on, and a sauce that coats rather than drowns. Recipes follow that order of operations so the meal comes together in the time it would take to scroll a delivery app.",
  siblings: ["quick-healthy-dinners", "chicken-dinners-for-two", "one-pan-dinners-for-two"],
  pillarPage: {
    title: "Asian-Inspired Dinners for Two — Easy Weeknight Favorites",
    keyword: "easy asian dinners for two",
    volume: 2400,
    kd: 6,
    intent: "informational",
    requiredEntities: ["asian_cooking", "stir_fry", "rice_dishes", "quick_sauces"],
    wordCountRange: { min: 1800, max: 2500 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Better-Than-Takeout Beef and Broccoli for Two",
      keyword: "beef and broccoli for two",
      volume: 2900, kd: 5, intent: "informational",
      requiredEntities: ["beef", "broccoli", "stir_fry", "asian_sauce"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Quick Teriyaki Chicken Rice Bowls for Two",
      keyword: "teriyaki chicken rice bowl for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["chicken_teriyaki", "rice_bowl", "japanese_inspired"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const QUICK_HEALTHY_CLUSTER: Cluster = {
  id: "quick-healthy-dinners",
  name: "Quick & Healthy Dinners for Two",
  cuisine: "Quick & Healthy Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 12_000,
  coverageContribution: 15,
  description:
    "Fast dinners scaled for two, all built around short timelines and fresh ingredients — quick desserts included.\n\n" +
    "Speed here means honest cooking in 30 minutes or less, not convenience shortcuts: sauces that come together while the pasta boils, one-pan mains with a clear order of operations, and desserts like chocolate lava cakes and small-batch edible cookie dough that fit the same quick-turnaround brief.\n\n" +
    "Every recipe is sized for two servings with the timing written as a single timeline, so the meal lands on the table at once — no component waiting on another. It's the collection to reach for when the clock matters more than the occasion.",
  siblings: ["chicken-dinners-for-two", "asian-inspired-dinners", "one-pan-dinners-for-two"],
  pillarPage: {
    title: "Quick & Healthy Dinners for Two — 30 Minutes or Less",
    keyword: "quick healthy dinners for two",
    volume: 3600, kd: 6, intent: "informational",
    requiredEntities: ["quick_meals", "healthy_dinner", "30_minute_meals", "small_batch"],
    wordCountRange: { min: 2000, max: 2800 }, type: "pillar",
  },
  spokes: [
    {
      title: "15-Minute Mediterranean Bowls for Two",
      keyword: "quick mediterranean bowls for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["mediterranean", "grain_bowl", "quick_meal"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "30-Minute Healthy Salmon Dinner for Two",
      keyword: "healthy salmon dinner for two",
      volume: 2400, kd: 5, intent: "informational",
      requiredEntities: ["salmon", "healthy_fats", "omega_3", "quick_dinner"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "High-Protein Ground Turkey Skillet for Two",
      keyword: "ground turkey skillet for two",
      volume: 1600, kd: 4, intent: "informational",
      requiredEntities: ["ground_turkey", "high_protein", "skillet_meal"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

/**
 * All active clusters in the topical map.
 * Add new clusters here as we expand to new cuisines.
 */
export const TOPICAL_MAP: Cluster[] = [
  SLOW_COOKER_CLUSTER,   // Priority 1 — 12.5K vol
  ONE_PAN_CLUSTER,       // Priority 2 — 18.2K vol (head term)
  BUDGET_CLUSTER,        // Priority 3 — 9.8K vol
  CHICKEN_CLUSTER,       // Priority 4 — 15.6K vol
  ASIAN_CLUSTER,         // Priority 5 — 8.4K vol
  QUICK_HEALTHY_CLUSTER, // Priority 6 — 12K vol
]

/**
 * Look up a cluster by its ID.
 */
export function getClusterById(id: string): Cluster | undefined {
  return TOPICAL_MAP.find((c) => c.id === id)
}

/**
 * Get cuisine configuration for pipeline injection.
 */
export function getCuisineConfig(cuisine: string): {
  cuisine: string
  cuisine_ingredients: string
  cuisine_techniques: string
} {
  const presets: Record<string, { name: string; ingredients: string; techniques: string }> = {
    "dinners-for-two": DINNERS_FOR_TWO_PRESET,
    "small-batch slow cooker": DINNERS_FOR_TWO_PRESET,
    "one-pan dinners": DINNERS_FOR_TWO_PRESET,
    "budget dinners": DINNERS_FOR_TWO_PRESET,
    "chicken dinners": DINNERS_FOR_TWO_PRESET,
    "asian-inspired dinners": DINNERS_FOR_TWO_PRESET,
  }

  const preset = presets[cuisine.toLowerCase()] ?? presets["dinners-for-two"]
  return {
    cuisine: preset?.name ?? "Easy Weeknight Dinners for Two",
    cuisine_ingredients: preset?.ingredients ?? DINNERS_FOR_TWO_PRESET.ingredients,
    cuisine_techniques: preset?.techniques ?? DINNERS_FOR_TWO_PRESET.techniques,
  }
}
