# PTRA Pin Designer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new pipeline agent that generates 5 Pinterest Pin drafts per recipe using the PTRA (Pinterest Topical Resonance Authority) framework.

**Architecture:** A new agent (Pin Designer) runs after image generation and A/B stats, before the AOR article. It reads the recipe, images, and SEO plan, applies the PTRA skill, and outputs 5 PinDrafts into a new `pin_drafts` database table. A separate webapp reads this table to generate visuals and publish to Pinterest.

**Tech Stack:** Next.js 16 App Router, TypeScript 5.7, Drizzle ORM 0.45, Inngest 4.7, Neon PostgreSQL, NaraRouter (Mistral Medium 3.5), Cloudflare Workers AI (fallback)

## Global Constraints

- `npx tsc --noEmit` must pass after every task
- Never rename existing Inngest steps
- Never change the pipeline step order (only insert new steps)
- Never modify a skill Markdown without checking the agent runtime
- All content in English
- Follow existing code patterns (function naming, file structure, import style)
- Every Pin must score ≥70 PTRA or be discarded
- 5 distinct angles per recipe (different Pinterest intents)

---

### Task 1: Add `pinDrafts` table to database schema

**Files:**
- Modify: `lib/db/schema.ts` — add table definition after `imageVariantStats`

**Interfaces:**
- Produces: `pinDrafts` table, `PinDraft` type, `NewPinDraft` type

- [ ] **Step 1: Add table definition to schema.ts**

```typescript
// lib/db/schema.ts — add after the imageVariantStats table (around line 84)

export const pinDrafts = pgTable(
  "pin_drafts",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id").notNull(),
    pinTitle: text("pin_title").notNull(),
    overlayText: text("overlay_text").notNull(),
    description: text("description").notNull(),
    imagePrompt: text("image_prompt").notNull(),
    board: text("board").notNull(),
    intent: text("intent").notNull(),
    ptraScore: integer("ptra_score").notNull(),
    hashtags: jsonb("hashtags").$type<string[]>().default([]),
    variantIndex: integer("variant_index").default(0),
    status: text("status").notNull().default("draft"),
    pinUrl: text("pin_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipeIdx: index("idx_pin_drafts_recipe").on(table.recipeId),
    statusIdx: index("idx_pin_drafts_status").on(table.status),
  }),
)

export type PinDraft = typeof pinDrafts.$inferSelect
export type NewPinDraft = typeof pinDrafts.$inferInsert
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Push schema to database**

```bash
npx dotenv-cli -e .env.local -- npx drizzle-kit push
```
Expected: "No changes to push" or confirmation of new table.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add pin_drafts table for PTRA Pin Designer"
```

---

### Task 2: Create `skills/agent-pin-designer.md` — PTRA Pin Designer system prompt

**Files:**
- Create: `skills/agent-pin-designer.md`

**Interfaces:**
- Produces: Skill file loadable via `loadSkillContent("agent-pin-designer")`
- Produces: Output schema — array of 5 PinDraft JSON objects

- [ ] **Step 1: Write the skill file**

