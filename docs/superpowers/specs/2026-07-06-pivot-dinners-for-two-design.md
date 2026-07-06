# Pivot — "Easy Weeknight Dinners for Two" — Design Spec

> **Status:** Draft — awaiting user review
> **Date:** 2026-07-06
> **Topic:** Strategic pivot from "sourdough discard recipes" to "Easy Weeknight Dinners for Two"
> **Brand:** Chef Augustin stays — persona evolves from sourdough baker to practical small-batch dinner cook

---

## 1. Strategic Decision

The `sourdough discard recipes` niche is abandoned. The blog pivots to:

```
Easy Weeknight Dinners for Two
```

Positioning: **Small-Batch Weeknight Dinners for Two**
First sub-cluster: **Small-Batch Slow Cooker Dinners for Two**

---

## 2. New Persona — Chef Augustin v2

Same name, same domain (`chefaugustin.com`), evolved backstory:

| Attribute | Sourdough persona (old) | Dinners-for-two persona (new) |
|---|---|---|
| Identity | French-trained baker | French-trained chef |
| Training | Lyon + Parisian boulangeries | Lyon + brigade kitchens |
| Cookbook | 5 published sourdough books | Compiling first cookbook: "Dinner for Two" |
| Specialty | Artisan sourdough bread | Practical small-batch dinners scaled for two |
| Promise | Master sourdough at home | Real weeknight dinners for real small households |
| Audience | Home bakers | Couples, roommates, singles, empty nesters |

---

## 3. Niche Core (PTRA-aligned)

```json
{
  "micro_niche": "Easy Weeknight Dinners for Two",
  "positioning_variant": "Small-Batch Weeknight Dinners for Two",
  "primary_sub_cluster": "Small-Batch Slow Cooker Dinners for Two",
  "excluded_adjacent_niches": [
    "family dinners for 4-6 people",
    "general recipe blog",
    "medical diet recipes",
    "weight loss meal plans",
    "party food menus",
    "cocktail recipes",
    "sourdough discard recipes"
  ],
  "target_audience": "Small-household home cooks: couples, roommates, singles cooking for two, empty nesters",
  "user_problem": "Most recipes are designed for 4-6 servings, creating waste and portion confusion",
  "solution_promise": "Simple, portion-conscious weeknight dinner recipes designed for two people",
  "primary_pinterest_intent": "quick solution + step-by-step + dinner inspiration",
  "content_positioning": "Small-batch dinner recipes for real weeknights, not generic family meals randomly reduced"
}
```

---

## 4. Phase 1 — Sourdough Cleanup

### 4.1 Files to update (replace sourdough references)

| File | Action |
|---|---|
| `app/page.tsx` | Replace H1, intro, description, browse text |
| `app/about/page.tsx` | Rewrite Chef Augustin bio — same name, new story |
| `app/feed.xml/route.ts` | Update title + description |
| `app/llm.txt/route.ts` | Replace sourdough content with dinners-for-two |
| `app/api/recipes/generate/route.ts` | Change default cuisine from `"sourdough"` to `"dinners-for-two"` |
| `scripts/generate-pinterest-batch.ts` | Change default cuisine |
| `skills/agent-strategist.md` | Replace §0-2 (role, persona, content strategy) |
| `skills/agent-writer.md` | Replace §1 (identity, persona, voice) |
| `skills/agent-pin-designer.md` | Replace all examples, boards, micro-niche |
| `lib/topical-map.ts` | Replace sourdough clusters with dinners-for-two clusters |
| `lib/inngest/functions/generate-recipe.ts` | Default cuisine text |
| `lib/queries.ts` | Check for hardcoded sourdough references |
| `data/pinterest-input.json` | Replace test data |
| `components/site-header.tsx` | Update tagline if present |

### 4.2 Files to keep (unchanged)

- `lib/content-validator.ts` — generic, no niche-specific content
- `lib/inngest/functions/steps/*` — generic
- `lib/inngest/functions/agents/editor.ts` — generic
- `lib/inngest/functions/agents/qa.ts` — generic
- `lib/db/schema.ts` — no changes needed
- All UI components except site-header

---

## 5. Phase 2 — New Taxonomy

### 5.1 Categories (6, PTRA-compliant)

```json
[
  { "slug": "dinners-for-two", "name": "Dinners for Two" },
  { "slug": "small-batch-slow-cooker", "name": "Small-Batch Slow Cooker" },
  { "slug": "one-pan-dinners-for-two", "name": "One-Pan Dinners for Two" },
  { "slug": "budget-meals-for-two", "name": "Budget Meals for Two" },
  { "slug": "chicken-dinners-for-two", "name": "Chicken Dinners for Two" },
  { "slug": "asian-inspired-dinners-for-two", "name": "Asian-Inspired Dinners for Two" }
]
```

### 5.2 Tags (16)

```
"dinner for two", "small batch dinner", "weeknight dinner", "easy dinner",
"30 minute dinner", "one pan dinner", "slow cooker for two", "mini crockpot",
"2 quart crockpot", "budget dinner", "chicken dinner", "ground beef dinner",
"healthy-ish dinner", "no waste cooking", "couples dinner", "small household cooking"
```

