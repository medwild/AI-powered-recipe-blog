# Pipeline v14 — Karpathy Simplification

> **Design spec — 2026-07-21 — v1.3 (2ème review Kimi 2.6 + Claude Sonnet 4.6)**
> Objectif : Simplification radicale du pipeline IA selon les principes Karpathy.
> Principe fondateur : *"The LLM generates, code enforces quality."*
> Revue externe : 9/10 (Kimi) — GO conditionnel. Favorable avec 5 clarifications (Claude). Corrections intégrées.

## 1. Philosophy

> "Est-ce qu'un senior engineer dirait que c'est trop compliqué ?" — Karpathy Rule #2

Le pipeline v13 actuel souffre de **complexité accumulée** : 4 agents LLM, 5 skills, ~3,500 lignes de code, 11 fichiers de règles, 8 steps Inngest. Chaque ajout était justifié isolément, mais l'ensemble est devenu fragile — trop de points de défaillance, trop de code à maintenir, trop de règles qui se contredisent.

**v14 revient à l'essentiel** : un seul appel LLM avec un seul skill, une gate de qualité minimale, et le moins de code possible. La qualité vient des instructions données au LLM, pas du nombre de vérifications après coup.

### Ce qu'on garde (non-négociable)

| Élément | Justification |
|---|---|
| Stack technique (Next.js, Drizzle, Inngest, Tailwind, Neon, FLUX-1) | Stabilité, pas de migration infra |
| Persona Chef Augustin | Différenciation éditoriale |
| 7 patterns humains | Signature anti-AI éprouvée |
| SERP data (Serper API) | Base de l'analyse concurrentielle |
| Food safety validation (code) | Risque légal, ne peut pas être délégué au LLM |
| JSON-LD structuré | Rich snippets Google |
| FAQ structuré | Extraction AI Overviews |
| Publié automatique (AUTO_APPROVE) | Mode dev, pas de friction |

### Ce qu'on jette (et pourquoi)