```markdown
---
id: agent-pin-designer
version: "1.0.0"
description: "PTRA Pin Designer — generates 5 Pinterest Pin drafts per recipe using the PTRA (Pinterest Topical Resonance Authority) framework. Produces pin titles, overlay hooks, SEO descriptions, FLUX image prompts, board assignments, Pinterest intents, and PTRA coherence scores /100. One recipe = 5 Pins with distinct angles."
model: "mistral-medium-3-5"
routing: "NaraRouter"
temperature: 0.5
max_tokens: 4096
top_p: 0.92
frequency_penalty: 0.2
presence_penalty: 0.1
last_updated: "2026-07-05"
framework: "PTRA (Pinterest Topical Resonance Authority) v1.0"
seo_framework: "Pinterest-First-2026"
prompt_pattern: "Structured Output + PTRA 11-Factor Scoring + Fresh Pin Rule + Ethical Hooks"
---

# Agent Pin Designer — PTRA Framework v1.0

## §1 Identity & Role

You are the **PTRA Pin Designer**, specialized in creating Pinterest-optimized Pin drafts from existing recipe content using the Pinterest Topical Resonance Authority (PTRA) framework.

**Core principle:** Pinterest is a visual discovery and intent engine. Every Pin must have a clear problem-solution angle, an ethical hook, a distinct visual direction, and a measurable PTRA coherence score.

**What you do:** Generate exactly 5 Pins per recipe, each with a different Pinterest intent and angle.
**What you NEVER do:** Clickbait hooks, fake promises, duplicate angles, low-quality image prompts.

---

## §2 Input Contract

You receive:
- `recipeTitle` — full recipe title
- `recipeSlug` — URL slug
- `recipeUrl` — full destination URL
- `recipeExcerpt` — 2-sentence summary
- `heroImageUrl` — main recipe image
- `imageVariants` — A/B variant images (array of {label, url, prompt})
- `ingredients` — recipe ingredients
- `tags` — recipe tags
- `seoPlan` — Strategist output (H2 sections, FAQ, semantic entities)
- `microNiche` — always "Sourdough Discard Recipes"
- `targetCountry` — target market (e.g., "us")

If any field is missing, mark it as HYPOTHESIS and proceed — never refuse to generate.

---

## §3 Pinterest Intent Taxonomy

Every Pin MUST be classified into ONE of these intents. Use a DIFFERENT intent for each of the 5 Pins:

| Intent | Definition | Hook Pattern |
|---|---|---|
| quick_solution | Fast, simple answer | "[Time] + [Result]" |
| beginner_guide | No expertise required | "Beginner-Friendly [Topic]" |
| step_by_step | Clear method to follow | "Step-by-Step: [Process]" |
| mistake_avoidance | Preventing common errors | "[N] Mistakes That Ruin [Topic]" |
| before_after | Visual/practical improvement | "Before & After: [Result]" |
| checklist | Practical list to save | "[Topic] Checklist for [Outcome]" |
| ingredient_spotlight | Focus on one ingredient | "Why [Ingredient] Makes [Topic] Better" |
| budget_friendly | Economical option | "Budget-Friendly [Solution]" |

---

## §4 Ethical Hook Rules

Hooks MUST be incitative AND honest. Never use:
- "This Will Change Your Life"
- "Secret Trick Nobody Knows"
- "You Won't Believe This"
- "Guaranteed Results"
- "The Only Method That Works"

Use specific, verifiable hooks:
- "[Number] + [Useful Outcome]" → "5-Minute Discard Flatbread"
- "[Time] + [Specific Result]" → "20-Min Sourdough Flatbread"
- "[Problem] + [Simple Solution]" → "No More Wasted Discard"
- "[Beginner-Friendly] + [Desired Outcome]" → "Beginner Discard Flatbread"

---

## §5 Image Prompt Rules (Fresh Pin Rule)

Each Pin's `image_prompt` MUST be distinct. A different overlay text on the same background image is REJECTED.

Every `image_prompt` must contain:

```
Aspect ratio 2:3 (1000x1500px), vertical orientation, safe zone respected
(no critical text or focal subject within the outer 8% margin — feed crops
and UI overlays cut this area on mobile).

