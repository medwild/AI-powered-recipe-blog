# Pipeline v14 Karpathy Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the AI pipeline from 4 agents + 5 skills + 8 Inngest steps (~3,500 lines) to 1 mega-skill + 1 LLM call + 4 steps (~400 lines) using Claude Opus 4.8 with structured outputs.

**Architecture:** 4 Inngest steps: SERP (code, ~60 lines) → Mega-Skill (1 LLM call, Opus 4.8 + Sonnet 5 fallback) → Quality Gate (code, ~100 lines, 4 binary checks) → Persist + Image (code, ~80 lines). Single skill file `skills/chef-augustin-mega.md` (~200 lines) replaces 5 separate skills. Retry loop with per-reason feedback injected via Inngest `step.invoke()`.

**Tech Stack:** Next.js 16, Drizzle ORM, Inngest, Tailwind CSS 4, Neon PostgreSQL, FLUX-1, Anthropic SDK, Zod, TypeScript.

**Design spec:** `docs/superpowers/specs/2026-07-21-karpathy-pipeline-v14-simplification.md`

## Global Constraints

- `npx tsc --noEmit` must pass after every task
- Never rename an existing Inngest step (Inngest versioning depends on step names)
- `content_type = "recipe"` mandatory on all public recipe queries
- Deleted files in the spec's §5 must be removed in Task 12
- Food safety USDA temps must be validated by code, not by LLM
- No health claims: probiotics, detox, gut health, immune boost, anti-inflammatory, fat-burning, miracle, superfood, cleanse, cure, heal, treat
- Auto-publish in dev (`AUTO_APPROVE=true`), BLOCK'd recipes stay as draft
- Kill switch: `SCIENCE_ENRICHER_ENABLED`, `PIN_DESIGNER_ENABLED`, `IMAGE_GEN_ENABLED` env vars removed (features deleted)

---

### Task 1: Create Zod Schema Contract

**Files:**
- Create: `lib/schemas/recipe-article.ts`

**Interfaces:**
- Produces: `RecipeArticleSchema` (Zod schema), `RecipeArticle` (inferred type), `Ingredient` (string alias), `Instruction` (object type)

- [ ] **Step 1: Create directory and schema file**

```bash
mkdir -p lib/schemas
```

- [ ] **Step 2: Write the Zod schema**

```typescript
// lib/schemas/recipe-article.ts
import { z } from "zod";

export const RecipeArticleSchema = z.object({
  title: z.string().describe("SEO H1, keyword first"),
  metaTitle: z.string().max(60).describe("≤60 chars, keyword first"),
  metaDescription: z.string().min(150).max(160).describe("150-160 chars, actionable"),
  excerpt: z.string().describe("1-2 sentences, hook the reader"),
  contentMarkdown: z.string().describe("Full article in markdown: H2 sections, FAQ, [IMAGE:] placeholders, instructions integrated"),
  ingredients: z.array(z.string()).describe("Each ingredient as 'quantity name, notes' — e.g. '1 cup (140g) all-purpose flour'"),
  instructions: z.array(z.object({
    step: z.number(),
    text: z.string().describe("Step description with temperature and visual cue"),
    duration: z.string().optional(),
    temperature: z.string().optional(),
  })).describe("Step-by-step instructions. Food safety gate scans this array for USDA temps."),
  tags: z.array(z.string()).describe("Keywords, cuisine, technique"),
  prepTime: z.string(),
  cookTime: z.string(),
  totalTime: z.string(),
  servings: z.string().describe("e.g. '2 servings'"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  imagePrompt: z.string().max(120).describe("Food photography prompt, 60-100 words, ≤120"),
  jsonLd: z.object({
    "@context": z.literal("https://schema.org"),
    "@graph": z.array(z.object({
      "@type": z.enum(["Recipe", "BlogPosting", "FAQPage", "BreadcrumbList"]),
    }).passthrough()),
  }).describe("@graph: Recipe + BlogPosting + FAQPage + BreadcrumbList. Validé par eval-recipe.ts, pas par la gate."),
});

export type RecipeArticle = z.infer<typeof RecipeArticleSchema>;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/schemas/recipe-article.ts
git commit -m "feat: add RecipeArticle Zod schema for v14 structured output

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create Quality Gate

**Files:**
- Create: `lib/quality-gate.ts`

**Interfaces:**
- Consumes: `RecipeArticle` from `lib/schemas/recipe-article.ts`, `db` from `@/lib/db`, `recipes` from `@/lib/db/schema`
- Produces: `qualityGate(output: RecipeArticle): Promise<GateResult>`, `GateResult` type, `validateFoodSafety(text: string, ingredients: string[]): string[]`, `detectBannedWords(text: string): string[]`

- [ ] **Step 1: Write the quality gate**

```typescript
// lib/quality-gate.ts
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { RecipeArticle } from "@/lib/schemas/recipe-article";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short" | "banned_words";
  errors?: string[];
}

// ---------------------------------------------------------------------------
// PROTEIN_RULES — USDA food safety temperature matching
// ---------------------------------------------------------------------------

interface ProteinRule {
  keywords: string[];
  temp: string[];
  exclude?: string[];
  rule?: "fda_egg";
}

const PROTEIN_RULES: ProteinRule[] = [
  {
    keywords: ["chicken", "turkey", "duck", "goose", "poultry", "quail", "cornish hen"],
    temp: ["165°F", "74°C"],
    exclude: ["stock", "broth", "powder", "bouillon", "fat", "liver", "gizzard"],
  },
  {
    keywords: ["ground beef", "ground pork", "ground lamb", "ground chicken", "ground turkey",
               "ground meat", "minced beef", "minced pork", "minced lamb"],
    temp: ["160°F", "71°C"],
  },
  {
    keywords: ["pork chop", "pork loin", "pork tenderloin", "pork shoulder", "pork roast",
               "ham", "prosciutto", "serrano ham", "iberico"],
    temp: ["145°F", "63°C"],
    exclude: ["bacon", "pancetta", "guanciale", "lardons", "stock", "broth"],
  },
  {
    keywords: ["steak", "beef", "lamb", "veal", "roast beef", "prime rib", "ribeye",
               "sirloin", "tenderloin", "filet mignon", "strip steak"],
    temp: ["145°F", "63°C"],
  },
  {
    keywords: ["salmon", "tuna", "cod", "halibut", "sea bass", "trout", "mahi mahi",
               "shrimp", "scallop", "lobster", "crab", "mussel", "clam"],
    temp: ["145°F", "63°C"],
  },
  {
    keywords: ["egg", "eggs", "egg yolk", "egg white"],
    temp: [],
    rule: "fda_egg",
  },
];

// ---------------------------------------------------------------------------
// Banned words (AdSense compliance)
// ---------------------------------------------------------------------------

