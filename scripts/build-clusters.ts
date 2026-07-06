/**
 * Topical Cluster Builder — PTRA Phase 4
 *
 * Reads scored keywords (≥75), groups them by token overlap,
 * assigns Pinterest intent + primary board per cluster.
 * Orphan keywords (no cluster match) are listed separately.
 *
 * Usage: npx tsx scripts/build-clusters.ts data/pinterest-scored.json
 */

import * as fs from "node:fs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoredKeyword {
  keyword: string
  score: number
  status: "high" | "medium" | "low" | "disqualified"
  breakdown: Record<string, unknown>
  niche_match: boolean
  hypotheses: string[]
  [key: string]: unknown
}

interface ClusterKeyword {
  keyword: string
  score: number
  breakdown: Record<string, unknown>
}

interface Cluster {
  cluster_name: string
  micro_niche: string
  user_problem: string
  pinterest_intent: string
  primary_board: string
  keywords: ClusterKeyword[]
  total_opportunity_score_avg: number
  priority: "high" | "medium" | "low"
}

interface ClustersOutput {
  micro_niche: string
  generated_at: string
  clusters: Cluster[]
  orphans: { keyword: string; score: number; reason: string }[]
  summary: {
    total_keywords_scored: number
    high_priority: number
    clusters_created: number
    orphans: number
  }
}

// ---------------------------------------------------------------------------
// Stop words (excluded from token comparison)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "recipe", "recipes", "easy", "best", "quick", "simple",
  "homemade", "how", "to", "make", "the", "and", "for",
  "with", "from", "ideas", "guide", "healthy",
])

// ---------------------------------------------------------------------------
// Semantic category mapping (fallback when token overlap fails)
// ---------------------------------------------------------------------------

