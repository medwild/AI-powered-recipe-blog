# Topical Authority SEO Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add classic organic SEO (topical authority via hub & spoke) as a 4th layer on top of existing hijacking + PTRA + LLM/GEO strategies, zero pipeline changes.

**Architecture:** Cluster inference from recipe tags (deterministic, no DB column). Hub pages at `/recettes?cluster=X`. Contextual internal links inserted as post-processing in `persist-phase.ts`. Cluster-aware breadcrumbs + related sidebar on recipe pages.

**Tech Stack:** TypeScript 5.7, Next.js 16 App Router, Drizzle ORM, Tailwind CSS 4

## Global Constraints

- ZERO changes to AI agents (Chef Augustin, Pin Designer)
- ZERO changes to Inngest step names or order
- ZERO database schema changes (no new columns)
- ZERO new routes (query parameter only)
- No new dependencies
- `npx tsc --noEmit` must pass after every task
- Existing pages must return 200 (no regression)
- `/articles/test` must return 404 (no routing regression)

---

### Task 1: Cluster Resolver + Topical Map Enhancements

**Files:**
- Create: `lib/cluster-resolver.ts`
- Modify: `lib/topical-map.ts:27-37` (Cluster interface), `lib/topical-map.ts:180-270` (cluster presets)
- Test: `__tests__/cluster-resolver.test.ts`

**Interfaces:**
- Consumes: `Cluster` interface from `lib/topical-map.ts`
- Produces: `resolveCluster(tags: string[]) => ResolvedCluster | null`
  - `ResolvedCluster = { id: string; name: string; description: string; siblings: string[] }`
- Produces: `getClusterById(id: string) => ResolvedCluster | null`
- Produces: `getAllClusters() => ResolvedCluster[]`
- Produces: `getClusterDescription(id: string) => string` (for hub page meta)

- [ ] **Step 1: Update the Cluster interface in `lib/topical-map.ts`**

Add `description` and `siblings` fields to the `Cluster` interface plus sibling data to each preset.

```typescript
// In the Cluster interface (line 27-37), add:
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
  description: string        // NEW — used on hub pages
  siblings: string[]         // NEW — cross-link target cluster IDs
}
```

Then update each cluster preset to include `description` and `siblings`. Example for CHICKEN_CLUSTER (add before `pillarPage`):

```typescript
export const CHICKEN_CLUSTER: Cluster = {
  id: "chicken-dinners-for-two",
  name: "Chicken Dinners for Two",
  cuisine: "Chicken Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 15_600,
  coverageContribution: 20,
  description: "Practical chicken recipes perfectly portioned for two people. Quick weeknight dinners, sheet-pan meals, and stir-fries that make cooking for a small household effortless.",
  siblings: ["one-pan-dinners-for-two", "quick-healthy-dinners", "budget-meals-for-two"],
  pillarPage: { /* ...unchanged... */ },
  spokes: [ /* ...unchanged... */ ],
}
```

Add `description` and `siblings` to all 5 exported clusters (SLOW_COOKER_CLUSTER, ONE_PAN_CLUSTER, BUDGET_CLUSTER, CHICKEN_CLUSTER, ASIAN_CLUSTER) plus add the missing `QUICK_HEALTHY_CLUSTER`:

```typescript
export const QUICK_HEALTHY_CLUSTER: Cluster = {
  id: "quick-healthy-dinners",
  name: "Quick & Healthy Dinners for Two",
  cuisine: "Quick & Healthy Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 12_000,
  coverageContribution: 15,
  description: "Fast, nutritious dinners scaled for two. All recipes ready in 30 minutes or less, using fresh ingredients and smart shortcuts.",
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
```

Add `QUICK_HEALTHY_CLUSTER` to the `TOPICAL_MAP` array:

```typescript
export const TOPICAL_MAP: Cluster[] = [
  SLOW_COOKER_CLUSTER,
  ONE_PAN_CLUSTER,
  BUDGET_CLUSTER,
  CHICKEN_CLUSTER,
  ASIAN_CLUSTER,
  QUICK_HEALTHY_CLUSTER,
]
```

