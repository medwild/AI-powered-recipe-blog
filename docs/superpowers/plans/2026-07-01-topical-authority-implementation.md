# Topical Authority Phase 2A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the AI pipeline to be cuisine-agnostic with Chef Augustin as international cuisine specialist, build a topical coverage analyzer, and generate Sprint 1 Nordic Hub content.

**Architecture:** Three independent workstreams. Workstream 1 (pipeline adaptation) must complete first. Workstreams 2 (gap analyzer) and 3 (content generation) can run in parallel after 1.

**Tech Stack:** TypeScript, Next.js 16, Inngest, Drizzle ORM, Neon PostgreSQL, Node.js scripts

## Global Constraints

- `npx tsc --noEmit` required after any pipeline change (CLAUDE.md rule)
- Never rename Inngest steps (breaks versioning)
- Never modify a skill Markdown without checking the corresponding agent runtime
- Chef Augustin Lefevre persona is fixed — only the CUISINE focus changes
- Domain: `augustcook.com`, tagline: "International Home Cooking by Chef Augustin"
- Backward compatible: existing recipes without `cuisine` parameter must still work

---

## File Map

```
Modified:
  skills/agent-strategist.md          — Update to international cuisine focus + {{cuisine}} placeholder
  skills/agent-writer.md              — Update persona: "French-trained chef, world cuisines specialist"
  lib/inngest/functions/generate-recipe.ts — Accept cuisine param, pass to Strategist + Writer
  app/api/recipes/generate/route.ts   — Accept cuisine in request body
  lib/skills.ts                       — Add replacePlaceholders() for template variable injection
  app/layout.tsx                      — Update metadata for augustcook.com

Created:
  scripts/analyze-topical-coverage.ts — Topical gap analyzer tool
  lib/topical-map.ts                  — Topical map data structure + Nordic cluster preset
  scripts/generate-sprint-batch.ts    — Batch generation script for Sprint 1
```

---

### Task 1: Update Skills to International Cuisine Focus

**Files:**
- Modify: `skills/agent-strategist.md`
- Modify: `skills/agent-writer.md`

**Interfaces:**
- Produces: Skills that use `{{cuisine}}`, `{{cuisine_ingredients}}`, `{{cuisine_techniques}}` placeholders for template injection

- [ ] **Step 1: Read current skill files**

Read `skills/agent-strategist.md` and `skills/agent-writer.md` to understand current content.

- [ ] **Step 2: Update Strategist skill for international cuisine**

In `skills/agent-strategist.md`, replace the French-cuisine-specific sections:

Find the persona/cuisine definition section (likely §1-3) and update to:

```markdown
## §1 — Role & Identity

You are an SEO/GEO strategist specialized in international home cooking. Your role is to analyze SERP data and produce an editorial plan for recipes that make world cuisines accessible to American home cooks.

**Current cuisine focus:** {{cuisine}}
**Key ingredients:** {{cuisine_ingredients}}
**Signature techniques:** {{cuisine_techniques}}

The brand voice is Chef Augustin Lefevre — a French-trained chef who explores and simplifies world cuisines for home cooks. Content should reflect his training (technique precision) while making international dishes approachable.

## §2 — Content Strategy for International Cuisine

For the current cuisine focus ({{cuisine}}), you must:

1. Identify which dishes from {{cuisine}} are most searched by American home cooks
2. Find easy substitutions for hard-to-find {{cuisine}} ingredients available in US grocery stores
3. Extract the 3-5 signature techniques of {{cuisine}} that differentiate it from other cuisines
4. Map competitor weaknesses — what do they NOT cover about {{cuisine}}?
5. Suggest FAQ questions that American cooks ask about {{cuisine}}
```

Remove any references to "French cooking recipes only" or "cuisine française".

- [ ] **Step 3: Update Writer skill for international persona**

In `skills/agent-writer.md`, update the persona definition:

Find the Chef Augustin definition and replace with:

```markdown
## §1 — Your Identity

You are Chef Augustin Lefevre — a French-trained chef who has dedicated his career to exploring and simplifying world cuisines for home cooks. After graduating from culinary school in Lyon and working in Parisian kitchens, you spent years traveling across {{cuisine}} learning from grandmothers, street vendors, and professional chefs.

Your unique value: you bring French culinary precision to {{cuisine}} home cooking. You explain WHY techniques work (the science), not just HOW to do them. You find clever substitutions for hard-to-find {{cuisine}} ingredients so American home cooks can succeed.

**Current cuisine:** {{cuisine}}
**Key ingredients for this cuisine:** {{cuisine_ingredients}}
**Signature techniques:** {{cuisine_techniques}}
```

Update any section that hardcodes "French cuisine" or assumes the recipe is French. Replace with {{cuisine}}-aware language:

- "French grandmothers" → "{{cuisine}} home cooks"
- "French technique" → "techniques from {{cuisine}}"
- "French ingredients" → "{{cuisine}} ingredients"

- [ ] **Step 4: Run type check and commit**

```bash
npx tsc --noEmit
git add skills/agent-strategist.md skills/agent-writer.md
git commit -m "feat: update Strategist + Writer skills to international cuisine with {{cuisine}} placeholders"
```

---

### Task 2: Add Template Variable Injection to Skill Loader

**Files:**
- Modify: `lib/skills.ts`

**Interfaces:**
- Consumes: Skills with `{{placeholder}}` syntax from Task 1
- Produces: `loadSkillContent(skillName: string, replacements?: Record<string, string>): Promise<string>`

- [ ] **Step 1: Read current skills.ts**

Read `/home/user/ai-blog-builder/lib/skills.ts` to understand current `loadSkillContent()` implementation.

- [ ] **Step 2: Add replacePlaceholders function**

Add the following to `lib/skills.ts`:

```typescript
/**
 * Replaces {{placeholder}} variables in skill content with actual values.
 * Used to inject cuisine-specific data without duplicating skill files.
 *
 * Example:
 *   replacePlaceholders("Focus on {{cuisine}} using {{cuisine_ingredients}}", {
 *     cuisine: "Swedish",
 *     cuisine_ingredients: "salmon, rye, lingonberry, dill, cardamom"
 *   })
 */
export function replacePlaceholders(
  content: string,
  replacements: Record<string, string>
): string {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content
  )
}
```

- [ ] **Step 3: Update loadSkillContent signature**

Add optional `replacements` parameter to `loadSkillContent`:

```typescript
export async function loadSkillContent(
  skillName: string,
  replacements?: Record<string, string>
): Promise<string> {
  // ... existing file reading logic ...
  const content = await fs.readFile(skillPath, "utf-8")
  return replacements ? replacePlaceholders(content, replacements) : content
}
```

- [ ] **Step 4: Run type check and commit**

```bash
npx tsc --noEmit
git add lib/skills.ts
git commit -m "feat: add replacePlaceholders() to skill loader for cuisine parameterization"
```

---

### Task 3: Add `cuisine` Parameter to Pipeline

**Files:**
- Modify: `app/api/recipes/generate/route.ts`
- Modify: `lib/inngest/functions/generate-recipe.ts`

**Interfaces:**
- Consumes: `loadSkillContent` with replacements from Task 2
- Produces: Pipeline accepts optional `cuisine` parameter with ingredients/techniques

- [ ] **Step 1: Update the generate API route to accept cuisine**

Read `/home/user/ai-blog-builder/app/api/recipes/generate/route.ts` (already in context).

Add cuisine parameter acceptance after the Aor article params block (around line 69):

```typescript
  // Cuisine focus — makes the pipeline cuisine-agnostic
  // If not provided, defaults to "French" (backward compatible)
  const cuisine = body?.cuisine?.toString().trim() || "French"
  const cuisineIngredients = body?.cuisineIngredients?.toString().trim() ||
    getDefaultIngredients(cuisine)
  const cuisineTechniques = body?.cuisineTechniques?.toString().trim() ||
    getDefaultTechniques(cuisine)
```

