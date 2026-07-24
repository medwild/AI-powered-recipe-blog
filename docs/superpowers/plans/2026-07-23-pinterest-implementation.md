# Pinterest Strategy — Implementation Plan
> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Execute the Pinterest traffic strategy: setup 13 boards, activate Rich Pins, generate content via pipeline v14, and establish the weekly publication workflow.

**Architecture:** 3 phases. Phase 1 = manual Pinterest setup (one-time, 1h). Phase 2 = content generation using existing pipeline v14 + pin brief script. Phase 3 = operational workflow (manual pin creation + Tailwind scheduling). Minimal code — the pipeline already does the heavy lifting. Pin text overlays are manual (Canva/Tailwind) until volume justifies automation.

**Tech Stack:** Pipeline v14 (TypeScript, Anthropic/DeepSeek, Ideogram), Tailwind (scheduler), Canva (text overlays)

## Global Constraints

- 1-3 fresh pins/day, never burst publishing
- 5 pin variants per recipe (different text overlay angles)
- 3 boards max per pin, spaced 2-3 days apart
- 3 articles/week cadence (S2 onward)
- Seasonal content 45-60 days before peak
- No AdSense-banned health claims on any pin or board
- Board names = exact Pinterest search queries
- One board = one strict theme (no cross-contamination)

---

### Task 1: Pinterest boards reference file

**Files:**
- Create: `data/pinterest-boards.json`

**Interfaces:**
- Produces: JSON array of 13 board objects `{ name: string, description: string, category: string }`
- Consumed by: Task 4 (pin-brief script), manual Pinterest setup

- [ ] **Step 1: Create the boards JSON file**

Create `data/pinterest-boards.json`:

```json
[
  {
    "name": "Easy Chicken Dinners for Two",
    "description": "Simple chicken dinner recipes scaled for two people. From one-pan chicken thighs to crispy chicken parmesan — all tested for small-batch cooking. No leftovers, no waste, no scaling math. Each recipe includes exact cook times, USDA-safe temperatures, and step-by-step instructions. Perfect for weeknight dinners when you want something satisfying without feeding a crowd. New pins weekly.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Asian-Inspired Dinners for Two",
    "description": "Asian-style dinner recipes portioned for two — ramen bowls, stir-fries, dumplings, Thai curries, Korean BBQ for two, and quick weeknight noodle dishes. Every recipe adapted for a Western home kitchen with accessible ingredients and clear techniques. No specialty equipment needed. Each recipe includes exact ingredient quantities for two servings. Chef Augustin's tips on wok hei, sauce building, and the balance of salty-sweet-sour-umami.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Quick Weeknight Dinners for Two",
    "description": "Fast dinner ideas for busy weeknights — all scaled for two people and ready in under 45 minutes. No complicated techniques, no specialty ingredients, no hour of prep. Quick sears, fast sauces, 15-minute sides, and pantry-staple meals you can throw together on a Tuesday. Organized by protein, cook method, and total time so you find exactly what you need in seconds. Practical cooking for real life.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Budget-Friendly Meals for Two",
    "description": "Affordable dinner recipes for two that don't taste cheap — under $15 total, under $10, and pantry-only meals. Smart ingredient swaps, budget cuts of meat cooked properly, and how to shop for two without waste. Each recipe includes cost-per-serving estimate and a shopping strategy. Batch-cooking tips for freezing half now and eating half tonight. Good food doesn't require expensive ingredients — it requires knowing what to do with the affordable ones.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "One-Pan Meals for Two",
    "description": "One-pan dinner recipes for two people — sheet pan suppers, skillet meals, and stovetop dishes that minimize cleanup. Every recipe uses a single cooking vessel from prep to plate. Small-batch portions mean no endless leftovers. Includes chicken, beef, pork, seafood, and vegetarian options. Cheat sheets for pan size, oven temperature, and timing included in every recipe.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Slow Cooker Recipes for Two",
    "description": "Small-batch slow cooker and crockpot recipes sized for two people. No more drowning in leftovers from a 6-quart recipe — these are built for 2-quart and 3-quart cookers. Dump-and-go dinners, tender fall-apart meats, soups, and stews. Each recipe includes cook time for both low and high settings, plus make-ahead and freezer prep tips.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Pasta & Noodles for Two",
    "description": "Pasta recipes portioned for two — carbonara, lasagna, mac and cheese, fettuccine, ramen bowls, and quick weeknight noodle dishes. No half-empty boxes of pasta, no sauce for six. Every recipe scaled to exactly two servings with precise ingredient quantities in both volume and weight. Includes classic Italian, Asian-inspired, and creamy comfort pasta dishes.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Small-Batch Desserts for Two",
    "description": "Dessert recipes that make exactly two servings — chocolate lava cakes, small-batch cookies, mini pies, two ramekins of crème brûlée, and more. No temptation of a full cake on the counter, no stale leftovers. Every recipe tested for small-pan baking and precise scaling. Includes quick desserts under 30 minutes, weekend baking projects, and romantic date-night sweets.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Small-Batch Sides for Two",
    "description": "Side dish recipes scaled for exactly two people — mashed potatoes for two, roasted vegetables, small-batch biscuits, quick salads, and simple grain sides. No more half-head of cauliflower wilting in the fridge or measuring 1/3 of a package. Each recipe designed to pair with a main dish or stand alone with a protein. Practical portions, zero waste, timed to finish with your main course.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Romantic Dinner Ideas for Two",
    "description": "Date-night dinner recipes designed for two — steak dinners, candlelight-worthy pastas, seafood for two, and decadent desserts that feel restaurant-fancy without the restaurant price. Every recipe includes wine pairing suggestions, plating tips, and timing so everything hits the table hot. Special occasion menus plus everyday romantic meals that say \"I made an effort\" without requiring one.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Comfort Food for Two",
    "description": "Comfort food classics scaled down for two — meatloaf, chili, pot pie, mac and cheese, mashed potatoes, beef stew, chicken and dumplings. All the dishes you crave without cooking for an army. Rich, satisfying, nostalgic recipes tested at two-serving scale. Each one includes make-ahead and freezer instructions so comfort food is always within reach. Cold nights, bad days, Sunday dinners — the food that feels like home.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Cooking Tips & Techniques for Two",
    "description": "Practical cooking guides for small-batch home cooks — how to scale any recipe to two servings, essential equipment for a two-person kitchen, knife skills, sauce fundamentals, and ingredient substitution charts. No fluff, no culinary school jargon. Each guide solves a real problem: halving an egg, choosing the right pan size, freezing half-batches, speed-thawing proteins.",
    "category": "Food & Drink > Cooking"
  },
  {
    "name": "Balanced Dinners for Two",
    "description": "Well-structured dinner recipes for two — protein + vegetables + smart carbs, without the fad diets or food moralizing. Lean proteins, vegetable-forward mains, lighter pastas, grain bowls. Just real food with good plate composition. High-protein options, naturally gluten-free meals, and ways to add vegetables without making a separate side dish. Flavor first, balance second.",
    "category": "Food & Drink > Cooking"
  }
]
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "const d=require('./data/pinterest-boards.json'); console.log(d.length + ' boards, all have name+description+category:', d.every(b => b.name && b.description && b.category))"`
Expected: `13 boards, all have name+description+category: true`

- [ ] **Step 3: Commit**

```bash
git add data/pinterest-boards.json
git commit -m "feat: add 13 Pinterest board definitions with descriptions"
```

---

### Task 2: Manual Pinterest setup (boards + Rich Pins + profile)

**Files:**
- Reference: `data/pinterest-boards.json`

**Interfaces:**
- Consumes: boards JSON from Task 1
- Produces: Live Pinterest account with 13 boards, Rich Pins enabled, profile optimized

- [ ] **Step 1: Create all 13 boards**

On pinterest.com → Profile → Saved → + Create board:
1. For each board in `data/pinterest-boards.json`, copy the name and description
2. Set category to "Food & Drink" for each board
3. Set visibility to Public

- [ ] **Step 2: Claim website**

Go to Settings → Claimed accounts → Claim website.
Enter `chefaugustin.com`. Follow the HTML tag or HTML file verification method.
The meta tag option: add `<meta name="p:domain_verify" content="..."/>` to `app/layout.tsx` head section if needed.

- [ ] **Step 3: Activate Recipe Rich Pins**

1. Go to https://developers.pinterest.com/tools/rich-pin-validator/
2. Enter any published recipe URL from chefaugustin.com (e.g., `/recettes/[slug]`)
3. Click "Validate"
4. If JSON-LD is correct → "Apply" → Rich Pins enabled for entire domain
5. If validator fails → check JSON-LD output in page source, fix if needed

