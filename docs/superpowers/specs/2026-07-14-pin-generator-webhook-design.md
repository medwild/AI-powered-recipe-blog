# Spec — Pin Generator Webhook + Pin Designer Refactor

> **Date :** 2026-07-14
> **Status :** Draft — En attente de validation
> **Contexte :** Pipeline v11, Blog Chef Augustin, Stratégie Pinterest PTRA

---

## 1. Problème

Le Pin Designer actuel génère des `image_prompt` texte pour 5 pins Pinterest, mais ces images ne sont **jamais générées**. Les pins référencent les `imageVariants` du blog — mêmes images pour le blog et Pinterest.

Or Pinterest a des algorithmes de détection d'images IA qui, sans pénaliser directement, appliquent un label "AI Modified" réduisant le reach organique. La food photography est une niche à haute surveillance.

L'utilisateur a une **app externe de génération de pins** (texte + images) optimisée pour contourner la détection Pinterest. Cette app a besoin d'un flux de données structuré, contextuellement riche, pour générer 5 pins distincts et cohérents par recette.

## 2. Objectifs

1. **Séparer les pipelines** : blog (images pures, qualité SEO/UX) ≠ Pinterest (images stealth, optimisées anti-détection)
2. **Webhook temps réel** : dès qu'une recette est publiée, notifier l'app externe avec toutes les données nécessaires
3. **Pin Designer → Data Preparer** : le Pin Designer produit des **briefs créatifs structurés** (angle, mood, composition, keyElements, colorPalette, overlayZone) que l'app externe consomme. Le champ `image_prompt` devient un placeholder indiquant que la génération visuelle est déléguée.
4. **Zéro perte de contexte** : chaque brief contient assez d'information pour que l'app génère 5 pins visuellement distincts et sémantiquement cohérents

## 3. Architecture

```
Chef Augustin → Pipeline v11 (Inngest) → Recipe Published (publishRecipe)
                                              │
                                   Inngest event: recipe/published
                                              │
                              ┌───────────────▼───────────────┐
                              │  pin-generator-webhook (Inngest)│
                              │  Fetch DB → Build payload       │
                              │  → POST HTTP to external app    │
                              └───────────────┬───────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  App Pin Generator   │
                                   │  (externe)           │
                                   │  5 pins texte+image  │
                                   └──────────────────────┘
```

### 3.1 Flux de données

```
1. Recipe générée (workflow Inngest)
2. Pin Designer produit 5 briefs créatifs → stockés dans pin_drafts
3. Recipe publiée (publishRecipe action)
4. publishRecipe envoie l'événement Inngest recipe/published
5. Fonction Inngest pin-generator-webhook écoute l'événement
6. Fetch recette complète + briefs depuis la DB → construit le payload
7. POST HTTP vers PIN_GENERATOR_WEBHOOK_URL
8. Retry 3x avec backoff exponentiel si échec
```

## 4. Payload Webhook

### 4.1 Requête sortante

```
POST <PIN_GENERATOR_WEBHOOK_URL>
Headers:
  Content-Type: application/json
  X-Webhook-Secret: <PIN_GENERATOR_WEBHOOK_SECRET>
Body: <payload complet selon §4.2>
Timeout: 30s
```

### 4.2 Schéma complet