Add a helper function at the top of the file:

```typescript
function getDefaultIngredients(cuisine: string): string {
  const defaults: Record<string, string> = {
    swedish: "salmon, rye flour, lingonberry, dill, cardamom, cream, potatoes, herring",
    finnish: "salmon, rye flour, dill, potatoes, blueberries, mushrooms, cream, cardamom",
    polish: "cabbage, potatoes, sausage, sour cream, dill, beets, mushrooms, rye",
    cuban: "plantains, black beans, rice, pork, citrus, cumin, oregano, garlic",
    french: "butter, cream, wine, shallots, herbs de Provence, garlic, cheese, bread",
  }
  return defaults[cuisine.toLowerCase()] ?? defaults.french
}

function getDefaultTechniques(cuisine: string): string {
  const defaults: Record<string, string> = {
    swedish: "curing (gravlax), rye bread baking, cream-based sauces, cardamom baking",
    finnish: "rye bread baking, salmon soup making, berry desserts, slow fermentation",
    polish: "pierogi making, slow-braising, pickling, sour cream sauces",
    cuban: "slow-braising (ropa vieja), mojo marination, plantain frying, sofrito base",
    french: "sauce making, braising, pastry, knife skills, butter-based cooking",
  }
  return defaults[cuisine.toLowerCase()] ?? defaults.french
}
```

Pass cuisine data to Inngest event:

```typescript
  await inngest.send({
    name: "recipe/generate",
    data: {
      recipeId: created.id,
      keyword,
      cuisine,
      cuisineIngredients,
      cuisineTechniques,
      ...(aorCategory ? { aorCategory, aorAngle } : {}),
    },
  })
```

- [ ] **Step 2: Update generate-recipe.ts to use cuisine data**

In `/home/user/ai-blog-builder/lib/inngest/functions/generate-recipe.ts`, update the Inngest function to extract and use cuisine data.

Find the function signature (around line 1-30) and the step where `loadSkillContent` is called for Strategist and Writer.

Update the Strategist step (~Step 2) to pass cuisine replacements:

```typescript
// In the agent-1-strategist step:
const cuisineReplacements = {
  cuisine: event.data.cuisine || "French",
  cuisine_ingredients: event.data.cuisineIngredients || "butter, cream, wine, shallots, garlic",
  cuisine_techniques: event.data.cuisineTechniques || "sauce making, braising, pastry",
}

const strategistSkill = await loadSkillContent("agent-strategist", cuisineReplacements)
// ... pass strategistSkill to the LLM call
```

Update the Writer step (~Step 3) similarly:

```typescript
const writerSkill = await loadSkillContent("agent-writer", cuisineReplacements)
// ... pass writerSkill to the LLM call
```

Make sure the existing calls to `loadSkillContent` without replacements still work (backward compatibility).

- [ ] **Step 3: Run type check and commit**

```bash
npx tsc --noEmit
git add app/api/recipes/generate/route.ts lib/inngest/functions/generate-recipe.ts
git commit -m "feat: add cuisine parameter to pipeline — Strategist + Writer now cuisine-agnostic"
```

---

### Task 4: Topical Map Data Structure

**Files:**
- Create: `lib/topical-map.ts`

**Interfaces:**
- Produces: `TopicalMap`, `Cluster`, `CoverageReport` types + `NORDIC_CLUSTER` preset

- [ ] **Step 1: Create the topical map types and presets**

Create `/home/user/ai-blog-builder/lib/topical-map.ts`:

```typescript
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
```

- [ ] **Step 2: Run type check and commit**

```bash
npx tsc --noEmit
git add lib/topical-map.ts
git commit -m "feat: add topical map data structures + Nordic cluster preset"
```

---

