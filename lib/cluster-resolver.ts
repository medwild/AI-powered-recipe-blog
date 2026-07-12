/**
 * Cluster Resolver — Deterministic tag-to-cluster mapping.
 *
 * Pure functions: no API calls, no DB queries, no side effects.
 * Uses the topical map clusters from lib/topical-map.ts.
 */

import { TOPICAL_MAP, type Cluster } from "@/lib/topical-map"

export interface ResolvedCluster {
  id: string
  name: string
  description: string
  siblings: string[]
}

/** Tag patterns → cluster ID mapping. Checked in order — first match wins. */
const TAG_TO_CLUSTER: [string[], string][] = [
  [["chicken", "poultry", "rotisserie"], "chicken-dinners-for-two"],
  [["slow-cooker", "crockpot", "mijoteuse"], "small-batch-slow-cooker"],
  [["one-pan", "sheet-pan", "one-pot", "single-pan", "skillet"], "one-pan-dinners-for-two"],
  [["asian", "stir-fry", "soy", "ginger", "sesame", "teriyaki"], "asian-inspired-dinners"],
  [["budget", "cheap", "affordable", "economical", "frugal"], "budget-meals-for-two"],
  [["healthy", "quick", "30-minute", "15-minute", "light", "low-carb"], "quick-healthy-dinners"],
]

/**
 * Resolve a recipe's cluster from its tags.
 * Tags are iterated in array order (most relevant first). First tag that matches
 * any cluster pattern wins.
 *
 * @returns ResolvedCluster | null if no tags match any cluster
 */
export function resolveCluster(tags: string[]): ResolvedCluster | null {
  if (!tags || tags.length === 0) return null

  for (const tag of tags) {
    const normalized = tag.toLowerCase()
    for (const [patterns, clusterId] of TAG_TO_CLUSTER) {
      if (patterns.some((p) => normalized.includes(p))) {
        const cluster = TOPICAL_MAP.find((c) => c.id === clusterId)
        if (cluster) {
          return {
            id: cluster.id,
            name: cluster.name,
            description: cluster.description,
            siblings: cluster.siblings,
          }
        }
      }
    }
  }

  return null
}

/** Get all clusters with their public-facing data. */
export function getAllClusters(): ResolvedCluster[] {
  return TOPICAL_MAP.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    siblings: c.siblings,
  }))
}

/** Look up a cluster by its ID. */
export function getClusterById(id: string): ResolvedCluster | null {
  const cluster = TOPICAL_MAP.find((c) => c.id === id)
  if (!cluster) return null
  return {
    id: cluster.id,
    name: cluster.name,
    description: cluster.description,
    siblings: cluster.siblings,
  }
}
