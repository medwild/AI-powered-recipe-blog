# Topical Authority SEO Integration — Design Spec

> **Date:** 2026-07-12
> **Status:** Approved
> **Scope:** Classic SEO overlay on existing hijacking + PTRA + LLM/GEO strategies

---

## 1. Objective

Add classic organic SEO (topical authority via hub & spoke architecture) to the existing content strategy **without modifying the AI agent pipeline, database schema, or routing structure**.

The three existing pillars remain primary:
1. **Pinterest SERP Hijacking** — Pin-First format, 2:3 images, 5 pins per recipe
2. **PTRA** — Editorial plan, batch generation, board mapping
3. **LLM/GEO Citation** — Citability scoring, answer nuggets, per-platform profiles

Classic SEO becomes the **4th layer**, providing the domain authority foundation that the other three strategies can build on.

---

## 2. Architecture

```
Pipeline IA (UNCHANGED)
  SERP → Chef Augustin → Content Loop → Persist → Images → Pin Designer
                              │
                              ▼
                     ┌────────────────────┐
                     │  POST-PROCESSING   │  ← NEW (2 files)
                     │  Cluster Inference │
                     │  + Link Insertion  │
                     └────────────────────┘
                              │
                              ▼
                     ┌────────────────────┐
                     │  RENDU FRONTEND    │  ← MODIFIED (3 files)
                     │  Hub Pages         │
                     │  Breadcrumbs       │
                     │  Related Sidebar   │
                     └────────────────────┘
```

**Key principle:** cluster is inferred from recipe tags at render/post-processing time. No database column. No AI agent prompt change. No new routes.

---

## 3. Components

### 3.1 Cluster Resolver — `lib/cluster-resolver.ts` (NEW, ~40 lines)

Pure function: `resolveCluster(tags: string[]) => Cluster | null`

Deterministic tag-to-cluster mapping using the 6 clusters defined in `lib/topical-map.ts`:

| Tag Matches | Cluster |
|---|---|
| `chicken`, `poultry`, `rotisserie` | `chicken-dinners` |
| `slow-cooker`, `crockpot`, `mijoteuse` | `small-batch-slow-cooker` |
| `one-pan`, `sheet-pan`, `one-pot`, `single-pan`, `skillet` | `one-pan-dinners` |
| `asian`, `stir-fry`, `soy`, `ginger`, `sesame`, `teriyaki` | `asian-inspired-dinners` |
| `budget`, `cheap`, `affordable`, `economical`, `frugal` | `budget-meals` |
| `healthy`, `quick`, `30-minute`, `15-minute`, `light`, `low-carb` | `quick-healthy-dinners` |

**Fallback:** `null` — recipe does not belong to any hub (no breadcrumb cluster, no hub page filtering).

**No API calls, no DB queries, no side effects.** Imported by all other components.

### 3.2 Internal Linker — `lib/internal-linker.ts` (NEW, ~60 lines)

Post-processing function: `insertContextualLinks(markdown: string, recipeId: number, tags: string[]) => Promise<string>`

**Algorithm:**
1. Extract candidate phrases from markdown: dish names (H2/H3 headings), key ingredients (bullet list items), technique mentions
2. Resolve current recipe's cluster via `resolveCluster(tags)`
3. Query published recipes in the same cluster first (`getRelatedRecipes`), then cross-cluster
4. For each candidate phrase, find a matching recipe whose title/slug contains the phrase
5. Insert markdown link `[phrase](/recettes/{slug})` at the first occurrence
6. Stop when 3 links inserted or no more candidates

**Rules:**
- Never link to the current recipe (`recipeId` check)
- Max 1 link per paragraph (split by `\n\n`)
- Natural anchors only: dish names, ingredients, techniques — never "click here" or "read more"
- If no match found → don't force it (return markdown unchanged)
- Links spaced at least 200 words apart

**Call site:** `persist-phase.ts`, after the content loop produces the final markdown, before DB write. One function call, one line.

### 3.3 Hub Pages — `app/recettes/page.tsx` (MODIFIED, ~30 new lines)

The existing recipe listing page gains cluster-filtered hub mode via the `?cluster=` query parameter.

**URL patterns:**
```
/recettes                              → All recipes (current behavior)
/recettes?cluster=chicken-dinners      → "Chicken Dinners for Two" hub
/recettes?cluster=one-pan-dinners      → "One-Pan Dinners for Two" hub
```

**What hub pages display:**
- **H1:** Cluster name (e.g., "Chicken Dinners for Two")
- **Description:** 2-3 sentences about the cluster (hardcoded per cluster in the topical map)
- **Stats row:** recipe count, average cook time, number of techniques
- **Recipe grid:** filtered to recipes matching the cluster (via `resolveCluster`)
- **Cross-links:** 3 related clusters at the bottom