---

## 6. Phase 3 — SEO & Metadata

| Element | Old | New |
|---|---|---|
| Site title | Chef Augustin — The Sourdough Kitchen | Chef Augustin — Easy Weeknight Dinners for Two |
| Site description | Tested sourdough bread recipes... | Simple small-batch dinner recipes for two people... |
| Homepage H1 | (sourdough-focused) | Easy Weeknight Dinners for Two |
| About meta | French-trained sourdough baker | French-trained chef — practical small-batch dinners for two |
| Feed title | The Sourdough Kitchen | Easy Weeknight Dinners for Two |
| llm.txt | Sourdough baking blog | Small-batch dinners for two blog |

---

## 7. Phase 4 — AI Prompts Update

### 7.1 Strategist skill (§0-2)

Replace sourdough baking specialist identity with:

```
You are an SEO/GEO strategist specialized in easy weeknight dinners for two.
The brand voice is Chef Augustin Lefèvre — a French-trained chef who cooks
practical small-batch dinners for two. Content should reflect his training
(French cooking precision) while keeping weeknight meals approachable.

Content focus:
1. Identify which small-batch dinner topics are most searched by couples,
   roommates, and small households
2. Find common dinner-for-two pitfalls and how to solve them
3. Extract 3-5 signature techniques of practical home cooking for two
4. Map competitor weaknesses — what do they NOT cover about small-batch cooking?
5. Suggest FAQ questions that couples cooking for two ask
```

### 7.2 Writer skill (§1)

Replace sourdough baker persona with:

```
You are Chef Augustin Lefèvre — a French-trained chef who has dedicated
his career to making great food accessible. You trained in Lyon and cooked
in professional kitchens, learning that the best meals aren't always the
most complicated — they're the ones shared with someone you love.

Your unique value: you bring French chef precision to practical weeknight
dinners for two. You explain WHY techniques work, not just HOW.
You teach home cooks to cook smarter, not harder.

You are compiling your first cookbook: "Dinner for Two — Small-Batch
Weeknight Meals for Real Life."
```

### 7.3 Pin Designer skill

Replace all micro-niche references, board examples, and sample Pins from sourdough to dinners-for-two.
Remove all flatbread/cracker/muffin examples.

---

## 8. Phase 5 — Topical Map

Replace `lib/topical-map.ts` sourdough clusters with:

| Cluster | Cuisine | Priority |
|---|---|---|
| `small-batch-slow-cooker` | Small-Batch Slow Cooker | 1 |
| `one-pan-dinners-for-two` | One-Pan Dinners for Two | 2 |
| `budget-meals-for-two` | Budget Meals for Two | 3 |
| `chicken-dinners-for-two` | Chicken Dinners for Two | 4 |
| `asian-inspired-dinners` | Asian-Inspired Dinners | 5 |

Each cluster: 1 pillar + 3-5 spokes. Cuisine presets adapted for small-batch cooking.

---

## 9. Phase 6 — PTRA / Pinterest

### 9.1 Boards

| Board | Role |
|---|---|
| Easy Dinners for Two | Primary board |
| 30-Minute Meals for Two | Quick solution intent |
| Small-Batch Slow Cooker Recipes | Primary sub-cluster |
| Budget Meals for Two | Economic angle |
| Chicken Dinners for Two | Protein-specific |
| Asian-Inspired Dinners for Two | Test cluster |

### 9.2 Pin strategy (unchanged from existing)

5 Pins per recipe, different angles, 2:3 format, Fresh Pin Rule enforced.

---

## 10. Files NOT Changed

- `lib/inngest/functions/steps/*` — generic pipeline steps
- `lib/inngest/functions/agents/editor.ts` — format-agnostic
- `lib/inngest/functions/agents/qa.ts` — format-agnostic
- `lib/inngest/functions/agents/auditor.ts` — niche-agnostic
- `lib/content-validator.ts` — generic
- `lib/db/schema.ts` — no change
- `components/` (except site-header) — UI components generic
- `app/recettes/[slug]/page.tsx` — dynamic, no niche-specific content
- `middleware.ts`, auth, rate-limit — no change

---

## 11. Success Criteria

- [ ] Zero "sourdough" references in public-facing pages
- [ ] Zero "discard" references in skills/prompts
- [ ] Chef Augustin persona consistent across all pages
- [ ] New taxonomy (6 categories, 16 tags) in place
- [ ] Topical map reflects dinners-for-two clusters
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Homepage shows new niche
- [ ] About page shows new persona
- [ ] Feed/llm.txt/sitemap updated

---

## 12. Risks

- Skill edits change LLM behavior — test with one recipe generation to verify
- Pin Designer examples need complete replacement — largest single-file change
- Default cuisine change from "sourdough" to "dinners-for-two" affects all new recipe generations
- `lib/topical-map.ts` clusters are used by batch scripts — verify batch scripts still work