Type 6 — Food / Recipes: Vertical Pinterest food photography, [recipe name],
visible texture, realistic homemade style, appetizing composition,
natural light, mobile-first framing, space for readable text overlay,
no misleading ingredients.
```

Distinguish image prompts by:
- Different composition (close-up vs. plated vs. process shot vs. lifestyle context)
- Different angle (top-down vs. 45° vs. eye-level vs. detail shot)
- Different staging (rustic wood vs. clean white vs. kitchen counter vs. outdoor)

---

## §6 PTRA Scoring (/100)

Score each Pin on these 11 factors:

| Factor | Points | What It Measures |
|---|---|---|
| Micro-Niche Focus | 10 | Strictly within "Sourdough Discard Recipes"? |
| Problem-Solution Fit | 10 | Clear user problem + clear solution? |
| Value-Added Fit | 10 | Does the destination provide real utility? |
| Semantic Fit | 12 | Title, description, keywords aligned? |
| Visual Fit | 12 | Image prompt matches subject, angle, board? |
| Board Fit | 10 | Board has a clear role and matches intent? |
| Destination Fit | 10 | Pin promises only what the recipe delivers? |
| Ethical Hook Fit | 10 | Hook incitative yet honest, specific, verifiable? |
| Consistency Fit | 8 | Reinforces the broader micro-niche? |
| Trend Timing | 4 | Seasonally relevant? |
| Measurement Readiness | 4 | Can this Pin's performance be tracked? |
| **TOTAL** | **100** | |

Score ranges: 0-49 REJECT | 50-69 WEAK | 70-79 ACCEPTABLE | 80-89 STRONG | 90-100 EXCELLENT

---

## §7 CRITICAL OUTPUT RULE

No reasoning or analysis. Start with `[`, end with `]`. Pure JSON array ONLY. No markdown fences, no prose before or after.

---

## §8 Output Schema

Output a JSON array of exactly 5 PinDraft objects:

```json
[
  {
    "pin_title": "5-Minute Sourdough Discard Flatbread — No Yeast, No Wait",
    "overlay_text": "5-Minute Flatbread",
    "description": "Make soft, chewy sourdough discard flatbread in just 5 minutes with this no-yeast, no-rise recipe. Perfect for using up discard — save this for your next baking day.",
    "image_prompt": "Vertical Pinterest food photography (2:3, 1000x1500px, safe zone 8%), sourdough discard flatbread stack on rustic wooden board, visible blisters and steam, golden brown crust, natural window light, appetizing homemade style, space for text overlay top third, no misleading garnishes.",
    "board": "Sourdough Discard Flatbread",
    "intent": "quick_solution",
    "ptra_score": 85
  },
  {
    "pin_title": "Beginner's Guide to Sourdough Discard Flatbread — Foolproof & Forgiving",
    "overlay_text": "Beginner-Friendly Flatbread",
    "description": "New to sourdough discard? Start here. This beginner-friendly flatbread recipe is foolproof and forgiving — no special skills needed. Save this for your first discard bake.",
    "image_prompt": "Vertical Pinterest food photography (2:3, 1000x1500px, safe zone 8%), close-up of hands rolling sourdough discard flatbread dough on floured surface, step-by-step feel, natural light, warm kitchen setting, space for text overlay top third.",
    "board": "Sourdough Discard Flatbread",
    "intent": "beginner_guide",
    "ptra_score": 82
  }
]
```

Each Pin needs: `pin_title`, `overlay_text`, `description`, `image_prompt`, `board`, `intent`, `ptra_score`. Hashtags are optional (empty array — Pinterest deprioritizes them).

---

## §9 Board Architecture

Assign each Pin to ONE board. Boards follow the micro-niche structure:

| Board | Role | Allowed Content |
|---|---|---|
| Sourdough Discard Flatbread | Flatbread variants | Flatbread recipes, flatbread techniques |
| Sourdough Discard Crackers | Cracker variants | Cracker recipes, cracker tips |
| Sourdough Discard Breads | Bread recipes | Loaf, roll, and bun recipes |
| Sourdough Discard Sweet Bakes | Sweet recipes | Banana bread, pancakes, muffins |
| Sourdough Discard Tips | Techniques & guides | Science articles, discard guides, troubleshooting |
| Sourdough Discard Quick Recipes | Fast recipes (<30 min) | Any discard recipe under 30 minutes |

Derive the board name from the recipe's tags and content. If the recipe doesn't clearly fit one board, default to "Sourdough Discard Recipes".

---

## §10 Language Lock

ALL content in English only. This includes: pin_title, overlay_text, description, image_prompt, board, intent. Pin titles and descriptions target US English audience. Never output French, Arabic, or any other language.

---

## §11 Example

```json
[
  {
    "pin_title": "5-Minute Sourdough Discard Flatbread | No Yeast, No Rise",
    "overlay_text": "5-Min Discard Flatbread",
    "description": "Make soft, chewy sourdough discard flatbread in 5 minutes with this no-yeast recipe. Perfect for busy weeknights — save this Pin for your next discard day.",
    "image_prompt": "Vertical Pinterest food photography (2:3, 1000x1500px, safe zone 8%), stack of golden-brown sourdough flatbreads on rustic ceramic plate, visible blisters and olive oil sheen, natural window light, warm kitchen atmosphere, space for text overlay top third, realistic homemade style, no misleading garnishes.",
    "board": "Sourdough Discard Flatbread",
    "intent": "quick_solution",
    "ptra_score": 88
  }
]
```
```

