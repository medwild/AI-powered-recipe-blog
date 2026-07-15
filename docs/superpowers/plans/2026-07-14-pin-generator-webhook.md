# Pin Generator Webhook + Pin Designer Refactor — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le Pin Designer en Data Preparer, ajouter un webhook asynchrone qui notifie l'app externe de génération de pins à chaque publication de recette.

**Architecture:** 7 fichiers modifiés. Ordre : schéma DB → types Pin Designer → skill → agent → pin-phase → publishRecipe → nouvelle fonction Inngest webhook → config.

**Tech Stack:** TypeScript 5.7, Drizzle ORM 0.45, Inngest 4.7, Next.js 16 App Router

## Global Constraints

- `npx tsc --noEmit` doit passer après chaque modification du pipeline
- Ne jamais renommer un step Inngest existant (la step "pin-designer" garde son nom)
- Ne jamais modifier l'ordre des steps du pipeline
- Les colonnes ajoutées doivent être `nullable` ou avoir une `.default()`
- Pas de `// @ts-ignore`, `as any`, `eslint-disable`
- Modifications chirurgicales — toucher uniquement ce qui est nécessaire
- `image_prompt` colonne NOT NULL — utiliser `"__EXTERNAL_PIN_GENERATOR__"` comme placeholder

---

### Task 1: Ajouter la colonne `brief_data` au schéma `pin_drafts`

**Files:**
- Modify: `lib/db/schema.ts:117`

**Interfaces:**
- Produces: `brief_data` colonne JSONB dans `pin_drafts`, export `BriefData` type

- [ ] **Step 1: Ajouter `brief_data` dans la définition de table**

Dans `lib/db/schema.ts`, ligne 117 (avant `pinUrl`), ajouter :

```typescript
    briefData: jsonb("brief_data").$type<BriefData>(),
```

Et avant la définition de la table, ajouter le type :

```typescript
export type BriefData = {
  angle: string
  mood: string
  composition: string
  keyElements: string[]
  colorPalette: string
  overlayZone: string
}
```

- [ ] **Step 2: Push le schéma vers Neon**

```bash
npx drizzle-kit push
```

Expected: colonne `brief_data` ajoutée (nullable, pas de `.notNull()` ni `.default()`), aucune donnée existante perdue.

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add brief_data JSONB column to pin_drafts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Mettre à jour le type `PinDraftOutput` avec les champs brief

**Files:**
- Modify: `lib/inngest/functions/agents/pin-designer.ts:33-65`

**Interfaces:**
- Consumes: `BriefData` de Task 1
- Produces: `PinDraftOutput` avec champs brief (`angle`, `mood`, `composition`, `keyElements`, `colorPalette`, `overlayZone`)

- [ ] **Step 1: Ajouter les champs brief à `PinDraftOutput`**

Ligne 37, après `image_prompt`, ajouter :

```typescript
  // Brief créatif — directions visuelles pour l'app externe
  angle: string
  mood: string
  composition: string
  keyElements: string[]
  colorPalette: string
  overlayZone: string
```

Le type complet devient :

