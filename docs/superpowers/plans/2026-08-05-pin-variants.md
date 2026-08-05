# Pin Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/pin-variants.ts <recipeId|slug>` — outputs the recipe's hero image URL (as reference) + 4 copy-paste image-to-image prompts for Ideogram chat, one per photo angle.

**Architecture:** Console-only deterministic script. Reads `recipes` (read-only) via the existing Drizzle pattern from `pin-brief.ts`. No DB writes, no API calls, no LLM. Pure local prompt templates with a fixed angle sequence + 2 tag-based exceptions.

**Tech Stack:** TypeScript, tsx, Drizzle ORM (existing), dotenv.

## Global Constraints

- **One new file only**: `scripts/pin-variants.ts`. No schema, lib, skill, or migration changes.
- **Zero DB writes, zero API calls, zero LLM calls** — deterministic output.
- **Prompt template is fixed**: `title + angle + pro specs + "2:3 vertical, Pinterest. Fond simple. Pas de texte sur l'image."`
- **Cohérence via `title` only** — never parse `imagePrompt` (fragile).
- **Camera body fixed**: `Sony A7R IV` — never extract from `imagePrompt`.
- **Angle sequence fixed** — `45° close-up → overhead → macro → lifestyle`; only `FLAT_LAY_TAGS` and `BURGER_TAGS` deviate.
- **No text on generated images** — overlays come from `pin-brief.ts` (Canva), never from the prompt.
- Follow `pin-brief.ts` conventions: dotenv → db → findFirst → console.log; `main().catch()` wrapper.
- After any modification: `npx tsc --noEmit` must pass.
- Commit message must end with `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

### Task 1: Scaffold + read recipe + error handling

**Files:**
- Create: `scripts/pin-variants.ts`

**Interfaces:**
- Consumes: `dotenv`, `db` from `../lib/db`, `recipes` from `../lib/db/schema`, `eq` from `drizzle-orm` (same as `pin-brief.ts`)
- Produces: `main()` CLI entry; reads `recipe.id, recipe.title, recipe.slug, recipe.tags, recipe.heroImageUrl`

- [ ] **Step 1: Create `scripts/pin-variants.ts` with the scaffold, DB read, and error handling**

```typescript
// Generate 5 Pinterest pins per recipe using the hero image as reference:
// Pin 1 = existing hero image; Pins 2-5 = 4 image-to-image prompts (different
// photo angles) to paste into Ideogram chat with the hero as reference.
// Usage: npx tsx scripts/pin-variants.ts <recipeId|slug>
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const target = process.argv[2]
  if (!target) {
    console.log("Usage: npx tsx scripts/pin-variants.ts <recipeId|slug>")
    process.exit(1)
  }

  const isId = /^\d+$/.test(target)
  const recipe = isId
    ? await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, parseInt(target)) })
    : await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, target) })

  if (!recipe) { console.error(`Recipe not found: ${target}`); process.exit(1) }
  if (!recipe.heroImageUrl) {
    console.error("⚠️ Génère la hero image d'abord — elle sert de référence")
    process.exit(1)
  }

  const title = recipe.title || recipe.keyword || "Untitled"
  const tags = (recipe.tags ?? []) as string[]

  // TODO: print pin 1 (hero URL) + pins 2-5 (4 prompts)
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Verify error handling behaviorally**

Run: `npx tsx scripts/pin-variants.ts` (no argument)
Expected: `Usage: npx tsx scripts/pin-variants.ts <recipeId|slug>` + exit 1

Run: `npx tsx scripts/pin-variants.ts 999999999` (nonexistent)
Expected: `Recipe not found: 999999999` + exit 1

- [ ] **Step 4: Commit**

```bash
git add scripts/pin-variants.ts
git commit -m "feat(pins): scaffold pin-variants — read recipe + error handling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Angle resolver (fixed sequence + 2 tag exceptions)

**Files:**
- Modify: `scripts/pin-variants.ts`

**Interfaces:**
- Consumes: `tags: string[]`
- Produces: `resolveAngles(tags: string[]): Angle[]` where `Angle = { label: string; specs: string }` — array of 4 entries, one per pin (pin 2 → pin 5). Labels from the spec table; specs = lens/aperture/DOF from `food-photography.md` §7. Prose in French per spec template.

- [ ] **Step 1: Add the angle type, tag lists, resolver, and specs map**

```typescript
type Angle = { label: string; specs: string }

const FLAT_LAY_TAGS = ["pizza", "salad", "board", "cake", "tart"] // food-photography.md §6
const BURGER_TAGS = ["burger", "sandwich", "wrap"] // food-photography.md §6

const LIFESTYLE: Angle = {
  label: "Lifestyle en situation",
  specs: "35mm, f/2.0, shallow depth of field",
}