```json
{
  "event": "recipe.published",
  "timestamp": "2026-07-14T10:30:00Z",
  "recipeId": 42,

  "recipe": {
    "id": 42,
    "title": "One-Pan Lemon Chicken for Two",
    "slug": "one-pan-lemon-chicken-for-two",
    "keyword": "lemon chicken dinner for two",
    "url": "https://chefaugustin.com/recettes/one-pan-lemon-chicken-for-two",
    "excerpt": "Juicy lemon chicken with roasted vegetables on a single sheet pan.",
    "metaTitle": "One-Pan Lemon Chicken for Two | 25 Min | Chef Augustin",
    "metaDescription": "Juicy lemon chicken and roasted vegetables on one sheet pan. Ready in 25 minutes, perfect for busy weeknights.",
    "prepTime": "10 mins",
    "cookTime": "15 mins",
    "totalTime": "25 mins",
    "servings": "2",
    "difficulty": "easy",
    "microNiche": "Easy Weeknight Dinners for Two",
    "targetCountry": "us"
  },

  "visual": {
    "heroImageUrl": "https://res.cloudinary.com/chefaugustin/image/upload/v1/...",
    "imageVariants": [
      {
        "label": "Variant 1",
        "url": "https://res.cloudinary.com/chefaugustin/image/upload/v1/...",
        "prompt": "Professional food photography of one-pan lemon chicken..."
      }
    ],
    "heroImagePrompt": "Professional food photography of one-pan lemon chicken with roasted asparagus and cherry tomatoes on a sheet pan, golden-brown chicken thighs, glossy lemon glaze, natural overhead light, warm tones, 2:3 vertical, editorial food photography"
  },

  "content": {
    "markdown": "# One-Pan Lemon Chicken for Two\n\n...",
    "ingredients": [
      { "name": "boneless skinless chicken breast", "quantity": "2 (6oz each)" },
      { "name": "asparagus", "quantity": "1 bunch" },
      { "name": "cherry tomatoes", "quantity": "1 cup" },
      { "name": "lemon", "quantity": "1 large" },
      { "name": "olive oil", "quantity": "2 tbsp" },
      { "name": "garlic", "quantity": "3 cloves" }
    ],
    "instructions": [
      { "step": 1, "text": "Preheat oven to 400°F (200°C)." },
      { "step": 2, "text": "Season chicken breasts with salt, pepper, and minced garlic." }
    ],
    "tags": ["chicken", "one-pan", "quick", "dinner-for-two", "lemon", "sheet-pan"]
  },

  "structure": {
    "h2Sections": [
      "Why One-Pan Dinners Work for Two",
      "Ingredients You'll Need",
      "Step-by-Step Instructions",
      "Tips for Perfect Lemon Chicken",
      "What to Serve on the Side"
    ],
    "faqQuestions": [
      "Can I use chicken thighs instead of breasts?",
      "How do I store and reheat leftovers?",
      "Can I make this dairy-free?"
    ]
  },

  "strategy": {
    "angle": "Quick one-pan dinner solution for couples — minimal cleanup, maximum flavor",
    "primaryKeyword": "lemon chicken dinner for two",
    "secondaryKeywords": ["one-pan chicken", "easy dinner for two", "lemon chicken recipe", "sheet pan dinner"],
    "semanticEntities": ["sheet pan", "roasted vegetables", "lemon garlic sauce", "weeknight dinner", "small-batch cooking"],
    "competitorGaps": ["No dairy-free option in top 3 SERP results", "Missing meal prep / make-ahead instructions"]
  },

  "briefs": [
    {
      "index": 0,
      "intent": "quick_solution",
      "board": "30-Minute Meals for Two",
      "pinTitle": "25-Min One-Pan Lemon Chicken for Two",
      "overlayText": "25-Min Lemon Chicken",
      "description": "Juicy lemon chicken and roasted vegetables on a single sheet pan — ready in 25 minutes with almost no cleanup. Save this for your next busy weeknight.",
      "angle": "Speed + simplicity — fastest path from fridge to table",
      "mood": "Warm weeknight kitchen, natural window light, effortless elegance",
      "composition": "Overhead flat-lay of the full sheet pan, golden chicken centered, lemon slices and herbs scattered",
      "keyElements": ["lemon slices with visible juice", "golden-brown chicken", "roasted asparagus spears", "cherry tomatoes slightly blistered"],
      "colorPalette": "Warm yellows, roasted browns, fresh green accents, white ceramic pan",
      "overlayZone": "Top third — dark gradient overlay for white bold text",
      "ptraScore": 88
    },
    {
      "index": 1,
      "intent": "beginner_guide",
      "board": "Easy Dinners for Two",
      "pinTitle": "Beginner-Friendly Sheet Pan Chicken for Two",
      "overlayText": "No-Fail Sheet Pan Dinner",
      "description": "New to cooking for two? This one-pan lemon chicken is foolproof — no fancy techniques, just simple ingredients and one pan.",
      "angle": "Accessibility — anyone can make this, first try success",
      "mood": "Cozy home kitchen, approachable, real-life cooking (not studio perfection)",
      "composition": "45° angle shot of the pan coming out of the oven, oven mitt visible, steam rising, casual and real",
      "keyElements": ["steam rising from the pan", "oven mitt in frame", "slightly rustic plating"],
      "colorPalette": "Warm amber tones, soft highlights, lived-in kitchen feel",
      "overlayZone": "Bottom half — light text on dark pan surface",
      "ptraScore": 84
    },
    {
      "index": 2,
      "intent": "step_by_step",
      "board": "Easy Dinners for Two",
      "pinTitle": "Step-by-Step: One-Pan Lemon Chicken for Two",
      "overlayText": "4 Steps, 1 Pan, 0 Leftovers",
      "description": "Follow these 4 simple steps for the perfect sheet pan chicken dinner — seasoning, arranging, roasting, and serving for two.",
      "angle": "Process clarity — visual walkthrough of the method",
      "mood": "Clean, instructional, bright kitchen daylight",
      "composition": "4-panel process grid: (1) raw seasoned chicken, (2) arranged on pan, (3) mid-roast, (4) plated for two",
      "keyElements": ["raw ingredients", "sheet pan arrangement", "oven roasting", "final plated dish for two"],
      "colorPalette": "Bright whites, fresh ingredient colors, progression from raw to golden",
      "overlayZone": "Each panel has a small label overlay (Step 1, Step 2, etc.)",
      "ptraScore": 86
    },
    {
      "index": 3,
      "intent": "ingredient_spotlight",
      "board": "Chicken Dinners for Two",
      "pinTitle": "Why Lemon Makes This Chicken Dinner Irresistible",
      "overlayText": "The Lemon Trick",
      "description": "The secret to this one-pan chicken dinner? Fresh lemon — it tenderizes, brightens, and creates a glossy pan sauce without extra effort.",
      "angle": "Single ingredient focus — lemon as the hero",
      "mood": "Bright, fresh, citrus-forward — Mediterranean summer evening",
      "composition": "Close-up detail shot of a lemon being squeezed over the golden chicken, juice droplets visible in mid-air",
      "keyElements": ["lemon half in hand", "juice droplets", "golden chicken surface", "fresh herbs"],
      "colorPalette": "Bright citrus yellow, golden brown, fresh green parsley",
      "overlayZone": "Bottom left corner — small text overlay, image is the hero",
      "ptraScore": 82
    },
    {
      "index": 4,
      "intent": "budget_friendly",
      "board": "Budget Meals for Two",
      "pinTitle": "Grocery List: One-Pan Lemon Chicken for Two Under $12",
      "overlayText": "Under $12 for Two",
      "description": "This restaurant-quality lemon chicken dinner costs less than $12 total. Perfect for date night on a budget — save this grocery list.",
      "angle": "Value — affordable date night without compromise",
      "mood": "Warm, inviting, rustic — kitchen table with handwritten-style grocery list overlay",
      "composition": "Flat-lay of all ingredients with price tags visible, final plated dish at center",
      "keyElements": ["ingredients with visible price tags", "plated dish for two", "utensils set for two"],
      "colorPalette": "Earthy tones, kraft paper brown, fresh produce colors",
      "overlayZone": "Top left — 'Under $12' badge, grocery list stylized in bottom right",
      "ptraScore": 80
    }
  ]
}
```

