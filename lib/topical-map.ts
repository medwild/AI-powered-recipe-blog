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

// ---- Nordic Cluster Preset (Sprint 1) ----

export const SWEDISH_CUISINE = {
  name: "Swedish",
  ingredients: "salmon, rye flour, lingonberry, dill, cardamom, cream, potatoes, herring, pearl sugar, almond paste",
  techniques: "curing (gravlax), rye bread baking, cream-based sauces, cardamom baking, meatball making",
}

export const FINNISH_CUISINE = {
  name: "Finnish",
  ingredients: "salmon, rye flour, dill, potatoes, blueberries, mushrooms, cream, cardamom, reindeer meat, cloudberry",
  techniques: "rye bread baking, salmon soup making, berry desserts, slow fermentation, pulla (cardamom bread)",
}

export const NORDIC_CLUSTER: Cluster = {
  id: "nordic-home-cooking",
  name: "Nordic Home Cooking",
  cuisine: "Swedish & Finnish",
  section: "core",
  kdAvg: 18,
  totalVolume: 114_500,
  coverageContribution: 25,
  pillarPage: {
    title: "Easy Swedish Recipes You Can Make at Home",
    keyword: "easy swedish recipes at home",
    volume: 74_000,
    kd: 21,
    intent: "informational",
    requiredEntities: ["swedish_cuisine", "swedish_ingredients", "swedish_techniques", "ikea_recipes", "scandinavian_baking"],
    wordCountRange: { min: 1800, max: 2500 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Swedish Meatballs with Cream Sauce — Better Than IKEA",
      keyword: "swedish meatballs recipe",
      volume: 0,
      kd: 0,
      intent: "informational",
      requiredEntities: ["swedish_meatballs", "cream_sauce", "lingonberry_jam", "ikea_copycat"],
      wordCountRange: { min: 1500, max: 2000 },
      type: "spoke",
    },
    {
      title: "Quick Gravlax — No-Cure Scandinavian Salmon in 24 Hours",
      keyword: "gravlax recipe easy",
      volume: 0,
      kd: 0,
      intent: "informational",
      requiredEntities: ["gravlax", "cured_salmon", "dill", "scandinavian_appetizer"],
      wordCountRange: { min: 1500, max: 2000 },
      type: "spoke",
    },
    {
      title: "Kanelbullar — Swedish Cinnamon Buns Made Simple",
      keyword: "swedish cinnamon buns recipe",
      volume: 0,
      kd: 0,
      intent: "informational",
      requiredEntities: ["kanelbullar", "cardamom_baking", "swedish_fika", "yeast_dough"],
      wordCountRange: { min: 1500, max: 2000 },
      type: "spoke",
    },
    {
      title: "Easy Finnish Recipes You Can Make at Home",
      keyword: "easy finnish recipes at home",
      volume: 40_500,
      kd: 15,
      intent: "informational",
      requiredEntities: ["finnish_cuisine", "finnish_ingredients", "finnish_techniques", "nordic_baking"],
      wordCountRange: { min: 1800, max: 2500 },
      type: "pillar",
    },
    {
      title: "Lohikeitto — Creamy Finnish Salmon Soup in 30 Minutes",
      keyword: "finnish salmon soup recipe",
      volume: 0,
      kd: 0,
      intent: "informational",
      requiredEntities: ["lohikeitto", "salmon_soup", "finnish_comfort_food", "cream_soup"],
      wordCountRange: { min: 1500, max: 2000 },
      type: "spoke",
    },
    {
      title: "Nordic Rye Bread — The Science of Scandinavian Dark Bread",
      keyword: "swedish rye bread recipe",
      volume: 0,
      kd: 0,
      intent: "informational",
      requiredEntities: ["rye_bread", "scandinavian_baking", "sourdough", "dark_bread_science"],
      wordCountRange: { min: 2000, max: 2500 },
      type: "article",
    },
  ],
}

/**
 * All active clusters in the topical map.
 * Add new clusters here as we expand to new cuisines.
 */
export const TOPICAL_MAP: Cluster[] = [NORDIC_CLUSTER]

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
  const presets: Record<string, { ingredients: string; techniques: string }> = {
    swedish: SWEDISH_CUISINE,
    finnish: FINNISH_CUISINE,
  }

  const preset = presets[cuisine.toLowerCase()]
  return {
    cuisine: preset ? cuisine : "French",
    cuisine_ingredients: preset?.ingredients ?? "butter, cream, wine, shallots, garlic, herbs, cheese",
    cuisine_techniques: preset?.techniques ?? "sauce making, braising, pastry, knife skills",
  }
}
