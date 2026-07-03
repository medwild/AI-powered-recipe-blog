# The Sourdough Kitchen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand chefaugustin.com from "International Home Cooking" to "The Sourdough Kitchen" — a sourdough baking micro-niche where Chef Augustin teaches starter care, artisan techniques, and discard recipes.

**Architecture:** Brand copy update across 7 files (layout, homepage, about, feed, llm.txt, 2 skills), topical map restructure (Nordic → 6 Sourdough clusters), pipeline defaults updated. The pipeline itself is cuisine-agnostic via `{{cuisine}}` template variables — no structural pipeline changes needed.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Inngest, Drizzle ORM. Skills are Markdown files loaded by `loadSkillContent()`.

## Global Constraints

- `npx tsc --noEmit` required after any `.ts`/`.tsx` change (CLAUDE.md rule)
- Never rename Inngest steps (breaks versioning)
- Never modify a skill Markdown without checking the corresponding agent runtime
- Chef Augustin Lefevre persona is fixed — only the FOCUS changes from world cuisines to sourdough
- Domain: `chefaugustin.com` stays unchanged
- Backward compatible: existing recipes without `cuisine` parameter must still work (falls back to sourdough defaults)
- Template variable system (`{{cuisine}}`, `{{cuisine_ingredients}}`, `{{cuisine_techniques}}`) must be preserved — it's the decoupling mechanism between topical map and skills

---

## File Map

```
Modified:
  app/layout.tsx                       — Metadata rebrand (International → Sourdough)
  app/page.tsx                         — Homepage copy + stats + JSON-LD
  app/about/page.tsx                   — About page meta + JSON-LD
  app/feed.xml/route.ts                — RSS feed title + description
  app/llm.txt/route.ts                 — LLM guide description
  skills/agent-strategist.md           — Role identity + strategy sections
  skills/agent-writer.md               — Persona backstory + vocabulary + ratios
  lib/topical-map.ts                   — Replace Nordic cluster with 6 Sourdough clusters
  lib/inngest/functions/generate-recipe.ts — Default cuisine values
```

---

### Task 1: Rebrand Site Metadata (layout.tsx)

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: Updated `Metadata` export with sourdough-focused titles and descriptions
- Consumes: `NEXT_PUBLIC_SITE_URL` env var (unchanged)

- [ ] **Step 1: Update the metadata export**

In `app/layout.tsx`, replace the metadata object (lines 15-37):

```typescript
export const metadata: Metadata = {
  title: {
    default: 'Chef Augustin — The Sourdough Kitchen',
    template: '%s | Chef Augustin',
  },
  description:
    'Chef Augustin Lefevre brings French sourdough techniques to your kitchen. Tested artisan bread recipes for home bakers — from starter to discard, from crust to crumb.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://chefaugustin.com',
  ),
  openGraph: {
    type: 'website',
    siteName: 'Chef Augustin',
    title: 'Chef Augustin — The Sourdough Kitchen',
    description:
      'Chef Augustin Lefevre brings French sourdough techniques to your kitchen. Tested artisan bread recipes for home bakers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chef Augustin — The Sourdough Kitchen',
    description:
      'Chef Augustin Lefevre brings French sourdough techniques to your kitchen.',
  },
}
```

- [ ] **Step 2: Type check**

Run `npx tsc --noEmit`. Expected: clean (no errors).

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: rebrand metadata — The Sourdough Kitchen

Replace International Home Cooking with sourdough baking focus.
Title, description, OG, Twitter cards updated.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Rebrand Homepage (page.tsx)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getPublishedRecipes()`, `getRecipeCategories()` from `lib/queries.ts` (unchanged)

- [ ] **Step 1: Update hero section copy**

In `app/page.tsx`, replace lines 40-43:

```tsx
// Before (~line 40):
<h1>French cooking, simple and always successful.</h1>
<p>Generous recipes, tested and explained step by step. Each article is designed to save you time in the kitchen.</p>

// After:
<h1>French sourdough, made simple for your home kitchen.</h1>
<p>Artisan bread recipes from a French-trained chef. Each recipe is tested, explained step by step, and designed to help you master sourdough — from your first starter to your best loaf.</p>
```

- [ ] **Step 2: Update stats row**

Replace lines 105-107:

```tsx
// Before:
<span>{"<30"}</span>
<span>Min on average</span>

// After:
<span>72h</span>
<span>Cold ferment</span>
```

- [ ] **Step 3: Update CTA section**

Replace lines 186 and 189:

```tsx
// Before:
<h2>Ready to cook?</h2>
<p>Browse our recipe collection and find inspiration for your next meal.</p>

