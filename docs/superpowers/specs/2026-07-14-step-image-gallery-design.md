# dev.md — Step Image Gallery & Multi-Pin Strategy
> **Projet :** AI AutoBlog (chefaugustin.com)  
> **Feature :** Multi-Image Recipe Steps + Consistency Lock  
> **Date :** 2026-07-13  
> **Version :** 1.0  
> **Auteur :** Peer Review (Kimi + Claude Code)  
> **Statut :** Prêt pour implémentation  
> **Fichier cible :** `lib/inngest/functions/steps/image-phase.ts` (refactor) + nouveaux modules  

---

## 1. Contexte & Motivation

### 1.1 État actuel
Le pipeline v11 génère **une seule image** par recette (hero shot, format 2:3) via Ideogram v4 Turbo ou Cloudflare FLUX-1-Schnell. Cette image sert à la fois de :
- Visuel principal de l'article (hero)
- Source unique pour les 5 pins Pinterest (overlays différents, même image de base)

### 1.2 Données de la niche (juillet 2026)
- **Pinterest domine** : 73% du volume addressable (278K vs 103K recherches/mois)
- **Fresh Pin Rule** : Pinterest pénalise les pins avec des images visuellement identiques
- **Top performers** : 98K–144K saves sur des pins "step-by-step" et "ingredient spotlight"
- **Google** : 88,8% du volume SEO est sur des mots-clés KD 31–35 (inaccessibles à court terme)

### 1.3 Hypothèse
Passer d'une image unique à une **galerie d'images par étape** (3–5 images cohérentes) permettra de :
1. Multiplier par 5 les surfaces de découverte Pinterest (1 pin = 1 image distincte)
2. Augmenter le temps sur page de 45–90s à 2–4 min
3. Créer N ancres visuelles pour la citabilité GEO (LLM-friendly formatting)
4. Améliorer la confiance culinaire ("je vois exactement comment faire")

---

## 2. Concept : Step Image Gallery

### 2.1 Définition
Pour chaque recette, le système génère une **série d'images visuellement cohérentes** où chaque image illustre une étape clé de la préparation. Les images partagent un **Style Lock** (palette, éclairage, assiette, fond) extrait de l'image hero.

### 2.2 Séquence d'images (3 → 5 selon phase)

| # | Nom | Étape mappée | Rôle Pinterest | Rôle UX |
|---|-----|--------------|----------------|---------|
| 0 | `hero` | Recette finie | Pin principal (saves) | Hero article |
| 1 | `prep` | Mise en place | Ingredient Spotlight | Flat lay intro |
| 2 | `sear` | Action chaude (sauté, rôtir) | Step-by-step | Technique démontrée |
| 3 | `simmer` | Cuisson / sauce | Process shot | Texture, temps |
| 4 | `plate` | Dressage final | Before/After | Résultat attendu |
| 5 | `detail` | Gros plan fourchette | Food porn | Engagement émotionnel |

**Phase 1 (PoC) :** 3 images (hero + prep + plate)  
**Phase 2 (MVP) :** 5 images (toutes les étapes ci-dessus)

### 2.3 Différence clé avec l'existant
- **Avant :** 1 prompt LLM → 1 image → 5 pins (overlays texte uniquement)
- **Après :** 1 prompt hero + N prompts d'étape (Style Lock) → N images distinctes → N pins (images réellement différentes, Fresh Pin Rule respectée)

---

## 3. Stratégie & Justification Métier

### 3.1 Pinterest-First
Les données montrent que Pinterest est le canal dominant (73% du volume). La stratégie de contenu doit être inversée : **Pinterest-first, Google-second**.

### 3.2 Fresh Pin Rule
Pinterest détecte et dé-priorise les pins avec des images identiques ou quasi-identiques. Actuellement, 5 pins avec la même image + overlay différent = risque de spam. Avec N images distinctes, chaque pin est un "Fresh Pin" légitime.

