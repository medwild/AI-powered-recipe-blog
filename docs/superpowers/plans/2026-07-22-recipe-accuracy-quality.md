# Recipe Accuracy & Editorial Quality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen recipe editorial quality and data accuracy by adding verification constraints to the Chef Augustin mega-skill and expanding the Quality Gate with 3 new checks.

**Architecture:** The skill (`skills/chef-augustin-mega.md`) gains a new § on ingredient accuracy, conversion tables, equipment rules, and cooking time guardrails. The Quality Gate (`lib/quality-gate.ts`) gains ingredient cross-reference validation and weight conversion spot-checks. Both are independent — the skill prevents errors at generation time, the gate catches what slips through.

**Tech Stack:** TypeScript, Markdown (skill file), Zod schemas

## Global Constraints

- NEVER modify the order of pipeline steps (CLAUDE.md §8)
- NEVER disable TypeScript to make code pass (global.md §11)
- After any pipeline modification: `npx tsc --noEmit` MUST pass
- No new dependencies without documented justification (global.md §13)
- Changes are surgical — touch only what's needed (karpathy.md §3)
- Output format: valid JSON matching `RecipeArticleSchema` (Zod)
- Food safety: all USDA temperatures from existing gate still apply

---

### Task 1: Upgrade Chef Augustin Mega-Skill — Accuracy Constraints

**Files:**
- Modify: `skills/chef-augustin-mega.md`

**What:** Add 5 new sections to the skill that constrain the LLM toward accurate data rather than creative fabrication. No code changes — this is a prompt engineering task.

- [ ] **Step 1: Add §4A — Ingredient Accuracy & Weight Conversions after §4 line 86**

Insert the following block between the current §4 end (line 86: `- Sear/deglaze/reduce/braise — not brown/add liquid/thicken`) and §5 header (line 88: `## §5 SEO & STRUCTURE`):

```markdown

## §4A INGREDIENT ACCURACY — Volume to Weight Conversions

### Required Conversion Table
Every ingredient with volume measure MUST use the correct weight from this table. Do NOT calculate or estimate — use these values exactly.

| Ingredient | 1 cup | ½ cup | ¼ cup | 1 tbsp | 1 tsp |
|---|---|---|---|---|---|
| All-purpose flour | 125g | 63g | 31g | 8g | 3g |
| Bread flour | 130g | 65g | 33g | 8g | 3g |
| Whole wheat flour | 120g | 60g | 30g | 8g | 2.5g |
| Granulated sugar | 200g | 100g | 50g | 13g | 4g |
| Brown sugar (packed) | 220g | 110g | 55g | 14g | 5g |
| Powdered sugar | 120g | 60g | 30g | 8g | 2.5g |
| Butter | 227g | 113g | 57g | 14g | 5g |
| Olive oil | 216g | 108g | 54g | 13g | 4.5g |
| Vegetable/canola oil | 218g | 109g | 55g | 14g | 4.5g |
| Heavy cream | 240g | 120g | 60g | 15g | 5g |
| Milk (whole) | 240g | 120g | 60g | 15g | 5g |
| Water | 237g | 118g | 59g | 15g | 5g |
| Rice (uncooked, white) | 200g | 100g | 50g | 13g | 4g |
| Grated Parmesan | 90g | 45g | 22g | 6g | 2g |
| Shredded cheese (cheddar/mozzarella) | 113g | 57g | 28g | 7g | 2.5g |
| Honey | 340g | 170g | 85g | 21g | 7g |
| Tomato paste | 260g | 130g | 65g | 16g | 5g |
| Panko breadcrumbs | 80g | 40g | 20g | 5g | 1.5g |
| Almond flour | 96g | 48g | 24g | 6g | 2g |
| Cocoa powder | 85g | 42g | 21g | 5g | 1.8g |
| Cornstarch | 128g | 64g | 32g | 8g | 2.7g |

For ingredients NOT in this table:
- Liquids (wine, stock, vinegar, soy sauce, lemon juice): use 240g per cup
- Solid fats (lard, shortening, coconut oil): use 220g per cup
- Ground spices: use 2g per teaspoon
- Fresh herbs (chopped): do NOT convert to weight — use volume only
- "Pinch": do NOT convert — "pinch" is correct

### Conversion Rules
- Round to nearest 5g for quantities ≥50g, nearest 1g for quantities <50g
- For ingredients listed with volume AND count (e.g., "2 medium onions, diced (about 1½ cups)"), include count first, then volume, then weight
- If an ingredient has no reliable weight conversion, state volume only — never fabricate
```