- [ ] **Step 4: Optimize profile**

Update profile:
- Name: `Chef Augustin | Easy Weeknight Dinners for Two`
- Bio: `Small-batch dinner recipes for two people. French-trained chef sharing practical weeknight meals — no leftovers, no scaling math, no fuss. New pins daily.`
- Profile photo: Upload hero-kitchen.png or a branded chef avatar
- Website: `https://chefaugustin.com`

- [ ] **Step 5: Verify setup**

Check:
- 13 boards visible on profile
- Each board has correct name and description
- Rich Pin validator shows green checkmark for a recipe URL
- Profile shows updated name, bio, website

---

### Task 3: Pin brief generator script

**Files:**
- Create: `scripts/pin-brief.ts`

**Interfaces:**
- Consumes: PostgreSQL (recipe data via Drizzle), `@/lib/db`, `@/lib/db/schema`
- Produces: CLI output — 5 pin variants with text overlay, pin descriptions, target boards
- Input: recipe ID (number) or slug (string)

- [ ] **Step 1: Write the pin-brief script**

Create `scripts/pin-brief.ts`:

```typescript
// Generate a pin brief from a published recipe — 5 pin variants with
// text overlays, descriptions, and target boards for the weekly workflow.
// Usage: npx tsx scripts/pin-brief.ts <recipeId|slug>
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"

const ANGLE_TEMPLATES = [
  { label: "A — Titre exact", template: (t: string) => t },
  { label: "B — Temps", template: (t: string, r: any) => `${r.totalTime.replace(/[^0-9]/g, "")}-Minute ${t}` },
  { label: "C — Méthode/Accessoire", template: (t: string, r: any) => {
    const tags = (r.tags ?? []) as string[]
    if (tags.some((tag: string) => /one.pan/i.test(tag))) return `One-Pan ${t} (No Mess)`
    if (tags.some((tag: string) => /slow.cook/i.test(tag))) return `Slow Cooker ${t} — Set It & Forget It`
    if (tags.some((tag: string) => /pasta/i.test(tag))) return `${t} — Ready in ${r.totalTime}`
    return `Easy ${t} — Step by Step`
  }},
  { label: "D — Bénéfice/Résultat", template: (t: string) => `The ${t} That Actually Serves 2` },
  { label: "E — Long-tail SEO", template: (t: string) => `Small-Batch ${t} — Just 2 Servings` },
]

const BOARD_MAP: Record<string, string[]> = {
  chicken: ["Easy Chicken Dinners for Two", "Quick Weeknight Dinners for Two"],
  pasta: ["Pasta & Noodles for Two", "Quick Weeknight Dinners for Two"],
  dessert: ["Small-Batch Desserts for Two", "Romantic Dinner Ideas for Two"],
  side: ["Small-Batch Sides for Two"],
  slow_cooker: ["Slow Cooker Recipes for Two", "Comfort Food for Two"],
  one_pan: ["One-Pan Meals for Two", "Quick Weeknight Dinners for Two"],
  comfort: ["Comfort Food for Two", "Budget-Friendly Meals for Two"],
  romantic: ["Romantic Dinner Ideas for Two"],
  asian: ["Asian-Inspired Dinners for Two", "Quick Weeknight Dinners for Two"],
  balanced: ["Balanced Dinners for Two"],
  budget: ["Budget-Friendly Meals for Two", "Quick Weeknight Dinners for Two"],
  tips: ["Cooking Tips & Techniques for Two"],
}

async function main() {
  const target = process.argv[2]
  if (!target) { console.log("Usage: npx tsx scripts/pin-brief.ts <recipeId|slug>"); process.exit(1) }

  const isId = /^\d+$/.test(target)
  const recipe = isId
    ? await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, parseInt(target)) })
    : await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, target) })

  if (!recipe) { console.error(`Recipe not found: ${target}`); process.exit(1) }

  const title = recipe.title || recipe.keyword || "Untitled"
  const tags = (recipe.tags ?? []) as string[]
  const tagStr = tags.join(" ").toLowerCase()

  // Determine which boards match this recipe
  let matchedBoards: string[] = []
  for (const [keyword, boards] of Object.entries(BOARD_MAP)) {
    if (tagStr.includes(keyword)) {
      for (const b of boards) { if (!matchedBoards.includes(b)) matchedBoards.push(b) }
    }
  }
  if (matchedBoards.length === 0) matchedBoards = ["Quick Weeknight Dinners for Two", "Budget-Friendly Meals for Two"]
  const primary = matchedBoards[0]
  const secondary = matchedBoards.length > 1 ? matchedBoards[1] : "Quick Weeknight Dinners for Two"
  const tertiary = matchedBoards.length > 2 ? matchedBoards[2] : "Easy Chicken Dinners for Two"

  // Generate pin description (200-300 chars)
  const baseDescription = `${title} — a small-batch dinner recipe for two people. `.substring(0, 80)
  const timePart = recipe.totalTime ? `Ready in ${recipe.totalTime}. ` : ""
  const servePart = recipe.servings ? `Serves ${recipe.servings}. ` : "Serves 2. "
  const pinDescription = `${baseDescription}${timePart}${servePart}Easy step-by-step instructions with USDA food safety temperatures. Perfect for weeknight cooking without leftovers. Click for the full recipe.`

  console.log("")
  console.log(`📌 PIN BRIEF — ${title}`)
  console.log(`   Recipe #${recipe.id} | Slug: ${recipe.slug}`)
  console.log(`   Image: ${recipe.heroImageUrl || "⚠️ No image — generate first"}`)
  console.log("")
  console.log(`📋 PIN DESCRIPTION (use for all variants):`)
  console.log(`   ${pinDescription}`)
  console.log("")
  console.log(`🗂️  BOARDS: 1) ${primary}  2) ${secondary}  3) ${tertiary}`)
  console.log("")
  console.log("─".repeat(70))
  console.log("5 PIN VARIANTS — Text overlays to add in Canva:")
  console.log("─".repeat(70))

  for (const angle of ANGLE_TEMPLATES) {
    const overlay = angle.template(title, recipe)
    console.log("")
    console.log(`[${angle.label}]`)
    console.log(`Overlay:   ${overlay}`)
    let subline = ""
    if (recipe.totalTime) subline += `${recipe.totalTime} · `
    if (recipe.difficulty) subline += `${recipe.difficulty} · `
    if (tags.length > 0) subline += tags.slice(0, 2).join(" · ")
    console.log(`Subline:   ${subline || "Small-batch · For two"}`)
  }

  console.log("")
  console.log("─".repeat(70))
  console.log("📅 SCHEDULE (Tailwind):")
  const schedule = [
    { day: "Day 1", board: primary, variant: "A — Titre exact" },
    { day: "Day 3", board: secondary, variant: "B — Temps" },
    { day: "Day 5", board: tertiary, variant: "C — Méthode" },
    { day: "Day 7", board: primary, variant: "D — Bénéfice" },
    { day: "Day 9", board: secondary, variant: "E — Long-tail SEO" },
  ]
  for (const s of schedule) {
    console.log(`   ${s.day.padEnd(6)} → ${s.board.padEnd(35)} → ${s.variant}`)
  }
  console.log("")

  // Output JSON for programmatic use
  const json = {
    recipeId: recipe.id,
    slug: recipe.slug,
    title,
    imageUrl: recipe.heroImageUrl,
    pinDescription,
    boards: [primary, secondary, tertiary],
    variants: ANGLE_TEMPLATES.map(a => ({
      angle: a.label,
      textOverlay: a.template(title, recipe),
    })),
    schedule: schedule.map(s => ({ day: s.day, board: s.board, variant: s.variant })),
  }
  console.log("// JSON output:")
  console.log(JSON.stringify(json, null, 2))
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
```

- [ ] **Step 2: Verify script compiles**

Run: `npx tsc --noEmit scripts/pin-brief.ts`
Expected: No errors

- [ ] **Step 3: Test with an existing recipe**

Run: `npx tsx scripts/pin-brief.ts 1`
Expected: Outputs a pin brief for recipe #1 (if exists) or "Recipe not found: 1" (if no recipe #1)

- [ ] **Step 4: Commit**

```bash
git add scripts/pin-brief.ts
git commit -m "feat: add pin-brief script — 5 variants per recipe"
```

---

### Task 4: First content generation (2 pilot recipes)

**Files:**
- Uses: `scripts/generate.ts` (existing), `scripts/pin-brief.ts` (Task 3)

**Interfaces:**
- Consumes: Pipeline v14 (`lib/generate-recipe-pure.ts`), env vars (.env.local)
- Produces: 2 published recipes with images, ready for pin creation

- [ ] **Step 1: Generate recipe #1**

Run: `npx tsx scripts/generate.ts "easy chicken parmesan for two"`
Expected: Pipeline runs (SERP → Mega-Skill → Quality Gate → Persist → Image → SEO Gate). Output shows recipe ID and elapsed time.

- [ ] **Step 2: Verify recipe #1**

Run: `npx tsx scripts/check-recipes.ts`
Expected: Recipe #1 has status "published", heroImageUrl is set, contentMarkdown > 1500 words

- [ ] **Step 3: Generate recipe #2**

Run: `npx tsx scripts/generate.ts "one pan garlic herb chicken thighs for two"`
Expected: Pipeline completes successfully.

- [ ] **Step 4: Verify recipe #2**

Run: `npx tsx scripts/check-recipes.ts`
Expected: Recipe #2 published with image.

- [ ] **Step 5: Generate pin briefs for both**

Run: `npx tsx scripts/pin-brief.ts "easy-chicken-parmesan-for-two"`
Run: `npx tsx scripts/pin-brief.ts "one-pan-garlic-herb-chicken-thighs-for-two"`
Expected: Each outputs 5 variant text overlays, pin description, 3 target boards, 5-day schedule.

- [ ] **Step 6: Commit generated content log**

```bash
git add -A
git commit -m "content: first 2 pilot recipes generated"
```

---

### Task 5: Weekly workflow script (batch generator)

**Files:**
- Create: `scripts/weekly-generate.ts`

**Interfaces:**
- Consumes: `scripts/generate.ts` logic (inline), `data/pinterest-boards.json`, `data/editorial-plan.json`
- Produces: 3 recipes generated + pin briefs in one CLI command

- [ ] **Step 1: Write the weekly batch script**

Create `scripts/weekly-generate.ts`:

```typescript
// Weekly content batch — generates 3 recipes and outputs pin briefs.
// Usage: npx tsx scripts/weekly-generate.ts [--dry-run]
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