**SEO metadata per hub:**
Dynamically generated `<title>`, `<meta description>`, canonical URL, and JSON-LD (CollectionPage).

**Implementation:** Read `searchParams.cluster` in the server component. Filter results from `getPublishedRecipes()` server-side. ISR revalidation handles cache freshness (60s on listing pages).

### 3.4 Breadcrumbs — `components/recipe-hero.tsx` (MODIFIED, ~15 new lines)

Add a breadcrumb row above the recipe title in the hero component:

```
Home > Chicken Dinners > Easy Chicken Piccata for Two
```

**Behavior:**
- If `resolveCluster(recipe.tags)` returns a cluster → show 3-level breadcrumb
- If no cluster → show `Home > Recettes > Title` (existing behavior, no change)
- Cluster name links to `/recettes?cluster={id}`

**Schema:** BreadcrumbList JSON-LD added alongside existing structured data.

### 3.5 Related Sidebar — `components/recipe-article.tsx` (MODIFIED, ~20 new lines)

Enhance the existing "Related Recipes" sidebar to be cluster-aware.

**Layout:**
```
┌─────────────────────────────┐
│  More [Cluster Name]        │  ← Contextual heading
│                             │
│  [4 same-cluster recipes]   │  ← via getRelatedRecipes (tag overlap)
│                             │
│  You might also like:       │
│  [2 cross-cluster recipes]  │  ← random from other clusters
└─────────────────────────────┘
```

**Logic:**
- First 4 slots: `getRelatedRecipes(recipeId, tags)` — already prioritizes tag overlap (same cluster recipes share cluster tags)
- Next 2 slots: `getPublishedRecipes()` filtered to different clusters, random sample
- Heading adapts: "More Chicken Dinners" / "More One-Pan Meals" / "Related Recipes" (fallback)

---

## 4. Data Flow

```
Recipe published
  │
  ├─→ resolveCluster(tags) → Cluster | null
  │         │
  │         ├─→ Breadcrumbs (recipe-hero.tsx)
  │         ├─→ Sidebar heading (recipe-article.tsx)
  │         └─→ Hub page filter (recettes/page.tsx)
  │
  └─→ insertContextualLinks(markdown, id, tags) → enriched markdown
            │
            └─→ Saved to DB in persist-phase.ts
```

---

## 5. What Does NOT Change

| Component | Status |
|---|---|
| AI agents (Chef Augustin, Pin Designer) | UNCHANGED |
| Inngest steps (SERP, Content Loop, Persist, Image, Pin) | UNCHANGED |
| Database schema (`recipes` table) | UNCHANGED — no new columns |
| Routing structure (no new routes) | UNCHANGED |
| Content format (Pin-First / Google) | UNCHANGED |
| Batch generator | UNCHANGED |

---

## 6. Existing Assets Leveraged

| Asset | Used For |
|---|---|
| `lib/topical-map.ts` | Cluster definitions, names, descriptions |
| `lib/queries.ts::getRelatedRecipes()` | Tag-overlap scoring for sidebar and linker |
| `lib/queries.ts::getPublishedRecipes()` | Hub page listing and cross-cluster discovery |
| `data/editorial-plan.json` | Cluster ↔ board alignment verification |
| `topical-authority-skill/SKILL.md` | Methodology reference (E-A-V, hub & spoke, 74% coverage) |

---

## 7. File Manifest

| # | File | Action | Est. Lines |
|---|---|---|---|
| 1 | `lib/cluster-resolver.ts` | **NEW** — tag-to-cluster mapping | ~40 |
| 2 | `lib/internal-linker.ts` | **NEW** — contextual link insertion | ~60 |
| 3 | `app/recettes/page.tsx` | **MODIFIED** — `?cluster=` hub mode | ~30 |
| 4 | `components/recipe-hero.tsx` | **MODIFIED** — cluster breadcrumbs | ~15 |
| 5 | `components/recipe-article.tsx` | **MODIFIED** — cluster-aware sidebar | ~20 |
| 6 | `lib/inngest/functions/steps/persist-phase.ts` | **MODIFIED** — call `insertContextualLinks` | ~3 |
| **Total** | | | **~168 lines** |

---

## 8. Success Criteria

- [ ] `resolveCluster()` correctly maps all 6 clusters from recipe tags
- [ ] Hub pages display filtered recipes with correct SEO metadata
- [ ] Breadcrumbs show cluster context on recipe pages
- [ ] Internal linker inserts 2-3 contextual links without breaking markdown
- [ ] Sidebar shows 4 same-cluster + 2 cross-cluster recipes
- [ ] `npx tsc --noEmit` passes
- [ ] All existing pages return 200 (no regression)
- [ ] `/articles/test` returns 404 (no routing regression)