- [ ] **Step 2: Add §4B — Equipment Specification**

Insert after §4A:

```markdown

## §4B EQUIPMENT — Pan Size, Material, and Thermometer Placement

### Pan Size (MANDATORY)
Every recipe MUST specify pan size and material for the primary cooking vessel. Format: `[size] [material] [type]`.

Examples:
- "10-inch cast iron skillet"
- "9×13-inch stainless steel baking dish"
- "3-quart enameled Dutch oven"
- "half-sheet pan (18×13 inches), aluminum"

For "dinner for two" recipes:
- Skillet: 10-inch or 12-inch (never 8-inch unless explicitly a small-batch dessert)
- Saucepan: 2-3 quart
- Dutch oven: 4-5 quart
- Sheet pan: quarter-sheet (9×13) or half-sheet (18×13)
- Baking dish: 8×8 inch or 9×9 inch

### Thermometer Placement (MANDATORY for meat/fish)
When a USDA temperature is specified, include WHERE to probe:
- "Insert the probe into the thickest part of the breast, not touching bone"
- "Check at the center of the thickest fillet — the probe should meet no resistance"
- "For thigh meat, probe near the bone without touching it"

Never state a doneness temperature without probe placement.
```

- [ ] **Step 3: Add §4C — Cooking Time Realism Guardrails**

Insert after §4B:

```markdown

## §4C COOKING TIME REALISM — Physical Plausibility

These are MINIMUM times for common proteins at standard cooking temperatures (350-400°F oven, medium-high stovetop). Times below these are physically impossible — do NOT write them.

| Protein | Cut/Form | Minimum Time |
|---|---|---|
| Chicken breast | Boneless, 6-8 oz | 10 min stovetop, 20 min oven at 400°F |
| Chicken thighs | Bone-in | 12 min stovetop, 35 min oven at 400°F |
| Chicken thighs | Boneless | 8 min stovetop, 18 min oven at 400°F |
| Steak | 1-inch thick | 6 min total stovetop (rare to medium) |
| Steak | 1.5-inch thick | 8 min total stovetop + 4 min oven finish |
| Salmon fillet | 6 oz, 1-inch | 8 min stovetop skin-side, 12 min oven at 400°F |
| Ground beef | Crumbled for sauce | 6 min stovetop (until no pink remains) |
| Shrimp | Large, peeled | 3 min per side maximum |
| Pork chop | 1-inch, bone-in | 6 min stovetop + 6 min oven at 400°F |

### Rest Time Rules
- Steak (any cut): rest 5-10 minutes after cooking
- Chicken breast: rest 5 minutes
- Roast (any protein): rest 10-15 minutes
- Fish fillet: rest 2-3 minutes
- Rest times are NOT optional — include in total time calculation

### Carryover Cooking
- Thick cuts (≥1.5 inches): temperature rises 5-10°F during rest
- Thin cuts (<1 inch): temperature rises 2-3°F during rest
- Account for carryover in doneness instructions: pull at target minus carryover
```

- [ ] **Step 4: Add §4D — Ingredient-Instruction Cross-Reference Rule**

Insert after §4C:

```markdown

## §4D INGREDIENT CROSS-REFERENCE — Every Ingredient Used

### The Rule (ZERO TOLERANCE)
1. **Every ingredient in the list MUST appear in at least one instruction step.**
2. **Every ingredient mentioned in the instructions MUST exist in the ingredient list.**
3. **Every ingredient quantity in the list MUST be fully consumed by the instructions.** No "reserve for another use."

### Before Output — Self-Check
After writing but before outputting JSON, mentally run through the ingredient list and confirm:
- Where does this ingredient appear in the instructions?
- Is the full quantity accounted for?
- Is there any instruction referencing an ingredient not in the list?

### "Pantry Staples" Exception
Salt, black pepper, and water for boiling pasta are the ONLY ingredients that may appear without a listed quantity. Everything else — including cooking oil — must be listed with quantity.
```