| Élément | Raison |
|---|---|
| Strategist agent séparé | L'analyse SERP se fait dans le mega-skill |
| Science Enricher agent séparé | La food science est intégrée au mega-skill |
| Pin Designer agent | Pinterest = trafic secondaire, pas core |
| 4 des 5 skills | Fusionnés en 1 mega-skill |
| GEO citability scoring | Les règles sont dans le skill, le scoring ne décidait rien |
| Loop state tracking (loop-state.ts) | Plus de loop multi-passes |
| Quality scoring composite | Remplacé par 4 checks binaires |
| A/B image stats | Optimisation prématurée |
| 9 des 11 fichiers de règles | Conservé : global.md, security.md |
| Retry loop + truncation detection | Structured outputs garantit la sortie |
| Internal linking automatique | Complexité > gain SEO |
| Pin-first format | Google format uniquement |
| Review humaine obligatoire | Auto-publish sauf BLOCK |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│ STEP 1: SERP (code, ~60 lignes)                  │
│                                                   │
│ Serper API → nettoyage minimal:                    │
│   Extraire titles + snippets du top 10 organiques  │
│   + PAA questions + related searches               │
│   Format texte simple, pas de JSON complexe        │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ STEP 2: MEGA-SKILL (1 LLM call, Opus 4.8)        │
│                                                   │
│ System: CHEF_AUGUSTIN_MEGA (~200 lignes)          │
│ Messages: [{ role: "user", content: `              │
│   KEYWORD, CUISINE, INGREDIENTS, TECHNIQUES,      │
│   SERP data, SOURCE citations                     │
│ `}]                                                │
│                                                   │
│ cache_control: { type: "ephemeral" }              │
│ output_config: { format: RecipeArticleSchema }    │
│ thinking: { type: "adaptive" }                    │
│                                                   │
│ Modèle primaire:    claude-opus-4-8               │
│ Modèle fallback:    claude-sonnet-5               │
│   Déclenché sur:  HTTP 429, 529, 5xx, timeout >120s │
│   Jamais sur:      schema mismatch (bug skill)    │
│   Même skill, même structured output              │
│   Cible utilisation: < 5% des recettes            │
│                                                   │
│ → Retourne: RecipeArticle (validé par l'API)      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ STEP 3: QUALITY GATE (code, ~100 lignes)          │
│   Reçoit: RecipeArticle de Step 2                  │
│   Retourne: GateResult { status, reason?, errors? }│
│                                                   │
│ 1. Duplicate slug? → BLOCK immédiat (pas de retry) │
│ 2. Food safety temps? → BLOCK (retry 1x max)      │
│ 3. Word count < seuil? → BLOCK (retry 1x max)      │
│ 4. Banned words? → BLOCK (retry 2x max avec        │
│    feedback: "WARNING: Your output contained       │
│    banned claims: [mots]. This is a HARD RULE.")   │
│                                                   │
│ Retry géré par Inngest (step.invoke() avec         │
│ feedback injecté dans le user message).            │
│ Après max retries → BLOCK définitif = draft.       │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ STEP 4: PERSIST + IMAGE (code, ~80 lignes)       │
│   Reçoit: RecipeArticle (de Step 2) +              │
│           GateResult (de Step 3) — via Inngest     │
│                                                   │
│ Persist:                                          │
│   slugify(title) → slug                          │
│   Remplacer [IMAGE:] par <img> + alt text        │
│   INSERT INTO recipes                             │
│   content_type = "recipe"                         │
│   status = gate PASS ? "published" : "draft"      │
│   Ping sitemap Google                             │
│                                                   │
│ Image (non-bloquant):                             │
│   try: FLUX-1 → Cloudinary → UPDATE recipe        │
│   catch: log, recipe published without image      │
└──────────────────────────────────────────────────┘
```

---

## 3. Le Mega-Skill

Un seul fichier `skills/chef-augustin-mega.md`, ~200 lignes.

### Structure par priorité (pas par domaine)

```
§1 CRITICAL — Food Safety + AdSense Compliance
    - USDA températures (poultry 165°F/74°C, ground meat 160°F/71°C, ...)
    - Never "healthy", "good for you", "nutritious", "better than [food]"
    - Zero health claims: probiotics, detox, gut health, immune, anti-inflammatory, fat-burning
    - Transparent brand persona — no fabricated credentials

§2 IDENTITY & VOICE
    - Chef Augustin Lefèvre, French-trained, American audience
    - "Dinner for Two — Small-Batch Weeknight Meals for Real Life"
    - Warm authority, first-person, precise, no fake enthusiasm

§3 THE 7 HUMAN PATTERNS (use ≥5 per article)
    1. Title → first sentence (never "This recipe is..." or "Today I'm sharing...")
    2. Parentheses = personality
    3. Sign tips with name ("Chef Augustin's Tip:")
    4. Comment between steps
    5. Substitutions with reassurance
    6. Standalone wisdom lines
    7. Close with a scene, not "Enjoy!" or "Bon appétit!"

§4 WRITING & CULINARY QUALITY
    - Specificity: inconveniently specific
    - Sensory verbs: sizzle, blister, crackle, infuse
    - One culinary failure per article
    - Time + visual cue on every timed step
    - ≥4 source attributions (rotate: named authority + first-person testing)
    - ≥4 answer nuggets (FAQ blocks, 25-120 words, ≥1 number or named entity)
    - Every temperature in °F AND °C
    - Quantities as volume AND weight
    - Cite 1-2 external sources where contextually relevant

§5 SEO & STRUCTURE (Google format, 1800-2200 words)
    - metaTitle: ≤60 chars, keyword first
    - metaDescription: 150-160 chars, actionable
    - H2 sections: 6-8, each with clear purpose
    - FAQ: 5 Q&A with ## Question? format
    - Include sections: "Why This Works", "What Most Recipes Get Wrong", "Chef's Tips"
    - Analyze SERP data for angle — find the gap competitors missed
    - State your angle before writing: one sentence, specific, differentiated

§6 IMAGE PROMPT
    - Subject/Action/Environment (≤40 words subject)
    - Lighting (pick one: natural window 3500K, dramatic side 3200K, golden hour 3000K, studio softbox 5000K)
    - Camera: Sony A7R IV, lens per dish type
    - Total 60-100 words, never >120
    - Low-visual dishes: ingredients, process, texture close-ups

§7 OUTPUT — Follow the Zod schema. Output valid JSON only.
```

### Règles de rédaction du skill
- **Règles vérifiables par le LLM uniquement** — pas de "word count ≥ 1200" (la gate le fait)
- **Ordre par criticité** — food safety en premier
- **Direct, pas poli** — "Never say..." pas "Please avoid..."
- **≤ 200 lignes** — si ça dépasse, c'est qu'on met des règles que la gate devrait gérer

### Zod Schema Contract

Le schema `RecipeArticleSchema` est le contrat entre le LLM et le code. Il est défini dans `lib/schemas/recipe-article.ts` et utilisé par `output_config.format` dans l'appel à Opus 4.8. La gate dépend de ce schema.

```typescript
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
  jsonLd: z.object({}).passthrough().describe("@graph: Recipe + BlogPosting + FAQPage + BreadcrumbList for Google; Recipe + BreadcrumbList only for Pin-First"),
});
```

---

## 4. La Quality Gate

Un seul fichier `lib/quality-gate.ts`, ~100 lignes.

### Les 4 checks (tous BLOCK — pas de modification silencieuse du contenu)

```typescript
interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short" | "banned_words";
  errors?: string[];
}

