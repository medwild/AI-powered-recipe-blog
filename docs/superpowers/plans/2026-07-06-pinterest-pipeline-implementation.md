# Pinterest SERP Hijacking — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 0 Discovery scripts + Phase 1 Pin-First pipeline + PTRA patches — 15 files, 6 new + 9 modified, 0 deleted.

**Architecture:** 3 deterministic scripts for keyword discovery → `mode` parameter propagated through existing Inngest pipeline via `{{format}}` template variable → unified word-count thresholds (1000 error / 1200 warning) across Auditor, QA, and ContentValidator. Rollback-safe: default mode is `"google"`.

**Tech Stack:** TypeScript (tsx for scripts), Next.js 16 App Router, Inngest 4.7, Drizzle ORM, Markdown skills as LLM system prompts.

## Global Constraints

- Never rename an Inngest step (breaks workflow versioning)
- Never change step order (breaks inter-step dependencies)
- After every modification: `npx tsc --noEmit` must pass
- Default mode = `"google"` (backward compatible — existing pipeline unchanged)
- Chirurgical changes only — touch only lines that need to change
- Skills are LLM system prompts — modify with precision, test with `npx tsc --noEmit`
- `mode: "pin-first"` is opt-in via batch caller

---

### Task 1: ContentValidator — Unified thresholds

**Files:**
- Modify: `lib/content-validator.ts:119-131`

**Interfaces:**
- Produces: `MIN_WORD_COUNT_ERROR = 1000`, `MIN_WORD_COUNT_WARNING = 1200` (was 1500/1800)

- [ ] **Step 1: Update word count thresholds**

In `lib/content-validator.ts`, change line 119 from:
```typescript
if (wordCount < 1500) {
```
to:
```typescript
if (wordCount < 1000) {
```

Change line 123 from:
```typescript
message: `Content too short: ${wordCount} words (minimum: 1500, target: 1800-2200)`,
```
to:
```typescript
message: `Content too short: ${wordCount} words (minimum: 1000)`,
```

Change line 125 from:
```typescript
} else if (wordCount < 1800) {
```
to:
```typescript
} else if (wordCount < 1200) {
```

Change line 129 from:
```typescript
message: `Content below target: ${wordCount} words (target: 1800-2200)`,
```
to:
```typescript
message: `Content below target: ${wordCount} words (target: 1200-2200)`,
```

Also update line 291 — originality score length factor — from:
```typescript
const lengthFactor = Math.min(1, words.length / 1800)
```
to:
```typescript
const lengthFactor = Math.min(1, words.length / 1200)
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/content-validator.ts
git commit -m "fix: unify ContentValidator thresholds — 1000 error / 1200 warning

Supports both Pin-First (1200-1500 words) and Google-first (1800-2200)
formats with a single lower bound. Originality score length factor
adjusted to 1200.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Strategist skill — Add {{format}} template variable

**Files:**
- Modify: `skills/agent-strategist.md` — frontmatter version + §3 Input Contract + §14 Output Schema

**Interfaces:**
- Consumes: `{{format}}` template variable ("google" | "pin-first")
- Produces: `targetWordCount` in SeoPlan varies by format

- [ ] **Step 1: Update frontmatter version**

Change line 2 from `version: "5.1.0-ULTRA"` to `version: "5.2.0-ULTRA"`.

Change line 9 from `last_updated: "2026-06-27"` to `last_updated: "2026-07-06"`.

- [ ] **Step 2: Add format awareness to §3 Input Contract**

After line 62 (`target_date`), add a new line in §3:

```
- `format`: Content format — "google" (1800-2200 words, 5 FAQ, Nutrition Highlights) or "pin-first" (1200-1500 words, 3 FAQ, no Nutrition Highlights, recipe card above fold). Default: "google".
```

- [ ] **Step 3: Add Pin-First editorial rules to §4 Pre-Planning Checklist**

After Step 6 (line 92), add:

```
### Step 7 — FORMAT ADAPTATION (v5.2)

If `format` is "pin-first", apply these constraints to your editorial plan:

1. **Word count**: Target 1200-1500 words total. Set `targetWordCount` to "1200-1500".
2. **FAQ**: Plan exactly 3 Q&A (not 5). Prioritize the 3 most actionable PAA questions.
3. **Nutrition Highlights**: Do NOT include in the plan. Remove from `whyThisWorks` expectations.
4. **Intro length**: Plan a 50-80 word opening hook (not 60-80).
5. **Recipe card position**: Plan the recipe card (ingredients + instructions) to appear immediately after the intro — before any H2 sections. This is the "above the fold" placement that Pinterest users expect.
6. **JSON-LD**: Include Recipe + BlogPosting + BreadcrumbList. Do NOT include FAQPage schema (Pinterest Pins don't benefit from it).
7. **Image prompt**: Plan for 2:3 aspect ratio vertical images (Pinterest-optimized).

If `format` is "google" (default), use the standard 1800-2200 word target with 5 FAQ, Nutrition Highlights, and full JSON-LD.
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add skills/agent-strategist.md
git commit -m "feat(strategist): v5.2 — {{format}} template for Pin-First editorial plans

Adds format-aware planning: pin-first targets 1200-1500 words,
3 FAQ, no Nutrition Highlights, recipe card above fold.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Writer skill — Add {{format}} + Pin-First structure

**Files:**
- Modify: `skills/agent-writer.md` — frontmatter version + §14 Content Length + §16 Pre-Publish Checklist

**Interfaces:**
- Consumes: `{{format}}` template variable ("google" | "pin-first")
- Produces: contentMarkdown target varies by format (1200-1500 vs 1800-2200)

- [ ] **Step 1: Update frontmatter version**

Change line 2 from `version: "6.2.0-ULTRA"` to `version: "6.3.0-ULTRA"`.

Change line 12 from `last_updated: "2026-07-03"` to `last_updated: "2026-07-06"`.

- [ ] **Step 2: Replace §14 Content Length Targets**

Replace the entire §14 table (lines 344-355) with:

```
## 14. CONTENT LENGTH TARGETS

**Format-dependent.** Read `format` from your system prompt.

### Google Format (default)
| Element | Target | Tolerance |
|---|---|---|
| contentMarkdown total | 1800-2200 words | ±10% |
| Opening hook | 60-80 words | ±5 |
| Per H2 section | 180-280 words | ±20 |
| Chef's Tips | 150-200 words total | ±15 |
| FAQ answers | 50-80 words each | ±5 |
| Nutrition Highlights | 60-100 words total | ±10 |

### Pin-First Format
| Element | Target | Tolerance |
|---|---|---|
| contentMarkdown total | 1200-1500 words | ±10% |
| Opening hook | 50-80 words | ±5 |
| Per H2 section | 120-180 words | ±20 |
| Chef's Tips | 100-150 words total | ±15 |
| FAQ answers | 40-60 words each | ±5 |
| Nutrition Highlights | OMIT — not used in Pin-First | — |

Density: Primary keyword 0.8-1.2%, semantic entities 3-5 woven naturally.
```

- [ ] **Step 3: Add Pin-First structure rules after §14**

After the length targets table, add:

```
### Pin-First Structure Rules

When `format` is "pin-first", apply these structural changes:

1. **Recipe card above the fold**: Place ingredients + instructions IMMEDIATELY after the 50-80 word intro, before any H2 sections. Pinterest users expect to see the recipe instantly — they save Pins for the recipe, not the story.

2. **Sections to OMIT**: Do NOT include "Why This Works" summary box. Do NOT include "Nutrition Highlights". Do NOT include "What Most Recipes Get Wrong".

3. **Sections to KEEP**: Keep "Chef's Tips", "Variations", "Storage & Reheating", and "FAQ" (3 Q&A only).

4. **FAQ**: Write exactly 3 Q&A (not 5). Choose the 3 most actionable questions.

5. **Image prompt**: Output a food photography prompt optimized for 2:3 vertical aspect ratio (Pinterest standard). Use the same style as Image Optimizer v2.1 but with 2:3 framing.

6. **JSON-LD**: Include Recipe + BlogPosting + BreadcrumbList. Do NOT include FAQPage (Pinterest Pins don't benefit from FAQ rich results, which Google deprecated in May 2026 anyway).

When `format` is "google" (default), use the standard 1800-2200 word structure with all sections.
```

- [ ] **Step 4: Update §16 Pre-Publish Checklist item 5**

Change line 381 from:
```
5. **JSON & length** — valid JSON, 1800-2200 words, keyword in first 40 words, FAQ has 5 Q&A, Nutrition Highlights present.
```
to:
```
5. **JSON & length** — valid JSON. If google format: 1800-2200 words, FAQ 5 Q&A, Nutrition Highlights present. If pin-first format: 1200-1500 words, FAQ 3 Q&A, recipe card above fold, Nutrition Highlights OMITTED.
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add skills/agent-writer.md
git commit -m "feat(writer): v6.3 — {{format}} template for Pin-First content

Pin-first: 1200-1500 words, 3 FAQ, recipe card above fold,
no Nutrition Highlights, no Why This Works, 2:3 images.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Auditor skill — Unified thresholds

**Files:**
- Modify: `skills/agent-auditor.md` — frontmatter version + §8 Red Flags + §10 Criterion 6

**Interfaces:**
- Produces: Thin content flag at <1000, Criterion 6 checks format-appropriate length

- [ ] **Step 1: Update frontmatter version**

Change the version in the frontmatter from `"5.1.0-ULTRA"` to `"5.2.0-ULTRA"`. Update `last_updated` to `"2026-07-06"`.

- [ ] **Step 2: Update §8 Red Flags — Thin content threshold**

Change line 223 from:
```
| Thin content | <1500 words or >2500 words (outside tolerance) |
```
to:
```
| Thin content | <1000 words or >3000 words (outside tolerance) |
```

Delete the explanatory note on lines 225-226 (about "1800-2200 words" conflict — no longer relevant with unified thresholds).

- [ ] **Step 3: Update §10 Criterion 6 — Readability & Structure**

Change line 258 from:
```
| **20/20** | Clear hierarchy, paragraphs 3-5 sentences max, logical flow, specific engaging hook, concrete conclusion/next step, 1800-2200 words, varied paragraph lengths, Why This Works summary box present, Nutrition Highlights present |
```
to:
```
| **20/20** | Clear hierarchy, paragraphs 3-5 sentences max, logical flow, specific engaging hook, concrete conclusion/next step, format-appropriate length, varied paragraph lengths |
```

Change line 264 (specific checks) from:
```
- [ ] Each H2 section is 120-200 words
- [ ] No paragraph exceeds 5 sentences
- [ ] Total contentMarkdown is 1800-2200 words (±10%)
- [ ] FAQ section has 3-5 extractable Q&A pairs (3 minimum, 5 optional — FAQ serves user needs, not rich-result requirements)
```
to:
```
- [ ] Each H2 section is 100-200 words
- [ ] No paragraph exceeds 5 sentences
- [ ] Total contentMarkdown is format-appropriate (≥1000 words minimum, 1200-1500 for pin-first, 1800-2200 for google)
- [ ] FAQ section has 3-5 extractable Q&A pairs (3 minimum — FAQ serves user needs, not rich-result requirements)
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add skills/agent-auditor.md
git commit -m "feat(auditor): v5.2 — unified thresholds (1000 min, format-appropriate length)

Thin content flag at <1000 (was <1500). Criterion 6 no longer
hardcodes 1800-2200. Supports both Google and Pin-First formats.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: QA skill — Dynamic word count range

**Files:**
- Modify: `skills/agent-qa.md` — frontmatter version + §2 Input 1 + word count check

**Interfaces:**
- Consumes: `targetWordCount` from strategist_summary (dynamic, not hardcoded)
- Produces: word count validation against dynamic range

- [ ] **Step 1: Update frontmatter version**

Change version from `"1.1.0-LIGHT"` to `"1.2.0-LIGHT"`. Update `last_updated` to `"2026-07-06"`.

- [ ] **Step 2: Update Input 1 — targetWordCount**

Change line 41 from:
```
  "targetWordCount": "1800-2200",
```
to:
```
  "targetWordCount": "1200-1500 | 1800-2200",
```

Add a note after the Input 1 schema:
```
**targetWordCount** is format-dependent. Pin-first = "1200-1500", Google = "1800-2200". Read the actual value from strategist_summary — do NOT assume.
```

- [ ] **Step 3: Update word count check**

Find the word count validation check (around line 225). If it checks against hardcoded "1500-2500", change to dynamic range derived from `strategist_summary.targetWordCount`.

If the check reads:
```
- Verify the word count did not drop below 1500 or exceed 2500.
```
change to:
```
- Verify the word count is within the format-appropriate range from `strategist_summary.targetWordCount`. Minimum: 1000 words (any format).
```

If the check reads:
```
- Word count outside 1500-2500 range
```
change to:
```
- Word count outside format-appropriate range
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add skills/agent-qa.md
git commit -m "feat(qa): v1.2 — dynamic word count range from strategist plan

Reads targetWordCount from strategist_summary instead of
hardcoded 1800-2200. Supports both Pin-First and Google formats.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Strategist runtime — Pass format to template

**Files:**
- Modify: `lib/inngest/functions/agents/strategist.ts:219-238` — `agentStrategistV2` signature + replacements

**Interfaces:**
- Consumes: `format` parameter ("google" | "pin-first")
- Produces: `replacements` object now includes `format` key

- [ ] **Step 1: Add format to agentStrategistV2**

Change the function signature at line 215-220 from:
```typescript
export async function agentStrategistV2(
  keyword: string,
  structuredSerp: StructuredSerp,
  pastImprovements: string[],
  replacements?: Record<string, string>,
): Promise<SeoPlan> {
```
to:
```typescript
export async function agentStrategistV2(
  keyword: string,
  structuredSerp: StructuredSerp,
  pastImprovements: string[],
  replacements?: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<SeoPlan> {
```

- [ ] **Step 2: Merge format into replacements**

After line 222 (`const systemPrompt = await loadSkillContent("agent-strategist", replacements)`), add:
```typescript
// Merge format into replacements so {{format}} resolves in skill template
const mergedReplacements = { ...(replacements ?? {}), format } as Record<string, string>
```

Change line 222 from:
```typescript
const systemPrompt = await loadSkillContent("agent-strategist", replacements)
```
to:
```typescript
const systemPrompt = await loadSkillContent("agent-strategist", mergedReplacements)
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/inngest/functions/agents/strategist.ts
git commit -m "feat(strategist): pass {{format}} to skill template via replacements

agentStrategistV2 accepts optional format param ('google' | 'pin-first'),
merged into replacements so skill reads {{format}}.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Writer runtime — Pass format to template

**Files:**
- Modify: `lib/inngest/functions/agents/writer.ts:110-115` — `agentWriter` signature + replacements

**Interfaces:**
- Consumes: `format` parameter ("google" | "pin-first")
- Produces: `replacements` object includes `format` key

- [ ] **Step 1: Add format to agentWriter**

Change the function signature at line 110-114 from:
```typescript
export async function agentWriter(
  keyword: string,
  plan: SeoPlan,
  replacements?: Record<string, string>,
): Promise<RecipeDraft> {
```
to:
```typescript
export async function agentWriter(
  keyword: string,
  plan: SeoPlan,
  replacements?: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<RecipeDraft> {
```

- [ ] **Step 2: Merge format into replacements**

Change line 116 from:
```typescript
const systemPrompt = await loadSkillContent("agent-writer", replacements)
```
to:
```typescript
const mergedReplacements = { ...(replacements ?? {}), format } as Record<string, string>
const systemPrompt = await loadSkillContent("agent-writer", mergedReplacements)
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/inngest/functions/agents/writer.ts
git commit -m "feat(writer): pass {{format}} to skill template via replacements

agentWriter accepts optional format param ('google' | 'pin-first'),
merged into replacements so skill reads {{format}}.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Pipeline — Propagate {{format}} from event data

**Files:**
- Modify: `lib/inngest/functions/generate-recipe.ts:44-47` — event data destructuring
- Modify: `lib/inngest/functions/steps/agent-phase.ts` — pass format to Strategist/Writer

**Interfaces:**
- Consumes: `mode` from Inngest event data
- Produces: `format` passed to agent-phase → Strategist + Writer

- [ ] **Step 1: Extract mode from event data**

In `generate-recipe.ts`, change line 44-47 from:
```typescript
const { recipeId, keyword, aorCategory, aorAngle, cuisine, cuisineIngredients, cuisineTechniques } = event.data as {
  recipeId: number; keyword: string; aorCategory?: string; aorAngle?: string;
  cuisine?: string; cuisineIngredients?: string; cuisineTechniques?: string;
}
```
to:
```typescript
const { recipeId, keyword, aorCategory, aorAngle, cuisine, cuisineIngredients, cuisineTechniques, mode } = event.data as {
  recipeId: number; keyword: string; aorCategory?: string; aorAngle?: string;
  cuisine?: string; cuisineIngredients?: string; cuisineTechniques?: string;
  mode?: string;
}
```

- [ ] **Step 2: Compute format and pass to agent phase**

After the `cuisineReplacements` block (line 53), add:
```typescript
const format = (mode === "pin-first" ? "pin-first" : "google") as "google" | "pin-first"
```

Now read the agent-phase module to find the call site:
```typescript
const agentResult = await runAgentPhase(step, recipeId, keyword, serpResult.structuredSerp, cuisineReplacements)
```

Change it to:
```typescript
const agentResult = await runAgentPhase(step, recipeId, keyword, serpResult.structuredSerp, cuisineReplacements, format)
```

- [ ] **Step 3: Update agent-phase.ts signature**

Read `lib/inngest/functions/steps/agent-phase.ts` to find the `runAgentPhase` function. Add `format` parameter:

```typescript
export async function runAgentPhase(
  step: ...,
  recipeId: number,
  keyword: string,
  structuredSerp: StructuredSerp,
  cuisineReplacements: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<AgentPhaseResult> {
```

Inside the function, find where `agentStrategistV2` is called and add `format`:
```typescript
const seoPlan = await agentStrategistV2(keyword, structuredSerp, pastImprovements, cuisineReplacements, format)
```

Find where `agentWriter` is called and add `format`:
```typescript
const draft = await agentWriter(keyword, seoPlan, cuisineReplacements, format)
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/inngest/functions/generate-recipe.ts lib/inngest/functions/steps/agent-phase.ts
git commit -m "feat(pipeline): propagate {{format}} from mode event param

Reads mode from Inngest event data, computes format
('google' | 'pin-first'), passes through agent-phase
to Strategist and Writer agents.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: API Route — Accept mode parameter

**Files:**
- Modify: `app/api/recipes/generate/route.ts:34-153` — POST handler

**Interfaces:**
- Consumes: `mode` in request body (optional, "google" | "pin-first")
- Produces: `mode` passed to Inngest event data

- [ ] **Step 1: Validate mode parameter**

After line 97 (end of aorCategory validation block), add:
```typescript
// Mode: content format — "google" (default, 1800-2200 words) or "pin-first" (1200-1500 words, Pinterest-optimized)
const validModes = ["google", "pin-first"]
let mode: string | undefined
const rawMode = body?.mode?.toString().trim()
if (rawMode) {
  if (!validModes.includes(rawMode)) {
    return NextResponse.json(
      { error: `mode invalide. Valeurs acceptées : ${validModes.join(", ")}` },
      { status: 400 },
    )
  }
  mode = rawMode
}
```

- [ ] **Step 2: Pass mode to Inngest event**

Change lines 134-143 from:
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
to:
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
    ...(mode ? { mode } : {}),
  },
})
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/recipes/generate/route.ts
git commit -m "feat(api): accept optional mode param (google | pin-first)

mode='pin-first' triggers Pin-First content format in the pipeline.
Default is 'google' (backward compatible).
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Opportunity Scorer script

**Files:**
- Create: `scripts/score-opportunities.ts`

**Interfaces:**
- Consumes: `data/pinterest-input.json` + `--niche` CLI arg
- Produces: `data/pinterest-scored.json` + terminal summary report

- [ ] **Step 1: Write the script**

```typescript
/**
 * Opportunity Scorer v2 — Pinterest SERP Hijacking
 *
 * Reads raw Pinterest SERP data, applies the 4-factor Opportunity Score v2,
 * and outputs scored keywords with breakdowns.
 *
 * Usage: npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "sourdough discard recipes"
 */

import * as fs from "node:fs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawKeyword {
  keyword: string
  google_position: number
  pinterest_url_type: "pin" | "board"
  competitor_domain: string | null
  competitor_followers: number
  competitor_account_type: "personal" | "generalist" | "semi-specialized" | "very-specialized"
  search_volume?: number
  trending?: boolean
  user_problem?: string
  solution_promise?: string
}

interface ScoreBreakdown {
  domainBeatability: { score: number; level: string; weighted: number }
  engagementGap: { score: number; weighted: number }
  specializationGap: { score: number; weighted: number }
  urlType: { score: number; weighted: number }
}

interface ScoredKeyword extends RawKeyword {
  score: number
  status: "high" | "medium" | "low" | "disqualified"
  breakdown: ScoreBreakdown
  niche_match: boolean
  hypotheses: string[]
  disqualification_reason?: string
}

// ---------------------------------------------------------------------------
// Domain classification table
// ---------------------------------------------------------------------------

const UNBEATABLE_DOMAINS = [
  "allrecipes.com", "delish.com", "foodandwine.com",
  "foodnetwork.com", "bonappetit.com",
]

const VERY_HARD_DOMAINS = [
  "skinnytaste.com", "gimmesomeoven.com", "wellplated.com",
  "cookieandkate.com",
]

const KNOWN_BRANDS = [
  "allrecipes.com", "delish.com", "foodandwine.com",
  "foodnetwork.com", "bonappetit.com", "skinnytaste.com",
  "gimmesomeoven.com", "wellplated.com", "cookieandkate.com",
]

// ---------------------------------------------------------------------------
// Scoring functions (pure, deterministic)
// ---------------------------------------------------------------------------

function scoreDomainBeatability(domain: string | null): { score: number; level: string } {
  if (!domain) return { score: 100, level: "Unknown" }
  const d = domain.toLowerCase()
  if (UNBEATABLE_DOMAINS.some((u) => d.includes(u))) return { score: 0, level: "Unbeatable" }
  if (VERY_HARD_DOMAINS.some((v) => d.includes(v))) return { score: 20, level: "Very Hard" }
  // Heuristic: known TLD but not in lists = medium; no TLD = weak
  if (d.includes(".")) return { score: 60, level: "Medium" }
  return { score: 90, level: "Weak" }
}

function isKnownBrand(domain: string | null): boolean {
  if (!domain) return false
  const d = domain.toLowerCase()
  return KNOWN_BRANDS.some((b) => d.includes(b))
}

function scoreEngagementGap(followers: number, isBrand: boolean): number {
  let score: number
  if (followers < 50) score = 100
  else if (followers <= 200) score = 80
  else if (followers <= 1000) score = 50
  else if (followers <= 5000) score = 20
  else score = 0

  if (isBrand) score = Math.max(0, score - 30)
  return score
}

function scoreSpecializationGap(accountType: string): number {
  switch (accountType) {
    case "personal": return 100
    case "generalist": return 70
    case "semi-specialized": return 40
    case "very-specialized": return 10
    default: return 70 // conservative default
  }
}

function scoreURLType(urlType: string): number {
  switch (urlType) {
    case "pin": return 100
    case "board": return 60 // board — could be small or large, default to medium
    default: return 60
  }
}

function calculateOpportunity(kw: RawKeyword): ScoredKeyword {
  const domainBeatability = scoreDomainBeatability(kw.competitor_domain)

  if (domainBeatability.level === "Unbeatable") {
    return {
      ...kw,
      score: 0,
      status: "disqualified",
      breakdown: {
        domainBeatability: { ...domainBeatability, weighted: 0 },
        engagementGap: { score: 0, weighted: 0 },
        specializationGap: { score: 0, weighted: 0 },
        urlType: { score: 0, weighted: 0 },
      },
      niche_match: true,
      hypotheses: [],
      disqualification_reason: `Unbeatable domain: ${kw.competitor_domain}`,
    }
  }

  const engagement = scoreEngagementGap(kw.competitor_followers, isKnownBrand(kw.competitor_domain))
  const specialization = scoreSpecializationGap(kw.competitor_account_type)
  const urlType = scoreURLType(kw.pinterest_url_type)

  const score =
    domainBeatability.score * 0.35 +
    engagement * 0.30 +
    specialization * 0.20 +
    urlType * 0.15

  const status: ScoredKeyword["status"] =
    score >= 75 ? "high" : score >= 65 ? "medium" : "low"

  // Detect hypotheses (PTRA compliance)
  const hypotheses: string[] = []
  if (!kw.user_problem || kw.user_problem === "HYPOTHESIS") hypotheses.push("user_problem")
  if (!kw.solution_promise || kw.solution_promise === "HYPOTHESIS") hypotheses.push("solution_promise")

  return {
    ...kw,
    score: Math.round(score),
    status,
    breakdown: {
      domainBeatability: { ...domainBeatability, weighted: Math.round(domainBeatability.score * 0.35) },
      engagementGap: { score: engagement, weighted: Math.round(engagement * 0.30) },
      specializationGap: { score: specialization, weighted: Math.round(specialization * 0.20) },
      urlType: { score: urlType, weighted: Math.round(urlType * 0.15) },
    },
    niche_match: true,
    hypotheses,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const inputPath = args.find((a) => a.endsWith(".json"))
  const nicheIdx = args.indexOf("--niche")
  const niche = nicheIdx >= 0 ? args[nicheIdx + 1] : null

  if (!inputPath) {
    console.error("Usage: npx tsx scripts/score-opportunities.ts <input.json> --niche \"micro-niche\"")
    process.exit(1)
  }
  if (!niche) {
    console.warn("⚠️  No --niche provided. PTRA Micro-Niche Lock not enforced.")
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as RawKeyword[]
  const scored = raw.map(calculateOpportunity)

  // Niche validation (PTRA: reject keywords outside micro-niche)
  if (niche) {
    for (const kw of scored) {
      // Simple check: does any niche token appear in the keyword?
      const nicheTokens = niche.toLowerCase().split(/\s+/).filter((t) => t.length > 3)
      const kwLower = kw.keyword.toLowerCase()
      kw.niche_match = nicheTokens.some((t) => kwLower.includes(t))
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Write output
  const outputPath = inputPath.replace(/input\.json$/, "scored.json").replace(/\.json$/, "-scored.json")
  fs.writeFileSync(outputPath, JSON.stringify(scored, null, 2))
  console.log(`Scored data → ${outputPath}\n`)

  // Summary report
  const high = scored.filter((k) => k.status === "high")
  const medium = scored.filter((k) => k.status === "medium")
  const low = scored.filter((k) => k.status === "low")
  const disqualified = scored.filter((k) => k.status === "disqualified")
  const nicheMismatches = scored.filter((k) => !k.niche_match)
  const totalHypotheses = scored.reduce((sum, k) => sum + k.hypotheses.length, 0)

  console.log(`=== Opportunity Scorer v2 ===`)
  console.log(`Micro-niche: ${niche ?? "not specified"}`)
  console.log(`Input: ${raw.length} keywords from ${inputPath}\n`)

  console.log(`Results:`)
  console.log(`  HIGH (≥75):      ${high.length} keywords`)
  console.log(`  MEDIUM (65-74):  ${medium.length} keywords`)
  console.log(`  LOW (<65):       ${low.length} keywords`)
  console.log(`  DISQUALIFIED:    ${disqualified.length} keywords\n`)

  if (high.length > 0) {
    console.log(`Top ${Math.min(5, high.length)}:`)
    for (const kw of high.slice(0, 5)) {
      console.log(`  ${high.indexOf(kw) + 1}. ${kw.keyword} — ${kw.score} (HIGH)`)
    }
    console.log()
  }

  if (nicheMismatches.length > 0) {
    console.log(`Niche mismatches flagged: ${nicheMismatches.length}`)
  }
  if (totalHypotheses > 0) {
    console.log(`Hypotheses to resolve: ${totalHypotheses} fields across ${scored.filter((k) => k.hypotheses.length > 0).length} keywords`)
  }
  if (disqualified.length > 0) {
    console.log(`\nDisqualified:`)
    for (const kw of disqualified) {
      console.log(`  ✕ ${kw.keyword} — ${kw.disqualification_reason}`)
    }
  }

  console.log(`\nNext step → npx tsx scripts/build-clusters.ts ${outputPath}`)
}

main()
```

- [ ] **Step 2: Test with a minimal input file**

First create the template input file (see Task 15), then run:

```bash
npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "sourdough discard recipes"
```

Expected: Terminal summary + `data/pinterest-scored.json` created.

- [ ] **Step 3: Verify the top 10 manually-scored keywords match**

Check that `dirty soda recipes` scores 91, `easy finnish recipes` scores 88, etc.

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add scripts/score-opportunities.ts
git commit -m "feat: Opportunity Scorer v2 — deterministic Pinterest keyword scoring

4-factor scoring (DomainBeatability 35% + EngagementGap 30% +
SpecializationGap 20% + URLType 15%). PTRA-aligned: niche lock,
hypothesis marking, domain disqualification.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Cluster Builder script

**Files:**
- Create: `scripts/build-clusters.ts`

**Interfaces:**
- Consumes: `data/pinterest-scored.json`
- Produces: `data/pinterest-clusters.json` + terminal summary

- [ ] **Step 1: Write the script**

```typescript
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
  if (kw.includes("easy") || kw.includes("quick")) return "quick solution"
  if (kw.includes("beginner") || kw.includes("guide")) return "beginner guide"
  if (kw.includes("diet") || kw.includes("fast")) return "beginner guide"
  return "step-by-step" // default for recipes
}

function inferBoard(keyword: string): string {
  const kw = keyword.toLowerCase()
  for (const [token, category] of Object.entries(SEMANTIC_CATEGORIES)) {
    if (kw.includes(token)) return category.board
  }
  // Default: capitalize significant words
  const tokens = extractTokens(keyword)
  return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") + " Recipes"
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

function buildClusters(keywords: ScoredKeyword[]): { clusters: Cluster[]; orphans: Cluster["keywords"] } {
  const highOnly = keywords.filter((k) => k.status === "high")
  const assigned = new Set<number>()
  const clusters: Cluster[] = []

  for (let i = 0; i < highOnly.length; i++) {
    if (assigned.has(i)) continue
    const tokens = extractTokens(highOnly[i].keyword)
    const group: ScoredKeyword[] = [highOnly[i]]
    assigned.add(i)

    // Find keywords with ≥2 token overlap
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
      const category = Object.entries(SEMANTIC_CATEGORIES).find(([token]) => kw.includes(token))
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
      const clusterName = group[0].keyword.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => !STOP_WORDS.has(t)).slice(0, 3).join("-").replace(/\s+/g, "-")
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
    orphans: orphans.map((o) => ({
      keyword: o.keyword,
      score: o.score,
      reason: o.reason,
    })),
    summary: {
      total_keywords_scored: scored.length,
      high_priority: scored.filter((k) => k.status === "high").length,
      clusters_created: clusters.length,
      orphans: orphans.length,
    },
  }

  const outputPath = inputPath.replace(/scored\.json$/, "clusters.json").replace(/\.json$/, "-clusters.json")
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log(`=== Topical Cluster Builder ===`)
  console.log(`Clusters: ${clusters.length}`)
  for (const c of clusters) {
    console.log(`  📌 ${c.cluster_name} — ${c.keywords.length} keywords (avg ${c.total_opportunity_score_avg}) → board: ${c.primary_board}`)
  }
  if (orphans.length > 0) {
    console.log(`\nOrphans (${orphans.length}):`)
    for (const o of orphans) {
      console.log(`  ⚠️  ${o.keyword} (${o.score}) — ${o.reason}`)
    }
  }
  console.log(`\nClusters → ${outputPath}`)
  console.log(`Next step → npx tsx scripts/generate-pinterest-batch.ts ${outputPath}`)
}

main()
```

- [ ] **Step 2: Test with scored output**

```bash
npx tsx scripts/build-clusters.ts data/pinterest-scored.json
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add scripts/build-clusters.ts
git commit -m "feat: Topical Cluster Builder — token overlap + semantic fallback

Groups HIGH keywords into PTRA-compatible clusters with
intent + board assignment. Orphans surfaced for human review.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Batch Caller script

**Files:**
- Create: `scripts/generate-pinterest-batch.ts`

**Interfaces:**
- Consumes: `data/pinterest-clusters.json`
- Calls: `POST /api/recipes/generate` with `mode: "pin-first"`

- [ ] **Step 1: Write the script**

```typescript
/**
 * Pinterest Batch Caller
 *
 * Reads clustered keywords and triggers the AI pipeline for each.
 * Uses mode: "pin-first" for Pinterest-optimized content.
 *
 * Usage: npx tsx scripts/generate-pinterest-batch.ts data/pinterest-clusters.json
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000"

interface ClusterKeyword {
  keyword: string
  score: number
}

interface Cluster {
  cluster_name: string
  primary_board: string
  keywords: ClusterKeyword[]
}

interface ClustersOutput {
  micro_niche: string
  clusters: Cluster[]
}

async function generateOne(keyword: string, clusterName: string, index: number, total: number) {
  const body = {
    keyword,
    cuisine: "sourdough",
    mode: "pin-first",
  }

  const start = Date.now()
  process.stdout.write(`[${index + 1}/${total}] ${keyword}... `)

  try {
    const res = await fetch(`${API_BASE}/api/recipes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      console.log(`FAILED: ${(err as { error?: string }).error || res.status}`)
      return null
    }

    const data = await res.json()
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`OK — recipe #${data.id} [${clusterName}] (${elapsed}s)`)
    return data.id as number
  } catch (err) {
    console.log(`ERROR: ${(err as Error).message}`)
    return null
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error("Usage: npx tsx scripts/generate-pinterest-batch.ts <clusters.json>")
    process.exit(1)
  }

  const data = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(inputPath, "utf-8"))) as ClustersOutput

  const allKeywords: { keyword: string; cluster: string }[] = []
  for (const cluster of data.clusters) {
    for (const kw of cluster.keywords) {
      allKeywords.push({ keyword: kw.keyword, cluster: cluster.cluster_name })
    }
  }

  console.log(`\n🔧 Pinterest Batch — ${allKeywords.length} keywords across ${data.clusters.length} clusters\n`)

  const ids: number[] = []
  for (let i = 0; i < allKeywords.length; i++) {
    const id = await generateOne(allKeywords[i].keyword, allKeywords[i].cluster, i, allKeywords.length)
    if (id) ids.push(id)

    if (i < allKeywords.length - 1) {
      process.stdout.write("  waiting 35s (rate limit)... ")
      await sleep(35_000)
      console.log("go")
    }
  }

  console.log(`\n✅ Batch complete — ${ids.length}/${allKeywords.length} recipes launched`)
  console.log(`   Recipe IDs: ${ids.join(", ")}`)
  console.log(`   Check progress: npx tsx scripts/check-batch.ts ${ids.join(" ")}\n`)
}

main().catch((err) => {
  console.error("Batch failed:", err)
  process.exit(1)
})
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-pinterest-batch.ts
git commit -m "feat: Pinterest batch caller — triggers pipeline in pin-first mode

Reads clusters.json, calls POST /api/recipes/generate with
mode='pin-first'. Rate-limited at 35s between calls.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Data directory + input template

**Files:**
- Create: `data/.gitkeep`
- Create: `data/pinterest-input.json`

- [ ] **Step 1: Create data directory structure**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 2: Write input template**

```json
[
  {
    "_comment": "Pinterest SERP Hijacking — Input template for Opportunity Scorer v2",
    "_instructions": "Fill this with keywords where Pinterest ranks in Google top 10. Export from Semrush: domain=pinterest.com, filter=recipes, organic top 10.",
    "keyword": "dirty soda recipes",
    "google_position": 3,
    "pinterest_url_type": "pin",
    "competitor_domain": null,
    "competitor_followers": 101,
    "competitor_account_type": "personal",
    "search_volume": 18100,
    "trending": true,
    "user_problem": "HYPOTHESIS",
    "solution_promise": "HYPOTHESIS"
  }
]
```

- [ ] **Step 3: Add gitignore entries**

Append to `.gitignore`:
```gitignore
# Pinterest Discovery — generated files
data/pinterest-scored.json
data/pinterest-clusters.json
```

- [ ] **Step 4: Commit**

```bash
git add data/.gitkeep data/pinterest-input.json .gitignore
git commit -m "feat: data directory + pinterest-input.json template

Input template for Opportunity Scorer v2. Generated files
(pinterest-scored.json, pinterest-clusters.json) gitignored.
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: PTRA Patches — agent-pin-designer.md

**Files:**
- Modify: `skills/agent-pin-designer.md`

- [ ] **Step 1: Add execution modes section**

After the existing frontmatter/sections, add an execution modes section. Find a logical insertion point (after the Pin Designer's role description) and add:

```markdown
## Execution Modes (v2.2)

The Pin Designer supports 7 execution modes to control output size and token cost. The mode is passed via the `{{execution_mode}}` template variable.

| Mode | Output | Use Case |
|---|---|---|
| `intake` | Niche core + problem-solution map only | Initial keyword validation |
| `serp_opportunity_scan` | PTRA scores for candidate keywords | Batch keyword scoring |
| `editorial_plan` | Clusters + boards (no individual Pins) | Planning phase |
| `pin_batch` | Full 5 Pin variants for a single article | Production (default) |
| `scoring_only` | PTRA Coherence Score with breakdown | Calibration / QA |
| `pre_publish_audit` | Validation report only | Pre-publication gate |
| `optimization_loop` | Scale/Refine/Pause/Reject decisions | Post-publication |

**Default mode:** `pin_batch` (full 5 Pins per recipe — backward compatible).

When mode is `scoring_only`, output ONLY the PTRA score object — no Pin variants, no board architecture, no calendar.
When mode is `pre_publish_audit`, validate the destination page quality and output pass/fail with reasons.
When mode is `optimization_loop`, analyze Pinterest Analytics data and classify each Pin.
```

- [ ] **Step 2: Add scoring rubric per factor**

Find the PTRA scoring table (11 factors) and add a detailed rubric after it:

```markdown
### Scoring Rubric per Factor

**Semantic Fit (12 points):**
| Check | Points |
|---|---|
| Main keyword in Pin title | 3 |
| Description matches intent | 3 |
| Board semantic alignment | 3 |
| No keyword stuffing | 3 |

**Visual Fit (12 points):**
| Check | Points |
|---|---|
| Image matches Pin subject | 4 |
| 2:3 aspect ratio correct | 3 |
| Text overlay readable at thumbnail size | 3 |
| Visual consistent with board theme | 2 |

**Board Fit (10 points):**
| Check | Points |
|---|---|
| Board has clear strategic role | 4 |
| Board matches Pin intent | 3 |
| Board not too broad (≤2 sub-topics) | 3 |

**Ethical Hook Fit (10 points):**
| Check | Points |
|---|---|
| Hook is specific and verifiable | 4 |
| Hook matches destination content | 3 |
| No misleading/vague/clickbait language | 3 |

**Destination Fit (10 points):**
| Check | Points |
|---|---|
| Pin promises match page content | 5 |
| URL is valid and loads | 3 |
| Page delivers on Pin's solution promise | 2 |

**Consistency Fit (8 points):**
| Check | Points |
|---|---|
| Pin reinforces micro-niche | 4 |
| Pin consistent with other Pins in board | 2 |
| Pin contributes to topical graph | 2 |

**Trend Timing (4 points):**
| Check | Points |
|---|---|
| Topic is seasonally relevant (±30 days) | 2 |
| Pinterest Trends data checked (if available) | 2 |
```

- [ ] **Step 3: Add Pinterest anti-spam gate**

Add a new section:

```markdown
## Pinterest Account Safety Gate

Before publishing, validate these anti-spam checks. A FAIL on any check means the Pin batch should be reviewed manually before publication.

```json
{
  "pinterest_account_safety_gate": {
    "duplicate_creative_risk": "low | medium | high",
    "same_url_frequency_risk": "low | medium | high",
    "description_repetition_risk": "low | medium | high",
    "commercial_disclosure_needed": true,
    "publish_allowed": true
  }
}
```

**Rules:**
- **duplicate_creative_risk**: HIGH if >2 Pins use the same background image (Fresh Pin Rule violation)
- **same_url_frequency_risk**: HIGH if >3 Pins link to the same URL within 7 days
- **description_repetition_risk**: HIGH if >2 Pins share ≥80% description text
- **commercial_disclosure_needed**: true if content contains affiliate links or sponsored products
- **publish_allowed**: false if ANY risk is HIGH
```

- [ ] **Step 4: Add destination gate (planning vs publishing)**

Add a new section:

```markdown
## Destination Quality Gate

Two-tier validation depending on execution mode:

### Planning Mode (`execution_mode: "intake" | "editorial_plan"`)
- Destination unknown → ALLOWED, marked as HYPOTHESIS
- PTRA Score measures distribution coherence only
- Disclaimer: "This score does not account for destination page quality"

### Publishing Mode (`execution_mode: "pin_batch" | "pre_publish_audit"`)
- Destination unknown → REJECTED
- Destination weak or unverified → REJECTED
- The Pin must NOT promise what the destination doesn't deliver

**Validation checks (publishing mode only):**
1. Does the page exist and load (HTTP 200)?
2. Does the page contain the recipe/ingredients/instructions it promises?
3. Is the page mobile-friendly (Pinterest traffic is 85%+ mobile)?
4. Does the page load in <3 seconds?
5. Are Rich Pins metadata present (Recipe schema)?

If any check fails, `publish_allowed: false`.
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add skills/agent-pin-designer.md
git commit -m "feat(pin-designer): PTRA v2.2 — execution modes, scoring rubric, safety gates

Adds 7 execution modes for token efficiency, detailed scoring
rubric per PTRA factor, Pinterest anti-spam gate, and destination
quality gate (planning vs publishing mode).
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: Final type check + integration verification

**Files:**
- All modified files

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```

Expected: No errors. Fix any issues before proceeding.

- [ ] **Step 2: Verify backward compatibility**

```bash
# The existing pipeline must still work without mode parameter
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword":"sourdough discard crackers","cuisine":"sourdough"}'
```
Expected: 200 (or 429 if rate limited — check response body)

- [ ] **Step 3: Run Opportunity Scorer on template**

```bash
npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "sourdough discard recipes"
```
Expected: Terminal summary with 1 keyword scored. `data/pinterest-scored.json` created.

- [ ] **Step 4: Run Cluster Builder**

```bash
npx tsx scripts/build-clusters.ts data/pinterest-scored.json
```
Expected: 1 orphan (single keyword can't cluster). `data/pinterest-clusters.json` created.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "chore: final type check + integration verification

All 15 files pass npx tsc --noEmit. Backward compatibility
verified (mode defaults to 'google').
Co-Authored-By: Claude <noreply@anthropic.com>"
```