// After:
<h2>Ready to bake?</h2>
<p>Browse our sourdough collection and start your next loaf.</p>
```

- [ ] **Step 4: Update JSON-LD Organization schema**

Replace lines 210-238. Update `description` to `'Chef Augustin Lefevre teaches French sourdough — artisan bread recipes for home bakers.'` and update any "International Home Cooking" references:

```tsx
// Find and replace in JSON-LD block:
// "International Home Cooking" → "Sourdough Baking"
// "world cuisines" → "French sourdough"
```

- [ ] **Step 5: Type check and build test**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -5
```

Expected: clean type check, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rebrand homepage for The Sourdough Kitchen

Hero, stats, CTA, and JSON-LD updated. French sourdough focus.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Rebrand About Page + RSS Feed + LLM.txt

**Files:**
- Modify: `app/about/page.tsx`
- Modify: `app/feed.xml/route.ts`
- Modify: `app/llm.txt/route.ts`

**Interfaces:**
- Produces: Updated brand copy in about page metadata, RSS feed, and LLM guide

- [ ] **Step 1: Update about page metadata**

In `app/about/page.tsx`, replace the meta description (line 12):

```typescript
// Before:
'bringing world cuisines to home cooks everywhere'

// After:
'bringing French sourdough techniques to home bakers everywhere'
```

Find and replace `'International Home Cooking'` → `'Sourdough Baking'` in the JSON-LD `knowsAbout` field (~line 132).

- [ ] **Step 2: Update RSS feed**

In `app/feed.xml/route.ts`, replace lines 25 and 27:

```xml
<!-- Before: -->
<title>Chef Augustin -- International Home Cooking</title>
<description>Easy, tested international recipes for home cooks by Chef Augustin Lefevre.</description>

<!-- After: -->
<title>Chef Augustin -- The Sourdough Kitchen</title>
<description>Tested sourdough bread recipes for home bakers by Chef Augustin Lefevre. From starter to discard, from crust to crumb.</description>
```

- [ ] **Step 3: Update LLM.txt guide**

In `app/llm.txt/route.ts`, replace lines 45-48:

```typescript
// Before:
'Chef Augustin is an international home cooking blog by Chef Augustin Lefevre.'
'The blog covers world cuisines made accessible for home cooks, from Swedish meatballs to Finnish salmon soup...'

// After:
'Chef Augustin is a sourdough baking blog by Chef Augustin Lefevre, a French-trained chef.'
'The blog covers everything sourdough — from starter care and troubleshooting to artisan loaves, flavored breads, and discard recipes. Content spans 6 clusters: Starter, Technique, Discard, Breads, Dishes, and Storage.'
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/about/page.tsx app/feed.xml/route.ts app/llm.txt/route.ts
git commit -m "feat: rebrand about page, RSS feed, and LLM guide for sourdough

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Update Strategist Skill for Sourdough

**Files:**
- Modify: `skills/agent-strategist.md`

**Interfaces:**
- Produces: Strategist system prompt focused on sourdough baking GEO strategy
- Template variables `{{cuisine}}`, `{{cuisine_ingredients}}`, `{{cuisine_techniques}}` preserved

- [ ] **Step 1: Read the current skill**

Read `skills/agent-strategist.md`. Key sections to update:
- §0 — Role & Identity (lines 16-24)
- §2 — International Cuisine Strategy → Sourdough Bread Strategy (line 44+)
- §14 — Output schema: `recipeCuisine: "American"` → `"Sourdough"` (line 216)

- [ ] **Step 2: Update Section 0 — Role & Identity**

Replace the role description:

```markdown
## 0. ROLE & IDENTITY

You are an SEO/GEO strategist specialized in sourdough bread baking. Your role is to analyze SERP data and produce an editorial plan for recipes and guides that help home bakers master sourdough — from starter creation to artisan loaves, from discard recipes to troubleshooting.

**Current focus area:** {{cuisine}}
**Key ingredients for this topic:** {{cuisine_ingredients}}
**Signature techniques:** {{cuisine_techniques}}

The brand voice is Chef Augustin Lefèvre — a French-trained chef who specializes in sourdough and artisan bread baking for home bakers. Content should reflect his training (French baking technique precision) while making sourdough approachable.
```

- [ ] **Step 3: Update Section 2 — Strategy heading**

Replace the heading and content:

```markdown
## 2. SOURDOUGH CONTENT STRATEGY

For the current focus area ({{cuisine}}), you must:

1. Identify which {{cuisine}} topics are most searched by home bakers (starter care, discard recipes, artisan loaves, flavored breads, troubleshooting)
2. Find common {{cuisine}} pitfalls and how to solve them
3. Extract 3-5 signature techniques of {{cuisine}} baking that differentiate professional results
4. Map competitor weaknesses — what do they NOT cover about {{cuisine}}?
5. Suggest FAQ questions that beginner sourdough bakers ask about {{cuisine}}
```

- [ ] **Step 4: Update output schema default**

Find `recipeCuisine: "American"` → `recipeCuisine: "Sourdough"`

- [ ] **Step 5: Commit**

```bash
git add skills/agent-strategist.md
git commit -m "feat: update Strategist skill for sourdough baking focus

Role, strategy section, and schema defaults updated.
Template variables preserved for topical map injection.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Update Writer Skill for Sourdough Baker Persona

**Files:**
- Modify: `skills/agent-writer.md`

**Interfaces:**
- Produces: Writer system prompt with Chef Augustin as sourdough expert
- Template variables `{{cuisine}}`, `{{cuisine_ingredients}}`, `{{cuisine_techniques}}` preserved

- [ ] **Step 1: Read the current skill**

Read `skills/agent-writer.md`. Key sections:
- §1 — Your Identity (backstory, lines 18-31)
- §3 — Your Mission (line 54+)
- §9 — Culinary Vocabulary (lines 185-216)
- §10 — Food Safety & Ratios (lines 220-241)
- §12 — Vibe Coding (line 368)

- [ ] **Step 2: Rewrite Section 1 — Identity**

Replace the persona backstory:

```markdown
## 1. YOUR IDENTITY

You are Chef Augustin Lefèvre — a French-trained chef who has dedicated his career to mastering the craft of sourdough and artisan bread baking. After graduating from culinary school in Lyon, you spent years in Parisian boulangeries, then traveled across France studying regional bread traditions with village bakers.

Your unique value: you bring French baker precision to {{cuisine}}. You explain WHY techniques work (the fermentation science), not just HOW to do them. You teach home bakers to read their dough — its texture, smell, and behavior — rather than just following recipes blindly.

You've authored five books including *The Art of French Sourdough* and *Flour, Water, Time*.

**Current focus:** {{cuisine}}
**Key ingredients:** {{cuisine_ingredients}}
**Signature techniques:** {{cuisine_techniques}}
```

- [ ] **Step 3: Update Section 3 — Mission**

Replace "world cuisines accessible" language:

```markdown
## 3. YOUR MISSION

Make artisan sourdough accessible to home bakers without compromise. You respect the craft but demystify it. Your reader is someone who wants bakery-quality bread at home — you give them the confidence, science, and precise techniques to succeed.
```

- [ ] **Step 4: Add sourdough vocabulary to Section 9**

Append a Sourdough/Baking sub-table to the culinary vocabulary section:

```markdown
### Sourdough Baking Vocabulary

| Term | Meaning | Use when... |
|---|---|---|
| Autolyse | Resting flour+water before adding starter | Explaining dough development |
| Bulk fermentation | First rise after mixing | Describing the main fermentation phase |
| Cold retard | Refrigerated proofing | Explaining flavor development |
| Stretch and fold | Gentle dough strengthening | Describing gluten development technique |
| Coil fold | Alternative folding method | High-hydration doughs |
| Bench rest | Short rest before final shaping | Relaxing gluten |
| Scoring | Cutting the dough surface | Controlling oven spring |
| Boule | Round loaf shape | Describing finished loaves |
| Batard | Oval loaf shape | Describing finished loaves |
| Banneton | Proofing basket | Equipment mentions |
| Lame | Scoring blade | Equipment mentions |
| Dutch oven baking | Steam-trapping method | Explaining crust development |
| Discard | Unfed starter removed before feeding | Zero-waste recipes |
| Hooch | Liquid on top of hungry starter | Troubleshooting |
| Oven spring | Final rise in the oven | Describing results |
| Crumb | Internal bread structure | Describing texture |
| Ear | Raised flap from scoring | Describing professional results |
| Hydration | Water-to-flour ratio (e.g., 75%) | Recipe precision |
| Inoculation | Starter percentage in dough | Recipe precision |
| Fermentolyse | Autolyse with starter included | Advanced technique |
```

- [ ] **Step 5: Add sourdough ratios to Section 10**

Append sourdough-specific data to the Food Safety & Ratios section:

```markdown
### Sourdough Baker's Ratios

| Parameter | Range | Notes |
|---|---|---|
| Hydration | 60-85%+ | 60-65%: sandwich bread, 70-75%: artisan boule, 80%+: ciabatta/pan de cristal |
| Salt | 1.8-2.2% of flour weight | Standard: 2% |
| Inoculation (starter %) | 10-20% | 10%: slow/long ferment, 20%: standard/same-day |
| Ideal dough temperature | 75-78°F (24-26°C) | After mixing |
| Internal bread doneness | 190-210°F (88-99°C) | Enriched doughs: 190°F, lean doughs: 205-210°F |
| Bulk fermentation rise | 30-50% volume increase | Before shaping |
| Final proof rise | 50-75% volume increase | Before baking |
```

- [ ] **Step 6: Commit**

```bash
git add skills/agent-writer.md
git commit -m "feat: update Writer skill for sourdough baker persona

New backstory (Parisian boulangeries), sourdough vocabulary table,
baker's ratios section. Template variables preserved.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Replace Topical Map with Sourdough Clusters

**Files:**
- Modify: `lib/topical-map.ts`

**Interfaces:**
- Produces: 6 sourdough clusters replacing Nordic, `getCuisineConfig()` with sourdough presets
- Consumed by: `scripts/analyze-topical-coverage.ts`, `scripts/generate-sprint-batch.ts`, `lib/inngest/functions/generate-recipe.ts`

- [ ] **Step 1: Replace the SWEDISH_CUISINE and FINNISH_CUISINE presets with SOURDOUGH_PRESET**

Remove lines 50-60 (`SWEDISH_CUISINE`, `FINNISH_CUISINE`). Add:

```typescript
// ---- Sourdough Preset ----

export const SOURDOUGH_PRESET = {
  name: "Sourdough",
  ingredients: "bread flour, rye flour, whole wheat flour, sourdough starter, salt, water, olive oil, honey, butter, milk, eggs",
  techniques: "autolyse, stretch and fold, coil fold, bulk fermentation, cold retard, bench rest, scoring, steam baking (dutch oven), lamination, preferments (poolish/biga)",
}
```

- [ ] **Step 2: Replace NORDIC_CLUSTER with 6 Sourdough clusters**

In `TOPICAL_MAP` array, replace the single `NORDIC_CLUSTER` entry with 6 cluster definitions representing the sourdough content architecture from the design spec. Each cluster follows the existing `Cluster` interface:

```typescript
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

export const TOPICAL_MAP: Cluster[] = [
  DISCARD_CLUSTER,    // Priority 1 — 74K vol head term
  TECHNIQUE_CLUSTER,  // Priority 2 — 13.8K vol
  DISHES_CLUSTER,     // Priority 3 — 13.6K vol
  BREADS_CLUSTER,     // Priority 4 — 5.7K vol
  STARTER_CLUSTER,    // Priority 5 — 5.6K vol
  STORAGE_CLUSTER,    // Priority 6 — 3.8K vol
]
```

- [ ] **Step 3: Update getCuisineConfig()**

Replace the function body:

```typescript
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
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: clean. The `Cluster` interface hasn't changed, only the data.

- [ ] **Step 5: Commit**

```bash
git add lib/topical-map.ts
git commit -m "feat: replace Nordic topical map with 6 Sourdough clusters

6 clusters: Starter (5.6K), Technique (13.8K), Discard (78K),
Breads (5.7K), Dishes (13.6K), Storage (3.8K).
Total: 120K+/mo volume, 40+ keyword-validated topics.
SOURDOUGH_PRESET replaces SWEDISH/FINNISH presets.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Update Pipeline Defaults for Sourdough

**Files:**
- Modify: `lib/inngest/functions/generate-recipe.ts`

**Interfaces:**
- Consumes: `cuisine`, `cuisineIngredients`, `cuisineTechniques` from Inngest event data
- Produces: Sourdough defaults passed to `runAgentPhase`

- [ ] **Step 1: Update default cuisine replacements**

In `lib/inngest/functions/generate-recipe.ts`, replace lines 43-47:

```typescript
// Before:
const cuisineReplacements = {
  cuisine: cuisine || "French",
  cuisine_ingredients: cuisineIngredients || "butter, cream, wine, shallots, garlic",
  cuisine_techniques: cuisineTechniques || "sauce making, braising, pastry",
}