async function qualityGate(output: RecipeArticle): Promise<GateResult> {
  // Check 0: Duplicate slug
  const slug = slugify(output.title);
  const existing = await db.select().from(recipes).where(eq(recipes.slug, slug)).limit(1);
  if (existing.length > 0) {
    return { status: "BLOCK", reason: "duplicate", errors: [`Slug "${slug}" exists`] };
  }

  // Check 1: Food Safety (USDA temps)
  const foodSafetyErrors = validateFoodSafety(output.instructions, output.ingredients);
  if (foodSafetyErrors.length > 0) {
    return { status: "BLOCK", reason: "food_safety", errors: foodSafetyErrors };
  }

  // Check 2: Word Count minimum (seuils par type de recette)
  const wordCount = output.contentMarkdown.split(/\s+/).filter(Boolean).length;
  const minWords = getMinWords(output); // ≥30min/plat principal: 1200, express <30min: 800, dessert: 600
  if (wordCount < minWords) {
    return { status: "BLOCK", reason: "too_short", errors: [`${wordCount} words < ${minWords} minimum`] };
  }

  // Check 3: Banned Words (BLOCK — skill §1 is the prevention layer)
  // Si ce check déclenche, le LLM n'a pas respecté §1. Ne pas scrubber —
  // un scrub crée des phrases cassées. Bloquer et retry avec feedback.
  const bannedWordsFound = detectBannedWords(output.contentMarkdown);
  if (bannedWordsFound.length > 0) {
    return { status: "BLOCK", reason: "banned_words", errors: bannedWordsFound.map(w => `"${w}" found`) };
  }

  return { status: "PASS" };
}
```

### Banned words list
```
probiotics, gut health, immune boost, detox, anti-inflammatory,
fat-burning, miracle, superfood, cleanse, cure, heal, treat,
all-natural (as health claim), clinically proven, scientifically proven
```

### Retry strategy

Géré par Inngest (`step.invoke()` avec feedback injecté). Max 3 tentatives au total (initial + 2 retries max).

| Raison du BLOCK | Retries max | Feedback au LLM | Après échec |
|---|---|---|---|
| `duplicate` | 0 | Aucun (logique métier) | Draft, revue humaine |
| `food_safety` | 1 | "Missing USDA temperatures for: [protéines]. Include °F and °C." | Draft, revue humaine |
| `too_short` | 1 | "Article is ${wc} words. Minimum is ${min}. Expand with more technique detail." | Draft, revue humaine |
| `banned_words` | 2 | "WARNING: Your output contained banned health claims: [mots]. This is a HARD RULE. Do not use these terms." | Draft, revue humaine |

**Mécanisme** : Le retry Inngest ré-exécute Step 2 avec un `feedback` string injecté dans le user message. Le mega-skill §1 reçoit ce feedback comme contexte additionnel.

---

### Food safety validation (~50 lignes)

Règles de matching des protéines (case-insensitive, supporte °F et °C) :

```typescript
const PROTEIN_RULES = [
  // Volaille — USDA: 165°F/74°C (toutes les volailles)
  { keywords: ["chicken", "turkey", "duck", "goose", "poultry", "quail", "cornish hen"],
    temp: ["165°F", "74°C"],
    exclude: ["stock", "broth", "powder", "bouillon", "fat", "liver", "gizzard"] },

  // Viande hachée — USDA: 160°F/71°C
  { keywords: ["ground beef", "ground pork", "ground lamb", "ground chicken", "ground turkey",
               "ground meat", "minced beef", "minced pork", "minced lamb"],
    temp: ["160°F", "71°C"] },

  // Porc (muscles entiers) — USDA: 145°F/63°C + repos 3 min
  // Bacon/pancetta/guanciale exclus (souvent pré-cuits ou utilisés en petite quantité comme garniture)
  { keywords: ["pork chop", "pork loin", "pork tenderloin", "pork shoulder", "pork roast",
               "ham", "prosciutto", "serrano ham", "iberico"],
    temp: ["145°F", "63°C"],
    exclude: ["bacon", "pancetta", "guanciale", "lardons", "stock", "broth"] },

  // Bœuf/agneau (muscles entiers) — USDA: 145°F/63°C
  { keywords: ["steak", "beef", "lamb", "veal", "roast beef", "prime rib", "ribeye",
               "sirloin", "tenderloin", "filet mignon", "strip steak"],
    temp: ["145°F", "63°C"],
    tolerate: "medium-rare" }, // note à 130-135°F → BLOCK si aucune mention de la température USDA

  // Poisson/fruits de mer — USDA: 145°F/63°C
  { keywords: ["salmon", "tuna", "cod", "halibut", "sea bass", "trout", "mahi mahi",
               "shrimp", "scallop", "lobster", "crab", "mussel", "clam"],
    temp: ["145°F", "63°C"] },

  // Œufs — FDA: cuire jusqu'à ce que le blanc et le jaune soient fermes,
  // ou utiliser des œufs pasteurisés pour les préparations crues
  { keywords: ["egg", "eggs", "egg yolk", "egg white"],
    temp: [], // pas de température — vérifier mention "pasteurized" ou "cooked until firm"
    rule: "fda_egg" },
];