const ANGLES: Record<"default" | "flat-lay" | "burger", Angle[]> = {
  // 45° close-up → overhead → macro → lifestyle (spec §5)
  default: [
    { label: "45° close-up", specs: "90mm macro, f/2.8, shallow depth of field (bokeh)" },
    { label: "Overhead", specs: "50mm, f/5.6, deep depth of field (tout net)" },
    { label: "Détail macro", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
  // Flat-lay: overhead first (pizza, salad, board, cake/tart)
  "flat-lay": [
    { label: "Overhead flat lay", specs: "50mm, f/5.6, deep depth of field (tout net)" },
    { label: "45° close-up", specs: "90mm macro, f/2.8, shallow depth of field (bokeh)" },
    { label: "Détail macro", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
  // Burger/sandwich: 45° hero + side cut-away
  burger: [
    { label: "45° hero (hauteur/layers)", specs: "35mm, f/2.0, shallow depth of field" },
    { label: "Side cut-away (couches)", specs: "50mm, f/4, moderate depth of field" },
    { label: "Détail macro (sauce qui coule)", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
}

function resolveAngles(tags: string[]): Angle[] {
  const joined = tags.join(" ").toLowerCase()
  if (FLAT_LAY_TAGS.some((t) => joined.includes(t))) return ANGLES["flat-lay"]
  if (BURGER_TAGS.some((t) => joined.includes(t))) return ANGLES.burger
  return ANGLES.default
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add scripts/pin-variants.ts
git commit -m "feat(pins): angle resolver — fixed sequence + flat-lay/burger exceptions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Prompt builder + console output

**Files:**
- Modify: `scripts/pin-variants.ts`

**Interfaces:**
- Consumes: `title: string`, `angles: Angle[]`, `heroImageUrl: string`
- Produces: `buildPrompt(title: string, angle: Angle): string` — the copy-paste prompt per spec §5.1; console output per spec §4.2.

- [ ] **Step 1: Add the prompt builder and the full console output in `main()`**

```typescript
function buildPrompt(title: string, angle: Angle): string {
  return [
    `Recrée exactement ce même plat — ${title} — mêmes ingrédients, mêmes couleurs, même style, même lumière. Change uniquement l'angle de prise de vue : ${angle.label}.`,
    "",
    angle.specs,
    "",
    "2:3 vertical, Pinterest. Fond simple. Pas de texte sur l'image.",
  ].join("\n")
}
```

Replace the `// TODO: print pin 1 (hero URL) + pins 2-5 (4 prompts)` comment in `main()` with:

```typescript
  console.log("")
  console.log("═══ PIN 1 — HERO EXISTANTE ═══")
  console.log("Image de référence (à charger dans le chat Ideogram) :")
  console.log(recipe.heroImageUrl)
  console.log("")

  const angles = resolveAngles(tags)
  for (let i = 0; i < angles.length; i++) {
    const pinNum = i + 2
    console.log(`═══ PIN ${pinNum} — ${angles[i].label} ═══`)
    console.log("[PROM] " + buildPrompt(title, angles[i]))
    console.log("")
  }

  console.log("💡 Overlays texte : npx tsx scripts/pin-brief.ts " + recipe.id + " (pas de duplication ici)")
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Verify behavior on 2 recipes (success criterion 2)**

Run: `npx tsx scripts/pin-variants.ts <id-of-a-pizza-or-salad-recipe>`
Expected: Pin 2 label = `Overhead flat lay`, pins 3-5 follow the flat-lay sequence

Run: `npx tsx scripts/pin-variants.ts <id-of-a-lasagna-or-other-recipe>`
Expected: Pin 2 label = `45° close-up`, pins 3-5 follow the default sequence

(Get real recipe IDs via `npx drizzle-kit studio`, or reuse a recipe id/slug you already know.)

- [ ] **Step 4: Verify output shape on a real recipe**

Run: `npx tsx scripts/pin-variants.ts <any-valid-recipe-id>`
Expected: console shows PIN 1 hero URL, PIN 2-5 prompts (each = coherence clause with title + angle label + specs + "2:3 vertical, Pinterest. Fond simple. Pas de texte sur l'image."), and the `pin-brief.ts` reminder line. No DB writes, no API calls.

- [ ] **Step 5: Commit**

```bash
git add scripts/pin-variants.ts
git commit -m "feat(pins): pin-variants — prompt builder + 5-pin console output

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §3 architecture (read-only DB, console output) → Task 1 + 3 ✅
- §4.1 errors (usage, not found, heroImageUrl null) → Task 1 ✅
- §4.2 output shape → Task 3 ✅
- §5 angle sequence + 2 exceptions → Task 2 ✅
- §5.1 prompt template (title + angle + specs + no-text footer) → Task 3 ✅
- §5.2 pro specs (lens/aperture/DOF per framing) → Task 2 specs map ✅
- §5.3 no text on image → footer in Task 3 ✅
- §8 criteria 1 (tsc) → every task ✅; criterion 2 (flat-lay vs default) → Task 3 Step 3 ✅; criterion 3 (manual Ideogram test) → user action after plan ✅

**2. Placeholder scan:** The only `// TODO:` is an explicit implementation marker replaced in Task 3 Step 1 — no unresolved placeholders. All code blocks contain real code.

**3. Type consistency:** `Angle = { label, specs }` defined in Task 2, consumed in Task 3 as `Angle`; `resolveAngles(tags): Angle[]` matches its use; `buildPrompt(title, angle)` parameter types match `title: string`, `angle: Angle`. `LIFESTYLE` shared constant defined once in Task 2, used in all three angle arrays. ✅