## 5. Modifications Code

### 5.1 Nouveau : `lib/inngest/functions/pin-generator-webhook.ts`

- Fonction Inngest qui écoute l'événement `recipe/published`
- Fetch la recette complète + `pin_drafts` (briefs) depuis la DB
- Construit le payload webhook complet (voir §4.2)
- POST HTTP vers `PIN_GENERATOR_WEBHOOK_URL` avec header `X-Webhook-Secret`
- Retry 3x avec backoff exponentiel (1s, 4s, 16s) si échec
- No-op silencieux si `PIN_GENERATOR_WEBHOOK_URL` n'est pas configuré
- Log les résultats dans `workflow_log`

### 5.2 Modifié : `lib/inngest/functions/agents/pin-designer.ts`

- Le type `PinDraftOutput` garde les champs existants, dont `image_prompt` (rempli avec `"__EXTERNAL_PIN_GENERATOR__"` — placeholder indiquant que l'image sera générée par l'app externe)
- Ajout des champs **brief créatif** : `angle`, `mood`, `composition`, `keyElements`, `colorPalette`, `overlayZone`
- `buildUserPrompt()` inclut maintenant : `prepTime`, `cookTime`, `totalTime`, `servings`, `difficulty`, données du `StrategyPlan`
- La validation existante (`!p.image_prompt`) reste valide car le placeholder est toujours présent