// Editorial plan keywords — wave 1 (quick wins, KD < 20)
const WAVE_1_KEYWORDS = [
  "healthy dinner ideas for two",
  "dessert for two",
  "cooking for two",
  "mac and cheese for two",
  "steak dinner ideas for two",
  "easy week of meals",
  "chicken pot pie for two",
  "2 qt slow cooker recipes",
  "mashed potato for two",
  "chocolate chip cookies for two",
]

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  
  // Dynamic imports — hoisted static imports break before dotenv
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { slugify } = await import("../lib/slug")
  const { generateRecipe } = await import("../lib/generate-recipe-pure")
  const { eq } = await import("drizzle-orm")

  // Find the next 3 ungenerated keywords from the wave
  const existing = await db.query.recipes.findMany({
    where: (r, { inArray }) => inArray(r.keyword, WAVE_1_KEYWORDS),
  })
  const existingKeywords = new Set(existing.map(r => r.keyword))
  const next = WAVE_1_KEYWORDS.filter(k => !existingKeywords.has(k)).slice(0, 3)

  if (next.length === 0) {
    console.log("✅ All wave 1 keywords already generated.")
    process.exit(0)
  }

  console.log(`\n📝 Weekly batch — ${next.length} recipes\n`)
  if (dryRun) {
    console.log("DRY RUN — would generate:")
    next.forEach((k, i) => console.log(`  ${i + 1}. ${k}`))
    process.exit(0)
  }

  for (const keyword of next) {
    console.log(`\n🔬 Generating: "${keyword}"`)
    
    // Create DB entry
    let slug = slugify(keyword) || "recette"
    let suffix = 0
    while (true) {
      const row = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, slug) })
      if (!row) break
      slug = `${slugify(keyword)}-${++suffix}`
    }

    const [created] = await db.insert(recipes).values({
      slug, keyword, title: keyword, status: "generating", workflowLog: [],
    }).returning({ id: recipes.id })

    // Run pipeline
    const t0 = Date.now()
    await generateRecipe({ recipeId: created.id, keyword })
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`  ✅ Recipe #${created.id} done in ${elapsed}s — slug: ${slug}`)
  }

  console.log("\n✨ Batch complete. Run pin-brief for each recipe:")
  const generated = await db.query.recipes.findMany({
    where: (r, { inArray }) => inArray(r.keyword, next),
    orderBy: (r, { desc }) => desc(r.id),
    limit: 3,
  })
  for (const r of generated) {
    console.log(`   npx tsx scripts/pin-brief.ts ${r.slug}`)
  }
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
```

- [ ] **Step 2: Verify script compiles**

Run: `npx tsc --noEmit scripts/weekly-generate.ts`
Expected: No errors

- [ ] **Step 3: Dry-run test**

Run: `npx tsx scripts/weekly-generate.ts --dry-run`
Expected: Lists 3 keywords that would be generated, no DB writes.

- [ ] **Step 4: Commit**

```bash
git add scripts/weekly-generate.ts
git commit -m "feat: add weekly-generate script — batch 3 recipes"
```

---

### Task 6: Operational workflow — manual pin creation & scheduling

**Files:**
- Reference: `data/pinterest-boards.json`, `scripts/pin-brief.ts`
- External: Tailwind (scheduler), Canva (text overlays)

**Note:** This task is manual/operational. No code changes. It's the recurring workflow each week.

- [ ] **Step 1: Run the weekly batch**

```bash
npx tsx scripts/weekly-generate.ts
```
Generates 3 recipes. Each takes 3-8 minutes depending on LLM latency.

- [ ] **Step 2: Generate pin briefs**

```bash
npx tsx scripts/pin-brief.ts <slug-1>
npx tsx scripts/pin-brief.ts <slug-2>
npx tsx scripts/pin-brief.ts <slug-3>
```
Each outputs: 5 text overlays, pin description, 3 target boards, 5-day schedule.

- [ ] **Step 3: Create pin images in Canva (or Tailwind Create)**

For each recipe, create 5 images:
1. Import the recipe's hero image (from Cloudinary URL in brief)
2. Add text overlay per variant (use brief output)
3. Export as 1000×1500px PNG
4. Repeat for all 5 variants

Time: ~2 min/variant × 5 = 10 min/recipe × 3 = 30 min/week

- [ ] **Step 4: Schedule in Tailwind**

1. Upload all 15 pin images to Tailwind
2. For each pin, copy the pin description from brief
3. Set destination URL to the recipe page on chefaugustin.com
4. Schedule per the 5-day schedule from brief:
   - Day 1: Variant A → Primary board
   - Day 3: Variant B → Secondary board
   - Day 5: Variant C → Tertiary board
   - Day 7: Variant D → Primary board
   - Day 9: Variant E → Secondary board

Time: ~1 min/pin × 15 = 15 min/week

- [ ] **Step 5: Curate 2-3 pins from other creators**

Search Pinterest for complementary content (not direct competitors — e.g., kitchen equipment, table setting, wine pairing). Save 2-3 pins to relevant boards. Signals legitimacy to the algorithm.

Time: 5 min

- [ ] **Step 6: Review analytics every 2 weeks**

Check Pinterest Analytics → Top pins by:
- Saves (strongest signal)
- Outbound clicks (traffic to blog)
- Impressions (visibility)

Double down on what works. If variant B ("30-Minute...") outperforms variant A, make B the primary angle for future recipes.
```

---

### Task 7: Verification — pipeline smoke test

**Files:**
- Uses: `scripts/smoke-test-single.ts` (existing), `scripts/generate.ts` (existing)

- [ ] **Step 1: Run existing smoke test**

Run: `npx tsx scripts/smoke-test-single.ts`
Expected: All checks pass (SERP API, LLM provider, DB connection, Cloudinary config, Ideogram config)

- [ ] **Step 2: Verify all env vars are set**

Run: `node -e "require('dotenv').config({path:'.env.local',override:true}); const keys=['DATABASE_URL','SERPER_API_KEY','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','IDEOGRAM_API_KEY']; const missing=keys.filter(k=>!process.env[k]); if(missing.length) { console.log('MISSING:',missing.join(', ')); process.exit(1) } else console.log('All required env vars present')"`
Expected: `All required env vars present`

- [ ] **Step 3: Verify tsc and tests**

Run: `npx tsc --noEmit && npm test`
Expected: No TypeScript errors, all tests pass.
