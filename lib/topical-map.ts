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
  keyword: string          // Primary SEO keyword
  volume: number           // Monthly search volume (from Semrush)
  kd: number               // Keyword Difficulty (0-100)
  intent: "informational" | "commercial" | "transactional"
  requiredEntities: string[] // E-A-V attributes this page must cover
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
  coverageContribution: number // % of total topical coverage
  kdAvg: number
  totalVolume: number
}

export interface CoverageReport {
  clusterId: string
  clusterName: string
  targetTopics: number
  publishedTopics: number
  coveragePercent: number
  gaps: TopicNode[]
}

// ---- Sourdough Preset ----

export const SOURDOUGH_PRESET = {
  name: "Sourdough",
  ingredients: "bread flour, rye flour, whole wheat flour, sourdough starter, salt, water, olive oil, honey, butter, milk, eggs",
  techniques: "autolyse, stretch and fold, coil fold, bulk fermentation, cold retard, bench rest, scoring, steam baking (dutch oven), lamination, preferments (poolish/biga)",
}

// ---- Sourdough Clusters ----

export const STARTER_CLUSTER: Cluster = {
  id: "sourdough-starter-care",
  name: "Starter Care & Troubleshooting",
  cuisine: "Sourdough Starter",
  section: "core",
  kdAvg: 4,
  totalVolume: 5_650,
  coverageContribution: 12,
  pillarPage: {
    title: "The Complete Guide to Sourdough Starter — Creation, Care & Troubleshooting",
    keyword: "sourdough starter guide",
    volume: 590,
    kd: 4,
    intent: "informational",
    requiredEntities: ["sourdough_starter", "fermentation", "feeding_ratio", "troubleshooting"],
    wordCountRange: { min: 2200, max: 3000 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Why Does My Starter Smell Like Acetone?",
      keyword: "why does my sourdough starter smell like acetone",
      volume: 390, kd: 4, intent: "informational",
      requiredEntities: ["sourdough_starter", "acetone", "hooch", "feeding_schedule"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "My Sourdough Starter Is Runny — Here's the Fix",
      keyword: "my sourdough starter is runny",
      volume: 590, kd: 3, intent: "informational",
      requiredEntities: ["sourdough_starter", "hydration", "starter_consistency"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Can You Overfeed Sourdough Starter?",
      keyword: "can you overfeed sourdough starter",
      volume: 320, kd: 2, intent: "informational",
      requiredEntities: ["sourdough_starter", "feeding_ratio", "overfeeding"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
    {
      title: "White Mold on Sourdough Starter — Safe or Toss?",
      keyword: "white mold on sourdough starter",
      volume: 260, kd: 5, intent: "informational",
      requiredEntities: ["sourdough_starter", "mold", "food_safety", "starter_care"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
    {
      title: "Did I Kill My Sourdough Starter?",
      keyword: "did i kill my sourdough starter",
      volume: 210, kd: 3, intent: "informational",
      requiredEntities: ["sourdough_starter", "dead_starter", "reviving_starter"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
  ],
}

export const TECHNIQUE_CLUSTER: Cluster = {
  id: "sourdough-technique",
  name: "Baking Techniques & How-To",
  cuisine: "Sourdough Technique",
  section: "core",
  kdAvg: 4,
  totalVolume: 13_860,
  coverageContribution: 25,
  pillarPage: {
    title: "Sourdough Baking: The Complete Technique Guide",
    keyword: "sourdough baking techniques",
    volume: 720,
    kd: 5,
    intent: "informational",
    requiredEntities: ["sourdough_baking", "fermentation", "scoring", "steam_baking", "proofing"],
    wordCountRange: { min: 2500, max: 3500 },
    type: "pillar",
  },
  spokes: [
    {
      title: "How to Make Sourdough More Sour",
      keyword: "how to make sourdough bread more sour",
      volume: 480, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "fermentation", "sour_flavor", "acetic_acid"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Bake Sourdough Without a Dutch Oven — 5 Methods",
      keyword: "can you bake sourdough without a dutch oven",
      volume: 390, kd: 5, intent: "informational",
      requiredEntities: ["sourdough_baking", "steam", "dutch_oven_alternative", "oven_spring"],
      wordCountRange: { min: 1500, max: 2000 }, type: "spoke",
    },
    {
      title: "Sourdough Proofing: The Complete Visual Guide",
      keyword: "proofing sourdough",
      volume: 720, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "proofing", "fermentation", "poke_test"],
      wordCountRange: { min: 1500, max: 2200 }, type: "spoke",
    },
    {
      title: "How Many Stretch and Folds Do You Need?",
      keyword: "how many stretches and folds for sourdough",
      volume: 260, kd: 2, intent: "informational",
      requiredEntities: ["sourdough", "stretch_and_fold", "gluten_development"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
    {
      title: "Slow Fermented Sourdough vs Fast — What's the Difference?",
      keyword: "slow fermented sourdough bread",
      volume: 480, kd: 4, intent: "informational",
      requiredEntities: ["sourdough", "long_fermentation", "flavor_development", "digestibility"],
      wordCountRange: { min: 1500, max: 2000 }, type: "spoke",
    },
  ],
}

export const DISCARD_CLUSTER: Cluster = {
  id: "sourdough-discard",
  name: "Sourdough Discard Recipes",
  cuisine: "Sourdough Discard",
  section: "core",
  kdAvg: 4,
  totalVolume: 78_080,
  coverageContribution: 30,
  pillarPage: {
    title: "Sourdough Discard Recipes: 20+ Ways to Never Waste Starter",
    keyword: "sourdough discard recipes",
    volume: 74_000,
    kd: 29,
    intent: "informational",
    requiredEntities: ["sourdough_discard", "zero_waste", "discard_recipes", "starter_maintenance"],
    wordCountRange: { min: 2500, max: 3500 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Sourdough Discard Pretzel Bites",
      keyword: "sourdough discard pretzel bites recipe",
      volume: 390, kd: 4, intent: "informational",
      requiredEntities: ["sourdough_discard", "pretzel", "snack"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Discard Garlic Bread",
      keyword: "sourdough discard garlic bread",
      volume: 320, kd: 4, intent: "informational",
      requiredEntities: ["sourdough_discard", "garlic_bread", "side_dish"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Discard Dutch Baby Pancake",
      keyword: "sourdough discard dutch baby",
      volume: 390, kd: 5, intent: "informational",
      requiredEntities: ["sourdough_discard", "dutch_baby", "breakfast"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Discard Chocolate Cupcakes",
      keyword: "sourdough discard chocolate cupcakes",
      volume: 320, kd: 5, intent: "informational",
      requiredEntities: ["sourdough_discard", "cupcake", "dessert"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Discard Scallion Pancakes",
      keyword: "sourdough discard scallion pancakes",
      volume: 260, kd: 3, intent: "informational",
      requiredEntities: ["sourdough_discard", "scallion_pancake", "savory"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Discard Cast Iron Pizza",
      keyword: "sourdough discard pizza cast iron",
      volume: 170, kd: 3, intent: "informational",
      requiredEntities: ["sourdough_discard", "pizza", "cast_iron"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Discard French Bread",
      keyword: "sourdough discard french bread",
      volume: 480, kd: 4, intent: "informational",
      requiredEntities: ["sourdough_discard", "french_bread", "baguette"],
      wordCountRange: { min: 1500, max: 2000 }, type: "spoke",
    },
    {
      title: "Sourdough Discard Apple Fritters",
      keyword: "sourdough discard apple fritters",
      volume: 210, kd: 3, intent: "informational",
      requiredEntities: ["sourdough_discard", "apple_fritter", "dessert"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const BREADS_CLUSTER: Cluster = {
  id: "sourdough-flavored-breads",
  name: "Flavored & Specialty Breads",
  cuisine: "Sourdough Breads",
  section: "core",
  kdAvg: 4,
  totalVolume: 5_750,
  coverageContribution: 15,
  pillarPage: {
    title: "Flavored Sourdough Breads: 20+ Variations to Try",
    keyword: "flavored sourdough bread recipes",
    volume: 0,
    kd: 0,
    intent: "informational",
    requiredEntities: ["sourdough_bread", "flavored_bread", "inclusions"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Roasted Garlic Rosemary Sourdough Bread",
      keyword: "roasted garlic and rosemary sourdough bread",
      volume: 170, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "roasted_garlic", "rosemary", "savory_bread"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Cranberry Walnut Sourdough Bread",
      keyword: "cranberry walnut sourdough bread",
      volume: 260, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "cranberry", "walnut", "fruit_bread"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Jalapeño Cheddar Sourdough Bagels",
      keyword: "jalapeno cheddar sourdough bagels",
      volume: 170, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "jalapeno", "cheddar", "bagel"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "San Francisco Style Sourdough Bread",
      keyword: "san francisco style sourdough bread",
      volume: 590, kd: 4, intent: "informational",
      requiredEntities: ["sourdough", "san_francisco", "classic_sourdough", "lactobacillus"],
      wordCountRange: { min: 1500, max: 2000 }, type: "spoke",
    },
    {
      title: "Strawberry Sourdough Bread",
      keyword: "strawberry sourdough bread",
      volume: 590, kd: 4, intent: "informational",
      requiredEntities: ["sourdough", "strawberry", "sweet_bread"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const DISHES_CLUSTER: Cluster = {
  id: "sourdough-dishes",
  name: "Sourdough-Based Dishes & Meals",
  cuisine: "Sourdough Dishes",
  section: "core",
  kdAvg: 4,
  totalVolume: 13_680,
  coverageContribution: 12,
  pillarPage: {
    title: "Beyond the Loaf: Sourdough in Every Meal",
    keyword: "sourdough recipes beyond bread",
    volume: 0,
    kd: 0,
    intent: "informational",
    requiredEntities: ["sourdough", "cooking_with_sourdough", "sourdough_dishes"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Sourdough Focaccia Pizza",
      keyword: "sourdough focaccia pizza",
      volume: 880, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "focaccia", "pizza"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Crumpets — Easy English Classic",
      keyword: "sourdough crumpets",
      volume: 720, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "crumpet", "english"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "French Toast with Sourdough Bread",
      keyword: "can you make french toast with sourdough bread",
      volume: 720, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "french_toast", "breakfast"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Bread Stuffing",
      keyword: "sourdough bread stuffing",
      volume: 880, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "stuffing", "holiday"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Mac and Cheese",
      keyword: "sourdough mac and cheese",
      volume: 210, kd: 4, intent: "informational",
      requiredEntities: ["sourdough", "mac_and_cheese", "comfort_food"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Sourdough Pumpkin Cinnamon Rolls",
      keyword: "sourdough pumpkin cinnamon rolls",
      volume: 1000, kd: 5, intent: "informational",
      requiredEntities: ["sourdough", "cinnamon_roll", "pumpkin", "fall_baking"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const STORAGE_CLUSTER: Cluster = {
  id: "sourdough-storage",
  name: "Storage, Shelf Life & Leftovers",
  cuisine: "Sourdough Storage",
  section: "outer",
  kdAvg: 3,
  totalVolume: 3_810,
  coverageContribution: 6,
  pillarPage: {
    title: "Sourdough Storage: Keep Every Loaf Fresh",
    keyword: "how to store sourdough bread",
    volume: 0,
    kd: 0,
    intent: "informational",
    requiredEntities: ["sourdough", "bread_storage", "freezing", "shelf_life"],
    wordCountRange: { min: 1800, max: 2500 },
    type: "pillar",
  },
  spokes: [
    {
      title: "How Long Does Sourdough Bread Last?",
      keyword: "sourdough bread how long does it last",
      volume: 1000, kd: 2, intent: "informational",
      requiredEntities: ["sourdough", "shelf_life", "freshness"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
    {
      title: "How to Reheat Sourdough Bread",
      keyword: "how to reheat sourdough bread",
      volume: 880, kd: 3, intent: "informational",
      requiredEntities: ["sourdough", "reheating", "bread"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
    {
      title: "What to Do with Stale Sourdough Bread",
      keyword: "what to do with stale sourdough bread",
      volume: 210, kd: 4, intent: "informational",
      requiredEntities: ["sourdough", "stale_bread", "leftovers", "zero_waste"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
    {
      title: "Can You Freeze Sourdough Dough?",
      keyword: "can i freeze sourdough dough",
      volume: 210, kd: 4, intent: "informational",
      requiredEntities: ["sourdough", "freezing", "dough"],
      wordCountRange: { min: 1000, max: 1500 }, type: "spoke",
    },
  ],
}

/**
 * All active clusters in the topical map.
 * Add new clusters here as we expand to new cuisines.
 */
export const TOPICAL_MAP: Cluster[] = [
  DISCARD_CLUSTER,    // Priority 1 — 74K vol head term
  TECHNIQUE_CLUSTER,  // Priority 2 — 13.8K vol
  DISHES_CLUSTER,     // Priority 3 — 13.6K vol
  BREADS_CLUSTER,     // Priority 4 — 5.7K vol
  STARTER_CLUSTER,    // Priority 5 — 5.6K vol
  STORAGE_CLUSTER,    // Priority 6 — 3.8K vol
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
    sourdough: SOURDOUGH_PRESET,
    "sourdough starter": SOURDOUGH_PRESET,
    "sourdough technique": SOURDOUGH_PRESET,
    "sourdough discard": SOURDOUGH_PRESET,
    "sourdough breads": SOURDOUGH_PRESET,
    "sourdough dishes": SOURDOUGH_PRESET,
    "sourdough storage": SOURDOUGH_PRESET,
  }

  const preset = presets[cuisine.toLowerCase()] ?? presets["sourdough"]
  return {
    cuisine: preset?.name ?? "Sourdough",
    cuisine_ingredients: preset?.ingredients ?? SOURDOUGH_PRESET.ingredients,
    cuisine_techniques: preset?.techniques ?? SOURDOUGH_PRESET.techniques,
  }
}