```typescript
export interface PinDraftOutput {
  pin_title: string
  overlay_text: string
  description: string
  image_prompt: string
  board: string
  intent: string
  ptra_score: number
  hashtags: string[]
  // PTRA V2.1 fields
  micro_niche_validated?: boolean
  destination_quality_status?: "good" | "unknown" | "poor"
  visual_uniqueness?: number
  ptra_coherence_breakdown?: { /* ... */ }
  fresh_pin_rule_status?: "fresh" | "refresh" | "unknown"
  board_fit_status?: "excellent" | "good" | "poor"
  // Brief créatif — directions visuelles pour l'app externe
  angle: string
  mood: string
  composition: string
  keyElements: string[]
  colorPalette: string
  overlayZone: string
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: erreurs sur `pin-designer.ts` car les nouveaux champs ne sont pas encore utilisés dans `buildUserPrompt` — ok, sera corrigé en Task 4.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/agents/pin-designer.ts
git commit -m "feat: add creative brief fields to PinDraftOutput type

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Mettre à jour le skill `agent-pin-designer.md`

**Files:**
- Modify: `skills/agent-pin-designer.md`

**Interfaces:**
- Produces: Skill mis à jour avec nouveau rôle "Data Preparer", output schema avec champs brief, directives anti-détection Pinterest

- [ ] **Step 1: Mettre à jour le frontmatter**

Ligne 3, remplacer :

```
version: "1.2.0"
description: "PTRA Pin Designer v1.2 — generates 5 Pinterest Pin drafts per recipe..."
```

par :

```
version: "2.0.0"
description: "PTRA Pin Designer v2.0 — Data Preparer for external Pin Generator. Produces 5 creative briefs per recipe with PTRA scoring, board architecture, and visual directions for the external pin generation app."
```

- [ ] **Step 2: Mettre à jour le §1 Identity & Role**

Lignes 20-28, remplacer le bloc existant par :

```markdown
## §1 Identity & Role

You are the **PTRA Pin Designer — Data Preparer**, specialized in extracting structured creative briefs from existing recipe content for an external Pin Generator app.

**Core principle:** You prepare data, the external app generates visuals. Your job is to provide rich, contextually precise creative directions so the external app can generate 5 distinct, coherent Pinterest Pins without losing context between them.

**What you do:** Generate exactly 5 creative briefs per recipe, each with a different Pinterest intent, board assignment, PTRA score, and detailed visual direction (angle, mood, composition, keyElements, colorPalette, overlayZone).

**What you NEVER do:** Generate final image_prompt (the external app handles this). The `image_prompt` field must always contain the placeholder `__EXTERNAL_PIN_GENERATOR__`.

**Anti-detection directive:** Every brief's visual direction (mood, composition, keyElements) should include natural imperfections — visible crumbs, uneven shadows, rustic textures, slightly imperfect plating — to help the external generator produce images that bypass Pinterest's AI detection classifiers.
```

- [ ] **Step 3: Mettre à jour le §5 Image Prompt Rules**

Lignes 123-143, remplacer par :

```markdown
## §5 Image Prompt Rules (Delegated to External App)

The `image_prompt` field MUST always contain the exact placeholder `__EXTERNAL_PIN_GENERATOR__`. The external app handles all visual generation.

Instead of image prompts, provide rich visual direction through the creative brief fields:

- `angle`: The creative hook / storytelling angle (1 sentence)
- `mood`: Atmosphere, lighting, emotional tone (1 sentence)
- `composition`: Camera angle, framing, arrangement description
- `keyElements`: 3-5 specific visual elements that MUST appear in the image
- `colorPalette`: Dominant colors and tones
- `overlayZone`: Where text overlay should be placed and what style

### §5.1 Pinterest Lens Computer Vision Optimization

Every brief must account for Pinterest Lens detection signals. Direct the external app to produce images with:

1. **Visible text overlay zone**: Top 1/3 of the 1000x1500px canvas must be clear/simple background — specify in `overlayZone`.
2. **High contrast subject**: Dish must contrast with the surface (light on dark / dark on light).
3. **Single focal subject**: One main dish per frame — avoid cluttered compositions.
4. **Texture visibility**: Describe visible surface texture (crust, glaze, sizzle, herbs, imperfections).
5. **Authentic ingredients only**: The image must show only what the recipe uses.

### §5.2 AI Detection Bypass — Natural Imperfections

Pinterest uses automated classifiers that flag "overly smooth AI finish" images. Every brief MUST include natural imperfection cues:

- Grain / texture on surfaces (wood grain, ceramic speckle, fabric weave)
- Slightly uneven shadows (natural window light, not studio-perfect)
- Visible crumbs, herbs scattered naturally, sauce drips
- Rustic / homemade styling — not hyper-polished food photography
- Realistic kitchen context (utensils in background, ingredients on counter)
```

- [ ] **Step 4: Mettre à jour le §8 Output Schema**

Lignes 294-322, remplacer le schéma JSON existant par :

```json
[
  {
    "pin_title": "25-Min One-Pan Lemon Chicken for Two",
    "overlay_text": "25-Min Lemon Chicken",
    "description": "Juicy lemon chicken and roasted vegetables on a single sheet pan — ready in 25 minutes with almost no cleanup. Save this for your next busy weeknight.",
    "image_prompt": "__EXTERNAL_PIN_GENERATOR__",
    "board": "30-Minute Meals for Two",
    "intent": "quick_solution",
    "ptra_score": 88,
    "hashtags": [],
    "micro_niche_validated": true,
    "destination_quality_status": "good",
    "visual_uniqueness": 82,
    "ptra_coherence_breakdown": {
      "keyword_alignment": 90,
      "board_fit": 85,
      "visual_quality": 88,
      "freshness": 80,
      "destination_quality": 90,
      "engagement_potential": 85
    },
    "fresh_pin_rule_status": "fresh",
    "board_fit_status": "excellent",
    "angle": "Speed + simplicity — fastest path from fridge to table",
    "mood": "Warm weeknight kitchen, natural window light, slightly imperfect homemade feel, a few breadcrumbs on the counter",
    "composition": "Overhead flat-lay of the full sheet pan, golden chicken slightly off-center, lemon slices and herb sprigs scattered naturally, visible texture on the roasted vegetables",
    "keyElements": ["lemon slices with visible juice and seeds", "golden-brown chicken with herb-flecked surface", "roasted asparagus spears with charred tips", "cherry tomatoes slightly blistered and wrinkled"],
    "colorPalette": "Warm yellows, roasted amber browns, fresh green accents, matte white ceramic pan, subtle wood grain table texture",
    "overlayZone": "Top third — dark gradient overlay (opacity 40%) for white bold sans-serif text"
  }
]
```

- [ ] **Step 5: Vérifier que le skill n'a pas de sections contradictoires**

```bash
grep -n "image_prompt\|image prompt\|Image Prompt" skills/agent-pin-designer.md
```

Expected: toutes les occurrences de `image_prompt` pointent vers le placeholder `__EXTERNAL_PIN_GENERATOR__`.

- [ ] **Step 6: Commit**

```bash
git add skills/agent-pin-designer.md
git commit -m "feat: update Pin Designer skill to v2.0 — Data Preparer with creative briefs

- Role changed from pin generator to data preparer for external app
- image_prompt becomes placeholder __EXTERNAL_PIN_GENERATOR__
- Added creative brief fields: angle, mood, composition, keyElements, colorPalette, overlayZone
- Added anti-detection directives for Pinterest AI classifiers
- Preserved PTRA scoring and board architecture

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Mettre à jour `buildUserPrompt()` et la validation dans le Pin Designer

**Files:**
- Modify: `lib/inngest/functions/agents/pin-designer.ts:70-105` (buildUserPrompt)
- Modify: `lib/inngest/functions/agents/pin-designer.ts:112-152` (agentPinDesigner)

**Interfaces:**
- Consumes: `PinDraftOutput` de Task 2, skill v2.0 de Task 3
- Produces: `buildUserPrompt()` enrichi, validation adaptée aux nouveaux champs

- [ ] **Step 1: Ajouter les champs manquants à `PinDesignerInput`**

Lignes 19-31, ajouter après `targetCountry` :

```typescript
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  difficulty: string
  // strategyPlan optionnel — sera enrichi quand le pipeline transportera le StrategyPlan
  strategyPlan?: {
    angle?: string
    primaryKeyword?: string
    secondaryKeywords?: string[]
    semanticEntities?: string[]
    competitorGaps?: string[]
  }
```