const BANNED_WORDS = [
  "probiotics", "gut health", "immune boost", "detox", "anti-inflammatory",
  "fat-burning", "miracle", "superfood", "cleanse", "cure", "heal", "treat",
  "all-natural", "clinically proven", "scientifically proven",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

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

// ---------------------------------------------------------------------------
// Food safety validation
// ---------------------------------------------------------------------------

export function validateFoodSafety(
  allText: string,
  ingredients: string[],
): string[] {
  const errors: string[] = [];
  const lowerText = allText.toLowerCase();
  const lowerIngredients = ingredients.map((i) => i.toLowerCase()).join(" ");

  for (const rule of PROTEIN_RULES) {
    // Check if any keyword matches in ingredients
    const matchedKeywords = rule.keywords.filter((kw) =>
      lowerIngredients.includes(kw)
    );

    if (matchedKeywords.length === 0) continue;

    // Check excludes
    if (rule.exclude) {
      const excluded = rule.exclude.filter((ex) => lowerIngredients.includes(ex));
      if (excluded.length > 0 && matchedKeywords.every((kw) =>
        rule.exclude!.some((ex) => lowerIngredients.includes(ex))
      )) {
        continue; // All keyword matches are excluded contexts
      }
    }

    // fda_egg rule: check for pasteurized/cooked until firm
    if (rule.rule === "fda_egg") {
      const hasPasteurized = /pasteurized/i.test(lowerText);
      const hasCookedFirm = /cook(ed)? until (yolk and white are )?firm/i.test(lowerText);
      if (!hasPasteurized && !hasCookedFirm) {
        errors.push(
          `Raw egg preparation detected (${matchedKeywords.join(", ")}). ` +
          `Must mention "pasteurized eggs" or "cook until yolk and white are firm" per FDA guidelines.`
        );
      }
      continue;
    }

    // Temperature rule: at least one temp must be mentioned
    if (rule.temp.length > 0) {
      const tempFound = rule.temp.some((t) => lowerText.includes(t.toLowerCase()));
      if (!tempFound) {
        errors.push(
          `Protein "${matchedKeywords.join(", ")}" detected in ingredients ` +
          `but none of the required USDA temperatures found: ${rule.temp.join(", ")}.`
        );
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Banned words detection
// ---------------------------------------------------------------------------

export function detectBannedWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.filter((w) => lowerText.includes(w));
}

// ---------------------------------------------------------------------------
// Quality Gate
// ---------------------------------------------------------------------------

export async function qualityGate(output: RecipeArticle): Promise<GateResult> {
  // Check 0: Duplicate slug
  const slug = slugify(output.title);
  const existing = await db
    .select()
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return { status: "BLOCK", reason: "duplicate", errors: [`Slug "${slug}" exists`] };
  }

  // Check 1: Food Safety — scan BOTH instructions[].text AND contentMarkdown
  const allText = [
    ...output.instructions.map((i) => i.text),
    output.contentMarkdown,
  ].join(" ");
  const foodSafetyErrors = validateFoodSafety(allText, output.ingredients);
  if (foodSafetyErrors.length > 0) {
    return { status: "BLOCK", reason: "food_safety", errors: foodSafetyErrors };
  }

  // Check 2: Word Count minimum
  const wordCount = output.contentMarkdown.split(/\s+/).filter(Boolean).length;
  const minWords = getMinWords(output);
  if (wordCount < minWords) {
    return {
      status: "BLOCK",
      reason: "too_short",
      errors: [`${wordCount} words < ${minWords} minimum`],
    };
  }

  // Check 3: Banned Words
  const bannedWordsFound = detectBannedWords(output.contentMarkdown);
  if (bannedWordsFound.length > 0) {
    return {
      status: "BLOCK",
      reason: "banned_words",
      errors: bannedWordsFound.map((w) => `"${w}" found`),
    };
  }

  return { status: "PASS" };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/quality-gate.ts
git commit -m "feat: add quality gate v14 — 4 binary checks (duplicate, food safety, word count, banned words)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Create Mega-Skill

**Files:**
- Create: `skills/chef-augustin-mega.md`

**Interfaces:**
- Produces: Skill content consumed by `loadSkillContent("chef-augustin-mega", replacements)`

- [ ] **Step 1: Write the mega-skill file**

```markdown
<!-- skills/chef-augustin-mega.md -->
---
id: chef-augustin-mega
version: "1.0.0"
description: "Mega-Skill v14 — Single-pass recipe generation: strategy, writing, SEO, food safety, image prompt. All rules in one file."
model: "claude-opus-4-8"
temperature: none
max_tokens: 32000
last_updated: "2026-07-21"
---

# Chef Augustin — Mega-Skill v14

You generate complete recipe articles in a single pass. Output valid JSON matching the Zod schema exactly.

## §1 CRITICAL — Food Safety + AdSense Compliance

### USDA Temperatures (MANDATORY)
- Poultry (chicken, turkey, duck): **165°F / 74°C**
- Ground meat (beef, pork, lamb): **160°F / 71°C**
- Pork whole muscle: **145°F / 63°C** + rest 3 min
- Beef/lamb whole muscle: **145°F / 63°C**
- Fish/seafood: **145°F / 63°C**
- Eggs: if raw/undercooked (carbonara, mousse, dressing), specify **"use pasteurized eggs"** and cite FDA recommendation.
- Mention USDA temperatures BOTH in the step text AND in the structured temperature field.

### Medium-Rare / Raw Preparation Safety
- For medium-rare steak/salmon/lamb: ALWAYS cite USDA minimum (145°F/63°C) as safety baseline, then mention desired doneness temp. Example: "USDA recommends 145°F for safety; for medium-rare, pull at 130°F and rest 5 min — carryover cooking will bring it to a safe temperature."
- For raw/undercooked egg preparations: specify "use pasteurized eggs" and cite FDA recommendation. Example: "The FDA recommends pasteurized eggs for raw preparations — they're widely available and taste identical."

### AdSense / Health Claims (NEVER USE)
- Never describe a recipe or ingredient as "healthy", "good for you", "nutritious", or "better than [other food]"
- Zero health claims: probiotics, gut health, immune boost, detox, anti-inflammatory, fat-burning, miracle, superfood, cleanse, cure, heal, treat
- No "all-natural", "clinically proven", or "scientifically proven" claims

### Persona Transparency
- You are Chef Augustin Lefèvre — a brand persona, not a fabricated personal history
- Observable cooking insights only. No fake credentials ("tested 200+ times", "20 years in Paris")

## §2 IDENTITY & VOICE

You are **Chef Augustin Lefèvre** — French-trained chef writing for an American audience. Blog: *Dinner for Two — Small-Batch Weeknight Meals for Real Life*. Write ALL content in **English only**.

**Voice**: warm authority, first-person, direct reader address ("I" / "you"). Precise — never approximate. No jargon-stacking, no fake enthusiasm.

## §3 THE 7 HUMAN PATTERNS (use ≥5 per article)

1. **Title → first sentence.** Never separate title from body with a generic opener. NEVER "This recipe is..." or "Today I'm sharing..."
2. **Parentheses = personality.** Use (asides) to whisper details — the parenthetical is where your character lives.
3. **Sign tips with your name.** "Chef Augustin's Tip:" with WHY it works. Never just what to do.
4. **Comment between steps.** Break mechanical Step 1/2/3 rhythm with one personal sentence after each step.
5. **Substitutions come with reassurance.** Explain HOW to compensate, end by saying it'll still work.
6. **Standalone wisdom lines.** Single sentences of culinary truth between sections. No heading, no context.
7. **Close with a scene, not an instruction.** Paint the table. NEVER "Enjoy!" or "Bon appétit!"

## §4 WRITING & CULINARY QUALITY

### Specificity
Be inconveniently specific. "Diamond Crystal kosher salt", not "salt". "The skin is the color of a worn leather satchel", not "golden brown".

### Sensory Verbs
Not "add", "cook", "mix". Use: sizzle, blister, crackle, infuse, slide, work. "Slide the garlic into hot oil and listen for the hiss."

### Culinary Failure
One per article. A technique that went wrong — one sentence, observable, not fabricated.

### Time + Visual Cue
Every timed step gets both: "Sear 8 minutes without moving. The skin releases on its own when ready."

### Source Attributions (≥4 per article)
Weave ≥4 first-person attributions. Each paired with a specific fact/number in the same paragraph. Rotate:
- **Named Authority + Claim**: "Chef Augustin Lefèvre recommends searing chicken skin-side down for exactly 8 minutes — the Maillard reaction doesn't start until 280°F, and moving the meat early tears the skin."
- **First-Person Testing + Cause**: "I've tested this with both stainless steel and cast iron. Cast iron wins every time because it holds 4× more heat."

### Answer Nuggets (≥4 per article)
Place ≥4 self-contained FAQ blocks. Format: `## Specific Question?` followed by a 25-120 word answer containing at least one number or named entity. Distribute across sections — at least one per major H2.

### Precision
- Every temperature in °F AND °C
- Quantities as volume AND weight: "1 cup (140g) flour"
- Sear/deglaze/reduce/braise — not brown/add liquid/thicken

## §5 SEO & STRUCTURE (Google format, 1800-2200 words)

### Before Writing — SERP Analysis
Analyze the provided SERP data. Find ONE thing the top 3 competitors all miss. Make that your angle. State your angle in one sentence before writing — specific, differentiated, not generic.

### Meta Tags
- `metaTitle`: ≤60 chars, keyword first, compelling
- `metaDescription`: 150-160 chars, actionable, include keyword

### H2 Sections (6-8, in order)
Each H2 must have a clear purpose. Required sections:
- Opening / Introduction (state the angle)
- Why This Works (food science behind the technique)
- Ingredients (with notes on why each matters)
- Instructions (step-by-step with Chef's Tips inline)
- What Most Recipes Get Wrong (the gap you identified)
- Chef's Tips & What I've Learned (signed tips, wisdom lines)
- FAQ (5 questions with `## Question?` format)

### FAQ Rules
- 5 Q&A minimum
- Format: `## [Specific Question]?`
- Each answer: 25-120 words, at least one number or named entity
- Questions from real SERP PAA data when available

## §6 IMAGE PROMPT

Generate a food photography prompt for 2:3 (Pinterest). Parts: [Subject/Action/Environment]. [Lighting]. [Camera/Lens]. [Style/Colors].

- Subject < 40 words. Dish named in first 15 words. Minimal plates/surfaces, no hands.
- Lighting: pick ONE (natural window 3500K, dramatic side 3200K, golden hour 3000K, studio softbox 5000K)
- Camera: Sony A7R IV. Lens per dish type (overhead=50mm, 45°=85mm, close-up=100mm macro)
- Total 60-100 words. Never >120.
- Low-visual dishes: photograph ingredients, process shots, or texture close-ups — never a generic hero shot.

## §7 OUTPUT — Follow the Zod schema. Output valid JSON only.

Do NOT include markdown fences, reasoning, or preamble. Start with `{`, end with `}`.
```

- [ ] **Step 2: Verify file is valid (no YAML parsing errors)**

```bash
node -e "const fs = require('fs'); const content = fs.readFileSync('skills/chef-augustin-mega.md','utf8'); const stripped = content.replace(/^---\n[\s\S]*?---\n?/, '').trim(); console.log('Valid skill,', stripped.length, 'chars of content');"
```
Expected: `Valid skill, <N> chars of content`

- [ ] **Step 3: Commit**

```bash
git add skills/chef-augustin-mega.md
git commit -m "feat: add mega-skill v14 — single-pass recipe generation (strategy + writing + SEO + food safety)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Update Provider for Anthropic Structured Outputs

**Files:**
- Modify: `lib/agents/provider.ts`

**Interfaces:**
- Produces: `runWithStructuredOutput<T>(systemPrompt, userPrompt, schema: z.ZodSchema<T>, options?): Promise<T>` — new export
- Consumes: Nothing new

- [ ] **Step 1: Add structured output support to the Anthropic provider**

Read the current `lib/agents/provider.ts` (317 lines). We'll add a new function `runWithStructuredOutput` alongside the existing `runTextAndParseJson`. Open the file:

```bash
# Verify we're editing the right file
wc -l lib/agents/provider.ts
```

- [ ] **Step 2: Add the structured output function**

Add this export after the existing `runTextAndParseJson` function (after line 313):

```typescript
// ---------------------------------------------------------------------------
// Structured Output (Anthropic native — Opus 4.8, Sonnet 5)
// ---------------------------------------------------------------------------

import type { z } from "zod";

/**
 * Calls Claude with structured output (output_config.format).
 * Returns a validated, typed object — no JSON parsing, no retry for malformed
 * JSON needed. The API guarantees schema compliance.
 *
 * Falls back to runTextAndParseJson if the provider is DeepSeek (which doesn't
 * support native structured outputs).
 */
export async function runWithStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  options?: LlmProviderOptions,
): Promise<T> {
  const provider = getProvider();

  // DeepSeek path: use the legacy text + JSON parse approach
  if (!(provider instanceof AnthropicProvider)) {
    console.log("[provider] Structured output not supported — falling back to text+parse");
    return runTextAndParseJson<T>(systemPrompt, userPrompt, options);
  }

  // Anthropic path: native structured output via output_config.format
  const timeoutMs = options?.timeout ?? 300_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const zodToJsonSchema = (zodSchema: z.ZodSchema): Record<string, unknown> => {
    // Simplified — use the SDK's zodOutputFormat in production.
    // This provides the raw JSON Schema for the API call.
    // We inline a basic converter to avoid adding @anthropic-ai/sdk helpers dependency.
    const def = (zodSchema as any)._def;
    if (def?.typeName === "ZodObject") {
      const shape: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(def.shape() as Record<string, any>)) {
        shape[key] = zodFieldToJsonSchema(value);
        if (!(value as any).isOptional?.()) required.push(key);
      }
      return { type: "object", properties: shape, required, additionalProperties: false };
    }
    return { type: "object" };
  };

  const zodFieldToJsonSchema = (field: any): Record<string, unknown> => {
    const def = field._def;
    if (!def) return { type: "string" };
    switch (def.typeName) {
      case "ZodString": return { type: "string", ...(def.checks?.some((c: any) => c.kind === "max") ? { maxLength: def.checks.find((c: any) => c.kind === "max").value } : {}) };
      case "ZodNumber": return { type: "number" };
      case "ZodBoolean": return { type: "boolean" };
      case "ZodArray": return { type: "array", items: zodFieldToJsonSchema(def.type) };
      case "ZodEnum": return { type: "string", enum: def.values };
      case "ZodLiteral": return { type: "string", const: def.value };
      case "ZodObject": {
        const shape: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(def.shape() as Record<string, any>)) {
          shape[k] = zodFieldToJsonSchema(v);
        }
        return { type: "object", properties: shape };
      }
      default: return { type: "string" };
    }
  };

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set.");

    const jsonSchema = zodToJsonSchema(schema);
    const body = {
      model: options?.model ?? "claude-opus-4-8",
      max_tokens: options?.maxTokens ?? 32000,
      system: [
        { type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } },
      ],
      messages: [{ role: "user" as const, content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: jsonSchema,
        },
      },
      thinking: { type: "adaptive" as const, budget_tokens: 4000 },
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const contentBlocks: Array<Record<string, unknown>> = Array.isArray(data?.content)
      ? data.content as Array<Record<string, unknown>>
      : [];
    const textBlock = contentBlocks.find((b) => b.type === "text");
    const out = typeof textBlock?.text === "string" ? textBlock.text as string : "";

    if (out.trim().length === 0) {
      throw new Error("Anthropic returned no text content.");
    }

    const parsed = JSON.parse(out) as T;

    // Validate with Zod client-side (belt and suspenders)
    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.error("[provider] Zod validation failed despite structured output:", result.error.format());
      throw new Error(`Schema validation failed: ${result.error.message}`);
    }

    const cacheRead = (data?.usage as any)?.cache_read_input_tokens ?? 0;
    const cacheCreate = (data?.usage as any)?.cache_creation_input_tokens ?? 0;
    console.log(`[provider] Anthropic ${options?.model ?? "claude-opus-4-8"} structured output — success (${cacheRead > 0 ? `cache HIT (${cacheRead})` : cacheCreate > 0 ? `cache MISS (${cacheCreate})` : "cache n/a"})`);

    return result.data;
  } finally {
    clearTimeout(timer);
  }
}
```

Actually, the inline JSON schema converter is fragile. Let's use a simpler approach — leverage `zod-to-json-schema` or just pass the schema through the Anthropic SDK. Since the project already uses `@anthropic-ai/sdk`, let's check if it's installed:

```bash
npm ls @anthropic-ai/sdk 2>/dev/null || echo "NOT INSTALLED"
```

If NOT INSTALLED, we need to add it. But checking package.json, we might not have it. Let's use a pragmatic approach — the existing provider already works. We just need to add the `output_config.format` parameter to the AnthropicProvider's request body.

**Revised approach**: Instead of a complex zod-to-json-schema converter, add a simpler `runWithStructuredOutput` that:
1. Uses the Anthropic API with `output_config.format`
2. Falls back to `runTextAndParseJson` on other providers

For the json_schema, we'll use `zod-to-json-schema` package or construct it manually. But to avoid adding a dependency, let's use the built-in `z.input` pattern and pass a raw JSON schema object.

Let me simplify: we'll export the JSON schema as a const alongside the Zod schema, and pass it directly.

- [ ] **Step 2: Add structured output function to provider.ts**

After the `runTextAndParseJson` function (line 313), add:

```typescript
// ---------------------------------------------------------------------------
// Structured Output (Anthropic native)
// ---------------------------------------------------------------------------

/**
 * Calls Claude with structured output (output_config.format).
 * The API guarantees schema-compliant JSON — no parsing or retry needed.
 * Falls back to runTextAndParseJson on non-Anthropic providers.
 */
export async function runWithStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, unknown>,
  options?: LlmProviderOptions,
): Promise<T> {
  const provider = getProvider();

  // Non-Anthropic providers: fall back to text + JSON parse
  if (!(provider instanceof AnthropicProvider)) {
    console.log("[provider] Structured output not supported by current provider — falling back to text+parse");
    return runTextAndParseJson<T>(systemPrompt, userPrompt, options);
  }

  const timeoutMs = options?.timeout ?? 300_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for structured output");

    const body = {
      model: options?.model ?? "claude-opus-4-8",
      max_tokens: options?.maxTokens ?? 32000,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{ role: "user" as const, content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: jsonSchema,
        },
      },
      thinking: { type: "adaptive" as const, budget_tokens: 4000 },
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();

      // Fallback to Sonnet 5 on rate limit / overload / server error
      if ((status === 429 || status === 529 || status >= 500) && options?.model !== "claude-sonnet-5") {
        console.warn(`[provider] Opus 4.8 returned ${status} — falling back to claude-sonnet-5`);
        return runWithStructuredOutput<T>(systemPrompt, userPrompt, jsonSchema, {
          ...options,
          model: "claude-sonnet-5",
        });
      }

      throw new Error(`Anthropic API error (${status}): ${text.substring(0, 500)}`);
    }

    const data = await res.json();
    const contentBlocks: Array<Record<string, unknown>> = Array.isArray(data?.content)
      ? data.content as Array<Record<string, unknown>>
      : [];
    const textBlock = contentBlocks.find((b) => b.type === "text");
    const out = typeof textBlock?.text === "string" ? textBlock.text as string : "";

    if (out.trim().length === 0) {
      throw new Error("Anthropic structured output: no text content returned");
    }

    const parsed = JSON.parse(out) as T;

    // Log cache + token usage
    const usage = data?.usage as Record<string, number> | undefined;
    const cacheRead = usage?.cache_read_input_tokens ?? 0;
    const cacheCreate = usage?.cache_creation_input_tokens ?? 0;
    const inputTokens = usage?.input_tokens ?? 0;
    const outputTokens = usage?.output_tokens ?? 0;
    console.log(
      `[provider] Anthropic ${body.model} structured output — success ` +
      `(in:${inputTokens} out:${outputTokens} ${cacheRead > 0 ? `cache HIT(${cacheRead})` : `cache MISS(${cacheCreate})`})`
    );

    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 3: Add AnthropicProvider class check export**

```typescript
// At the end of provider.ts, add:
export { AnthropicProvider };
```

But wait, `AnthropicProvider` is a private class. Let's expose a type check instead:

At the end of the file, add:
```typescript
export function isAnthropicProvider(): boolean {
  return getProvider() instanceof AnthropicProvider;
}
```

Actually, the existing code already does `provider instanceof AnthropicProvider` in the new function. Let's just export the class. Change `class AnthropicProvider` to `export class AnthropicProvider`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/agents/provider.ts
git commit -m "feat: add runWithStructuredOutput — Anthropic native structured output with Sonnet 5 fallback

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Rewrite Chef Augustin Agent for Mega-Skill

**Files:**
- Modify: `lib/inngest/functions/agents/chef-augustin.ts`

**Interfaces:**
- Consumes: `loadSkillContent` from `@/lib/skills`, `runWithStructuredOutput` from `@/lib/agents/provider`, `RecipeArticleSchema` from `@/lib/schemas/recipe-article`
- Produces: `agentChefAugustinMega(params): Promise<RecipeArticle>`

- [ ] **Step 1: Rewrite the agent file**

```typescript
// lib/inngest/functions/agents/chef-augustin.ts
// Agent — Chef Augustin Mega-Skill v14
//
// Single LLM call with structured output (Opus 4.8 primary, Sonnet 5 fallback).
// The mega-skill handles strategy, writing, SEO, food safety, and image prompt
// in one pass. No separate Strategist or Science Enricher needed.
//
// Architecture:
//   System prompt ← loadSkillContent("chef-augustin-mega")
//   Output        ← RecipeArticle via Anthropic structured output

import { loadSkillContent } from "@/lib/skills";
import { runWithStructuredOutput } from "@/lib/agents/provider";
import { RecipeArticleSchema, type RecipeArticle } from "@/lib/schemas/recipe-article";
import { SITE_URL } from "../helpers";

// Re-export for consumers
export type { RecipeArticle };

// Re-export the schema (used by generate-recipe.ts for the user prompt)
export { RecipeArticleSchema };

// JSON Schema representation of RecipeArticleSchema — passed to Anthropic's
// output_config.format. Generated from the Zod schema at module load time.
// We use a simple zod-to-json conversion.
import { z } from "zod";

function zodToJsonSchema(schema: z.ZodObject<any>): Record<string, unknown> {
  const shape = schema._def.shape() as Record<string, z.ZodTypeAny>;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(shape)) {
    properties[key] = fieldToJsonSchema(field);
    if (!(field as any).isOptional?.()) required.push(key);
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function fieldToJsonSchema(field: z.ZodTypeAny): Record<string, unknown> {
  const def = (field as any)._def;
  if (!def) return { type: "string" };

  switch (def.typeName) {
    case "ZodString": {
      const checks = def.checks || [];
      const maxCheck = checks.find((c: any) => c.kind === "max");
      const minCheck = checks.find((c: any) => c.kind === "min");
      const result: Record<string, unknown> = { type: "string" };
      if (maxCheck) result.maxLength = maxCheck.value;
      if (minCheck) result.minLength = minCheck.value;
      if (def.description) result.description = def.description;
      return result;
    }
    case "ZodNumber": return { type: "number" };
    case "ZodBoolean": return { type: "boolean" };
    case "ZodArray":
      return { type: "array", items: fieldToJsonSchema(def.type) };
    case "ZodEnum":
      return { type: "string", enum: def.values };
    case "ZodLiteral":
      return { type: "string", const: def.value };
    case "ZodObject":
      if (def.description?.includes("passthrough")) {
        return { type: "object" }; // passthrough → no strict validation
      }
      const objShape = def.shape() as Record<string, z.ZodTypeAny>;
      const objProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(objShape)) {
        objProps[k] = fieldToJsonSchema(v);
      }
      return { type: "object", properties: objProps };
    default:
      return { type: "string" };
  }
}

// Pre-computed JSON schema for the Anthropic API
export const RECIPE_JSON_SCHEMA = zodToJsonSchema(RecipeArticleSchema);

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface ChefAugustinMegaParams {
  keyword: string;
  cuisine: string;
  cuisineIngredients: string;
  cuisineTechniques: string;
  serpData: string;
  citations: string;
  feedback?: string;
}

export async function agentChefAugustinMega(
  params: ChefAugustinMegaParams,
): Promise<RecipeArticle> {
  const { keyword, cuisine, cuisineIngredients, cuisineTechniques, serpData, citations, feedback } = params;

  try {
    const replacements = {
      cuisine,
      cuisine_ingredients: cuisineIngredients,
      cuisine_techniques: cuisineTechniques,
    };

    const systemPrompt = await loadSkillContent("chef-augustin-mega", replacements);

    let userPrompt = [
      `KEYWORD: ${keyword}`,
      `CUISINE: ${cuisine}`,
      `INGREDIENTS: ${cuisineIngredients}`,
      `TECHNIQUES: ${cuisineTechniques}`,
      ``,
      `## SERP DATA`,
      serpData,
      ``,
      `## AUTHORITATIVE SOURCES (cite 1-2 where contextually relevant)`,
      citations,
    ].join("\n");

    if (feedback) {
      userPrompt += `\n\n---\nQUALITY GATE FEEDBACK (fix these issues):\n${feedback}`;
    }

    userPrompt += `\n\n---\nGenerate a complete ${keyword} recipe article. Follow the mega-skill exactly. Output valid JSON only.`;

    console.log(`[ChefAugustinMega] Calling Opus 4.8 for "${keyword}" (${systemPrompt.length} chars skill, ${userPrompt.length} chars prompt)`);

    const result = await runWithStructuredOutput<RecipeArticle>(
      systemPrompt,
      userPrompt,
      RECIPE_JSON_SCHEMA,
      {
        model: "claude-opus-4-8",
        maxTokens: 32000,
        timeout: 180_000, // 3 min
      },
    );

    console.log(`[ChefAugustinMega] Success — ${result.contentMarkdown?.split(/\\s+/).filter(Boolean).length ?? 0} words, ${result.tags?.length ?? 0} tags`);

    return result;
  } catch (err) {
    throw new Error(
      `[ChefAugustinMega] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    );
  }
}

// Backward-compatible alias for consumers that imported agentChefAugustin
export { agentChefAugustinMega as agentChefAugustin };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: PASS (or fix type errors from zod internals)

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/agents/chef-augustin.ts
git commit -m "feat: rewrite chef-augustin agent for mega-skill v14 — single call with structured output

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Simplify SERP Phase

**Files:**
- Modify: `lib/inngest/functions/steps/serp-phase.ts`

**Interfaces:**
- Consumes: `fetchSerp` from `@/lib/agents/serp`, `appendLog`, `logEntry` from `../helpers`
- Produces: `runSerpPhase(step, recipeId, keyword): Promise<{ serpText: string; degraded: boolean }>`

- [ ] **Step 1: Simplify the SERP phase**

Replace the current content with:

```typescript
// lib/inngest/functions/steps/serp-phase.ts
// Step 1 — SERP Analysis (v14: minimal cleanup, no LLM)
//
// Fetches Google SERP via Serper, extracts titles + snippets top 10,
// PAA questions, and related searches. Formats as plain text for the
// mega-skill user prompt. No structuring, no matching — the LLM does that.

import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchSerp } from "@/lib/agents/serp";
import { logPipelineError } from "@/lib/queries";
import { appendLog, logEntry, generateSyntheticPAA, isRecoverableError } from "../helpers";

export interface SerpPhaseResult {
  serpText: string;
  degraded: boolean;
}

function formatSerpForPrompt(raw: Awaited<ReturnType<typeof fetchSerp>>): string {
  const lines: string[] = [];

  // Top organic results
  lines.push(`Top ${raw.organic.length} Google results:`);
  for (const r of raw.organic.slice(0, 10)) {
    lines.push(`- ${r.title}${r.snippet ? ` | ${r.snippet}` : ""}`);
  }

  // PAA questions
  if (raw.relatedQuestions?.length) {
    lines.push(`\nPeople Also Ask:`);
    for (const q of raw.relatedQuestions.slice(0, 10)) {
      lines.push(`- ${q.question}${q.snippet ? ` → ${q.snippet}` : ""}`);
    }
  }

  // Related searches
  if (raw.relatedSearches?.length) {
    lines.push(`\nRelated Searches: ${raw.relatedSearches.join(", ")}`);
  }

  return lines.join("\n");
}

export async function runSerpPhase(
  step: {
    run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleep: (name: string, dur: string) => Promise<void>;
  },
  recipeId: number,
  keyword: string,
): Promise<SerpPhaseResult> {
  let degraded = false;
  let serpText = "";

  try {
    const raw = await step.run("analyze-serp", async () => {
      await appendLog(recipeId, logEntry("SERP", "running", `Google analysis for "${keyword}"`));

      const result = await fetchSerp(keyword);

      // PAA fallback
      if (!result.relatedQuestions || result.relatedQuestions.length < 2) {
        const syntheticPAA = generateSyntheticPAA(keyword);
        result.relatedQuestions = syntheticPAA.map((q) => ({
          question: q,
          snippet: undefined,
          sourceUrl: undefined,
        }));
        await appendLog(recipeId, logEntry("SERP", "error",
          `No PAA questions — using ${syntheticPAA.length} synthetic fallbacks`));
      }

      // Persist raw SERP to DB
      await db
        .update(recipes)
        .set({ serpData: result as unknown as Record<string, unknown> })
        .where(eq(recipes.id, recipeId));

      await appendLog(recipeId, logEntry("SERP", "done",
        `${result.organic.length} organic, ${result.relatedQuestions.length} PAA`));

      return result;
    }) as Awaited<ReturnType<typeof fetchSerp>>;

    serpText = formatSerpForPrompt(raw);
  } catch (err) {
    if (!isRecoverableError(err as Error)) {
      await logPipelineError({
        recipeId,
        stepName: "analyze-serp",
        errorType: "llm_unavailable",
        message: (err as Error).message,
        severity: "critical",
      });
    }
    throw err;
  }

  await step.sleep("sleep-after-serp", "2s");
  return { serpText, degraded };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/steps/serp-phase.ts
git commit -m "feat: simplify SERP phase v14 — minimal cleanup, plain text for mega-skill

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Rewrite Main Pipeline (generate-recipe.ts)

**Files:**
- Modify: `lib/inngest/functions/generate-recipe.ts`

**Interfaces:**
- Consumes: `runSerpPhase` (step 1), `agentChefAugustinMega` (step 2), `qualityGate` (step 3), `persistDraftForReview`, `waitForApproval`, `runImagePhase` (step 4)
- Produces: `generateRecipeWorkflow` Inngest function

- [ ] **Step 1: Rewrite the main workflow**

```typescript
// lib/inngest/functions/generate-recipe.ts — Pipeline v14 Single-Shot
//
// 4 pipeline steps:
//   1. serp-phase       — Google SERP analysis (Serper API, plain text output)
//   2. mega-skill       — Single LLM call (Opus 4.8 + Sonnet 5 fallback)
//   3. quality-gate     — 4 binary checks (duplicate, food safety, word count, banned words)
//   4. persist+image    — Save to DB, ping sitemap, generate image (non-blocking)
//
// Architecture (v14 Karpathy):
//   - One mega-skill replaces 4 agents. One LLM call does everything.
//   - Structured outputs guarantee valid JSON. No truncation retry needed.
//   - Quality Gate blocks on critical issues (food safety, banned words, too short).
//   - Retry loop with per-reason feedback injected into the LLM call.
//   - Pinterest, Science Enricher, A/B stats removed.

import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logPipelineError } from "@/lib/queries";
import { inngest } from "@/lib/inngest/client";
import { runSerpPhase } from "./steps/serp-phase";
import { agentChefAugustinMega } from "./agents/chef-augustin";
import { qualityGate } from "@/lib/quality-gate";
import type { RecipeArticle } from "./agents/chef-augustin";
import { appendLog, logEntry, isRecoverableError } from "./helpers";
import { persistFinalDraft } from "./steps/persist-phase";
import { runImagePhase } from "./steps/image-phase";

// ---------------------------------------------------------------------------
// Retry strategy (max retries after initial attempt)
// ---------------------------------------------------------------------------

const MAX_RETRIES: Record<string, number> = {
  duplicate: 0,
  food_safety: 1,
  too_short: 1,
  banned_words: 2,
};

function buildFeedback(reason: string, errors: string[]): string {
  switch (reason) {
    case "food_safety":
      return `WARNING: Missing USDA food safety temperatures. ${errors.join(" ")} Fix: mention the required temperatures in both the step text and the structured temperature field.`;
    case "too_short":
      return errors[0];
    case "banned_words":
      return `WARNING: Your previous output contained banned health claims: ${errors.join(" ")}. This is a HARD RULE. Do not use these terms. Rewrite without them.`;
    default:
      return errors.join(" ");
  }
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export const generateRecipeWorkflow = inngest.createFunction(
  {
    id: "generate-recipe",
    triggers: [{ event: "recipe/generate" }],
    concurrency: { key: "generate-recipe-active", limit: 3 },
    throttle: { key: "recipe-generation-throttle", limit: 2, period: "1m" },
    retries: 1,
    cancelOn: [{ event: "recipe/cancel", match: "data.recipeId" }],
  },
  async ({ event, step }) => {
    const { recipeId, keyword, cuisine, cuisineIngredients, cuisineTechniques } = event.data as {
      recipeId: number;
      keyword: string;
      cuisine?: string;
      cuisineIngredients?: string;
      cuisineTechniques?: string;
    };

    const cuisineDefaults = {
      cuisine: cuisine || "Easy Weeknight Dinners for Two",
      cuisineIngredients: cuisineIngredients || "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs",
      cuisineTechniques: cuisineTechniques || "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling",
    };

    let degraded = false;

    try {
      // ── Step 1: SERP ──────────────────────────────────────────────────
      const serpResult = await runSerpPhase(step, recipeId, keyword);
      degraded = degraded || serpResult.degraded;

      // ── Step 2: Content Generation (Mega-Skill with retry loop) ──────
      const article = await step.run("generate-content", async () => {
        await appendLog(recipeId, logEntry("MegaSkill", "running",
          `Generating article for "${keyword}" with Opus 4.8 mega-skill`));

        let attempt = 0;
        let feedback = "";
        let article: RecipeArticle | null = null;
        let gateResult = { status: "BLOCK" as const, reason: undefined as string | undefined, errors: undefined as string[] | undefined };
        let totalAttempts = 1;

        do {
          article = await agentChefAugustinMega({
            keyword,
            ...cuisineDefaults,
            serpData: serpResult.serpText,
            citations: "", // external sources handled by the mega-skill §4
            feedback: feedback || undefined,
          });

          gateResult = await qualityGate(article);

          if (gateResult.status === "BLOCK") {
            const maxRetries = MAX_RETRIES[gateResult.reason!] ?? 0;
            if (attempt < maxRetries) {
              feedback = buildFeedback(gateResult.reason!, gateResult.errors ?? []);
              await appendLog(recipeId, logEntry("QualityGate", "retry",
                `${gateResult.reason}: ${gateResult.errors?.join("; ")} (attempt ${attempt + 1}/${maxRetries})`));
            }
          }
          attempt++;
          totalAttempts = attempt;
        } while (gateResult.status === "BLOCK" && attempt <= (MAX_RETRIES[gateResult.reason!] ?? 0));

        if (gateResult.status === "BLOCK") {
          await appendLog(recipeId, logEntry("QualityGate", "error",
            `BLOCKED (final): ${gateResult.reason} — ${gateResult.errors?.join("; ")} after ${totalAttempts} attempts`));
        } else {
          await appendLog(recipeId, logEntry("QualityGate", "done",
            `PASS — ${article!.contentMarkdown?.split(/\\s+/).filter(Boolean).length ?? 0} words`));
        }

        return { article: article!, gateResult, attempts: totalAttempts };
      }) as { article: RecipeArticle; gateResult: { status: string; reason?: string; errors?: string[] }; attempts: number };

      // ── Step 3: Persist ───────────────────────────────────────────────
      const persistResult = await persistFinalDraft(
        step, recipeId,
        article.article, "", // no heroImageUrl yet
        [], // no imageVariants yet
        keyword, "google", degraded,
      );

      if (persistResult?.blocked || article.gateResult.status === "BLOCK") {
        await appendLog(recipeId, logEntry("Workflow", "done",
          `Content blocked or in draft — skipping image generation`));
        return;
      }

      // ── Step 4: Image (non-blocking) ──────────────────────────────────
      try {
        const imageResult = await runImagePhase(step, recipeId, article.article, keyword);
        if (imageResult.heroImageUrl) {
          await db
            .update(recipes)
            .set({ heroImageUrl: imageResult.heroImageUrl, updatedAt: new Date() })
            .where(eq(recipes.id, recipeId));
        }
      } catch (err) {
        await logPipelineError({
          recipeId,
          stepName: "image-phase",
          errorType: "unknown",
          message: (err as Error).message,
          severity: "warning",
        });
        await appendLog(recipeId, logEntry("Image", "error",
          `Image generation failed (non-blocking): ${(err as Error).message}`));
      }

      await appendLog(recipeId, logEntry("Workflow", "done", "Pipeline v14 complete"));

    } catch (err) {
      if (isRecoverableError(err as Error)) throw err;

      await step.run("handle-pipeline-failure", async () => {
        await logPipelineError({
          recipeId,
          stepName: "generate-recipe",
          errorType: "unknown",
          message: (err as Error).message,
          severity: "critical",
        });

        await db
          .update(recipes)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(recipes.id, recipeId));

        await appendLog(recipeId, logEntry("Workflow", "error",
          `Pipeline failed: ${(err as Error).message.substring(0, 300)}`));
      });
    }
  },
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: May need to fix import paths or type mismatches. Adjust `persistFinalDraft` signature if needed.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/generate-recipe.ts
git commit -m "feat: rewrite generate-recipe.ts for v14 — 4 steps, retry loop, mega-skill

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Simplify Persist Phase

**Files:**
- Modify: `lib/inngest/functions/steps/persist-phase.ts`

**Interfaces:**
- Consumes: `RecipeArticle`, `db`, `recipes`
- Produces: `persistFinalDraft(step, recipeId, output, heroImageUrl, imageVariants, keyword, format, degraded): Promise<{ blocked: boolean } | undefined>`

- [ ] **Step 1: Simplify persist phase — remove internal linking, A/B stats, meta truncation**

Read the current `persist-phase.ts` (456 lines). The task is to simplify it: remove `initVariantStats`, remove internal linking logic, remove `persistDraftForReview`+`waitForApproval` (auto-publish), keep `persistFinalDraft`.

Key changes to `persistFinalDraft`:
- Replace `[IMAGE:]` placeholders with `<img>` tags + alt text (after image URL is known)
- `slugify(title)` for the slug
- Set `content_type = "recipe"` explicitly
- Auto-publish if gate PASS (status = "published"), else "draft"
- Ping Google sitemap after publish
- Remove: meta truncation, banned word scrubbing (the gate blocks now), internal linking

The existing `persist-phase.ts` is complex. The safest approach is to keep the existing `persistFinalDraft` function and simplify it by removing the sections the spec dictates. Let's modify the file rather than rewriting from scratch.

```typescript
// In persistFinalDraft, after the SEO gate, add:
//   slugify: const slug = slugify(output.title)
//   sitemap ping: fetch(`https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml`)
//   [IMAGE:] → <img>: content.replace(/\[IMAGE:\s*(.+?)\]/g, (_, alt) =>
//     `<img src="${heroImageUrl}" alt="${alt.trim()}" loading="lazy" />`)
```

- [ ] **Step 1: Read current file**

```bash
wc -l lib/inngest/functions/steps/persist-phase.ts
```

- [ ] **Step 2: Apply targeted simplifications**

Edit the file to:
1. Remove `initVariantStats` export and its implementation
2. Remove internal linking logic from `persistFinalDraft`
3. Remove meta truncation logic (structured output guarantees maxLength)
4. Remove banned word scrubbing (gate blocks now)
5. Add `[IMAGE:]` → `<img>` replacement
6. Add sitemap ping after publish
7. Set `content_type = "recipe"` explicitly
8. Remove `persistDraftForReview` and `waitForApproval` (auto-publish mode)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/inngest/functions/steps/persist-phase.ts
git commit -m "feat: simplify persist phase v14 — remove internal linking, meta truncation, variant stats. Add sitemap ping, img alt text

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Simplify Image Phase (non-blocking)

**Files:**
- Modify: `lib/inngest/functions/steps/image-phase.ts`

**Interfaces:**
- Consumes: `RecipeArticle`
- Produces: `runImagePhase(step, recipeId, output, keyword): Promise<{ heroImageUrl: string; imageVariants: ImageVariant[]; degraded: boolean }>`

- [ ] **Step 1: Wrap image generation in try/catch (non-blocking)**

The current `image-phase.ts` is 90 lines. The change is minimal — ensure that failures don't crash the workflow. Check that the caller (generate-recipe.ts Step 4) handles the try/catch. The image-phase itself stays the same.

- [ ] **Step 2: Verify caller handles failures**

In `generate-recipe.ts` Step 4, the call to `runImagePhase` is already wrapped in try/catch. Confirm.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/steps/image-phase.ts
git commit -m "feat: image phase v14 — verified non-blocking (try/catch in caller)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Clean Up Helpers

**Files:**
- Modify: `lib/inngest/functions/helpers.ts`

**Interfaces:**
- Keep: `appendLog`, `logEntry`, `isRecoverableError`, `generateSyntheticPAA`, `stripHtmlComments`, `stripBracketTokens`, `buildFallbackImagePrompt`, `logAgentTrace`, `SITE_URL`
- Remove: `withRetryEscalation`, `MAX_EDITOR_PASSES`, `RetryEscalationResult`

- [ ] **Step 1: Remove unused exports**

Remove `withRetryEscalation`, `RetryEscalationResult`, `MAX_EDITOR_PASSES` from the file.

- [ ] **Step 2: Verify no consumers of removed exports**

```bash
grep -r "withRetryEscalation\|MAX_EDITOR_PASSES\|RetryEscalationResult" lib/ --include="*.ts" --include="*.tsx"
```
Expected: Only matches in helpers.ts itself (definitions). If other files reference them, update those files first.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/helpers.ts
git commit -m "feat: clean up helpers v14 — remove unused retry escalation, editor passes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Create eval-recipe.ts Script

**Files:**
- Create: `scripts/eval-recipe.ts`

**Interfaces:**
- Consumes: `agentChefAugustinMega` from agents, `qualityGate` from quality-gate, `fetchSerp` from serp
- Produces: CLI script that generates 10 recipes and logs results

- [ ] **Step 1: Write the eval script**

```typescript
// scripts/eval-recipe.ts
// Eval script v14 — generates 10 recipes with the mega-skill and audits
// each section: food safety, human patterns, attributions, FAQ, JSON-LD.
// Logs token usage for cost estimation.
//
// Usage: npx tsx scripts/eval-recipe.ts

import "dotenv/config";
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin";
import { qualityGate } from "../lib/quality-gate";
import { fetchSerp } from "../lib/agents/serp";
import { formatSerpForPrompt } from "../lib/inngest/functions/steps/serp-phase";
import { generateSyntheticPAA } from "../lib/inngest/functions/helpers";

const KEYWORDS = [
  "Roast chicken for two",
  "Beef bourguignon small batch",
  "Authentic carbonara for two",
  "Pan-seared salmon medium-rare",
  "Vegetarian chickpea curry for two",
  "Caesar salad with homemade dressing",
  "Perfect medium-rare steak for two",
  "Dark chocolate mousse for two",
  "Chicken bacon pasta for two",
  "15-minute garlic shrimp",
];

function auditArticle(article: any, keyword: string): Record<string, string | number | boolean> {
  const content = article.contentMarkdown || "";
  const h2Count = (content.match(/^## /gm) || []).length;
  const faqCount = (content.match(/^## .+\?$/gm) || []).length;
  const tipCount = (content.match(/Chef Augustin'?s Tip/gi) || []).length;
  const parenCount = (content.match(/\([^)]+\)/g) || []).length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    keyword,
    title: article.title?.substring(0, 80),
    wordCount,
    h2Count,
    faqCount,
    tipCount,
    parenCount,
    jsonLdValid: !!article.jsonLd?.["@graph"],
    tags: article.tags?.join(", ") || "none",
  };
}

async function main() {
  console.log("=== Pipeline v14 — eval-recipe.ts ===\n");

  const cuisineDefaults = {
    cuisine: "Easy Weeknight Dinners for Two",
    cuisineIngredients: "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter",
    cuisineTechniques: "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking",
  };

  let passCount = 0;
  let blockCount = 0;
  const results: any[] = [];

  for (const keyword of KEYWORDS) {
    console.log(`\n--- ${keyword} ---`);

    try {
      // Fetch SERP
      const serp = await fetchSerp(keyword);
      if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
        serp.relatedQuestions = generateSyntheticPAA(keyword).map((q) => ({ question: q }));
      }
      const serpText = formatSerpForPrompt(serp);

      // Generate
      const article = await agentChefAugustinMega({
        keyword,
        ...cuisineDefaults,
        serpData: serpText,
        citations: "",
      });

      // Gate
      const gate = await qualityGate(article);
      const audit = auditArticle(article, keyword);

      console.log(`  Gate: ${gate.status}${gate.reason ? ` (${gate.reason})` : ""}`);
      console.log(`  Words: ${audit.wordCount} | H2s: ${audit.h2Count} | FAQ: ${audit.faqCount} | Tips: ${audit.tipCount} | Parens: ${audit.parenCount}`);
      console.log(`  Tags: ${audit.tags}`);
      console.log(`  Title: ${audit.title}`);
      if (gate.errors?.length) {
        console.log(`  Errors: ${gate.errors.join("; ")}`);
      }

      if (gate.status === "PASS") passCount++;
      else blockCount++;

      results.push({ ...audit, gateStatus: gate.status, gateReason: gate.reason, gateErrors: gate.errors });
    } catch (err) {
      console.log(`  ERROR: ${(err as Error).message}`);
      blockCount++;
      results.push({ keyword, error: (err as Error).message });
    }
  }

  console.log(`\n=== Results: ${passCount}/${KEYWORDS.length} PASS, ${blockCount} BLOCK ===`);

  // Summary table
  console.log("\nKeyword,Words,H2s,FAQ,Tips,Gate");
  for (const r of results) {
    console.log(`${r.keyword},${r.wordCount ?? "ERROR"},${r.h2Count ?? "-"},${r.faqCount ?? "-"},${r.tipCount ?? "-"},${r.gateStatus ?? "ERROR"}`);
  }
}

main().catch(console.error);
```

- [ ] **Step 2: Test with a single keyword first**

```bash
npx tsx scripts/eval-recipe.ts 2>&1 | head -100
```
Expected: Generates 10 recipes, logs results. Note: This requires `ANTHROPIC_API_KEY` and `SERPER_API_KEY` set.

- [ ] **Step 3: Commit**

```bash
git add scripts/eval-recipe.ts
git commit -m "feat: add eval-recipe.ts — 10 keyword validation script for v14 mega-skill

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Delete Obsolete Files

**Files:** Delete 25+ files listed in spec §5

- [ ] **Step 1: Delete obsolete skill files**

```bash
rm skills/agent-strategist.md
rm skills/agent-science-enricher.md
rm skills/agent-pin-designer.md
rm skills/agent-chef-augustin.md
```

- [ ] **Step 2: Delete obsolete agent runtimes**

```bash
rm lib/inngest/functions/agents/strategist.ts
rm lib/inngest/functions/agents/science-enricher.ts
rm lib/inngest/functions/agents/pin-designer.ts
```

- [ ] **Step 3: Delete obsolete pipeline steps**

```bash
rm lib/inngest/functions/steps/pin-phase.ts
rm lib/inngest/functions/steps/content-loop-phase.ts
```

- [ ] **Step 4: Delete obsolete validators and scorers**

```bash
rm lib/geo-validator.ts
rm lib/quality-scorer.ts
rm lib/loop-state.ts
rm lib/external-sources.ts
rm lib/content-validator.ts
```

`lib/loop-scorer.ts` is already deleted (per git status).

- [ ] **Step 5: Delete obsolete .claude/rules files**

```bash
rm .claude/rules/ai-pipeline.md
rm .claude/rules/routing-seo.md
rm .claude/rules/api.md
rm .claude/rules/frontend.md
rm .claude/rules/database.md
# Keep: global.md, security.md, karpathy.md, accuracy.md
```

- [ ] **Step 6: Delete obsolete scripts**

```bash
rm -f scripts/analyze-competitor-gaps.ts
rm -f scripts/analyze-cross-channel.ts
rm -f scripts/analyze-topical-coverage.ts
rm -f scripts/build-clusters.ts
rm -f scripts/batch-generate.mjs
```

- [ ] **Step 7: Delete obsolete docs**

```bash
rm -rf docs/archive/
```

- [ ] **Step 8: Verify no broken imports**

```bash
npx tsc --noEmit 2>&1 | head -50
```
Expected: May show errors from remaining files that imported deleted modules. Fix incrementally.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: delete 25+ obsolete files for v14 simplification

Removed: 4 skills, 3 agent runtimes, 2 pipeline steps, 5 validators,
5 rule files, 5 scripts, 10 archived docs.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Update Docs and Config

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/rules/global.md`
- Modify: `package.json`

- [ ] **Step 1: Update CLAUDE.md for v14**

Replace the Pipeline section with:

```markdown
# AI AutoBlog — CLAUDE.md
> MàJ : 2026-07-21 — Pipeline v14 Single-Shot, Opus 4.8, Karpathy simplification

## Pipeline — 4 étapes (v14 Single-Shot Mega-Skill)

```
SERP → Mega-Skill (1 LLM call, Opus 4.8) → Quality Gate (4 checks) → Persist + Image
```

### Mega-Skill Unique — Chef Augustin

| Paramètre | Valeur |
|---|---|
| Modèle primaire | Claude Opus 4.8 |
| Modèle fallback | Claude Sonnet 5 |
| Thinking | Adaptive, budget 4000 tokens |
| Max tokens | 32000 |
| Skill | `skills/chef-augustin-mega.md` |

L'agent unique gère en un seul appel LLM : analyse SERP, structuration, rédaction,
auto-édition, food safety, image prompt, et JSON-LD.

### Quality Gate (code pur)

4 checks binaires dans `lib/quality-gate.ts` :
1. Duplicate slug → BLOCK
2. Food safety USDA temps → BLOCK
3. Word count < seuil → BLOCK
4. Banned words (AdSense) → BLOCK

Retry loop avec feedback injecté via Inngest. Max 2 retries sur banned_words,
1 sur food_safety et too_short. Après échec → draft.

## Règles globales

- **Avant toute modification** : lire `.claude/rules/global.md` — 15 règles absolues NEVER + checklist
- **Après toute modification du pipeline** : `npx tsc --noEmit` obligatoire
- **Ne jamais modifier un skill Markdown** sans vérifier l'agent runtime correspondant
- Les variables d'env sont documentées dans `.env.example` — ne pas les hardcoder
```

- [ ] **Step 2: Update .claude/rules/global.md**

Merge routing-seo.md and database.md key rules into global.md. Remove references to deleted agents (Strategist, Science Enricher, Pin Designer).

- [ ] **Step 3: Clean package.json**

Remove any scripts or dependencies that were only used by deleted files:
- Remove `scripts/batch-generate`, `scripts/analyze-*`, `scripts/build-clusters` from `package.json` scripts
- Check if any npm packages can be removed (unlikely — most are shared)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md .claude/rules/global.md package.json
git commit -m "docs: update CLAUDE.md, global.md, package.json for v14

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: TypeScript Check + Smoke Test

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 2: Fix any remaining import errors**

If files that were deleted are still imported elsewhere, update those imports:
```bash
grep -r "from.*strategist\|from.*science-enricher\|from.*pin-designer\|from.*loop-state\|from.*geo-validator\|from.*quality-scorer\|from.*content-validator\|from.*external-sources" lib/ app/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 3: Run existing tests**

```bash
npm test 2>&1 | tail -20
```
Expected: Existing tests pass. Tests for deleted files will fail — remove them.

- [ ] **Step 4: Delete obsolete test files**

```bash
rm -f __tests__/loop-scorer.test.ts
# Remove any other tests for deleted modules
```

- [ ] **Step 5: Smoke test — generate one recipe**

Trigger via Inngest dev server:
```bash
npx inngest-cli dev &
# Send test event
curl -X POST http://localhost:3000/api/inngest \
  -H "Content-Type: application/json" \
  -d '{"name": "recipe/generate", "data": {"recipeId": 1, "keyword": "Roast chicken for two"}}'
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final v14 cleanup — tsc passes, smoke test ready

Pipeline v14 Karpathy simplification complete.
- ~3,500 → ~400 lines (-89%)
- 2-4 LLM calls → 1 (-75%)
- 8 Inngest steps → 4 (-50%)
- 5 skills → 1 mega-skill
- 11 rule files → 4

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Execution Order

Tasks must run sequentially due to dependencies:
1. Task 1 (Zod schema) — no deps
2. Task 2 (Quality gate) — depends on schema
3. Task 3 (Mega-skill) — no code deps
4. Task 4 (Provider update) — no deps
5. Task 5 (Chef Augustin agent) — depends on schema + provider + skill
6. Task 6 (SERP phase) — no hard deps
7. Task 7 (Main pipeline) — depends on all above
8. Task 8 (Persist phase) — depends on pipeline shape
9. Task 9 (Image phase) — minimal change
10. Task 10 (Helpers cleanup) — after pipeline rewrite
11. Task 11 (eval-recipe) — after agent + gate exist
12. Task 12 (Delete files) — after all new code written
13. Task 13 (Docs update) — after deletions
14. Task 14 (Final check) — last
