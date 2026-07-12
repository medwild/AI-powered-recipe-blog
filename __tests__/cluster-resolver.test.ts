import { describe, it, expect } from "vitest"
import { resolveCluster, getAllClusters, getClusterById } from "@/lib/cluster-resolver"

describe("resolveCluster", () => {
  it("resolves chicken-dinners from chicken tag", () => {
    const result = resolveCluster(["chicken", "garlic", "butter"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("chicken-dinners-for-two")
    expect(result!.name).toBe("Chicken Dinners for Two")
  })

  it("resolves one-pan from sheet-pan tag", () => {
    const result = resolveCluster(["sheet-pan", "vegetables", "roasted"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("one-pan-dinners-for-two")
  })

  it("resolves slow-cooker from crockpot tag", () => {
    const result = resolveCluster(["crockpot", "beef", "stew"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("small-batch-slow-cooker")
  })

  it("resolves asian from stir-fry tag", () => {
    const result = resolveCluster(["stir-fry", "soy", "ginger"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("asian-inspired-dinners")
  })

  it("resolves budget from cheap tag", () => {
    const result = resolveCluster(["cheap", "pasta", "budget"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("budget-meals-for-two")
  })

  it("resolves quick-healthy from 30-minute tag", () => {
    const result = resolveCluster(["30-minute", "chicken", "salad"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("quick-healthy-dinners")
  })

  it("uses first-tag priority for multi-cluster matches", () => {
    // "chicken" appears first → chicken-dinners, not one-pan
    const result = resolveCluster(["chicken", "one-pan", "30-minute"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("chicken-dinners-for-two")
  })

  it("returns null for no matching tags", () => {
    const result = resolveCluster(["dessert", "chocolate", "baking"])
    expect(result).toBeNull()
  })

  it("returns null for empty tags array", () => {
    const result = resolveCluster([])
    expect(result).toBeNull()
  })

  it("is case-insensitive", () => {
    const result = resolveCluster(["CHICKEN", "Garlic"])
    expect(result).not.toBeNull()
    expect(result!.id).toBe("chicken-dinners-for-two")
  })
})

describe("getAllClusters", () => {
  it("returns all 6 clusters", () => {
    const clusters = getAllClusters()
    expect(clusters).toHaveLength(6)
  })

  it("each cluster has required fields", () => {
    for (const c of getAllClusters()) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.description).toBeTruthy()
      expect(c.siblings.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe("getClusterById", () => {
  it("returns cluster for valid id", () => {
    const c = getClusterById("chicken-dinners-for-two")
    expect(c).not.toBeNull()
    expect(c!.name).toBe("Chicken Dinners for Two")
  })

  it("returns null for invalid id", () => {
    expect(getClusterById("nonexistent")).toBeNull()
  })
})