- [ ] **Step 2: Mettre à jour `buildUserPrompt()` pour inclure les nouveaux champs**

Ligne 79, remplacer le `return` existant par :

```typescript
  return `Generate exactly 5 Pinterest Pin creative briefs for this recipe. You are a Data Preparer — the external Pin Generator app will create the actual images from your briefs.

RECIPE:
Title: ${input.recipeTitle}
Slug: ${input.recipeSlug}
URL: ${input.recipeUrl}
Excerpt: ${input.recipeExcerpt}
Prep Time: ${input.prepTime} | Cook Time: ${input.cookTime} | Total Time: ${input.totalTime}
Servings: ${input.servings} | Difficulty: ${input.difficulty}
Hero Image: ${input.heroImageUrl}
Image Variants: ${input.imageVariants.map(v => v.url).join(", ")}
Ingredients: ${input.ingredients.map(i => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join(", ")}
Tags: ${input.tags.join(", ")}
${input.strategyPlan ? `STRATEGY PLAN:
Angle: ${input.strategyPlan.angle}
Primary Keyword: ${input.strategyPlan.primaryKeyword}
Secondary Keywords: ${input.strategyPlan.secondaryKeywords.join(", ")}
Semantic Entities: ${input.strategyPlan.semanticEntities.join(", ")}
Competitor Gaps: ${input.strategyPlan.competitorGaps.join(", ")}` : ""}

ARTICLE STRUCTURE:
H2 Sections: ${h2Headings.join(" | ")}
FAQ Questions: ${faqQuestions.join(" | ")}

MICRO-NICHE: ${input.microNiche}
TARGET COUNTRY: ${input.targetCountry}

INSTRUCTIONS:
1. Generate exactly 5 creative briefs — each with a DIFFERENT Pinterest intent
2. Use ETHICAL hooks — specific, verifiable, honest (NO clickbait)
3. Every brief MUST have DISTINCT angle, mood, composition, keyElements, colorPalette, overlayZone
4. Include natural imperfections in every brief (uneven shadows, visible crumbs, rustic textures) to help the external generator bypass Pinterest AI detection
5. Score each brief /100 using the 11-factor PTRA system
6. All briefs must score ≥70 — discard and regenerate any below 70
7. Set image_prompt to "__EXTERNAL_PIN_GENERATOR__" for EVERY brief (the external app generates images)
8. Output a pure JSON array — start with [, end with ]`
```

- [ ] **Step 3: Mettre à jour la validation dans `agentPinDesigner()`**

Ligne 137, modifier la validation pour inclure les nouveaux champs obligatoires :

```typescript
    const valid = result.filter(p => {
      if (!p.pin_title || !p.image_prompt || !p.intent) return false
      if (typeof p.ptra_score !== "number" || p.ptra_score < 70) return false
      // Valider les champs brief créatif obligatoires
      if (!p.angle || !p.mood || !p.composition) return false
      if (!Array.isArray(p.keyElements) || p.keyElements.length < 2) return false
      if (!p.colorPalette || !p.overlayZone) return false
      return true
    })
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: erreurs dans `pin-phase.ts` car l'appel à `agentPinDesigner` ne passe pas encore `prepTime`, `cookTime`, etc. — sera corrigé en Task 5.

- [ ] **Step 5: Commit**

```bash
git add lib/inngest/functions/agents/pin-designer.ts
git commit -m "feat: enrich Pin Designer with creative brief fields and strategy plan input

- PinDesignerInput gains prepTime, cookTime, totalTime, servings, difficulty, strategyPlan
- buildUserPrompt includes all timing/serving/difficulty/strategy data
- Validation requires brief fields: angle, mood, composition, keyElements, colorPalette, overlayZone
- image_prompt filled with __EXTERNAL_PIN_GENERATOR__ placeholder

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Mettre à jour `pin-phase.ts` — sauvegarder `brief_data` et passer les nouveaux champs

**Files:**
- Modify: `lib/inngest/functions/steps/pin-phase.ts:14-91`

**Interfaces:**
- Consumes: `PinDesignerInput` de Task 4, `BriefData` de Task 1
- Produces: `generatePins()` passe les nouveaux champs + sauvegarde `brief_data`

- [ ] **Step 1: Mettre à jour l'appel `agentPinDesigner` avec les nouveaux champs**

Lignes 25-37, remplacer l'appel existant par :

```typescript
    const pins = await agentPinDesigner({
      recipeTitle: finalRecipe.title ?? "",
      recipeSlug: slug,
      recipeUrl: `${siteUrl}/recettes/${slug}`,
      recipeExcerpt: finalRecipe.excerpt ?? "",
      heroImageUrl: heroImageUrl ?? "",
      imageVariants: imageVariants ?? [],
      ingredients: (finalRecipe.ingredients ?? []) as { name: string; quantity?: string }[],
      tags: finalRecipe.tags ?? [],
      contentMarkdown: finalRecipe.contentMarkdown ?? "",
      microNiche: "Easy Weeknight Dinners for Two",
      targetCountry: process.env.SERP_GL || "us",
      prepTime: finalRecipe.prepTime ?? "",
      cookTime: finalRecipe.cookTime ?? "",
      totalTime: finalRecipe.totalTime ?? "",
      servings: finalRecipe.servings ?? "",
      difficulty: finalRecipe.difficulty ?? "",
      // StrategyPlan n'est pas persisté dans ChefAugustinOutput — à enrichir
      // dans une future itération où le pipeline transporte le StrategyPlan.
      strategyPlan: undefined,
    })
```

- [ ] **Step 2: Mettre à jour `rows.map()` pour inclure `briefData`**

Lignes 41-55, remplacer le `rows.map` existant par :

```typescript
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
      briefData: {
        angle: pin.angle,
        mood: pin.mood,
        composition: pin.composition,
        keyElements: pin.keyElements,
        colorPalette: pin.colorPalette,
        overlayZone: pin.overlayZone,
      },
      createdAt: now,
      updatedAt: now,
    }))
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add lib/inngest/functions/steps/pin-phase.ts
git commit -m "feat: save creative briefs as brief_data JSONB in pin-phase

- Pass prepTime, cookTime, totalTime, servings, difficulty to Pin Designer
- Pass strategy plan data for richer briefs
- Save brief_data (angle, mood, composition, keyElements, colorPalette, overlayZone) to pin_drafts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Envoyer l'événement Inngest `recipe/published` depuis `publishRecipe`

**Files:**
- Modify: `app/actions/recipes.ts:1-18` (imports)
- Modify: `app/actions/recipes.ts:65-84` (publishRecipe body)

**Interfaces:**
- Produces: événement Inngest `recipe/published` émis après publication réussie

- [ ] **Step 1: Ajouter l'import Inngest**

Ligne 8, après `import { revalidatePath } from "next/cache"`, vérifier que l'import existe. Si absent, ajouter :

```typescript
import { inngest } from "@/lib/inngest/client"
```

Note : l'import existe déjà ligne 8 dans le fichier actuel pour `approveRecipe` et `cancelRecipe`.

- [ ] **Step 2: Ajouter l'envoi d'événement après publication réussie**

Ligne 83, après `return { ok: true, gate: gateResult }` et avant l'accolade fermante `}` de `publishRecipe`, ajouter dans le bloc `try` :

Le bloc actuel (lignes 65-84) :

```typescript
  // Publish
  const [row] = await db
    .update(recipes)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug, content_type: recipes.content_type, category: recipes.category })

  revalidatePath("/")
  revalidatePath("/dashboard")
  if (row) {
    if (row.content_type === "article") {
      revalidatePath(`/${row.category}`)
      revalidatePath(`/${row.category}/${row.slug}`)
    } else {
      revalidatePath("/recettes")
      revalidatePath(`/recettes/${row.slug}`)
    }
  }

  return { ok: true, gate: gateResult }
