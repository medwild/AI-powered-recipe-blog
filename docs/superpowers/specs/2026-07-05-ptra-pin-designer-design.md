# PTRA Pin Designer — Design Spec

> **Status:** Draft — awaiting user review
> **Date:** 2026-07-05
> **Topic:** Integration of PTRA (Pinterest Topical Resonance Authority) framework as a new pipeline agent that generates 5 Pin drafts per recipe.

---

## 1. Context & Motivation

### 1.1 Why Pinterest

The blog pivots from Google-first to **Pinterest-first SEO**. Pinterest is a visual discovery engine — not a social network — and serves as the primary traffic source. The methodology is inspired by:

- **PTRA Framework** (`/ptra-editorial-architect/SKILL.md`): a structured Pinterest editorial planning system scoring Pins across 11 factors (/100)
- **Practitioner video** (~2h, darija): two successful bloggers sharing their exact Pinterest method for recipe blogs targeting the German market. Key insights: micro-niche lock, multi-account strategy, warm-up protocol, Fresh Pin Rule, saves over impressions

### 1.2 Micro-Niche

**`Sourdough Discard Recipes`** — one and only one micro-niche. Pinterest rewards hyper-specialization. A site talking only about discard flatbreads, crackers, pretzels, pizza dough, pancakes, banana bread, etc. builds topical authority faster than a general "baking" site.

### 1.3 Architecture Decision

The blog pipeline generates Pin **metadata** (titles, hooks, descriptions, image prompts, PTRA scores). A separate webapp (outside this project) handles visual creation and Pinterest publication via Zernio/Buffer. Both projects share the same **Neon PostgreSQL** database.

---

## 2. Pipeline Integration

### 2.1 New Step

| # | Step | Agent | Status |
|---|---|---|---|
| 11 | Pin Designer | Agent Pin Designer (🆕) | After A/B Stats, before AOR Article |

### 2.2 Full Pipeline (Updated)

```
SERP → SERP Structurer → Strategist → Writer → Auditor → Human Review
→ Editor/QA Loop → Image Prompt → Image Gen → Self-Improvement → Persist
→ A/B Stats → 🆕 Pin Designer → AOR Article
```

### 2.3 Data Flow

```
Recipe (DB) + Images (Cloudinary) + SeoPlan
        ↓
   Agent Pin Designer  ← PTRA Skill (loadSkillContent)
        ↓
   5 PinDraft objects → INSERT INTO pin_drafts
        ↓
   Webapp externe lit pin_drafts → images FLUX → overlay → Zernio → Pinterest
```

---

## 3. Database

### 3.1 New Table: `pin_drafts`

```sql
pin_drafts (
  id              serial PRIMARY KEY,
  recipe_id       integer NOT NULL,        -- FK to recipes.id
  pin_title       text NOT NULL,           -- Pinterest-optimized title
  overlay_text    text NOT NULL,           -- Text to overlay on image
  description     text NOT NULL,           -- Pinterest SEO description
  image_prompt    text NOT NULL,           -- FLUX prompt (2:3, Type 6)
  board           text NOT NULL,           -- Target board name
  intent          text NOT NULL,           -- Pinterest intent taxonomy
  ptra_score      integer NOT NULL,        -- 0-100 PTRA Coherence Score
  hashtags        text[] DEFAULT '{}',     -- Optional hashtags
  variant_index   integer DEFAULT 0,       -- 0-4 (5 Pins per recipe)
  status          text DEFAULT 'draft',    -- draft | generated | published | rejected
  pin_url         text,                    -- Pinterest URL after publication
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

INDEX idx_pin_drafts_recipe ON pin_drafts(recipe_id)
INDEX idx_pin_drafts_status ON pin_drafts(status)
```

### 3.2 Schema Migration

```bash
npx drizzle-kit push   # After adding pinDrafts to lib/db/schema.ts
```

---

## 4. Agent: Pin Designer

### 4.1 Files

| File | Purpose |
|---|---|
| `skills/agent-pin-designer.md` | System prompt — applies PTRA framework to a recipe |
| `lib/inngest/functions/agents/pin-designer.ts` | Agent runtime — calls NaraRouter/Cloudflare LLM |
| `lib/inngest/functions/steps/pin-phase.ts` | Inngest step — inserts 5 pin_drafts into DB |
| `lib/inngest/functions/generate-recipe.ts` | One-line addition to call the new step |
| `lib/db/schema.ts` | Add `pinDrafts` table definition |

### 4.2 Input Contract

The agent receives:

```typescript
interface PinDesignerInput {
  recipeTitle: string          // "Sourdough Discard Flatbread — Soft, Chewy & Ready in 20 Minutes"
  recipeSlug: string           // "sourdough-discard-flatbread"
  recipeUrl: string            // "https://chefaugustin.com/recettes/sourdough-discard-flatbread"
  recipeExcerpt: string        // 2-sentence summary
  heroImageUrl: string         // Main hero image URL
  imageVariants: ImageVariant[] // A/B variant images
  ingredients: Ingredient[]    // Recipe ingredients
  tags: string[]               // Recipe tags
  seoPlan: SeoPlan             // Strategist output (H2s, FAQ, entities, etc.)
  microNiche: string           // "Sourdough Discard Recipes"
  targetCountry: string        // "us" (from SERP_GL env)
}
```

### 4.3 Output Contract

The agent returns 5 Pin drafts:

```typescript
interface PinDraft {
  pin_title: string       // e.g., "5-Min Sourdough Flatbread That Never Fails"
  overlay_text: string    // e.g., "5-Minute Discard Flatbread"
  description: string     // e.g., "Make soft, chewy sourdough discard flatbread in..."
  image_prompt: string    // e.g., "Vertical Pinterest food photography, sourdough flatbread..."
  board: string           // "Sourdough Discard Flatbread"
  intent: string          // quick_solution | beginner_guide | step_by_step | mistake_avoidance | before_after | checklist
  ptra_score: number      // 70-100
  hashtags: string[]      // [] (Pinterest deprioritizes hashtags — included for cross-platform)
}
```

### 4.4 Pin Variant Rules (from PTRA §6)

1. **5 Pins per recipe** — each with a DIFFERENT angle but the SAME core promise
2. **Fresh Pin Rule** — at least ONE of these must differ per variant:
   - Different background photo (distinct image_prompt)
   - Different visual composition (product shot vs. lifestyle vs. infographic)
   - Different format (static vs. video mention in prompt)
3. **Angles MUST vary** — use different Pinterest intents:
   - Pin 1: quick_solution ("5-Minute Discard Flatbread")
   - Pin 2: beginner_guide ("Beginner's Guide to Sourdough Discard Flatbread")
   - Pin 3: step_by_step ("Step-by-Step: Perfect Discard Flatbread Every Time")
   - Pin 4: mistake_avoidance ("3 Mistakes That Ruin Sourdough Flatbread")
   - Pin 5: before_after or checklist ("Before & After: The 10-Min Rest That Changes Everything")

### 4.5 Image Prompt Specs (from PTRA §10 + visual-prompts.md)

Every `image_prompt` must include:

```text
Aspect ratio 2:3 (1000x1500px), vertical orientation, safe zone respected
(no critical text or focal subject within the outer 8% margin).
Type 6 — Food / Recipes: Vertical Pinterest food photography, [recipe name],
visible texture, realistic homemade style, appetizing composition,
natural light, mobile-first framing, space for readable text overlay,
no misleading ingredients.
```

### 4.6 PTRA Scoring (per Pin)

The agent scores each Pin /100 across 11 factors. Minimum 70 required. Below 70 = discarded, regenerated.

### 4.7 Model Config

```typescript
{
  temperature: 0.5,    // Balance creativity (different angles) and consistency (PTRA rules)
  maxTokens: 4096,     // 5 Pins × ~800 tokens each
}
```

---

## 5. Step Implementation: `pin-phase.ts`

