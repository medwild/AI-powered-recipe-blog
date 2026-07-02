# Pre-Production SEO Gate — Design Spec

> Version 1.0 | 2026-07-02 | Status: Ready for implementation

## Executive Summary

Add a deterministic, non-AI validation gate that runs before any recipe/article is published. The gate checks 15 SEO criteria (8 blocking, 7 warnings) and returns PASS/REVISE/BLOCK. It is integrated into the existing `approveRecipe` Server Action — the single choke point between draft and published.

**Key decisions:**
- **No new Inngest step** — the gate runs synchronously in the Server Action
- **No LLM** — all 15 checks are deterministic (regex, length, JSON parse, DB query)
- **Does not replace Auditor or QA** — those agents verify content quality; this gate verifies technical SEO correctness
- **Research-backed criteria** — based on Google Recipe Schema requirements 2026, E-E-A-T framework, and expert consensus

## Architecture

```
app/actions/recipes.ts (approveRecipe)
    │
    ▼
lib/seo/gate.ts (runSeoGate)
    ├── validateRecipeSchema()    → BlockingIssue[]
    ├── validateMetadata()        → BlockingIssue[]
    ├── validateImages()          → BlockingIssue[]
    ├── checkCannibalization()    → BlockingIssue[]
    ├── checkTitleKeyword()       → Warning[]
    ├── checkMetaLength()         → Warning[]
    ├── checkIntroKeyword()       → Warning[]
    ├── checkSchemaFields()       → Warning[]
    └── checkInternalLinks()      → Warning[]
    │
    ▼
GateResult { status, score, blockingIssues[], warnings[] }
    ├── PASS   → set status = "published" + revalidate
    ├── REVISE → return warnings to dashboard
    └── BLOCK  → reject with blockingIssues
```

### Files

| File | Purpose | Est. lines |
|---|---|---|
| `lib/seo/types.ts` | `GateInput`, `GateResult`, `BlockingIssue`, `Warning` | ~40 |
| `lib/seo/gate.ts` | `runSeoGate()` + all 15 rules | ~250 |
| `app/actions/recipes.ts` | Modify `approveRecipe()` to call gate | ~10 added |

## BLOCK Criteria (8)

Any single BLOCK issue → status = BLOCK, publication refused.

| # | Code | Check | Rule |
|---|---|---|---|
| B1 | `RECIPE_SCHEMA_MISSING` | Recipe Schema absent/invalid | `jsonLd` is null, or `JSON.parse` fails, or no `@type: Recipe` node |
| B2 | `INGREDIENTS_MISSING` | `recipeIngredient` absent | No `recipeIngredient` array in Recipe node, or array is empty |
| B3 | `INSTRUCTIONS_MISSING` | `recipeInstructions` absent | No `recipeInstructions` array in Recipe node, or array is empty |
| B4 | `IMAGE_MISSING_IN_SCHEMA` | `image` absent from schema | No `image` field in the Recipe node of @graph |
| B5 | `IMAGE_PLACEHOLDER` | Placeholder image | `heroImageUrl` is null, undefined, or contains "placeholder" |
| B6 | `RECIPE_NAME_MISSING` | `name` absent from schema | `name` field empty or missing in Recipe node |
| B7 | `TITLE_MISSING` | HTML title absent | `metaTitle` is null, empty, or < 10 characters |
| B8 | `CANIBALIZATION` | Duplicate focus keyphrase | Another published recipe/article already uses this `focusKeyphrase` |

**Sources:** Google Recipe Rich Results required fields (2026), Google duplicate content guidelines.

## WARNING Criteria (7)

Each WARNING deducts 5 points from the base score of 100. Warnings do not block publication.

| # | Code | Check | Rule |
|---|---|---|---|
| W1 | `KEYPHRASE_NOT_IN_TITLE` | Keyphrase missing from SEO title | `metaTitle` does not contain `focusKeyphrase` (case-insensitive) |
| W2 | `META_DESC_OUT_OF_RANGE` | Meta description length | < 120 or > 160 characters |
| W3 | `KEYPHRASE_NOT_IN_INTRO` | Keyphrase missing from intro | First 100 words of `contentMarkdown` do not contain `focusKeyphrase` (case-insensitive) |
| W4 | `NUTRITION_MISSING_IN_SCHEMA` | No `nutrition` in schema | Recipe node has no `nutrition` field (Google-recommended for rich results) |
| W5 | `RATING_MISSING_IN_SCHEMA` | No `aggregateRating` in schema | Recipe node has no `aggregateRating` (critical for SERP CTR) |
| W6 | `LOW_INTERNAL_LINKS` | < 2 internal links | Less than 2 internal links found in content |
| W7 | `COOK_TIME_MISSING_IN_SCHEMA` | No `cookTime`/`prepTime` | Recipe node missing cooking duration fields |