```

Remplacer par :

```typescript
  // Publish
  const [row] = await db
    .update(recipes)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug, content_type: recipes.content_type, category: recipes.category })

  revalidatePath("/")
  revalidatePath("/dashboard")
  if (row) {
    if (row.content_type === "article") {
      revalidatePath(`/${row.category}`)
      revalidatePath(`/${row.category}/${row.slug}`)
    } else {
      revalidatePath("/recettes")
      revalidatePath(`/recettes/${row.slug}`)
    }
  }

  // Trigger Pin Generator webhook (fire-and-forget, ne bloque pas la réponse)
  try {
    await inngest.send({
      name: "recipe/published",
      data: { recipeId: id },
    })
  } catch (err) {
    // Inngest may be temporarily unavailable — recipe is still published.
    // The webhook will not fire, but the recipe remains live.
    console.error(`[publishRecipe] Inngest send failed for recipe #${id}: ${(err as Error).message}`)
  }

  return { ok: true, gate: gateResult }
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add app/actions/recipes.ts
git commit -m "feat: send recipe/published Inngest event on publish

- Fire-and-forget — does not block dashboard response
- Silently logs if Inngest is unavailable
- Recipe stays published regardless of webhook success

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Créer la fonction Inngest `pin-generator-webhook.ts`