### 3.3 SEO / GEO
- **Rich Results :** Schema.org `Recipe` avec `recipeInstructions` peut inclure des images par étape (Google affiche parfois des carrousels d'étapes)
- **GEO Citability :** Chaque image devient une ancre visuelle que les LLMs peuvent décrire et citer ("Step 2 shows golden searing")
- **E-E-A-T :** Visuels de process = signal d'expérience réelle (Experience)

### 3.4 ROI estimé
| Métrique | 1 image | 5 images | Delta |
|----------|---------|----------|-------|
| Coût image/recette | ~$0.05 | ~$0.25 | +$0.20 |
| Coût total/recette | ~$0.30 | ~$0.50 | +$0.20 |
| Surfaces Pinterest | 1 | 5 | ×5 |
| Temps sur page | 60s | 180s | ×3 |
| Taux de sauvegarde Pinterest | baseline | +40-60% (estimé) | — |

---

## 4. Architecture Globale

### 4.1 Vue d'ensemble du flux modifié

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IMAGE PHASE v2                                   │
│                                                                         │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐  │
│  │ Hero Prompt  │───▶│  Style Extractor │───▶│   Style Lock JSON   │  │
│  │ (LLM/Skill)  │    │  (code + vision) │    │  {seed, palette,    │  │
│  └──────────────┘    └──────────────────┘    │   plate, lighting}  │  │
│         │                                    └─────────────────────┘  │
│         │                                          │                   │
│         ▼                                          ▼                   │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐  │
│  │ Hero Image   │───▶│ Step Extractor   │───▶│ Prompt Builder    │  │
│  │ (FLUX-1)     │    │ (code pur)       │    │ (template + LLM   │  │
│  │              │    │ Parse markdown   │    │  light Haiku 4.5) │  │
│  └──────────────┘    │ instructions[]   │    └─────────────────────┘  │
│                      │ → steps[]        │          │                   │
│                      └──────────────────┘          ▼                   │
│                                               ┌──────────────┐        │
│                                               │ Step Prompts │        │
│                                               │ (N prompts)    │        │
│                                               └──────┬───────┘        │
│                                                      │                │
│                              ┌───────────────────────┼──────────────┐│
│                              ▼                       ▼              ││
│                       ┌──────────────┐        ┌──────────────┐     ││
│                       │ Step Images  │        │ Consistency  │     ││
│                       │ (FLUX-1 × N) │───────▶│ Gate (code)  │     ││
│                       │              │        │ {pass, retry,│     ││
│                       └──────────────┘        │  fallback}   │     ││
│                                               └──────────────┘     ││
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 Composants à créer / modifier

| Composant | Type | Fichier | Action |
|-----------|------|---------|--------|
| **Style Extractor** | Nouveau | `lib/image/style-extractor.ts` | Extraire le Style Lock de l'image hero ou du prompt |
| **Step Extractor** | Nouveau | `lib/image/step-extractor.ts` | Parser `instructions[]` → actions + ingrédients par étape |
| **Prompt Builder** | Nouveau | `lib/image/prompt-builder.ts` | Générer N prompts d'étape à partir du Style Lock |
| **Consistency Gate** | Nouveau | `lib/image/consistency-gate.ts` | Valider la cohérence visuelle entre images |
| **Image Phase v2** | Modifier | `lib/inngest/functions/steps/image-phase.ts` | Orchestrer le flux multi-image |
| **Pin Phase v2** | Modifier | `lib/inngest/functions/steps/pin-phase.ts` | Générer 1 pin par image (N pins) |
| **Skill Chef Augustin** | Modifier | `skills/agent-chef-augustin.md` | Mettre à jour §6 Image Prompt pour galerie |
| **Skill Pin Designer** | Modifier | `skills/agent-pin-designer.md` | Adapter à N images distinctes |

---

## 5. Spécification Technique

### 5.1 Interfaces TypeScript

```typescript
// lib/image/types.ts

interface StyleLock {
  seed: number;                    // Seed FLUX partagé (ou embedding ref)
  colorPalette: string[];          // 4-5 couleurs dominantes (hex)
  plateType: string;               // "ceramic_white_round", "cast_iron_skillet"
  lighting: string;                // "warm_side_45deg", "soft_overhead"
  background: string;              // "rustic_wooden_table", "marble_counter"
  aspectRatio: "2:3";             // Pinterest standard
  mood: string;                    // "rustic_comfort", "modern_minimal"
  lens: string;                    // "shallow_dof", "macro", "overhead"
}

interface RecipeStep {
  index: number;                   // 0-based
  action: string;                  // "sear", "simmer", "chop", "plate"
  instruction: string;             // Texte brut de l'étape
  ingredients: string[];           // Ingrédients impliqués dans cette étape
  duration?: string;               // "4 minutes", "until golden"
  temperature?: string;            // "medium-high heat", "375°F"
}

interface StepImagePrompt {
  stepIndex: number;
  prompt: string;                  // Prompt complet pour FLUX/Ideogram
  negativePrompt?: string;
  angle: "overhead" | "45deg" | "closeup" | "hero" | "macro";
  purpose: "prep" | "action" | "process" | "plate" | "detail";
}

interface GeneratedStepImage {
  stepIndex: number;
  url: string;                     // Cloudinary URL
  publicId: string;
  consistencyScore: number;        // 0-100 (gate interne)
  passedGate: boolean;
}

interface ImagePhaseResult {
  heroImage: string;
  stepImages: GeneratedStepImage[];
  styleLock: StyleLock;
  pinImages: string[];             // Toutes les images utilisables pour pins
}
```

### 5.2 Style Extractor (`lib/image/style-extractor.ts`)

**Option A — Extraction du prompt hero (recommandée pour PoC)**
Parser le `imagePrompt` généré par Chef Augustin pour en extraire les éléments de style.

```typescript
export function extractStyleLock(imagePrompt: string, seed: number): StyleLock {
  // Regex / NLP léger pour extraire :
  // - plate type ("ceramic white plate", "cast iron skillet")
  // - lighting ("warm side lighting", "soft natural light")
  // - background ("rustic wooden table", "marble countertop")
  // - angle ("top-down", "45-degree angle", "close-up")
  // - mood ("cozy", "rustic", "elegant")

  return {
    seed,
    colorPalette: extractDominantColors(imagePrompt), // Heuristique ou LLM light
    plateType: extractPlateType(imagePrompt),
    lighting: extractLighting(imagePrompt),
    background: extractBackground(imagePrompt),
    aspectRatio: "2:3",
    mood: extractMood(imagePrompt),
    lens: extractLens(imagePrompt),
  };
}
```

**Option B — Vision API (Phase 2)**
Uploader l'image hero générée vers une API vision (Cloudinary AI, OpenAI Vision, ou Gemini) pour extraire la palette réelle.

### 5.3 Step Extractor (`lib/image/step-extractor.ts`)

Parser le `instructions[]` du `ChefAugustinOutput` pour identifier les étapes clés et leurs attributs.

```typescript
export function extractSteps(
  instructions: string[],
  ingredients: string[]
): RecipeStep[] {
  // Mapping sémantique simple
  const stepMap: Record<string, Partial<RecipeStep>> = {
    "prep": { action: "prep", angle: "overhead" },
    "chop": { action: "prep", angle: "overhead" },
    "season": { action: "prep", angle: "closeup" },
    "sear": { action: "sear", angle: "45deg" },
    "sauté": { action: "sear", angle: "45deg" },
    "simmer": { action: "simmer", angle: "45deg" },
    "boil": { action: "simmer", angle: "45deg" },
    "bake": { action: "simmer", angle: "overhead" },
    "plate": { action: "plate", angle: "hero" },
    "garnish": { action: "plate", angle: "hero" },
    "serve": { action: "plate", angle: "hero" },
  };

  return instructions.map((instruction, index) => {
    const lower = instruction.toLowerCase();
    const matchedAction = Object.keys(stepMap).find(k => lower.includes(k)) || "process";
    const matchedIngredients = ingredients.filter(ing => lower.includes(ing.toLowerCase()));

    return {
      index,
      action: stepMap[matchedAction]?.action || "process",
      instruction,
      ingredients: matchedIngredients,
      // Extraction regex pour duration/temp
      duration: extractDuration(lower),
      temperature: extractTemperature(lower),
    };
  });
}
```

### 5.4 Prompt Builder (`lib/image/prompt-builder.ts`)

**Template-based (code pur) + LLM light optionnel**

```typescript
export function buildStepPrompt(
  styleLock: StyleLock,
  step: RecipeStep,
  heroPrompt: string
): StepImagePrompt {
  const templates: Record<string, string> = {
    prep: `Overhead flat lay, {ingredients} arranged on {background}, small prep bowls, {lighting}, {mood} food photography, {plateType} visible in corner, {lens}, 2:3 aspect ratio`,
    sear: `Close-up action shot, {ingredients} sizzling in {plateType}, steam rising, {lighting}, {mood}, motion blur on spatula, {lens}, 2:3 aspect ratio`,
    simmer: `Medium shot, {plateType} with bubbling sauce and {ingredients}, wooden spoon stirring, {lighting}, {mood}, {lens}, 2:3 aspect ratio`,
    plate: `Hero angle, final plated dish on {plateType}, {ingredients} beautifully arranged, {lighting}, {mood}, {lens}, 2:3 aspect ratio`,
    detail: `Extreme close-up, fork cutting into {ingredients}, sauce dripping, texture visible, {lighting}, {mood}, {lens}, 2:3 aspect ratio`,
  };

  const template = templates[step.action] || templates["process"];

  const prompt = template
    .replace("{ingredients}", step.ingredients.join(", "))
    .replace("{background}", styleLock.background)
    .replace("{lighting}", styleLock.lighting)
    .replace("{mood}", styleLock.mood)
    .replace("{plateType}", styleLock.plateType)
    .replace("{lens}", styleLock.lens);

  return {
    stepIndex: step.index,
    prompt,
    angle: getAngleForAction(step.action),
    purpose: step.action as StepImagePrompt["purpose"],
  };
}
```

**LLM Light option (Haiku 4.5) :** Si le template produit des prompts trop génériques, appeler Haiku 4.5 avec :
```
System: You are a food photography prompt engineer. 
Given a style lock and a recipe step, write a detailed FLUX-1 prompt.
Rules: Keep the style lock elements. Add specific culinary action verbs. 
Max 150 tokens. Output JSON only.
```

### 5.5 Consistency Gate (`lib/image/consistency-gate.ts`)

```typescript
interface ConsistencyCheck {
  pass: boolean;
  score: number;        // 0-100
  issues: string[];
  retryRecommended: boolean;
}

export async function consistencyGate(
  heroImageUrl: string,
  stepImages: GeneratedStepImage[],
  styleLock: StyleLock
): Promise<ConsistencyCheck> {
  // Phase 1 (PoC) — Heuristique basée sur les prompts
  // Vérifier que tous les prompts contiennent les mots-clés du Style Lock
  const checks = stepImages.map(img => {
    const prompt = img.prompt || "";
    const hasBackground = prompt.includes(styleLock.background);
    const hasLighting = prompt.includes(styleLock.lighting);
    const hasPlate = prompt.includes(styleLock.plateType);
    const hasAspect = prompt.includes("2:3") || prompt.includes("vertical");
    return { hasBackground, hasLighting, hasPlate, hasAspect };
  });

  const allPass = checks.every(c => c.hasBackground && c.hasLighting && c.hasPlate && c.hasAspect);
  const score = allPass ? 85 : 60;

  return {
    pass: allPass,
    score,
    issues: allPass ? [] : ["Style lock keywords missing in step prompts"],
    retryRecommended: !allPass,
  };
}

// Phase 2 (MVP) — Vision API
// Comparer la palette couleur réelle des images (histogramme LAB)
// Rejeter si delta-E > 15 entre hero et step
```

### 5.6 Modification Image Phase (`image-phase.ts`)

```typescript
// lib/inngest/functions/steps/image-phase.ts

export async function imagePhase(ctx: InngestContext, recipe: Recipe): Promise<ImagePhaseResult> {
  const { IMAGE_VARIANT_COUNT = 1, STEP_IMAGE_COUNT = 3 } = process.env;

  // 1. Générer l'image hero (existant)
  const heroImage = await generateHeroImage(recipe.imagePrompt);

  // 2. Extraire le Style Lock
  const styleLock = extractStyleLock(recipe.imagePrompt, heroImage.seed);

  // 3. Extraire les étapes
  const steps = extractSteps(recipe.instructions, recipe.ingredients);

  // 4. Sélectionner N étapes clés (selon STEP_IMAGE_COUNT)
  const selectedSteps = selectKeySteps(steps, parseInt(STEP_IMAGE_COUNT));

  // 5. Builder les prompts
  const stepPrompts = selectedSteps.map(step => buildStepPrompt(styleLock, step, recipe.imagePrompt));

  // 6. Générer les images en parallèle
  const stepImages = await Promise.all(
    stepPrompts.map(async (sp) => {
      const img = await generateImage(sp.prompt, { seed: styleLock.seed + sp.stepIndex });
      return { ...img, stepIndex: sp.stepIndex, prompt: sp.prompt };
    })
  );

  // 7. Consistency Gate
  const gate = await consistencyGate(heroImage.url, stepImages, styleLock);

  if (!gate.pass && gate.retryRecommended) {
    // Retry 1 fois avec seed+100
    const retryImages = await Promise.all(
      stepPrompts.map((sp, i) => generateImage(sp.prompt, { seed: styleLock.seed + 100 + i }))
    );
    // Re-test gate
  }

  // 8. Upload Cloudinary
  const uploaded = await uploadToCloudinary([heroImage, ...stepImages]);

  // 9. Retourner le résultat enrichi
  return {
    heroImage: uploaded[0].url,
    stepImages: uploaded.slice(1).map((u, i) => ({
      stepIndex: stepImages[i].stepIndex,
      url: u.url,
      publicId: u.publicId,
      consistencyScore: gate.score,
      passedGate: gate.pass,
    })),
    styleLock,
    pinImages: uploaded.map(u => u.url),
  };
}

function selectKeySteps(steps: RecipeStep[], count: number): RecipeStep[] {
  if (steps.length <= count) return steps;

  // Sélection stratégique : toujours inclure prep et plate
  const prep = steps.find(s => s.action === "prep") || steps[0];
  const plate = steps.find(s => s.action === "plate") || steps[steps.length - 1];
  const middle = steps.filter(s => s.action !== "prep" && s.action !== "plate");

  // Interpolation pour remplir le count
  const selected = [prep];
  const interval = Math.max(1, Math.floor(middle.length / (count - 2)));
  for (let i = 0; i < count - 2 && i * interval < middle.length; i++) {
    selected.push(middle[i * interval]);
  }
  selected.push(plate);

  return selected.slice(0, count);
}
```

### 5.7 Modification Pin Phase (`pin-phase.ts`)

```typescript
// lib/inngest/functions/steps/pin-phase.ts

export async function pinPhase(ctx: InngestContext, recipe: Recipe, imageResult: ImagePhaseResult): Promise<PinDraft[]> {
  const { pinImages } = imageResult; // [hero, step1, step2, ...]

  // Générer 1 pin par image disponible
  const pins = await Promise.all(
    pinImages.map(async (imageUrl, index) => {
      const pinDraft = await generatePinDraft({
        recipe,
        imageUrl,
        pinIndex: index,
        totalPins: pinImages.length,
        // Intent mapping selon l'index
        intent: getPinIntent(index), // quick_solution, step_by_step, etc.
      });
      return pinDraft;
    })
  );

  return pins;
}

function getPinIntent(index: number): string {
  const intents = [
    "quick_solution",      // hero → "30-min dinner"
    "ingredient_spotlight", // prep → "Mise en place"
    "step_by_step",      // sear → "How to sear"
    "before_after",      // plate → "Before/After"
    "budget_friendly",     // detail → "Cheap & delicious"
  ];
  return intents[index] || "quick_solution";
}
```

---

## 6. Intégration avec le Pipeline Existant

### 6.1 Changements dans `ChefAugustinOutput`

Ajouter au JSON schema :
```json
{
  "imagePrompt": "...",
  "stepImages": [        // NOUVEAU
    {
      "stepIndex": 0,
      "purpose": "prep",
      "description": "Overhead flat lay of mise en place"
    }
  ],
  "jsonLd": { ... }
}
```

### 6.2 Changements dans le skill Chef Augustin (`skills/agent-chef-augustin.md`)

**§6 Image Prompt (modifier)**
```markdown
## §6 Image Prompts

For each recipe, generate:
1. **Hero Image Prompt** — Final plated dish, 2:3 aspect ratio, professional food photography
2. **Step Image Prompts** — For each key step (prep, sear, simmer, plate), generate a prompt that:
   - References the SAME style elements as the hero (lighting, plate, background)
   - Uses action verbs specific to the culinary technique
   - Specifies the optimal camera angle for that step
   - Maintains 2:3 aspect ratio

Style Lock elements to repeat across all prompts:
- Plate type: [extract from hero]
- Lighting: [extract from hero]
- Background: [extract from hero]
- Mood: [extract from hero]
```

### 6.3 Changements dans le skill Pin Designer (`skills/agent-pin-designer.md`)

**§5 Fresh Pin Rule (modifier)**
```markdown
## §5 Fresh Pin Rule

Each of the N pins for a recipe MUST use a visually distinct image:
- Pin 1: Hero shot (final dish)
- Pin 2: Prep flat lay (ingredients)
- Pin 3: Action shot (cooking process)
- Pin 4: Plated hero (serving suggestion)
- Pin 5: Detail close-up (texture/texture)

Images must be visually distinct, not just text overlays on the same photo.
```

---

## 7. Plan d'Implémentation

### Phase 0 — Sécurité & Fondations (Avant tout)
- [ ] **USDA CRITICAL tier** : Modifier `validateFoodSafety()` → `severity: "error"` pour températures dangereuses
- [ ] **Judge → Sonnet 4.6** : Ou réduire poids à 20% / augmenter GEO à 50%
- [ ] **Corriger coût** : Mettre à jour docs avec $0.30/recette (pas $0.15)

### Phase 1 — PoC (2-4h)
- [ ] Créer `lib/image/types.ts` avec les interfaces
- [ ] Implémenter `extractStyleLock()` (parser prompt hero, pas vision API)
- [ ] Implémenter `extractSteps()` (mapping sémantique basique)
- [ ] Implémenter `buildStepPrompt()` (template-based, pas LLM)
- [ ] Modifier `image-phase.ts` pour générer 3 images (hero + 2 steps)
- [ ] Implémenter `consistencyGate()` v1 (check mots-clés dans prompts)
- [ ] **Test manuel** : 1 recette, vérifier cohérence visuelle des 3 images
- [ ] **Décision go/no-go** : Les images sont-elles cohérentes ?

### Phase 2 — MVP (4-8h)
- [ ] Passer à 5 images (ajouter sear, simmer, detail)
- [ ] Implémenter `selectKeySteps()` pour interpolation intelligente
- [ ] Ajouter LLM light (Haiku 4.5) pour enrichir les prompts si templates insuffisants
- [ ] Consistency Gate v2 : comparaison de palettes (vision API ou histogramme)
- [ ] Modifier `pin-phase.ts` pour 1 pin = 1 image (N pins par recette)
- [ ] Mettre à jour les skills (Chef Augustin §6, Pin Designer §5)
- [ ] **Test** : 5 recettes, mesurer coût total et cohérence

### Phase 3 — Production (2-4h)
- [ ] Ajouter `STEP_IMAGE_COUNT` dans les variables d'environnement
- [ ] Fallback robuste : si gate échoue 3× → générer text overlay sur hero
- [ ] Logging : `self_improvement_logs` pour tracker style drift
- [ ] A/B test : recettes avec 1 image vs 5 images (temps sur page, saves Pinterest)
- [ ] Documentation : mettre à jour `dev.md` avec les learnings

---

## 8. Testing & Validation

### 8.1 Consistency Gate Tests

```typescript
// tests/image/consistency-gate.test.ts

describe("consistencyGate", () => {
  it("should PASS when all prompts contain style lock keywords", () => {
    const styleLock = { background: "rustic wooden table", lighting: "warm side" };
    const steps = [
      { prompt: "...rustic wooden table...warm side..." },
      { prompt: "...rustic wooden table...warm side..." },
    ];
    expect(consistencyGate("", steps, styleLock).pass).toBe(true);
  });

  it("should FAIL when a prompt misses the plate type", () => {
    const styleLock = { plateType: "ceramic white plate" };
    const steps = [
      { prompt: "...ceramic white plate..." },
      { prompt: "...glass bowl..." }, // mismatch
    ];
    expect(consistencyGate("", steps, styleLock).pass).toBe(false);
  });
});
```

### 8.2 Métriques de succès (à mesurer post-lancement)

| Métrique | Baseline (1 image) | Cible (5 images) | Outil de mesure |
|----------|-------------------|------------------|-----------------|
| Temps sur page | 60-90s | 180-240s | Google Analytics 4 |
| Taux de rebond | 70% | <60% | Google Analytics 4 |
| Saves Pinterest / recette | 10-50 | 50-200 | Pinterest Analytics |
| Impressions Pinterest / pin | baseline | +200% | Pinterest Analytics |
| Coût image / recette | $0.05 | $0.25 | API billing |
| Temps de génération | 15s | 45s | Inngest logs |

---

## 9. Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Style drift (images incohérentes) | Moyenne | Haute | Consistency Gate + retry + fallback overlay |
| Coût image ×5 dépasse budget | Certaine | Moyenne | Commencer avec 3 images ($0.15), scaler progressivement |
| Latence ×5 (5 appels FLUX) | Certaine | Moyenne | Parallelize avec `Promise.all`, timeout 120s |
| FLUX seed non déterministe | Moyenne | Haute | Utiliser image-to-image reference (strength 0.3) au lieu de seed |
| Pinterest détecte "same recipe, different crop" | Faible | Haute | Fresh Pin Rule : visuels réellement distincts (angle, action, zoom) |
| User scroll fatigue (trop d'images) | Moyenne | Moyenne | Lazy load + "Jump to Recipe" + collapsible gallery |
| Cloudinary coût de stockage ×5 | Certaine | Faible | Images optimisées WebP, taille 800×1200px max |

---

## 10. Variables d'Environnement

```bash
# Image Phase Configuration
IMAGE_VARIANT_COUNT=1              # A/B variants (conservé)
STEP_IMAGE_COUNT=3                 # 3 (PoC) → 5 (MVP)
IMAGE_MAX_RETRIES=3                # Retry par image
CONSISTENCY_THRESHOLD=80           # Score min pour passer le gate

# Style Lock
STYLE_LOCK_METHOD=prompt           # "prompt" (PoC) → "vision" (MVP)
VISION_API_PROVIDER=cloudinary     # ou "openai", "gemini"

# Pin Phase
PINS_PER_RECIPE=5                  # 1 pin = 1 image
PIN_INTENT_ROTATION=true           # Mapper chaque pin à un intent différent

# Feature Flag
ENABLE_STEP_IMAGES=true            # Toggle pour rollback rapide
```

---

## 11. Checklist Claude Code — Action Items

### Immédiat (P0)
- [ ] Lire `lib/inngest/functions/steps/image-phase.ts` existant
- [ ] Lire `skills/agent-chef-augustin.md` §6
- [ ] Lire `lib/geo-validator.ts` et `lib/content-validator.ts` (USDA temps)

### Fondations (P0.5)
- [ ] Modifier `validateFoodSafety()` → `severity: "error"` pour USDA violations
- [ ] Modifier `loop-scorer.ts` : Judge 40% → 20%, GEO 30% → 50%
- [ ] Modifier `judge.ts` : passer model à Sonnet 4.6 (ou documenter la décision)

### PoC Step Images (P1)
- [ ] Créer `lib/image/types.ts`
- [ ] Créer `lib/image/style-extractor.ts` (Option A : parser prompt)
- [ ] Créer `lib/image/step-extractor.ts` (mapping sémantique)
- [ ] Créer `lib/image/prompt-builder.ts` (templates)
- [ ] Créer `lib/image/consistency-gate.ts` (v1 : check mots-clés)
- [ ] Modifier `image-phase.ts` : intégrer les 4 modules, générer 3 images
- [ ] Modifier `pin-phase.ts` : 1 pin par image (3 pins pour PoC)
- [ ] **Test** : générer 1 recette complète, inspecter visuellement les 3 images

### Post-PoC (si validation visuelle OK)
- [ ] Passer `STEP_IMAGE_COUNT` à 5
- [ ] Ajouter `selectKeySteps()` pour interpolation intelligente
- [ ] Implémenter LLM light (Haiku 4.5) pour enrichissement de prompts
- [ ] Mettre à jour `skills/agent-chef-augustin.md` §6
- [ ] Mettre à jour `skills/agent-pin-designer.md` §5 (Fresh Pin Rule)
- [ ] Ajouter tests unitaires pour `step-extractor` et `consistency-gate`
- [ ] Documenter les learnings dans `docs/step-image-gallery.md`

---

## 12. Références

- **Rapport de maturité** : `docs/rapport-maturite-ai-autoblog-2026-07-13.md`
- **Analyse données** : `docs/strategic-launch-analysis-2026-07-13.md` (Kimi)
- **Skill Chef Augustin** : `skills/agent-chef-augustin.md` (§6 Image Prompt)
- **Skill Pin Designer** : `skills/agent-pin-designer.md` (§5 Fresh Pin Rule)
- **Pipeline v11** : `lib/inngest/functions/steps/image-phase.ts`
- **Provider Layer** : `lib/agents/provider.ts`

---

> **Note pour Claude Code :** Ce document est conçu comme source de vérité unique pour l'implémentation. Chaque section est actionnable. Si un choix de design est ambigu, privilégier la simplicité (code pur > LLM, template > génération dynamique) pour la Phase 1. Le LLM light n'est activé qu'en Phase 2 si les templates s'avèrent insuffisants.