- [ ] **Step 5: Add §4E — Substitution Validity + Portion Yield**

Insert after §4D:

```markdown

## §4E SUBSTITUTIONS & PORTION YIELD

### Substitution Validity
When suggesting a substitution, confirm ALL of:
1. The substitution performs the same FUNCTION (thickener, acid, fat, leavening, binding)
2. The ratio is correct for that function
3. Any side effect of the substitution is acknowledged

Substitutions NEVER allowed without major recipe change:
- Baking soda ↔ baking powder (different chemical reactions)
- Cornstarch → flour 1:1 (flour has ½ the thickening power)
- Butter → oil in baking (butter provides structure via water evaporation)
- Egg → nothing in baking (egg provides structure, leavening, AND binding)

### Portion Yield for "Dinner for Two"
- This blog serves 2 people. If a recipe produces more, state it explicitly: "Makes 4 servings — halve for two, or refrigerate leftovers 3 days."
- Protein per person: 6-8 oz (170-225g) raw weight for dinner
- Pasta per person: 4 oz (113g) dry for main course, 2 oz (57g) for side
- Rice per person: ¾ cup (150g) uncooked for main, ½ cup (100g) for side
- Vegetables: 4-6 oz (113-170g) per person for a side

### Sensory Doneness Cues (MANDATORY per step)
Every cooking step that involves heat must include one sensory cue beyond temperature:
- Visual: "The edges curl and the center turns opaque"
- Auditory: "Listen for a steady sizzle, not a violent pop"
- Tactile: "Press with a finger — it should spring back, not leave a dent"
- Aromatic: "When it smells nutty and toasted, not just warm"
```

- [ ] **Step 6: Update §5 sidebar note — word count requirement to match new content**

In §5, update the word count range in the header comment to reflect the richer content:
- Change `1800-2200 words` to `2000-2500 words`

Find line 88 (`## §5 SEO & STRUCTURE (Google format, 1800-2200 words)`) and replace with:

```markdown
## §5 SEO & STRUCTURE (Google format, 2000-2500 words)
```

- [ ] **Step 7: Update Quality Gate word count thresholds to match**

The Quality Gate currently uses thresholds of 600 (dessert), 800 (≤30min), 1200 (default). With the richer accuracy constraints, these should be raised.

Read `lib/quality-gate.ts` lines 84-93 and replace the `getMinWords` function:

Old:
```typescript
function getMinWords(output: RecipeArticle): number {
  const totalMatch = (output.prepTime + output.cookTime).match(/(\d+)/g);
  const minutes = totalMatch ? totalMatch.reduce((sum, n) => sum + parseInt(n), 0) : 999;
  const isDessert = output.tags.some((t: string) =>
    /dessert|mousse|cake|cookie|tart|pie|pudding/i.test(t)
  );
  if (isDessert) return 600;
  if (minutes <= 30) return 800;
  return 1200;
}
```

New:
```typescript
function getMinWords(output: RecipeArticle): number {
  const totalMatch = (output.prepTime + output.cookTime).match(/(\d+)/g);
  const minutes = totalMatch ? totalMatch.reduce((sum, n) => sum + parseInt(n), 0) : 999;
  const isDessert = output.tags.some((t: string) =>
    /dessert|mousse|cake|cookie|tart|pie|pudding/i.test(t)
  );
  if (isDessert) return 700;
  if (minutes <= 30) return 1000;
  return 1500;
}
```

- [ ] **Step 8: Increment skill version and date**

In `skills/chef-augustin-mega.md` lines 3-9, update the version and date:

Change:
```
version: "1.0.0"
last_updated: "2026-07-21"
```

To:
```
version: "1.1.0"
last_updated: "2026-07-22"
```