// After:
const cuisineReplacements = {
  cuisine: cuisine || "Sourdough",
  cuisine_ingredients: cuisineIngredients || "bread flour, rye flour, whole wheat flour, sourdough starter, salt, water, olive oil, honey, butter",
  cuisine_techniques: cuisineTechniques || "autolyse, stretch and fold, coil fold, bulk fermentation, cold retard, bench rest, scoring, steam baking (dutch oven), lamination",
}
```

- [ ] **Step 2: Update the API route defaults (generate/route.ts)**

In `app/api/recipes/generate/route.ts`, update `getDefaultIngredients()` and `getDefaultTechniques()` to add sourdough as the default fallback:

```typescript
function getDefaultIngredients(cuisine: string): string {
  const defaults: Record<string, string> = {
    sourdough: "bread flour, rye flour, whole wheat flour, sourdough starter, salt, water, olive oil, honey, butter",
    // Keep existing entries for backward compatibility
    swedish: "salmon, rye flour, lingonberry, dill, cardamom, cream, potatoes, herring",
    finnish: "salmon, rye flour, dill, potatoes, blueberries, mushrooms, cream, cardamom",
    polish: "cabbage, potatoes, sausage, sour cream, dill, beets, mushrooms, rye",
    cuban: "plantains, black beans, rice, pork, citrus, cumin, oregano, garlic",
    french: "butter, cream, wine, shallots, herbs de Provence, garlic, cheese, bread",
  }
  return defaults[cuisine.toLowerCase()] ?? defaults.sourdough  // default → sourdough
}

function getDefaultTechniques(cuisine: string): string {
  const defaults: Record<string, string> = {
    sourdough: "autolyse, stretch and fold, coil fold, bulk fermentation, cold retard, bench rest, scoring, steam baking (dutch oven), lamination",
    // Keep existing entries
    swedish: "curing (gravlax), rye bread baking, cream-based sauces, cardamom baking",
    finnish: "rye bread baking, salmon soup making, berry desserts, slow fermentation",
    polish: "pierogi making, slow-braising, pickling, sour cream sauces",
    cuban: "slow-braising (ropa vieja), mojo marination, plantain frying, sofrito base",
    french: "sauce making, braising, pastry, knife skills, butter-based cooking",
  }
  return defaults[cuisine.toLowerCase()] ?? defaults.sourdough  // default → sourdough
}
```

And update line 96:

```typescript
// Before:
const cuisine = body?.cuisine?.toString().trim() || "French"

// After:
const cuisine = body?.cuisine?.toString().trim() || "sourdough"
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/inngest/functions/generate-recipe.ts app/api/recipes/generate/route.ts
git commit -m "feat: set sourdough as default pipeline cuisine

Defaults updated in orchestrator and API route.
Existing cuisine presets preserved for backward compatibility.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Integration Test — Generate a Sourdough Recipe

**Files:**
- No new files — manual test

- [ ] **Step 1: Start dev servers**

```bash
npm run dev
```

Wait for Next.js (port 3000) and Inngest (port 8288) to be ready.

- [ ] **Step 2: Trigger a sourdough discard recipe generation**

```bash
curl -s -X POST http://localhost:3000/api/recipes/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "keyword": "sourdough discard pretzel bites",
    "cuisine": "sourdough discard"
  }'
```

Expected: Returns `{"id": N, "status": "generating"}`

- [ ] **Step 3: Monitor pipeline**

Check Inngest dashboard at http://localhost:8288. Verify:
- Step 2 (Strategist) completes with sourdough-focused plan
- Step 3 (Writer) generates recipe with French sourdough persona
- All 13 steps complete without errors

- [ ] **Step 4: Verify generated content**

Check the published recipe:
1. Title mentions sourdough? ✅
2. Chef Augustin persona consistent? ✅
3. Meta targets the right keyword? ✅
4. JSON-LD schema valid? ✅
5. FAQ section present? ✅

- [ ] **Step 5: Run type check and audit**

```bash
npx tsc --noEmit
npm test
```

Expected: Clean type check, 35/35 tests pass.

---

## Summary

| Task | Files | Purpose | Depends On |
|---|---|---|---|
| 1 | `app/layout.tsx` | Metadata rebrand | — |
| 2 | `app/page.tsx` | Homepage copy + JSON-LD | — |
| 3 | `app/about/page.tsx`, `feed.xml`, `llm.txt` | Secondary page rebrand | — |
| 4 | `skills/agent-strategist.md` | Strategist sourdough focus | — |
| 5 | `skills/agent-writer.md` | Writer sourdough persona | — |
| 6 | `lib/topical-map.ts` | 6 sourdough clusters | — |
| 7 | `generate-recipe.ts`, `generate/route.ts` | Pipeline defaults | 6 |
| 8 | Manual | Integration test | 1-7 |

**Total: 8 tasks, ~9 files modified, 0 new files. Estimated: 45-60 min.**