### 5.3 Modifié : `lib/inngest/functions/steps/pin-phase.ts`

- Sauvegarde les briefs créatifs dans `pin_drafts.brief_data` (JSONB)

### 5.4 Modifié : `skills/agent-pin-designer.md`

- Mise à jour du §1 Identity & Role : "Data Preparer for External Pin Generator"
- Mise à jour du §8 Output Schema : nouveaux champs brief créatif + `image_prompt` devient placeholder `__EXTERNAL_PIN_GENERATOR__`
- Ajout des directives anti-détection Pinterest dans les briefs (grain, imperfections, textures)
- Conservation du scoring PTRA et de la board architecture

### 5.5 Modifié : `app/actions/recipes.ts` — `publishRecipe`

- Après publication réussie, envoie un événement Inngest `recipe/published` avec `{ recipeId }`. Le webhook est déclenché en arrière-plan (ne bloque pas la réponse dashboard).

### 5.6 Modifié : `lib/db/schema.ts` — `pinDrafts`

- Ajout d'une colonne `brief_data` (`jsonb`) pour stocker les champs créatifs : `angle`, `mood`, `composition`, `keyElements`, `colorPalette`, `overlayZone`
- JSONB choisi pour sa flexibilité (les champs créatifs évolueront)

### 5.7 Configuration

```env
# Webhook Pin Generator (optionnel — si absent, le webhook est désactivé)
PIN_GENERATOR_WEBHOOK_URL=https://pin-generator.example.com/api/generate
PIN_GENERATOR_WEBHOOK_SECRET=<clé partagée avec l'app externe>
```

## 6. Non-modifications (intouchable)

- **Pipeline Inngest** : l'ordre des steps reste inchangé (SERP → Content Loop → Persist → Images → Pins)
- **Chef Augustin** : aucune modification (génère toujours `imagePrompt` pour le blog)
- **`image-phase.ts`** : aucune modification (continue à générer des images pures pour le blog)
- **Routes existantes** : aucune modification de routing
- **Table `recipes`** : aucune modification de schéma

## 7. Gestion d'erreurs

| Scénario | Comportement |
|---|---|
| `PIN_GENERATOR_WEBHOOK_URL` non configuré | Webhook désactivé silencieusement — pas d'erreur |
| App externe injoignable | 3 retries (1s, 4s, 16s), puis log warning — la recette reste publiée |
| App externe retourne 4xx | Pas de retry — log l'erreur, la recette reste publiée |
| `pin_drafts` vide (Pin Designer a échoué) | Webhook envoyé sans la section `briefs` — l'app externe génère depuis les données brutes |
| Timeout app externe > 30s | Abandon après 30s, log warning |

## 8. Vérification

- [ ] `npx tsc --noEmit` passe
- [ ] `npm run test:e2e` passe
- [ ] Test manuel : publier une recette → vérifier que le webhook est appelé
- [ ] Test manuel : `PIN_GENERATOR_WEBHOOK_URL` absent → pas d'erreur
- [ ] Test manuel : app externe down → 3 retries, puis log warning, recette publiée

## 9. Décisions actées

1. **Colonne `brief_data`** → JSONB. Flexibilité > queryability pour des champs créatifs évolutifs.
2. **Webhook** → Asynchrone via événement Inngest `recipe/published`. Ne bloque pas la réponse dashboard.
3. **Retrofit** → Non pour le MVP. Script optionnel post-lancement.
4. **Pin Designer** → Conserve la génération des champs texte (pinTitle, overlayText, description, board, intent, ptraScore) + `image_prompt` (placeholder `__EXTERNAL_PIN_GENERATOR__`). Ajoute les champs brief créatif (`angle`, `mood`, `composition`, `keyElements`, `colorPalette`, `overlayZone`). L'app externe gère la création visuelle.