- [ ] **Step 2: Run `npx tsc --noEmit`** — verify no type errors from the interface changes.

```bash
npx tsc --noEmit
```
Expected: PASS (no errors from the modified file).

- [ ] **Step 3: Write the failing test for `resolveCluster`**

Create `__tests__/cluster-resolver.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npx vitest run __tests__/cluster-resolver.test.ts
```
Expected: 11 tests, all FAIL (module not found).

- [ ] **Step 5: Create `lib/cluster-resolver.ts`**

```typescript
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run __tests__/cluster-resolver.test.ts
```
Expected: 11 tests, all PASS.

- [ ] **Step 7: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/cluster-resolver.ts lib/topical-map.ts __tests__/cluster-resolver.test.ts
git commit -m "feat: cluster resolver — deterministic tag-to-cluster mapping

Add resolveCluster() pure function with 6-cluster support for
Dinners-for-Two topical map. Adds description and sibling fields
to Cluster interface and all presets. 11 unit tests passing.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Internal Linker

**Files:**
- Create: `lib/internal-linker.ts`
- Test: `__tests__/internal-linker.test.ts`

**Interfaces:**
- Consumes: `resolveCluster(tags)` from `lib/cluster-resolver.ts`
- Consumes: `getRelatedRecipes(id, tags)` from `lib/queries.ts`
- Consumes: `getPublishedRecipes()` from `lib/queries.ts`
- Produces: `insertContextualLinks(markdown: string, recipeId: number, tags: string[]) => Promise<string>`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/internal-linker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { insertContextualLinks } from "@/lib/internal-linker"

// Mock the DB queries
vi.mock("@/lib/queries", () => ({
  getPublishedRecipes: vi.fn(() => Promise.resolve([
    {
      id: 2,
      slug: "lemon-chicken-for-two",
      title: "Lemon Chicken for Two",
      tags: ["chicken", "lemon", "one-pan"],
      contentMarkdown: "A bright lemon chicken dinner.",
    },
    {
      id: 3,
      slug: "garlic-green-beans",
      title: "Garlic Green Beans",
      tags: ["green-beans", "garlic", "quick"],
      contentMarkdown: "Quick garlic green beans side dish.",
    },
    {
      id: 4,
      slug: "chicken-marsala",
      title: "Chicken Marsala for Two",
      tags: ["chicken", "marsala", "mushroom"],
      contentMarkdown: "Classic chicken marsala scaled for two.",
    },
  ])),
}))