### Task 5: Topical Coverage Analyzer Script

**Files:**
- Create: `scripts/analyze-topical-coverage.ts`

**Interfaces:**
- Consumes: `lib/topical-map.ts` (Task 4), `lib/db/schema.ts`, `lib/queries.ts`
- Produces: Coverage report printed to stdout showing gaps vs topical map

- [ ] **Step 1: Create the analyzer script**

Create `/home/user/ai-blog-builder/scripts/analyze-topical-coverage.ts`:

```typescript
/**
 * Topical Coverage Analyzer
 *
 * Scans existing published recipes/articles against the topical map
 * and identifies coverage gaps. Run before each sprint to prioritize
 * which content to generate next.
 *
 * Usage: npx tsx scripts/analyze-topical-coverage.ts
 */

import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { TOPICAL_MAP, type Cluster, type TopicNode } from "../lib/topical-map"

async function main() {
  console.log("=== Topical Coverage Analyzer ===\n")

  // Fetch all published recipes and articles
  const allContent = await db
    .select({
      title: recipes.title,
      slug: recipes.slug,
      keyword: recipes.keyword,
      tags: recipes.tags,
      content_type: recipes.content_type,
      category: recipes.category,
      status: recipes.status,
    })
    .from(recipes)
    .where(eq(recipes.status, "published"))

  const publishedRecipes = allContent.filter((r) => r.content_type !== "article")
  const publishedArticles = allContent.filter((r) => r.content_type === "article")

  console.log(`Published recipes: ${publishedRecipes.length}`)
  console.log(`Published articles: ${publishedArticles.length}`)
  console.log(`Total published: ${allContent.length}\n`)

  // Analyze coverage per cluster
  let totalCoverage = 0
  const reports: Array<{ cluster: Cluster; covered: number; total: number; pct: number; gaps: TopicNode[] }> = []

  for (const cluster of TOPICAL_MAP) {
    const allTopics = [cluster.pillarPage, ...cluster.spokes]
    const covered: TopicNode[] = []
    const gaps: TopicNode[] = []

    for (const topic of allTopics) {
      // Check if we have content matching this topic's keyword or title
      const match = allContent.find(
        (c) =>
          c.keyword?.toLowerCase().includes(topic.keyword.toLowerCase()) ||
          c.title?.toLowerCase().includes(topic.keyword.toLowerCase().split(" ").slice(0, 3).join(" "))
      )
      if (match) {
        covered.push(topic)
      } else {
        gaps.push(topic)
      }
    }

    const pct = Math.round((covered.length / allTopics.length) * 100)
    totalCoverage += pct
    reports.push({ cluster, covered: covered.length, total: allTopics.length, pct, gaps })
  }

  // Print results
  const overallPct = Math.round(totalCoverage / TOPICAL_MAP.length)

  console.log(`Overall coverage: ${overallPct}% (target: 74%)\n`)

  for (const report of reports) {
    console.log(`--- ${report.cluster.name} (${report.cluster.section}) ---`)
    console.log(`Coverage: ${report.pct}% (${report.covered}/${report.total} topics)`)
    console.log(`KD avg: ${report.cluster.kdAvg} | Volume: ${report.cluster.totalVolume.toLocaleString()}/mo`)

    if (report.gaps.length > 0) {
      console.log(`\nGAPS (${report.gaps.length} topics to create):`)
      for (const gap of report.gaps) {
        console.log(`  [${gap.type.toUpperCase()}] ${gap.title}`)
        if (gap.volume > 0) {
          console.log(`    KD: ${gap.kd} | Volume: ${gap.volume.toLocaleString()}/mo`)
        }
      }
    }
    console.log()
  }
}

main().catch((err) => {
  console.error("Analysis failed:", err)
  process.exit(1)
})
```

- [ ] **Step 2: Test run the analyzer**

```bash
npx tsx scripts/analyze-topical-coverage.ts
```

Expected output: Coverage report showing 0% for all clusters (no content generated yet for the new niche).