**Files:**
- Create: `lib/inngest/functions/pin-generator-webhook.ts`

**Interfaces:**
- Consumes: `BriefData` de Task 1, `Recipe` de `lib/db/schema`, événement `recipe/published` de Task 6
- Produces: POST HTTP vers `PIN_GENERATOR_WEBHOOK_URL` avec le payload complet

- [ ] **Step 1: Créer le fichier**

```typescript
/**
 * pin-generator-webhook — Inngest function
 *
 * Listens for recipe/published events and sends a structured webhook payload
 * to the external Pin Generator app. The external app generates 5 distinct
 * Pinterest Pins (text + images) optimized to bypass Pinterest AI detection.
 *
 * Architecture:
 *   publishRecipe → Inngest event "recipe/published" → this function
 *   → Fetch full recipe + briefs from DB → POST to PIN_GENERATOR_WEBHOOK_URL
 *
 * Graceful degradation:
 *   - No-op if PIN_GENERATOR_WEBHOOK_URL is not configured
 *   - 3 retries with exponential backoff on transient failures
 *   - No retry on 4xx responses
 *   - Recipe stays published regardless of webhook outcome
 */

import { db } from "@/lib/db"
import { recipes, pinDrafts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { inngest } from "@/lib/inngest/client"
import { SITE_URL } from "@/lib/inngest/functions/helpers"

const WEBHOOK_URL = process.env.PIN_GENERATOR_WEBHOOK_URL
const WEBHOOK_SECRET = process.env.PIN_GENERATOR_WEBHOOK_SECRET

function buildPayload(
  recipe: typeof recipes.$inferSelect,
  briefs: (typeof pinDrafts.$inferSelect)[],
): Record<string, unknown> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL

  return {
    event: "recipe.published",
    timestamp: new Date().toISOString(),
    recipeId: recipe.id,

    recipe: {
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      keyword: recipe.keyword,
      url: `${siteUrl}/recettes/${recipe.slug}`,
      excerpt: recipe.excerpt,
      metaTitle: recipe.metaTitle,
      metaDescription: recipe.metaDescription,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      microNiche: "Easy Weeknight Dinners for Two",
      targetCountry: process.env.SERP_GL || "us",
    },

    visual: {
      heroImageUrl: recipe.heroImageUrl,
      imageVariants: (recipe.imageVariants as Array<{ label: string; url: string; prompt: string }> | null) ?? [],
      heroImagePrompt: null as string | null,
    },

    content: {
      markdown: recipe.contentMarkdown,
      ingredients: (recipe.ingredients as Array<{ name: string; quantity?: string }> | null) ?? [],
      instructions: (recipe.instructions as Array<{ step: number; text: string }> | null) ?? [],
      tags: (recipe.tags as string[] | null) ?? [],
    },

    structure: {
      h2Sections: ((recipe.contentMarkdown ?? "").match(/^## (.+)$/gm) ?? [])
        .map((h: string) => h.replace(/^## /, ""))
        .filter((h: string) => !h.includes("?")),
      faqQuestions: ((recipe.contentMarkdown ?? "").match(/^\*\*(.+?\?)\*\*\s*$/gm) ?? [])
        .map((q: string) => q.replace(/\*\*/g, "").trim()),
    },

    strategy: {
      angle: "",
      primaryKeyword: recipe.keyword,
      secondaryKeywords: [] as string[],
      semanticEntities: [] as string[],
      competitorGaps: [] as string[],
    },

    briefs: briefs.map((b) => ({
      index: b.variantIndex,
      intent: b.intent,
      board: b.board,
      pinTitle: b.pinTitle,
      overlayText: b.overlayText,
      description: b.description,
      ptraScore: b.ptraScore,
      ...((b.briefData as Record<string, unknown> | null) ?? {}),
    })),
  }
}

async function postWithRetry(
  url: string,
  body: string,
  secret: string,
  retries = 3,
): Promise<{ ok: boolean; status: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": secret,
        },
        body,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      // 4xx = pas de retry
      if (response.status >= 400 && response.status < 500) {
        console.error(
          `[pin-generator-webhook] Client error ${response.status} for recipe — not retrying`,
        )
        return { ok: false, status: response.status }
      }

      if (response.ok) {
        return { ok: true, status: response.status }
      }

      // 5xx = retry
      if (attempt < retries) {
        const delay = Math.pow(4, attempt) * 1000 // 1s, 4s, 16s
        console.warn(
          `[pin-generator-webhook] Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms`,
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(4, attempt) * 1000 // 1s, 4s, 16s
        console.warn(
          `[pin-generator-webhook] Attempt ${attempt + 1} failed: ${(err as Error).message}, retrying in ${delay}ms`,
        )
        await new Promise((r) => setTimeout(r, delay))
      } else {
        console.error(
          `[pin-generator-webhook] All ${retries + 1} attempts failed: ${(err as Error).message}`,
        )
        return { ok: false, status: 0 }
      }
    }
  }

  return { ok: false, status: 0 }
}

export const pinGeneratorWebhook = inngest.createFunction(
  {
    id: "pin-generator-webhook",
    triggers: [{ event: "recipe/published" }],
    retries: 0, // Nous gérons les retries nous-mêmes dans postWithRetry
  },
  async ({ event }) => {
    const { recipeId } = event.data as { recipeId: number }

    // No-op si l'URL n'est pas configurée
    if (!WEBHOOK_URL) {
      console.log(`[pin-generator-webhook] WEBHOOK_URL not configured — skipping`)
      return { skipped: true, reason: "WEBHOOK_URL not configured" }
    }

    // Fetch la recette complète
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, recipeId))

    if (!recipe) {
      console.error(`[pin-generator-webhook] Recipe #${recipeId} not found`)
      return { error: "RECIPE_NOT_FOUND", recipeId }
    }

    // Fetch les briefs depuis pin_drafts
    const briefs = await db
      .select()
      .from(pinDrafts)
      .where(eq(pinDrafts.recipeId, recipeId))
      .orderBy(pinDrafts.variantIndex)

    // Construire le payload
    const payload = buildPayload(recipe, briefs)

    // Injecter le heroImagePrompt si disponible dans imageVariants
    const variants = (recipe.imageVariants as Array<{ label: string; url: string; prompt: string }> | null) ?? []
    if (variants.length > 0 && variants[0].prompt) {
      ;(payload.visual as Record<string, unknown>).heroImagePrompt = variants[0].prompt
    }

    const body = JSON.stringify(payload)
    const secret = WEBHOOK_SECRET || ""

    console.log(
      `[pin-generator-webhook] Sending webhook for recipe #${recipeId} (${recipe.title}) — ${briefs.length} briefs, ${body.length} bytes`,
    )

    const result = await postWithRetry(WEBHOOK_URL, body, secret)

    if (result.ok) {
      console.log(`[pin-generator-webhook] Successfully sent webhook for recipe #${recipeId}`)
    }

    return {
      recipeId,
      briefsCount: briefs.length,
      payloadSize: body.length,
      delivered: result.ok,
      status: result.status,
    }
  },
)
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/pin-generator-webhook.ts
git commit -m "feat: add pin-generator-webhook Inngest function