**Sources:** Backlinko CTR studies, WordStream 2026 ranking factors, Google Recipe schema recommended fields.

## Scoring

```
Base score = 100
- For each BLOCK issue: -100 (any BLOCK → score = 0, status = BLOCK)
- For each WARNING: -5

PASS  : score >= 85 AND 0 BLOCK issues
REVISE: score >= 60 AND 0 BLOCK issues
BLOCK : score < 60 OR >= 1 BLOCK issue
```

Score visible only in dashboard admin — never exposed to readers.

## GateInput Type

```ts
interface GateInput {
  recipeId: number
  title: string
  metaTitle: string | null
  metaDescription: string | null
  slug: string
  focusKeyphrase: string  // Uses recipe.keyword from DB (already NOT NULL)
  contentMarkdown: string | null
  heroImageUrl: string | null
  jsonLd: Record<string, unknown> | null
  content_type: "recipe" | "article"
}
```

## GateResult Type

```ts
interface GateResult {
  status: "PASS" | "REVISE" | "BLOCK"
  score: number // 0-100
  blockingIssues: BlockingIssue[]
  warnings: Warning[]
  summary: string
  checkedAt: string // ISO 8601
}

interface BlockingIssue {
  code: string // e.g. "RECIPE_SCHEMA_MISSING"
  message: string // Human-readable in English
}

interface Warning {
  code: string // e.g. "KEYPHRASE_NOT_IN_TITLE"
  message: string
}
```

## Criteria Voluntarily Excluded

| Excluded | Rationale |
|---|---|
| FAQPage schema check | Google restricted FAQ rich results to gov/health sites (2025). Our FAQ schema stays for AI parsing but is not gated. |
| ALT text on images | Already handled by front-end (RecipeCard). Not a blocking SEO issue. |
| Word count / content length | Auditor agent already checks 1800-2200 word target. Redundant. |
| Keyphrase density | All 2026 experts agree: don't measure it. Google understands synonyms. |
| Slug length/quality | Already handled by `slugify()`. |
| Transition words / readability scores | Yoast-ism. No SEO expert mentions it in 2026. |
| Qualitative content assessment | Already covered by Auditor (8 E-E-A-T criteria) + QA (5 cross-agent checks). No duplication. |

## Integration Point

Modified `approveRecipe()` in `app/actions/recipes.ts`:

```ts
// Before:
await db.update(recipes).set({ status: "published", publishedAt: new Date() }).where(eq(recipes.id, id))

// After:
const gateResult = await runSeoGate(recipe)
if (gateResult.status === "BLOCK") {
  return { error: `Publication blocked: ${gateResult.blockingIssues.map(i => i.message).join("; ")}` }
}
await db.update(recipes).set({ status: "published", publishedAt: new Date() }).where(eq(recipes.id, id))
// Pass gateResult.warnings to dashboard for display
```

## Risks

| Risk | Mitigation |
|---|---|
| `aggregateRating` warning on every new recipe (no ratings yet) | Acceptable — warning only, not blocking. Recipes accumulate ratings over time. |
| `CANIBALIZATION` check requires DB query per publish | Single indexed query on `focusKeyphrase` column — negligible cost. |
| Gate bypass via direct DB manipulation | Gate runs in Server Action, not at DB level. Direct DB access is already an admin-only risk. |

## Non-goals (V1)

- No dashboard UI for gate results (console/server response only)
- No auto-fix of issues (gate only reports)
- No historical gate log table
- No article-specific checks (V1 is recipe-only; article content_type gets a lightweight pass)

## Sources

- Google Recipe Schema documentation (2026): required fields `name`, `image`, `recipeIngredient`, `recipeInstructions`
- Google AI Optimization Guide (2026): "SEO fundamentals first — no special AI markup needed"
- Google deprecations (2025-2026): FAQPage restricted, HowTo standalone deprecated
- E-E-A-T Framework: Marie Haynes, Lily Ray, Danny Sullivan (Google)
- 40-site SEO data analysis (2026): topical authority > backlinks, internal link velocity, contentEffort signals
- WordStream 2026 Ranking Factors: content quality is #1, backlinks down to 13% weight