- [ ] **Step 3: Commit**

```bash
git add scripts/analyze-topical-coverage.ts
git commit -m "feat: add topical coverage analyzer script"
```

---

### Task 6: Update Site Metadata for augustcook.com

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update layout metadata for new brand**

Read `/home/user/ai-blog-builder/app/layout.tsx` (already in context from earlier edits).

Update the metadata to reflect the new brand:

```typescript
export const metadata: Metadata = {
  title: {
    default: 'August Cook — International Home Cooking by Chef Augustin',
    template: '%s | August Cook',
  },
  description:
    'Chef Augustin Lefevre brings world cuisines to your kitchen. Easy, tested international recipes for home cooks.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://augustcook.com',
  ),
  openGraph: {
    type: 'website',
    siteName: 'August Cook',
    title: 'August Cook — International Home Cooking by Chef Augustin',
    description:
      'Chef Augustin Lefevre brings world cuisines to your kitchen. Easy, tested international recipes for home cooks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'August Cook — International Home Cooking by Chef Augustin',
    description:
      'Chef Augustin Lefevre brings world cuisines to your kitchen.',
  },
}
```

Also update the fallback URLs in `app/sitemap.ts` and `app/robots.ts` from `lecarnetgourmand.fr` to `augustcook.com`.

- [ ] **Step 2: Run type check and commit**

```bash
npx tsc --noEmit
git add app/layout.tsx app/sitemap.ts app/robots.ts app/feed.xml/route.ts
git commit -m "feat: update site metadata for augustcook.com brand"
```

---

### Task 7: Sprint 1 Batch Generation Script

**Files:**
- Create: `scripts/generate-sprint-batch.ts`

**Interfaces:**
- Consumes: `lib/topical-map.ts` NORDIC_CLUSTER (Task 4), pipeline API (Task 3)

- [ ] **Step 1: Create batch generation script**

Create `/home/user/ai-blog-builder/scripts/generate-sprint-batch.ts`:

```typescript
/**
 * Sprint Batch Generator
 *
 * Triggers the AI pipeline for all topics in a cluster.
 * Run after pipeline adaptation (Task 3) and topical map (Task 4) are complete.
 *
 * Usage: npx tsx scripts/generate-sprint-batch.ts <cluster-id>
 * Example: npx tsx scripts/generate-sprint-batch.ts nordic-home-cooking
 */

import { getClusterById } from "../lib/topical-map"

const API_BASE = process.env.API_BASE || "http://localhost:3000"

async function generateRecipe(keyword: string, cuisine: string, aorCategory?: string) {
  const body: Record<string, unknown> = {
    keyword,
    cuisine,
    ...(aorCategory ? { generateAorArticle: true, aorCategory } : {}),
  }

  const res = await fetch(`${API_BASE}/api/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`Generation failed for "${keyword}": ${(err as { error?: string }).error || res.status}`)
  }

  const data = (await res.json()) as { id: number; status: string }
  console.log(`  ✅ Recipe #${data.id} — "${keyword}" — ${data.status}`)
  return data.id
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const clusterId = process.argv[2]
  if (!clusterId) {
    console.error("Usage: npx tsx scripts/generate-sprint-batch.ts <cluster-id>")
    console.error("Available clusters:")
    console.error("  nordic-home-cooking")
    process.exit(1)
  }

  const cluster = getClusterById(clusterId)
  if (!cluster) {
    console.error(`Cluster "${clusterId}" not found.`)
    process.exit(1)
  }

  console.log(`\n=== Sprint Batch: ${cluster.name} ===`)
  console.log(`Cuisine: ${cluster.cuisine}`)
  console.log(`Topics: ${1 + cluster.spokes.length} (1 pillar + ${cluster.spokes.length} spokes/articles)\n`)

  const allTopics = [cluster.pillarPage, ...cluster.spokes]
  let completed = 0
  let failed = 0

  for (const topic of allTopics) {
    const label = topic.type.toUpperCase()
    console.log(`[${label}] Generating: ${topic.title}`)

    try {
      // Pillar pages get Aor articles (technique deep-dives for the cuisine)
      const aorCategory = topic.type === "pillar" ? "techniques" : undefined
      await generateRecipe(topic.keyword, cluster.cuisine.split(" & ")[0].toLowerCase(), aorCategory)
      completed++
    } catch (err) {
      console.error(`  ❌ Failed: ${(err as Error).message}`)
      failed++
    }

    // Rate-limit: wait 3 minutes between generations to avoid hammering APIs
    if (allTopics.indexOf(topic) < allTopics.length - 1) {
      console.log(`  ⏳ Waiting 3min for API cooldown...`)
      await sleep(180_000)
    }
  }

  console.log(`\n=== Batch Complete ===`)
  console.log(`✅ Completed: ${completed}`)
  console.log(`❌ Failed: ${failed}`)
}