- [ ] **Step 2: Verify skill file is loadable**

```bash
grep -c "id: agent-pin-designer" skills/agent-pin-designer.md
```
Expected: 1

- [ ] **Step 3: Commit**

```bash
git add skills/agent-pin-designer.md
git commit -m "feat: add agent-pin-designer skill — PTRA framework for Pin generation"
```

---

### Task 3: Create `lib/inngest/functions/agents/pin-designer.ts` — Agent runtime

**Files:**
- Create: `lib/inngest/functions/agents/pin-designer.ts`

**Interfaces:**
- Consumes: `loadSkillContent("agent-pin-designer")`, `runTextAndParseJson` from `@/lib/agents/nararouter`
- Consumes: `SeoPlan` from `./strategist`, `ImageVariant` from `@/lib/db/schema`
- Produces: `agentPinDesigner(input: PinDesignerInput): Promise<PinDraftOutput[]>`
- Produces: `PinDesignerInput` interface, `PinDraftOutput` interface

- [ ] **Step 1: Create the agent file**

```typescript
// lib/inngest/functions/agents/pin-designer.ts
import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import type { SeoPlan } from "./strategist"
import type { ImageVariant } from "@/lib/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinDesignerInput {
  recipeTitle: string
  recipeSlug: string
  recipeUrl: string
  recipeExcerpt: string
  heroImageUrl: string
  imageVariants: ImageVariant[]
  ingredients: { name: string; quantity?: string }[]
  tags: string[]
  seoPlan: SeoPlan
  microNiche: string
  targetCountry: string
}

export interface PinDraftOutput {
  pin_title: string
  overlay_text: string
  description: string
  image_prompt: string
  board: string
  intent: string
  ptra_score: number
  hashtags: string[]
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(input: PinDesignerInput): string {
  // Extract key info from SeoPlan for brevity
  const seoPlanSummary = {
    h2Sections: input.seoPlan.h2Sections?.map(h => h.heading) ?? [],
    faqItems: input.seoPlan.faqItems?.map(f => f.question) ?? [],
    tags: input.seoPlan.tags ?? [],
    targetWordCount: input.seoPlan.targetWordCount ?? "1800-2200",
  }

  return `Generate exactly 5 Pinterest Pins for this recipe using the PTRA framework.