And update the description:
```
description: "Mega-Skill v14.1 — Single-pass recipe generation: strategy, writing, SEO, food safety, ingredient accuracy, image prompt. All rules in one file."
```

- [ ] **Step 9: Commit skill changes**

```bash
git add skills/chef-augustin-mega.md lib/quality-gate.ts
git commit -m "feat: add accuracy constraints to mega-skill v14.1 — weight conversions, equipment, cooking times, ingredient cross-reference, substitutions, portions"
```

---

### Task 2: Upgrade Quality Gate — New Checks

**Files:**
- Modify: `lib/quality-gate.ts`

**What:** Add 3 new gate checks: orphan ingredient detection, weight conversion spot-check, and equipment mention check. These are code-level validators that block generation if the LLM violates accuracy rules.

- [ ] **Step 1: Read current `lib/quality-gate.ts` to confirm exact content**

The file is at `/home/user/ai-blog-builder/lib/quality-gate.ts`. Verify it matches the expected content before editing.

- [ ] **Step 2: Add ingredient cross-reference check function**

Insert the following new function after `detectBannedWords` (before the `qualityGate` function, around line 160):

```typescript
// ---------------------------------------------------------------------------
// Ingredient cross-reference validation
// ---------------------------------------------------------------------------

// Words to skip when fuzzy-matching ingredients to instructions
const INGREDIENT_STOP_WORDS = new Set([
  "cup", "cups", "tablespoon", "tablespoons", "teaspoon", "teaspoons",
  "tbsp", "tsp", "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams", "kg", "ml", "liter", "large", "medium", "small",
  "to", "taste", "for", "serving", "plus", "more", "as", "needed",
  "fresh", "dried", "ground", "chopped", "diced", "minced", "sliced",
  "grated", "shredded", "peeled", "cooked", "uncooked", "raw",
  "room", "temperature", "cold", "hot", "warm", "about", "approximately",
  "or", "and", "the", "a", "an", "divided", "optional", "preferably",
  "such", "as", "like", "any", "each", "per", "of",
]);

function normalizeIngredient(ingredient: string): string[] {
  // Extract meaningful words, strip quantities/units/stop words
  return ingredient
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove parentheticals
    .replace(/\d+[\d\/\.\s]*/g, "") // remove numbers and fractions
    .split(/[\s,]+/)
    .filter(w => w.length > 1)
    .filter(w => !INGREDIENT_STOP_WORDS.has(w));
}

export function detectOrphanIngredients(
  ingredients: string[],
  instructionsText: string,
): string[] {
  const orphans: string[] = [];
  const lowerInstructions = instructionsText.toLowerCase();

  for (const ingredient of ingredients) {
    const words = normalizeIngredient(ingredient);
    if (words.length === 0) continue;

    // At least one significant word must appear in instructions
    const found = words.some(word => lowerInstructions.includes(word));
    if (!found) {
      orphans.push(`"${ingredient}" not found in instructions`);
    }
  }

  return orphans;
}

export function detectPhantomIngredients(
  ingredients: string[],
  instructionsText: string,
): string[] {
  // This is a best-effort check: flag common ingredient-like patterns
  // in instructions that are NOT in the ingredients list.
  // We only flag high-confidence matches (ingredients with quantities in instructions).
  const lowerIngredients = ingredients.map(i => i.toLowerCase());
  const phantomPattern = /(\d+[\d\/\.\s]*(?:cup|tbsp|tsp|oz|lb|g|ml|ounce|pound)s?\s+(?:of\s+)?([a-z\s]+?))(?:[,.;]|$)/gi;

  // Skip — too many false positives. Instead, flag if instructions
  // mention any core protein/vegetable not in the ingredients list.
  const CORE_INGREDIENTS = [
    "chicken", "beef", "pork", "lamb", "salmon", "tuna", "shrimp",
    "tofu", "egg", "mushroom", "onion", "garlic", "tomato", "potato",
    "carrot", "celery", "bell pepper", "broccoli", "spinach", "kale",
    "rice", "pasta", "bread", "cheese", "butter", "olive oil",
  ];

  const phantoms: string[] = [];
  const lowerText = instructionsText.toLowerCase();

  for (const core of CORE_INGREDIENTS) {
    if (lowerText.includes(core)) {
      // Check if it appears in any ingredient
      const inIngredients = lowerIngredients.some(ing => ing.includes(core));
      if (!inIngredients) {
        phantoms.push(`"${core}" mentioned in instructions but not in ingredient list`);
      }
    }
  }

  return phantoms;
}
```