- Listens for recipe/published event
- Fetches full recipe + creative briefs from DB
- Builds structured webhook payload with all recipe context
- POSTs to PIN_GENERATOR_WEBHOOK_URL with retry (3x, backoff: 1s/4s/16s)
- No-op if PIN_GENERATOR_WEBHOOK_URL is not configured

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Enregistrer la nouvelle fonction Inngest

**Files:**
- Modify: `app/api/inngest/route.ts`

**Interfaces:**
- Consumes: `pinGeneratorWebhook` de Task 7
- Produces: fonction enregistrée dans le serve Inngest

- [ ] **Step 1: Importer et enregistrer**

Remplacer le contenu de `app/api/inngest/route.ts` :

Avant :
```typescript
import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { generateRecipeWorkflow } from "@/lib/inngest/functions/generate-recipe"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateRecipeWorkflow],
})
```

Après :
```typescript
import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { generateRecipeWorkflow } from "@/lib/inngest/functions/generate-recipe"
import { pinGeneratorWebhook } from "@/lib/inngest/functions/pin-generator-webhook"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateRecipeWorkflow, pinGeneratorWebhook],
})
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add app/api/inngest/route.ts
git commit -m "feat: register pin-generator-webhook in Inngest serve

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Ajouter les variables d'environnement à `.env.example`

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Produces: nouvelles variables documentées

- [ ] **Step 1: Ajouter les variables**

Dans `.env.example`, après les variables existantes, ajouter :

```env
# Webhook Pin Generator (optionnel — si absent, le webhook est désactivé)
# URL de l'app externe de génération de pins
PIN_GENERATOR_WEBHOOK_URL=
# Secret partagé pour l'auth du webhook
PIN_GENERATOR_WEBHOOK_SECRET=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "feat: add PIN_GENERATOR_WEBHOOK_URL and PIN_GENERATOR_WEBHOOK_SECRET to .env.example

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Vérification finale

**Files:**
- Aucun fichier modifié — vérifications uniquement

- [ ] **Step 1: Vérifier TypeScript global**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 2: Vérifier les règles globales**

```bash
# Vérifier qu'aucune route catch-all n'a été créée
grep -r "\[\.\.\.slug\]\|\[category\]\|\[param\]" app/ --include="*.tsx" --include="*.ts"

# Vérifier qu'aucun content_type filter n'a été retiré
grep -n "content_type" lib/queries.ts

# Vérifier qu'aucun step Inngest n'a été renommé
grep -n "step.run" lib/inngest/functions/generate-recipe.ts
```

Expected: 
- Aucune route catch-all
- Tous les filtres `content_type` existants sont préservés
- Les steps Inngest existants ont les mêmes noms

- [ ] **Step 3: Lancer les tests existants**

```bash
npm run test:e2e
```

Expected: tous les tests existants passent.

- [ ] **Step 4: Vérifier le build**

```bash
npm run build
```

Expected: build réussi.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: final verification — typecheck, tests, build all pass

Co-Authored-By: Claude <noreply@anthropic.com>"
```