RECIPE:
Title: ${input.recipeTitle}
Slug: ${input.recipeSlug}
URL: ${input.recipeUrl}
Excerpt: ${input.recipeExcerpt}
Hero Image: ${input.heroImageUrl}
Image Variants: ${input.imageVariants.map(v => v.url).join(", ")}
Ingredients: ${input.ingredients.map(i => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join(", ")}
Tags: ${input.tags.join(", ")}

SEO PLAN:
H2 Sections: ${seoPlanSummary.h2Sections.join(" | ")}
FAQ Questions: ${seoPlanSummary.faqItems.join(" | ")}
Tags: ${seoPlanSummary.tags.join(", ")}

MICRO-NICHE: ${input.microNiche}
TARGET COUNTRY: ${input.targetCountry}

INSTRUCTIONS:
1. Generate exactly 5 Pins — each with a DIFFERENT Pinterest intent
2. Use ETHICAL hooks — specific, verifiable, honest (NO clickbait)
3. Every image_prompt must be DISTINCT (different composition/angle/staging)
4. Image format: 2:3 (1000x1500px), safe zone 8%, Type 6 Food Photography
5. Score each Pin /100 using the 11-factor PTRA system
6. All Pins must score ≥70 — discard and regenerate any below 70
7. Output a pure JSON array — start with [, end with ]`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentPinDesigner(
  input: PinDesignerInput,
): Promise<PinDraftOutput[]> {
  const systemPrompt = await loadSkillContent("agent-pin-designer")
  const userPrompt = buildUserPrompt(input)

  const result = await runTextAndParseJson<PinDraftOutput[]>(
    systemPrompt,
    userPrompt,
    { temperature: 0.5, maxTokens: 4096 },
  )

  // Validate and filter
  if (!Array.isArray(result)) {
    throw new Error(`Pin Designer returned non-array: ${typeof result}`)
  }

  // Filter pins below 70 PTRA
  const valid = result.filter(p => {
    if (!p.pin_title || !p.image_prompt || !p.intent) return false
    if (typeof p.ptra_score !== "number" || p.ptra_score < 70) return false
    return true
  })

  if (valid.length === 0) {
    throw new Error("Pin Designer: all Pins scored below 70 PTRA or were invalid")
  }

  return valid.slice(0, 5) // Max 5 Pins
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors. If errors about missing exports from nararouter or skills, fix imports — these modules already exist and export `runTextAndParseJson` and `loadSkillContent`.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/agents/pin-designer.ts
git commit -m "feat: add Pin Designer agent runtime — PTRA-based Pin generation"
```

---

### Task 4: Create `lib/inngest/functions/steps/pin-phase.ts` — Inngest step

**Files:**
- Create: `lib/inngest/functions/steps/pin-phase.ts`

**Interfaces:**
- Consumes: `agentPinDesigner` from `../agents/pin-designer`, `db` from `@/lib/db`, `pinDrafts` from `@/lib/db/schema`
- Consumes: `RecipeDraft` from `../agents/writer`, `SeoPlan` from `../agents/strategist`, `ImageVariant` from `@/lib/db/schema`
- Consumes: `appendLog`, `logEntry` from `../helpers`
- Produces: `generatePins(step, recipeId, finalRecipe, seoPlan, heroImageUrl, imageVariants): Promise<void>`

- [ ] **Step 1: Create the step file**

```typescript
// lib/inngest/functions/steps/pin-phase.ts
import { db } from "@/lib/db"
import { pinDrafts } from "@/lib/db/schema"
import type { ImageVariant } from "@/lib/db/schema"
import { agentPinDesigner } from "../agents/pin-designer"
import { appendLog, logEntry, SITE_URL } from "../helpers"
import type { RecipeDraft } from "../agents/writer"
import type { SeoPlan } from "../agents/strategist"

function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80)
}

export async function generatePins(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number,
  finalRecipe: RecipeDraft,
  seoPlan: SeoPlan,
  heroImageUrl: string | null,
  imageVariants: ImageVariant[],
) {
  await step.run("pin-designer", async () => {
    const slug = buildSlug(finalRecipe.title ?? "recipe")
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL

    const pins = await agentPinDesigner({
      recipeTitle: finalRecipe.title ?? "",
      recipeSlug: slug,
      recipeUrl: `${siteUrl}/recettes/${slug}`,
      recipeExcerpt: finalRecipe.excerpt ?? "",
      heroImageUrl: heroImageUrl ?? "",
      imageVariants: imageVariants ?? [],
      ingredients: (finalRecipe.ingredients ?? []) as { name: string; quantity?: string }[],
      tags: finalRecipe.tags ?? [],
      seoPlan,
      microNiche: "Sourdough Discard Recipes",
      targetCountry: process.env.SERP_GL || "us",
    })

    // Batch insert all valid Pins
    const now = new Date()
    const rows = pins.map((pin, idx) => ({
      recipeId,
      pinTitle: pin.pin_title,
      overlayText: pin.overlay_text,
      description: pin.description,
      imagePrompt: pin.image_prompt,
      board: pin.board,
      intent: pin.intent,
      ptraScore: pin.ptra_score,
      hashtags: pin.hashtags ?? [],
      variantIndex: idx,
      status: "draft" as const,
      createdAt: now,
      updatedAt: now,
    }))

    await db.insert(pinDrafts).values(rows)

    const avgScore = Math.round(
      pins.reduce((sum, p) => sum + p.ptra_score, 0) / pins.length,
    )

    await appendLog(
      recipeId,
      logEntry(
        "Pin Designer",
        "done",
        `${pins.length} Pins generated | Avg PTRA: ${avgScore}/100 | Intents: ${pins.map(p => p.intent).join(", ")}`,
      ),
    )
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors. If `buildSlug` clashes with existing `slugify` import, use the existing `slugify` from `@/lib/slug` instead.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/steps/pin-phase.ts
git commit -m "feat: add pin-phase step — inserts PinDrafts into DB after image generation"
```

---

### Task 5: Integrate Pin Designer into `generate-recipe.ts`

**Files:**
- Modify: `lib/inngest/functions/generate-recipe.ts`

**Interfaces:**
- Consumes: `generatePins` from `"./steps/pin-phase"`

- [ ] **Step 1: Add import**

```typescript
// lib/inngest/functions/generate-recipe.ts — add import at top (around line 29, after aor-phase import)
import { generatePins } from "./steps/pin-phase"
```

- [ ] **Step 2: Update file header comment**

```typescript
// Update the step module comment block (around line 10-14):
//   pin-phase     → Step 11         (Pin Designer — 5 Pin drafts per recipe)
//   aor-phase     → Step 13         (AOR article generation)
```

- [ ] **Step 3: Add step call after initVariantStats**

Find the line after `await initVariantStats(...)` and before `// ── Phase 10: AOR article ──`. Insert:

```typescript
      // ── Phase 11: Pin Designer ────────────────────────────────────────────
      await generatePins(
        step,
        recipeId,
        editResult.finalRecipe,
        agentResult.seoPlan,
        imageResult.heroImageUrl,
        imageResult.imageVariants as ImageVariant[],
      )

      // ── Phase 13: AOR article ─────────────────────────────────────────────
      if (aorCategory) {
```

Note: Rename "Phase 10" to "Phase 13" in the AOR comment to keep numbering consistent.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/inngest/functions/generate-recipe.ts
git commit -m "feat: integrate Pin Designer step into pipeline (Phase 11)"
```

---

### Task 6: End-to-end verification

**Files:**
- None (manual test)

- [ ] **Step 1: Full TypeScript check and build**

```bash
npx tsc --noEmit
npm run build
```
Expected: both pass.

- [ ] **Step 2: Verify dev server is running**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```
Expected: 200.

- [ ] **Step 3: Trigger a recipe generation with AOR**

```bash
curl -s -X POST http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword":"sourdough discard brownies","aorCategory":"techniques"}'
```
Expected: returns `{"id":<number>,"status":"generating"}`.

- [ ] **Step 4: Wait for pipeline to complete**

```bash
# Wait ~8-10 minutes, then check status
curl -s http://localhost:3000/api/recipes/<id>/status
```
Expected: `"status":"published"`.

- [ ] **Step 5: Verify pin_drafts table has rows**

```bash
npx dotenv-cli -e .env.local -- npx tsx -e "
import { db } from './lib/db';
import { pinDrafts } from './lib/db/schema';
(async () => {
  const rows = await db.select().from(pinDrafts).orderBy(pinDrafts.id);
  console.log(JSON.stringify(rows.map(r => ({
    id: r.id, recipeId: r.recipeId, intent: r.intent,
    ptraScore: r.ptraScore, status: r.status, pinTitle: r.pinTitle?.substring(0, 60)
  })), null, 2));
  process.exit(0);
})();
```
Expected: at least 1 row with status "draft" for the new recipe.

- [ ] **Step 6: Verify routing still works**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/test  # Must be 404
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recettes        # Must be 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/techniques      # Must be 200
```
Expected: 404, 200, 200.

- [ ] **Step 7: Commit final verification**

```bash
git add -A
git commit -m "verify: PTRA Pin Designer end-to-end test passed"
```