const SEMANTIC_CATEGORIES: Record<string, { cluster: string; board: string; intent: string }> = {
  "diet": { cluster: "diet-specific-recipes", board: "Diet-Specific Recipes", intent: "beginner guide" },
  "carnivore": { cluster: "diet-specific-recipes", board: "Diet-Specific Recipes", intent: "beginner guide" },
  "fast": { cluster: "diet-specific-recipes", board: "Diet-Specific Recipes", intent: "beginner guide" },
  "cuisine": { cluster: "ethnic-cuisine-recipes", board: "International Recipes", intent: "inspiration" },
  "finnish": { cluster: "ethnic-cuisine-recipes", board: "International Recipes", intent: "inspiration" },
  "venezuelan": { cluster: "ethnic-cuisine-recipes", board: "International Recipes", intent: "inspiration" },
  "griddle": { cluster: "griddle-recipes", board: "Blackstone & Griddle Recipes", intent: "step-by-step" },
  "blackstone": { cluster: "griddle-recipes", board: "Blackstone & Griddle Recipes", intent: "step-by-step" },
  "drink": { cluster: "drink-recipes", board: "Drinks & Beverages", intent: "quick solution" },
  "soda": { cluster: "drink-recipes", board: "Drinks & Beverages", intent: "quick solution" },
  "wonton": { cluster: "wonton-wrapper-recipes", board: "Wonton Wrapper Recipes", intent: "step-by-step" },
  "chuck": { cluster: "beef-recipes", board: "Beef & Steak Recipes", intent: "step-by-step" },
  "steak": { cluster: "beef-recipes", board: "Beef & Steak Recipes", intent: "step-by-step" },
  "venison": { cluster: "game-meat-recipes", board: "Game Meat Recipes", intent: "step-by-step" },
  "bisquick": { cluster: "bisquick-recipes", board: "Bisquick Recipes", intent: "quick solution" },
  "daniel": { cluster: "faith-based-recipes", board: "Faith-Based Recipes", intent: "beginner guide" },
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

function extractTokens(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
}

function tokenOverlap(a: string[], b: string[]): number {
  return a.filter((t) => b.includes(t)).length
}

// ---------------------------------------------------------------------------
// Intent assignment
// ---------------------------------------------------------------------------

function inferIntent(keyword: string): string {
  const kw = keyword.toLowerCase()
  const words = kw.split(/\s+/)
  if (words.includes("easy") || words.includes("quick")) return "quick solution"
  if (words.includes("beginner") || words.includes("guide")) return "beginner guide"
  if (words.includes("diet") || words.includes("fast")) return "beginner guide"
  return "step-by-step" // default for recipes
}

function inferBoard(keyword: string): string {
  const kw = keyword.toLowerCase()
  const words = kw.split(/\s+/)
  for (const [token, category] of Object.entries(SEMANTIC_CATEGORIES).sort(([a], [b]) => b.length - a.length)) {
    if (words.includes(token)) return category.board
  }
  // Default: capitalize significant words
  const tokens = extractTokens(keyword)
  return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") + " Recipes"
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

function buildClusters(keywords: ScoredKeyword[]): { clusters: Cluster[]; orphans: { keyword: string; score: number; reason: string }[] } {
  const highOnly = keywords.filter((k) => k.status === "high")
  const assigned = new Set<number>()
  const clusters: Cluster[] = []

  for (let i = 0; i < highOnly.length; i++) {
    if (assigned.has(i)) continue
    const tokens = extractTokens(highOnly[i].keyword)
    const group: ScoredKeyword[] = [highOnly[i]]

    // Find keywords with >=2 token overlap
    for (let j = i + 1; j < highOnly.length; j++) {
      if (assigned.has(j)) continue
      const otherTokens = extractTokens(highOnly[j].keyword)
      if (tokenOverlap(tokens, otherTokens) >= 2) {
        group.push(highOnly[j])
        assigned.add(j)
      }
    }

    // If no overlap found, try semantic category fallback
    if (group.length === 1) {
      const kw = highOnly[i].keyword.toLowerCase()
      const category = Object.entries(SEMANTIC_CATEGORIES)
        .sort(([a], [b]) => b.length - a.length)
        .find(([token]) => kw.includes(token))
      if (category) {
        // Find other keywords in the same category
        for (let j = i + 1; j < highOnly.length; j++) {
          if (assigned.has(j)) continue
          if (highOnly[j].keyword.toLowerCase().includes(category[0])) {
            group.push(highOnly[j])
            assigned.add(j)
          }
        }
      }
    }

    if (group.length >= 2) {
      assigned.add(i)
      let clusterName = group[0].keyword.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => !STOP_WORDS.has(t)).slice(0, 3).join("-")
      if (!clusterName) {
        clusterName = "cluster-" + (clusters.length + 1)
      }
      clusters.push({
        cluster_name: clusterName,
        micro_niche: "",
        user_problem: "HYPOTHESIS — à définir",
        pinterest_intent: inferIntent(group[0].keyword),
        primary_board: inferBoard(group[0].keyword),
        keywords: group.map((k) => ({
          keyword: k.keyword,
          score: k.score,
          breakdown: k.breakdown,
        })),
        total_opportunity_score_avg: Math.round(group.reduce((s, k) => s + k.score, 0) / group.length),
        priority: "high",
      })
    }
  }

  // Collect orphans (keywords with no cluster)
  const orphans = highOnly
    .filter((_, i) => !assigned.has(i))
    .map((k) => ({ keyword: k.keyword, score: k.score, reason: "No token overlap with any other HIGH keyword" }))

  return { clusters, orphans }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error("Usage: npx tsx scripts/build-clusters.ts <scored.json>")
    process.exit(1)
  }

  const scored = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as ScoredKeyword[]
  const microNiche = process.argv[3] ?? ""

  const { clusters, orphans } = buildClusters(scored)

  const output: ClustersOutput = {
    micro_niche: microNiche,
    generated_at: new Date().toISOString().split("T")[0],
    clusters,
    orphans,
    summary: {
      total_keywords_scored: scored.length,
      high_priority: scored.filter((k) => k.status === "high").length,
      clusters_created: clusters.length,
      orphans: orphans.length,
    },
  }

  const outputPath = inputPath.endsWith("scored.json")
    ? inputPath.replace(/scored\.json$/, "clusters.json")
    : inputPath.replace(/\.json$/, "-clusters.json")
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log(`=== Topical Cluster Builder ===`)
  console.log(`Clusters: ${clusters.length}`)
  for (const c of clusters) {
    console.log(`  \u{1F4CC} ${c.cluster_name} \u{2014} ${c.keywords.length} keywords (avg ${c.total_opportunity_score_avg}) → board: ${c.primary_board}`)
  }
  if (orphans.length > 0) {
    console.log(`\nOrphans (${orphans.length}):`)
    for (const o of orphans) {
      console.log(`  ⚠️ ${o.keyword} (${o.score}) — ${o.reason}`)
    }
  }
  console.log(`\nClusters → ${outputPath}`)
  console.log(`Next step → npx tsx scripts/generate-pinterest-batch.ts ${outputPath}`)
}

main()