- [ ] **Step 3: Add weight conversion spot-check function**

Insert after the ingredient cross-reference functions, before the `qualityGate` function:

```typescript
// ---------------------------------------------------------------------------
// Weight conversion spot-check
// ---------------------------------------------------------------------------

interface WeightRange {
  low: number;
  high: number;
}

const EXPECTED_WEIGHTS: Record<string, WeightRange> = {
  flour: { low: 110, high: 140 },
  "all-purpose flour": { low: 115, high: 130 },
  "bread flour": { low: 120, high: 140 },
  sugar: { low: 190, high: 210 },
  "granulated sugar": { low: 195, high: 210 },
  "brown sugar": { low: 200, high: 230 },
  "powdered sugar": { low: 110, high: 130 },
  butter: { low: 220, high: 235 },
  "olive oil": { low: 210, high: 225 },
  "heavy cream": { low: 235, high: 245 },
  milk: { low: 235, high: 245 },
  "grated parmesan": { low: 80, high: 100 },
  "shredded cheese": { low: 100, high: 125 },
  honey: { low: 330, high: 350 },
  "tomato paste": { low: 245, high: 275 },
  breadcrumbs: { low: 70, high: 90 },
  "almond flour": { low: 85, high: 105 },
  "cocoa powder": { low: 75, high: 95 },
  cornstarch: { low: 120, high: 140 },
  rice: { low: 185, high: 210 },
};

export function validateWeightConversions(ingredients: string[]): string[] {
  const errors: string[] = [];

  for (const ingredient of ingredients) {
    // Match pattern: "1 cup (Xg)" or "1/2 cup (Xg)" etc.
    const match = ingredient.match(/cup\s*\((\d+)\s*g\)/i);
    if (!match) continue;

    const weight = parseInt(match[1], 10);
    const lowerIngredient = ingredient.toLowerCase();

    // Find matching expected weight
    for (const [key, range] of Object.entries(EXPECTED_WEIGHTS)) {
      if (lowerIngredient.includes(key)) {
        if (weight < range.low || weight > range.high) {
          errors.push(
            `"${ingredient.trim()}" — ${weight}g is outside expected range ` +
            `(${range.low}-${range.high}g per cup for ${key})`
          );
        }
        break;
      }
    }
  }

  return errors;
}
```

- [ ] **Step 4: Add equipment mention check function**

Insert after the weight validation function:

```typescript
// ---------------------------------------------------------------------------
// Equipment specification check
// ---------------------------------------------------------------------------

export function checkEquipmentMention(allText: string, contentMarkdown: string): string[] {
  const errors: string[] = [];
  const lowerText = allText.toLowerCase();

  // Check for pan/skillet mention without size
  const panWords = ["skillet", "frying pan", "sauté pan", "saucepan", "pot", "dutch oven"];
  for (const word of panWords) {
    if (lowerText.includes(word)) {
      // Check if a size/number appears near it (within 5 words before)
      const pattern = new RegExp(
        `(\\d{1,2}[-”]?(?:inch|qt|quart|liter|l)|medium|large|small)\\s+${word}|${word}\\s+(\\d{1,2}[-”]?(?:inch|qt|quart|liter|l))`,
        "i"
      );
      // Also check for standalone size mentions
      const hasSize = /\d{1,2}[-”]?(?:inch|qt|quart|liter|l)/i.test(lowerText) ||
                      /\b(?:medium|large|small)\s+(?:skillet|pan|pot|dutch oven)\b/i.test(lowerText);

      // Only flag if this is the PRIMARY pan (mentioned multiple times)
      const mentionCount = (lowerText.match(new RegExp(word, "gi")) || []).length;
      if (mentionCount >= 2 && !hasSize) {
        errors.push(`"${word}" mentioned ${mentionCount}x without size specification`);
      }
    }
  }

  // Check for baking dish without dimensions
  if (lowerText.includes("baking dish") || lowerText.includes("baking pan")) {
    const hasDimension = /\d+\s*[x×]\s*\d+/i.test(lowerText);
    if (!hasDimension) {
      errors.push("Baking dish mentioned without dimensions (e.g., 9×13 inch)");
    }
  }

  // Check for sheet pan without size
  if (lowerText.includes("sheet pan")) {
    const hasSize = /(?:half|quarter|full|18[\sx×]13|13[\sx×]9|9[\sx×]13)\s*(?:sheet|inch)/i.test(lowerText);
    if (!hasSize) {
      errors.push("Sheet pan mentioned without size (e.g., half-sheet, quarter-sheet)");
    }
  }

  return errors;
}
```