```typescript
// lib/inngest/functions/steps/pin-phase.ts
import { db } from "@/lib/db"
import { pinDrafts } from "@/lib/db/schema"
import { agentPinDesigner } from "../agents/pin-designer"
import { appendLog, logEntry } from "../helpers"
import type { RecipeDraft } from "../agents/writer"
import type { SeoPlan } from "../agents/strategist"
import type { ImageVariant } from "@/lib/db/schema"

export async function generatePins(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number,
  finalRecipe: RecipeDraft,
  seoPlan: SeoPlan,
  heroImageUrl: string | null,
  imageVariants: ImageVariant[],
) {
  await step.run("pin-designer", async () => {
    const pins = await agentPinDesigner({
      recipeTitle: finalRecipe.title,
      recipeSlug: `recettes/${finalRecipe.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      recipeUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/recettes/${finalRecipe.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      recipeExcerpt: finalRecipe.excerpt ?? "",
      heroImageUrl: heroImageUrl ?? "",
      imageVariants,
      ingredients: finalRecipe.ingredients ?? [],
      tags: finalRecipe.tags ?? [],
      seoPlan,
      microNiche: "Sourdough Discard Recipes",
      targetCountry: process.env.SERP_GL || "us",
    })

    // Filter pins below 70 PTRA score
    const validPins = pins.filter(p => p.ptra_score >= 70)

    if (validPins.length === 0) {
      await appendLog(recipeId, logEntry("Pin Designer", "error",
        "All 5 Pins scored below 70 PTRA — no Pins generated."))
      return
    }

    // Batch insert
    const now = new Date()
    await db.insert(pinDrafts).values(
      validPins.map((pin, idx) => ({
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
    )

    await appendLog(recipeId, logEntry("Pin Designer", "done",
      `${validPins.length} Pins generated | Avg PTRA: ${Math.round(validPins.reduce((s, p) => s + p.ptra_score, 0) / validPins.length)}/100`))
  })
}
```

---

## 6. Skill: `agent-pin-designer.md`

### 6.1 Frontmatter

```yaml
---
id: agent-pin-designer
version: "1.0.0"
description: "PTRA Pin Designer — generates 5 Pinterest Pin drafts per recipe using the PTRA framework. Produces pin titles, overlay hooks, SEO descriptions, FLUX image prompts, board assignments, and PTRA scores /100."
model: "mistral-medium-3-5"
routing: "NaraRouter"
temperature: 0.5
max_tokens: 4096
last_updated: "2026-07-05"
framework: "PTRA (Pinterest Topical Resonance Authority) v1.0"
---
```

### 6.2 Key Instructions

1. Generate exactly 5 Pins per recipe
2. Each Pin has a DIFFERENT Pinterest intent from the taxonomy
3. Hooks must be ethical — specific, verifiable, honest (NEVER "This Will Change Your Life", "Secret Trick", "Guaranteed")
4. Image prompts follow Type 6 Food Photography (2:3, safe zone, realistic style)
5. Score each Pin /100 using PTRA 11-factor system
6. Output pure JSON array — no reasoning, no markdown fences
7. All content in English

---

## 7. Changes to Existing Files

### 7.1 `lib/db/schema.ts`

Add:
```typescript
export const pinDrafts = pgTable("pin_drafts", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  recipeIdx: index("idx_pin_drafts_recipe").on(table.recipeId),
  statusIdx: index("idx_pin_drafts_status").on(table.status),
}))

export type PinDraft = typeof pinDrafts.$inferSelect
export type NewPinDraft = typeof pinDrafts.$inferInsert
```

### 7.2 `lib/inngest/functions/generate-recipe.ts`

Add import:
```typescript
import { generatePins } from "./steps/pin-phase"
```

Add step call (after initVariantStats, before AOR article):
```typescript
// ── Phase 11: Pin Designer ────────────────────────────────────
await generatePins(step, recipeId, editResult.finalRecipe,
  agentResult.seoPlan, heroImageUrl, imageVariants)
```

---

## 8. What This Does NOT Include

- **Visual generation** — the FLUX image generation from `image_prompt` is done by the external webapp, not this pipeline
- **Overlay rendering** — text overlay positioning and rendering is the webapp's responsibility
- **Pinterest publication** — via Zernio/Buffer from the external webapp
- **Pinterest API integration** — out of scope for the blog pipeline
- **Board creation** — boards are created manually in Pinterest, not via this pipeline
- **Account management** — multi-account strategy is managed by the external webapp
- **Pinterest Trends API** — the agent uses SERP data + keyword analysis, not the Pinterest Trends API

---

## 9. Non-Negotiable Rules

1. **No Pin below 70 PTRA** — discarded automatically
2. **5 distinct angles** — cannot reuse the same intent for multiple Pins
3. **Ethical hooks only** — no clickbait, no fake promises, no "secret trick"
4. **Fresh Pin Rule** — distinct `image_prompt` per variant (different composition, not just overlay text change)
5. **2:3 aspect ratio** — every `image_prompt` must specify 1000×1500px vertical
6. **English only** — all Pin content in English (US market)

---

## 10. Success Criteria

1. Pipeline completes without errors — Pin Designer step runs after A/B Stats
2. 5 Pin drafts inserted into `pin_drafts` table per recipe
3. All Pins score ≥70 PTRA
4. Each Pin has a different Pinterest intent
5. Each Pin has a distinct `image_prompt` (Fresh Pin Rule)
6. `npx tsc --noEmit` passes
7. `npm run build` succeeds

---

## 11. Verification Steps

```bash
# 1. Type check
npx tsc --noEmit

# 2. Build
npm run build

# 3. DB migration
npx drizzle-kit push

# 4. Manual test — generate a recipe and check pin_drafts
curl -X POST http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword":"sourdough discard brownies","aorCategory":"techniques"}'

# 5. Verify pin_drafts in DB
npx drizzle-kit studio  # Check pin_drafts table

# 6. Verify routing still works
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/test  # Must be 404
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recettes  # Must be 200
```