main().catch((err) => {
  console.error("Batch failed:", err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify the script compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-sprint-batch.ts
git commit -m "feat: add sprint batch generation script for topical clusters"
```

---

### Task 8: Integration Test — Generate One Nordic Recipe

**Files:**
- No new files — manual test via curl

- [ ] **Step 1: Start dev servers**

```bash
npm run dev
```

Wait for Next.js (port 3000) and Inngest (port 8288) to be ready.

- [ ] **Step 2: Trigger a Nordic recipe generation**

```bash
curl -s -X POST http://localhost:3000/api/recipes/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "keyword": "swedish meatballs",
    "cuisine": "swedish",
    "generateAorArticle": true,
    "aorCategory": "techniques",
    "aorAngle": "the science of tender meatballs — why Swedish meatballs are different from Italian"
  }'
```

Expected: Returns `{"id": N, "status": "generating"}`

- [ ] **Step 3: Monitor pipeline progress**

```bash
# Wait 4-5 minutes then check status
curl -s http://localhost:3000/api/recipes/N/status | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const wf = d.workflowLog || [];
const seen = new Set();
for (const e of wf) {
  if (!seen.has(e.agent)) {
    seen.add(e.agent);
    console.log('[' + e.agent.padEnd(20) + '] ' + e.status + ': ' + (e.message||'').substring(0,100));
  }
}
"
```

Expected: Full 13-step pipeline completes. Strategist should mention "Swedish cuisine", Writer should use "Chef Augustin" persona with Swedish ingredients.

- [ ] **Step 4: Verify the generated content**

Check:
1. Does the recipe title mention Swedish cuisine? ✅
2. Does the meta title/description target the right keyword? ✅
3. Does the Aor article link back to the recipe? ✅
4. Is the Chef Augustin persona consistent (French-trained, international focus)? ✅

- [ ] **Step 5: Run coverage analyzer to confirm gap detection**

```bash
npx tsx scripts/analyze-topical-coverage.ts
```

Expected: Shows 1 topic covered for Nordic cluster (the one we just generated).

---

## Summary

| Task | File(s) | Purpose | Depends On |
|---|---|---|---|
| 1 | `skills/agent-strategist.md`, `skills/agent-writer.md` | Update skills to international cuisine | — |
| 2 | `lib/skills.ts` | Template variable injection | Task 1 |
| 3 | `app/api/recipes/generate/route.ts`, `generate-recipe.ts` | Add `cuisine` to pipeline | Task 2 |
| 4 | `lib/topical-map.ts` | Data structures + Nordic preset | — |
| 5 | `scripts/analyze-topical-coverage.ts` | Gap analyzer tool | Task 4 |
| 6 | `app/layout.tsx`, sitemap, robots | Brand update to augustcook.com | — |
| 7 | `scripts/generate-sprint-batch.ts` | Batch generation script | Tasks 3, 4 |
| 8 | Manual | Integration test | Tasks 1-7 |