describe("insertContextualLinks", () => {
  const RECIPE_ID = 1
  const TAGS = ["chicken", "lemon", "one-pan"]

  it("inserts a link for a matching recipe title phrase", async () => {
    const markdown = [
      "## Chicken Piccata for Two",
      "",
      "This chicken piccata is a quick weeknight dinner. The lemon-butter sauce",
      "comes together in minutes.",
      "",
      "Serve it with steamed green beans for a complete meal.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Should contain at least one link to a matching recipe
    expect(result).toContain("[/recettes/")
    expect(result).toContain("garlic-green-beans")
  })

  it("never links to the current recipe", async () => {
    const markdown = "## Lemon Chicken for Two\n\nThis is my lemon chicken recipe."
    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Should NOT link to itself even though "Lemon Chicken" matches recipe id:2
    // The recipeId check prevents self-links
    expect(result).not.toContain(`/recettes/${RECIPE_ID}`)
  })

  it("inserts at most 1 link per paragraph", async () => {
    const markdown = [
      "## Chicken Piccata",
      "",
      "This chicken dish pairs well with lemon chicken and chicken marsala.",
      "",
      "Another paragraph about garlic green beans as a side.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Count links per paragraph
    const paragraphs = result.split("\n\n")
    for (const p of paragraphs) {
      const linkCount = (p.match(/\[.*?\]\(\/recettes\//g) ?? []).length
      expect(linkCount).toBeLessThanOrEqual(1)
    }
  })

  it("returns unchanged markdown when no matches found", async () => {
    const markdown = "## Unique Dish\n\nSomething completely unrelated to any recipe."
    const result = await insertContextualLinks(markdown, RECIPE_ID, ["unique"])

    expect(result).toBe(markdown)
  })

  it("preserves existing markdown structure", async () => {
    const markdown = [
      "## Title",
      "",
      "This is a **bold** statement with `code` and a [link](https://example.com).",
      "",
      "Green beans are great with chicken marsala.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Bold text preserved
    expect(result).toContain("**bold**")
    // Code preserved
    expect(result).toContain("`code`")
    // Existing links preserved
    expect(result).toContain("[link](https://example.com)")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/internal-linker.test.ts
```
Expected: 5 tests, all FAIL (module not found).

- [ ] **Step 3: Create `lib/internal-linker.ts`**

```typescript
/**
 * Internal Linker — Post-processing contextual link insertion.
 *
 * Inserts 2-3 natural contextual links into recipe markdown, linking to
 * published recipes in the same cluster. Pure post-processing — no AI calls.
 */

import { getPublishedRecipes } from "@/lib/queries"
import { resolveCluster } from "@/lib/cluster-resolver"

interface LinkTarget {
  id: number
  slug: string
  title: string
  tags: string[]
}

/**
 * Extract candidate anchor phrases from markdown.
 * Looks at H2/H3 headings and ingredient/technique mentions in the text.
 */
function extractCandidates(markdown: string): string[] {
  const candidates: string[] = []

  // Extract H2/H3 headings
  const headingMatches = markdown.matchAll(/^#{2,3}\s+(.+?)$/gm)
  for (const m of headingMatches) {
    const text = m[1].trim()
    // Filter out generic headings
    if (
      text.length > 4 &&
      !/^(ingredients|instructions|directions|method|steps|notes|tips|nutrition|faq|why this|equipment)/i.test(text)
    ) {
      candidates.push(text)
    }
  }

  // Extract ingredient names from bullet lists (lines starting with "- ", "• ", or "* ")
  const ingredientMatches = markdown.matchAll(/^[-•*]\s+(.+?)$/gm)
  for (const m of ingredientMatches) {
    const text = m[1].trim()
    // Take the first 2-3 words (ingredient name)
    const words = text.split(/\s+/)
    if (words.length >= 2) {
      const ingredient = words.slice(0, Math.min(3, words.length)).join(" ")
      if (ingredient.length > 5 && !/^\d/.test(ingredient)) {
        candidates.push(ingredient)
      }
    }
  }

  return candidates.slice(0, 10) // Max 10 candidates to check
}

/**
 * Find the best link target for a candidate phrase.
 * Returns the recipe slug and the matching phrase, or null.
 */
function findLinkTarget(
  candidate: string,
  publishedRecipes: LinkTarget[],
  currentRecipeId: number,
): { slug: string; phrase: string } | null {
  const normalized = candidate.toLowerCase()

  // Try exact title match first (title contains candidate)
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    if (recipe.title.toLowerCase().includes(normalized)) {
      return { slug: recipe.slug, phrase: candidate }
    }
  }

  // Try title words appearing in candidate
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    const titleWords = recipe.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    for (const word of titleWords) {
      if (normalized.includes(word)) {
        return { slug: recipe.slug, phrase: candidate }
      }
    }
  }

  // Try tag match (recipe tags appearing in candidate)
  for (const recipe of publishedRecipes) {
    if (recipe.id === currentRecipeId) continue
    for (const tag of recipe.tags) {
      if (tag.length > 4 && normalized.includes(tag.toLowerCase())) {
        return { slug: recipe.slug, phrase: candidate }
      }
    }
  }

  return null
}

/**
 * Count approximate words in a string.
 */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Insert contextual internal links into recipe markdown.
 *
 * Algorithm:
 * 1. Extract candidate phrases (dish names, ingredients from headings/bullets)
 * 2. Find matching published recipes (same-cluster priority via getPublishedRecipes)
 * 3. Insert links at first occurrence, max 1 per paragraph, max 3 total
 * 4. Links spaced at least 200 words apart
 *
 * @param markdown - The recipe content markdown
 * @param recipeId - Current recipe ID (to avoid self-links)
 * @param tags - Recipe tags (for cluster resolution)
 * @returns Markdown with contextual links inserted
 */
export async function insertContextualLinks(
  markdown: string,
  recipeId: number,
  tags: string[],
): Promise<string> {
  const candidates = extractCandidates(markdown)
  if (candidates.length === 0) return markdown

  const publishedRecipes = await getPublishedRecipes()
  if (publishedRecipes.length <= 1) return markdown

  const linkTargets: LinkTarget[] = publishedRecipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    tags: (r.tags ?? []) as string[],
  }))

  // Resolve cluster for same-cluster priority
  const cluster = resolveCluster(tags)
  let sameClusterRecipes: LinkTarget[] = []
  let otherRecipes: LinkTarget[] = []

  if (cluster) {
    for (const r of linkTargets) {
      if (r.id === recipeId) continue
      const rCluster = resolveCluster(r.tags)
      if (rCluster?.id === cluster.id) {
        sameClusterRecipes.push(r)
      } else {
        otherRecipes.push(r)
      }
    }
  } else {
    otherRecipes = linkTargets.filter((r) => r.id !== recipeId)
  }

  // Prioritize same-cluster recipes
  const orderedTargets = [...sameClusterRecipes, ...otherRecipes]

  const paragraphs = markdown.split("\n\n")
  const linkedParagraphs = new Set<number>()
  let linksInserted = 0
  let lastLinkWordPosition = -999

  for (let i = 0; i < paragraphs.length && linksInserted < 3; i++) {
    if (linkedParagraphs.has(i)) continue

    // Skip paragraphs that are headings, images, or code blocks
    if (/^(#{1,6}\s|!\[|```|<)/.test(paragraphs[i].trim())) continue

    // Calculate cumulative word position of this paragraph
    const wordsBefore = paragraphs.slice(0, i).reduce((sum, p) => sum + wordCount(p), 0)
    const currentWordPos = wordsBefore

    // Enforce 200-word spacing
    if (currentWordPos - lastLinkWordPosition < 200) continue

    for (const candidate of candidates) {
      const match = findLinkTarget(candidate, orderedTargets, recipeId)
      if (!match) continue

      // Check if candidate appears in this paragraph
      const escapedPhrase = match.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`(\\b${escapedPhrase}\\b)`, "i")

      if (regex.test(paragraphs[i])) {
        // Insert link at first occurrence
        const link = `[${match.phrase}](/recettes/${match.slug})`
        paragraphs[i] = paragraphs[i].replace(regex, link)
        linkedParagraphs.add(i)
        linksInserted++
        lastLinkWordPosition = currentWordPos
        break // One link per paragraph
      }
    }
  }

  return paragraphs.join("\n\n")
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/internal-linker.test.ts
```
Expected: 5 tests, all PASS.

- [ ] **Step 5: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/internal-linker.ts __tests__/internal-linker.test.ts
git commit -m "feat: internal linker — contextual link insertion post-processing

Inserts 2-3 contextual links into recipe markdown. Same-cluster priority,
max 1 link per paragraph, 200-word spacing, natural anchors only.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Integrate Internal Linker into Persist Phase

**Files:**
- Modify: `lib/inngest/functions/steps/persist-phase.ts:176-180`

**Interfaces:**
- Consumes: `insertContextualLinks(markdown, recipeId, tags)` from `lib/internal-linker.ts`

- [ ] **Step 1: Add the internal linker call in `persistFinalDraft()`**

In `lib/inngest/functions/steps/persist-phase.ts`, after the template replacement block (line 176-178) and before the GEO citability check (line 186), add:

```typescript
// After line 178 (template replacement), insert:
// Internal Linking — insert 2-3 contextual links to related recipes.
// Runs deterministically (no AI), same-cluster priority.
try {
  const enriched = await insertContextualLinks(
    finalRecipe.contentMarkdown ?? "",
    recipeId,
    finalRecipe.tags ?? [],
  )
  if (enriched !== finalRecipe.contentMarkdown) {
    finalRecipe.contentMarkdown = enriched
    await appendLog(recipeId, logEntry("Internal Linker", "done",
      "Contextual links inserted into markdown"))
  }
} catch (err) {
  // Non-blocking — linker failure should never prevent publication
  await appendLog(recipeId, logEntry("Internal Linker", "error",
    `Link insertion failed: ${err instanceof Error ? err.message : String(err)}`))
}
```

Also add the import at the top of the file (after line 13, the last import):

```typescript
import { insertContextualLinks } from "@/lib/internal-linker"
```

- [ ] **Step 2: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/steps/persist-phase.ts
git commit -m "feat: integrate internal linker into persist phase

Calls insertContextualLinks after template replacement, before GEO check.
Non-blocking — linker failure logs error but does not prevent publication.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Hub Pages — Cluster Filter on `/recettes`

**Files:**
- Modify: `app/recettes/page.tsx`

**Interfaces:**
- Consumes: `resolveCluster(tags)` from `lib/cluster-resolver.ts`
- Consumes: `getAllClusters()`, `getClusterById(id)` from `lib/cluster-resolver.ts`
- Consumes: `searchPublishedRecipes(q, cat)` from `lib/queries.ts` (existing)

- [ ] **Step 1: Modify `app/recettes/page.tsx` to support `?cluster=`**

The existing page uses `searchParams: Promise<{ q?: string; cat?: string }>`. Add `cluster` parameter and hub mode rendering.

```typescript
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { ArticleCard } from "@/components/article-card"
import { RecipeSearch } from "@/components/recipe-search"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { searchPublishedRecipes, getRecipeCategories, getPublishedArticles } from "@/lib/queries"
import { resolveCluster, getClusterById, getAllClusters } from "@/lib/cluster-resolver"

export const revalidate = 60

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; cluster?: string }>
}): Promise<Metadata> {
  const { q, cat, cluster } = await searchParams
  const isFiltered = !!(q || cat)

  if (cluster) {
    const c = getClusterById(cluster)
    if (c) {
      return {
        title: `${c.name} | Chef Augustin`,
        description: c.description,
        alternates: { canonical: `/recettes?cluster=${cluster}` },
        robots: "index, follow",
        openGraph: {
          title: `${c.name} | Chef Augustin`,
          description: c.description,
          type: "website",
        },
      }
    }
  }

  return {
    title: "All recipes",
    description:
      "Browse our collection of easy dinners for two, optimized step by step.",
    alternates: { canonical: "/recettes" },
    robots: isFiltered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "All recipes | Chef Augustin",
      description:
        "Browse our collection of easy dinners for two, optimized step by step.",
      type: "website",
    },
  }
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; cluster?: string }>
}) {
  const { q, cat, cluster } = await searchParams
  const [recipes, categories, articles] = await Promise.all([
    searchPublishedRecipes(q, cat),
    getRecipeCategories(),
    getPublishedArticles(),
  ])

  // Hub mode: filter by cluster
  const clusterData = cluster ? getClusterById(cluster) : null
  const displayRecipes = clusterData
    ? recipes.filter((r) => {
        const rc = resolveCluster((r.tags ?? []) as string[])
        return rc?.id === cluster
      }).filter((r) => r.heroImageUrl)
    : recipes.filter((r) => r.heroImageUrl)

  const displayArticles = articles.filter((a) => a.heroImageUrl).slice(0, 3)

  // Hub page stats
  const totalTimeMinutes = clusterData
    ? displayRecipes.reduce((sum, r) => {
        const match = (r.totalTime ?? "").match(/(\d+)/)
        return sum + (match ? parseInt(match[1], 10) : 25)
      }, 0)
    : 0
  const avgTime = displayRecipes.length > 0
    ? Math.round(totalTimeMinutes / displayRecipes.length)
    : null

  // Sibling clusters for cross-linking
  const siblingClusters = clusterData
    ? clusterData.siblings
        .map((id) => getClusterById(id))
        .filter((c): c is NonNullable<typeof c> => {
          if (!c) return false
          // Only show siblings that have at least 1 published recipe
          return recipes.some((r) => {
            const rc = resolveCluster((r.tags ?? []) as string[])
            return rc?.id === c.id
          })
        })
        .slice(0, 3)
    : []

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={
            clusterData
              ? [
                  { label: "Home", href: "/" },
                  { label: "Recipes", href: "/recettes" },
                  { label: clusterData.name, href: `/recettes?cluster=${cluster}` },
                ]
              : [
                  { label: "Home", href: "/" },
                  { label: "Recipes", href: "/recettes" },
                ]
          }
        />

        {clusterData ? (
          /* ── Hub Mode ── */
          <>
            <header className="mt-4 mb-8">
              <h1 className="font-serif text-4xl text-balance">{clusterData.name}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
                {clusterData.description}
              </p>
              {/* Stats row */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  {displayRecipes.length} recipe{displayRecipes.length !== 1 ? "s" : ""}
                </span>
                {avgTime ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                    ~{avgTime} min avg
                  </span>
                ) : null}
              </div>
            </header>
          </>
        ) : (
          /* ── Default Mode ── */
          <header className="mt-4 mb-8">
            <h1 className="font-serif text-4xl text-balance">All recipes</h1>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Simple, small-batch recipes for real weeknights and practical home
              cooking. Browse by search or filter.
            </p>
          </header>
        )}

        {/* Search — only in default mode */}
        {!clusterData ? (
          <div className="mb-8">
            <Suspense>
              <RecipeSearch
                categories={categories}
                currentSearch={q || ""}
                currentCategory={cat || ""}
              />
            </Suspense>
          </div>
        ) : null}

        {/* Recipe Grid */}
        {displayRecipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {clusterData
                ? `No recipes in this category yet. Check back soon!`
                : q || cat
                  ? "No recipes match your search."
                  : "No recipes published yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        )}

        {/* Hub: Cross-links to sibling clusters */}
        {clusterData && siblingClusters.length > 0 ? (
          <section className="mt-16 border-t border-border pt-14">
            <h2 className="font-serif text-2xl mb-6">Explore more dinners for two</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siblingClusters.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/recettes?cluster=${sibling.id}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <h3 className="font-serif text-lg group-hover:text-primary transition-colors">
                    {sibling.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {sibling.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Cross-link: Related Articles (default mode only) */}
        {!clusterData && displayArticles.length > 0 && !q && !cat ? (
          <section className="mt-16 border-t border-border pt-14">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-serif text-2xl">Cooking Tips &amp; Guides</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Learn the techniques behind the recipes.
                </p>
              </div>
              <Link
                href="/techniques"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Verify existing pages return 200 (requires dev server running)**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recettes
```
Expected: 200.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recettes?cluster=chicken-dinners-for-two
```
Expected: 200.

- [ ] **Step 4: Verify routing regression — `/articles/test` returns 404**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/test
```
Expected: 404.

- [ ] **Step 5: Commit**

```bash
git add app/recettes/page.tsx
git commit -m "feat: hub pages — cluster-filtered recipe listing at /recettes?cluster=X

Adds hub mode with cluster description, stats, and sibling cross-links.
SEO metadata dynamically generated per cluster. Existing /recettes unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Cluster-Aware Breadcrumbs in Recipe Hero

**Files:**
- Modify: `components/recipe-hero.tsx:98-105` (RecipeHero component)

**Interfaces:**
- Consumes: `resolveCluster(tags)` from `lib/cluster-resolver.ts`
- Consumes: `Breadcrumbs` component from `components/breadcrumbs.tsx` (already used in `app/recettes/page.tsx`)

- [ ] **Step 1: Add breadcrumbs to `RecipeHero`**

In `components/recipe-hero.tsx`, add the import:

```typescript
import { Breadcrumbs } from "@/components/breadcrumbs"
import { resolveCluster } from "@/lib/cluster-resolver"
```

Then modify the `RecipeHero` component to render breadcrumbs above the image:

```typescript
export function RecipeHero({ recipe }: { recipe: Recipe }) {
  const badges = inferBadges(recipe)
  const valueProp = extractValueProp(recipe.contentMarkdown ?? null, recipe.excerpt ?? null)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  const recipeUrl = `${siteUrl}/recettes/${recipe.slug}`
  const pinterestShareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(recipeUrl)}&description=${encodeURIComponent(recipe.title)}`

  // Resolve cluster for breadcrumbs
  const cluster = resolveCluster((recipe.tags ?? []) as string[])

  return (
    <header className="mx-auto max-w-3xl px-4 pt-6">
      {/* ── Breadcrumbs ── */}
      <Breadcrumbs
        crumbs={
          cluster
            ? [
                { label: "Home", href: "/" },
                { label: "Recipes", href: "/recettes" },
                { label: cluster.name, href: `/recettes?cluster=${cluster.id}` },
                { label: recipe.title, href: `/recettes/${recipe.slug}` },
              ]
            : [
                { label: "Home", href: "/" },
                { label: "Recipes", href: "/recettes" },
                { label: recipe.title, href: `/recettes/${recipe.slug}` },
              ]
        }
      />

      {/* ── 1. Hero Image ── */}
      {/* ... rest of existing component unchanged ... */}
```

Note: The `Breadcrumbs` component renders its own `max-w-3xl px-4 pt-6` wrapper. In the hero, this creates a double wrapper. Remove the Breadcrumbs wrapper's outer classes by adding a `className` prop to Breadcrumbs, or keep the double padding (acceptable — just adds a few px of vertical space).

- [ ] **Step 2: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-hero.tsx
git commit -m "feat: cluster-aware breadcrumbs in recipe hero

Home > [Cluster] > Recipe Title when cluster resolved from tags.
Includes BreadcrumbList JSON-LD from existing Breadcrumbs component.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Cluster-Aware Related Sidebar

**Files:**
- Modify: `components/recipe-article.tsx` — add related recipes sidebar
- The sidebar is currently not rendered in `RecipeArticle`. We need to add it.

**Interfaces:**
- Consumes: `resolveCluster(tags)` from `lib/cluster-resolver.ts`
- Consumes: `getRelatedRecipes(id, tags)` from `lib/queries.ts`
- Consumes: `getPublishedRecipes()` from `lib/queries.ts`

First, check the current state — `RecipeArticle` currently renders `RecipeHero`, `RecipeIngredients`, `RecipeActionBar`, `RecipeInstructions`, `RecipeArticleBody` but no sidebar. We'll add a Related Recipes section at the bottom.

- [ ] **Step 1: Create the `RelatedRecipes` component inside `recipe-article.tsx`**

Add to `components/recipe-article.tsx`:

```typescript
import type { Recipe } from "@/lib/db/schema"
import { RecipeHero } from "@/components/recipe-hero"
import { RecipeActionBar } from "@/components/recipe-action-bar"
import { RecipeIngredients } from "@/components/recipe-ingredients"
import { RecipeInstructions } from "@/components/recipe-instructions"
import { RecipeArticleBody } from "@/components/recipe-article-body"
import { RelatedRecipes } from "@/components/related-recipes"  // NEW import

export function RecipeArticle({ recipe }: { recipe: Recipe }) {
  return (
    <article>
      <RecipeHero recipe={recipe} />
      <RecipeIngredients ingredients={recipe.ingredients ?? []} />
      <RecipeActionBar title={recipe.title} />
      <RecipeInstructions instructions={recipe.instructions ?? []} />
      <RecipeArticleBody contentMarkdown={recipe.contentMarkdown} />
      {/* NEW: Cluster-aware related recipes */}
      <RelatedRecipes recipe={recipe} />
    </article>
  )
}
```

- [ ] **Step 2: Create `components/related-recipes.tsx`**

New file — a server component (or client component if it needs interactivity) that displays cluster-aware related recipes.

```typescript
import Link from "next/link"
import Image from "next/image"
import { resolveCluster } from "@/lib/cluster-resolver"
import { getRelatedRecipes, getPublishedRecipes } from "@/lib/queries"
import type { Recipe } from "@/lib/db/schema"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"

export async function RelatedRecipes({ recipe }: { recipe: Recipe }) {
  const tags = (recipe.tags ?? []) as string[]
  const cluster = resolveCluster(tags)

  // Get same-cluster recipes via tag overlap
  const related = await getRelatedRecipes(recipe.id, tags)

  // Get cross-cluster recipes (2 from different clusters)
  let crossCluster: Recipe[] = []
  if (cluster) {
    const allPublished = await getPublishedRecipes()
    crossCluster = allPublished
      .filter((r) => {
        if (r.id === recipe.id) return false
        // Already in related?
        if (related.some((rel) => rel.id === r.id)) return false
        const rc = resolveCluster((r.tags ?? []) as string[])
        return rc?.id !== cluster.id
      })
      .filter((r) => r.heroImageUrl)
      .slice(0, 2)
  }

  const allRelated = [...related.slice(0, 4), ...crossCluster]

  if (allRelated.length === 0) return null

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 border-t border-border mt-12">
      <h2 className="font-serif text-2xl mb-6">
        {cluster ? `More ${cluster.name}` : "Related Recipes"}
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allRelated.map((r) => (
          <Link
            key={r.id}
            href={`/recettes/${r.slug}`}
            className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20"
          >
            {r.heroImageUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={r.heroImageUrl}
                  alt={r.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  placeholder="blur"
                  blurDataURL={FOOD_BLUR_PLACEHOLDER}
                />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-secondary/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground/60 font-serif">Coming soon</span>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-serif text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {r.title}
              </h3>
              {r.totalTime ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{r.totalTime}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/related-recipes.tsx components/recipe-article.tsx
git commit -m "feat: cluster-aware related recipes sidebar

4 same-cluster + 2 cross-cluster recipes at the bottom of recipe pages.
Contextual heading adapts to cluster name. Card layout with images.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Final Integration Check

**Files:** All modified/created files.
**Verification:** TypeScript, lint, routing, existing behavior.

- [ ] **Step 1: Run full type check**

```bash
npx tsc --noEmit
```
Expected: PASS with no errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass (11 cluster resolver + 5 internal linker = 16 tests).

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: PASS (no new warnings or errors).

- [ ] **Step 4: Verify routing integrity (requires dev server)**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recettes
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recettes?cluster=chicken-dinners-for-two
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/test
```
Expected: 200, 200, 200, 404.

- [ ] **Step 5: Verify recipe detail page renders (requires dev server with published recipe)**

```bash
# Get first published recipe slug
SLUG=$(curl -s http://localhost:3000/api/recipes/raw | head -1)
# If there are published recipes, test the detail page
```
Expected: Recipe page renders with breadcrumbs and related recipes section.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Topical Authority SEO Integration — complete

6 files, ~165 lines. Zero pipeline changes. Zero DB schema changes.

- Cluster resolver: deterministic tag-to-cluster mapping (6 clusters)
- Internal linker: contextual link insertion in post-processing
- Hub pages: /recettes?cluster=X with SEO metadata
- Cluster breadcrumbs: Home > Cluster > Recipe
- Related sidebar: 4 same-cluster + 2 cross-cluster recipes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

| Task | Files | Lines | Tests |
|---|---|---|---|
| 1. Cluster Resolver + Topical Map | 3 files (1 new, 1 mod, 1 test) | ~120 | 11 |
| 2. Internal Linker | 2 files (1 new, 1 test) | ~130 | 5 |
| 3. Persist Phase Integration | 1 file (mod) | ~15 | — |
| 4. Hub Pages | 1 file (mod) | ~100 | — |
| 5. Breadcrumbs | 1 file (mod) | ~15 | — |
| 6. Related Sidebar | 2 files (1 new, 1 mod) | ~70 | — |
| 7. Final Check | — | — | 16 |
| **Total** | **10 files** (4 new, 5 mod, 1 test) | **~450** | **16** |