// Logique de validation :
// Pour chaque PROTEIN_RULE :
//   1. Scanner ingredients[] pour les keywords (en excluant les exclude)
//   2. Si une protéine est trouvée ET qu'elle n'est PAS dans exclude :
//      → Au moins une instruction doit mentionner une température du tableau temp[]
//      → OU (pour la règle fda_egg) : mentionner "pasteurized" ou "cooked until firm"
//      → Si absent → BLOCK
```

**Cas edge couverts :**
- `chicken stock` → exclu (exclude) → pas de BLOCK
- `bacon` dans carbonara → exclu → pas de BLOCK
- `eggs` dans carbonara → règle fda_egg → vérifie "pasteurized" ou "firm" → BLOCK si absent
- `salmon medium-rare` → keyword match + tolerate → BLOCK si aucune mention de 145°F
- `steak medium-rare` → keyword match + tolerate → BLOCK si aucune mention de 145°F

**Impact sur les 10 keywords eval :**
| Keyword | Protéine | Règle | Statut attendu |
|---|---|---|---|
| Roast chicken | chicken | 165°F | ✅ Le LLM mentionne toujours 165°F |
| Beef bourguignon | beef | 145°F | ✅ Cuisson longue > 145°F, mention attendue |
| Carbonara | egg + bacon | fda_egg + exclude | ⚠️ Œuf cru → BLOCK si pas "pasteurized" — le skill doit l'exiger |
| Salmon medium-rare | salmon | 145°F + tolerate | ⚠️ BLOCK si le LLM ne mentionne pas USDA — le skill doit l'exiger |
| Chickpea curry | aucune | — | ✅ PASS automatique |
| Caesar salad | egg + chicken | fda_egg + 165°F | ⚠️ Double check : œuf cru + poulet |
| Medium-rare steak | steak | 145°F + tolerate | ⚠️ BLOCK si le LLM ne mentionne pas USDA |
| Chocolate mousse | egg (si présent) | fda_egg | ✅ Le LLM peut mentionner œufs pasteurisés |
| Chicken bacon pasta | chicken + bacon | 165°F + exclude | ✅ Bacon exclu, chicken → 165°F |
| Garlic shrimp | shrimp | 145°F | ✅ Cuisson rapide > 145°F, mention attendue |

---

## 5. Fichiers supprimés

| Fichier | ~Lignes | Raison |
|---|---|---|
| `skills/agent-strategist.md` | 76 | Fusionné dans mega-skill §5 |
| `skills/agent-science-enricher.md` | 85 | Fusionné dans mega-skill §4 |
| `skills/agent-pin-designer.md` | 249 | Pinterest hors scope |
| `skills/agent-chef-augustin.md` | 88 | Remplacé par mega-skill |
| `lib/inngest/functions/agents/strategist.ts` | 127 | Plus d'agent séparé |
| `lib/inngest/functions/agents/science-enricher.ts` | 162 | Plus d'agent séparé |
| `lib/inngest/functions/agents/pin-designer.ts` | 152 | Pinterest hors scope |
| `lib/inngest/functions/steps/pin-phase.ts` | 108 | Pinterest hors scope |
| `lib/inngest/functions/steps/content-loop-phase.ts` | 305 | Remplacé par step 2 direct |
| `lib/geo-validator.ts` | 330 | Règles dans le skill |
| `lib/quality-scorer.ts` | 73 | Plus de scoring composite |
| `lib/loop-scorer.ts` | 0 (déjà deleted) | Déjà supprimé |
| `lib/loop-state.ts` | 213 | Plus de multi-passes |
| `lib/external-sources.ts` | 391 | LLM fait le matching |
| `lib/content-validator.ts` | 556 | Remplacé par quality-gate.ts |
| `.claude/rules/ai-pipeline.md` | - | Simplifié dans CLAUDE.md |
| `.claude/rules/routing-seo.md` | - | Fusionné dans global.md |
| `.claude/rules/api.md` | - | Non essentiel |
| `.claude/rules/frontend.md` | - | Non essentiel |
| `.claude/rules/database.md` | - | Fusionné dans global.md |
| `.claude/rules/karpathy.md` | - | Conservé (philosophie) |
| `.claude/rules/accuracy.md` | - | Conservé (philosophie) |
| `scripts/analyze-*.ts` (3 scripts) | - | Outils d'analyse v13 |
| `scripts/build-clusters.ts` | - | Outil v13 |
| `scripts/batch-generate.mjs` | - | Outil v13 |
| `docs/archive/*.md` (10 fichiers) | - | Historique, pas de code |

---

## 6. Fichiers créés ou modifiés

### Créés
| Fichier | Description |
|---|---|
| `skills/chef-augustin-mega.md` | Mega-skill unique (~200 lignes) |
| `lib/quality-gate.ts` | Quality gate simplifiée (~100 lignes, dont ~50 food safety) |
| `lib/schemas/recipe-article.ts` | Zod schema pour structured output |
| `scripts/eval-recipe.ts` | Script de test : génère 10 recettes variées et audite chaque section du mega-skill séparément |

### Modifiés
| Fichier | Changement |
|---|---|
| `lib/inngest/functions/generate-recipe.ts` | Réécrit : 4 steps au lieu de 8 |
| `lib/inngest/functions/agents/chef-augustin.ts` | Réécrit : mega-skill au lieu de chef-augustin skill |
| `lib/inngest/functions/steps/serp-phase.ts` | Simplifié : nettoyage minimal (titres + snippets top 10) |
| `lib/inngest/functions/steps/persist-phase.ts` | Simplifié : persist + sitemap ping |
| `lib/inngest/functions/steps/image-phase.ts` | Simplifié : non-bloquant |
| `lib/inngest/functions/helpers.ts` | Réduit : log functions uniquement |
| `CLAUDE.md` | Mis à jour pour v14 |
| `.claude/rules/global.md` | Fusion de routing-seo + database |
| `package.json` | Dépendances inutilisées retirées |

### eval-recipe.ts — 10 keywords de validation

Cas edge explicites pour couvrir tous les scénarios de la food safety gate :

| # | Keyword | Test |
|---|---|---|
| 1 | Roast chicken for two | Protéine unique volaille, classique |
| 2 | Beef bourguignon small batch | Viande rouge, cuisson longue |
| 3 | Authentic carbonara for two | Œuf cru, multi-protéines (œuf + porc) |
| 4 | Pan-seared salmon medium-rare | Poisson, cuisson partielle |
| 5 | Vegetarian chickpea curry for two | Sans protéine animale |
| 6 | Caesar salad with homemade dressing | Œuf cru dans dressing + poulet |
| 7 | Perfect medium-rare steak for two | Température vs USDA minimum |
| 8 | Dark chocolate mousse for two | Dessert, pas de protéine à cuire |
| 9 | Chicken bacon pasta for two | Deux protéines animales, double validation |
| 10 | 15-minute garlic shrimp | Recette express, risque < 1200 mots |

Chaque évaluation loggue :
- `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`
- Score par section du mega-skill (food safety ✓/✗, human patterns count, attributions count, FAQ count, JSON-LD valid)
- Coût réel calculé à partir des tokens

---

## 7. Métriques

| Métrique | v13 | v14 | Delta |
|---|---|---|---|
| Appels LLM par recette | 2-4 | 1 | **-60% à -75%** |
| Skills Markdown | 5 fichiers | 1 fichier | **-80%** |
| Code pipeline + validateurs | ~3,500 lignes | ~400 lignes | **-89%** |
| Fichiers de règles | 11 | 3 | **-73%** |
| Steps Inngest | 8 | 4 | **-50%** |
| Points de défaillance | ~12 | 4 | **-67%** |
| Latence estimée | 3-8 min | 1.5-3 min | **-50%** |
| Coût LLM/article (est.) | $0.02-0.08 | $0.03-0.05 | ~équivalent |
| Temps humain/recette | Review obligatoire | 0 (sauf BLOCK) | **-100%** |

---

## 8. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Opus 4.8 API down ou rate-limité | Faible | Bloquant | Fallback automatique sur Sonnet 5 (même skill, structured outputs natif). Retries Inngest (2) |
| Mega-skill non testé en production | Moyen | Qualité dégradée | `scripts/eval-recipe.ts` sur 10 keywords variés (viande, poisson, végé, dessert, edge cases) avant déploiement. Audit par section du skill |
| Structured output rejeté (schema mismatch) | Faible | Article perdu | Retry Inngest automatique. Zod schema testé en isolation |
| Image FLUX-1 échoue | Faible | Article sans image | Non-bloquant, retry asynchrone |
| AdSense refuse malgré compliance | Faible | Revenu | Hors scope immédiat — on suit les règles connues. Monitoring des refus AdSense sur les 50 premiers articles |
| LLM ignore certaines règles du mega-skill | Moyen | Qualité variable | La gate bloque les violations critiques (food safety, banned words, word count). eval-recipe.ts audite §3 (patterns) et §4 (attributions) par section |
| Internal linking absent du pipeline | Certain | SEO long-terme | **Dette documentée pour v15** — à activer quand le corpus > 30 recettes. Solution probable : script déterministe par matching de tags |
| Coût Opus 4.8 sous-estimé | Moyen | Budget | Premier run eval-recipe.ts loggue les tokens réels (input/output/thinking/cache) avant de fixer les estimations |

### Observability — Monitoring des 50 premières recettes

Metrics logguées par recette dans `pipeline_logs` (table existante) :

| Métrique | Source | Seuil d'alerte |
|---|---|---|
| Statut final (PASS/BLOCK) | Gate | BLOCK > 10% → review du skill |
| Raison du BLOCK | Gate | food_safety > 5% → revoir les règles de matching |
| Latence Step 1 (SERP) | Inngest | > 5s → dégrader Serper |
| Latence Step 2 (LLM) | Inngest | > 120s → timeout, fallback Sonnet 5 |
| Latence Step 3 (Gate) | Inngest | > 2s → vérifier DB query |
| Tokens input/output/thinking/cache | API response | Coût > $0.08/article → revoir skill length |
| Taux fallback Sonnet 5 | Step 2 | > 5% → contacter Anthropic (rate limit anormal) |
| Human patterns count | eval-recipe (post-hoc) | < 5 → le skill §3 n'est pas suivi |
| Sitemap ping status | Step 4 | Échec → retry 1x, log |

---

## 9. Plan de migration

1. **Créer** `skills/chef-augustin-mega.md` (skill uniquement, pas de code)
2. **Créer** `lib/schemas/recipe-article.ts` (Zod schema pour structured output)
3. **Créer** `lib/quality-gate.ts` (4 checks, tous BLOCK)
4. **Réécrire** `lib/inngest/functions/generate-recipe.ts` (4 steps, fallback Opus 4.8 → Sonnet 5)
5. **Réécrire** `lib/inngest/functions/agents/chef-augustin.ts` (mega-skill call avec structured output + fallback)
6. **Simplifier** `serp-phase.ts` (nettoyage minimal : titres + snippets top 10 + PAA)
7. **Simplifier** `persist-phase.ts` (slugify, <img> alt text, sitemap ping)
8. **Simplifier** `image-phase.ts` (non-bloquant, try/catch)
9. **Supprimer** les fichiers obsolètes (25+ fichiers)
10. **Créer** `scripts/eval-recipe.ts` et tester sur 10 keywords avec audit par section
11. **Logger** les tokens réels (input/output/thinking/cache) du premier run → ajuster estimations coût
12. **`npx tsc --noEmit`** + déploiement
13. **Monitorer** les 50 premières recettes : taux de BLOCK, temps de génération, coût réel

---

## 10. Succès — Comment on saura que ça marche

- [ ] `npx tsc --noEmit` passe
- [ ] 1 recette générée de bout en bout sans erreur (smoke test)
- [ ] 10/10 recettes eval-recipe.ts : quality gate PASS, JSON-LD valide, ≥5 human patterns, ≥4 attributions
- [ ] Cas edge couverts : multi-protéine, sans protéine animale, œuf cru, poisson cru, recette courte
- [ ] Score Google Rich Results Test : 0 erreurs JSON-LD
- [ ] Indexation Google < 24h après ping sitemap
- [ ] AdSense approuve le contenu (pas de violation de politique sur les 50 premiers articles)
- [ ] Taux de BLOCK < 10% sur les 50 premières recettes
- [ ] Coût réel/article mesuré et dans le budget (tokens loggués du premier run)