- [ ] **Step 5a: Update GateResult type with new reason codes**

Update the `GateResult` interface (lines 11-15 of `lib/quality-gate.ts`):

Old:
```typescript
export interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short" | "banned_words";
  errors?: string[];
}
```

New:
```typescript
export interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short" | "banned_words" | "orphan_ingredients" | "bad_weight" | "missing_equipment";
  errors?: string[];
}
```

- [ ] **Step 5b: Integrate new checks into the `qualityGate` function**

In the `qualityGate` function, add 3 new checks AFTER the banned words check but BEFORE `return { status: "PASS" }`. New check order:

1. Duplicate slug (existing)
2. Food safety (existing)
3. Word count (existing)
4. Banned words (existing)
5. **NEW: Ingredient cross-reference**
6. **NEW: Weight conversion spot-check**
7. **NEW: Equipment mention**

Insert after the banned words check block:

```typescript

  // Check 4: Ingredient Cross-Reference — orphans
  const instructionsText = output.instructions.map((i) => i.text).join(" ");
  const orphanErrors = detectOrphanIngredients(
    output.ingredients,
    instructionsText + " " + output.contentMarkdown,
  );
  if (orphanErrors.length > 0) {
    return {
      status: "BLOCK",
      reason: "orphan_ingredients",
      errors: orphanErrors,
    };
  }

  // Check 5: Weight Conversion Spot-Check
  const weightErrors = validateWeightConversions(output.ingredients);
  if (weightErrors.length > 0) {
    return {
      status: "BLOCK",
      reason: "bad_weight",
      errors: weightErrors,
    };
  }

  // Check 6: Equipment Specification
  const allTextForEquipment = [
    ...output.instructions.map((i) => i.text),
    output.contentMarkdown,
  ].join(" ");
  const equipmentErrors = checkEquipmentMention(allTextForEquipment, output.contentMarkdown);
  if (equipmentErrors.length > 0) {
    return {
      status: "BLOCK",
      reason: "missing_equipment",
      errors: equipmentErrors,
    };
  }
```

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: PASS with no errors. If any errors, fix them before committing.

- [ ] **Step 7: Commit Quality Gate changes**

```bash
git add lib/quality-gate.ts
git commit -m "feat: add 3 new quality gate checks — orphan ingredients, weight conversions, equipment specs"
```

---

### Task 3: Validate Full Pipeline

**Files:**
- Check: `npx tsc --noEmit`
- Check: skill file parses correctly (no markdown syntax errors)

- [ ] **Step 1: Run TypeScript check on full project**

```bash
npx tsc --noEmit
```

Expected: PASS with zero errors.

- [ ] **Step 2: Verify skill file integrity**

```bash
grep -c "^## " skills/chef-augustin-mega.md
```

Expected: The skill should have sections §1 through §7 plus §4A-§4E. Verify no duplicate headers or broken formatting.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final validation — tsc passes, skill v14.1 integrity confirmed

Co-Authored-By: Claude <noreply@anthropic.com>"
```
