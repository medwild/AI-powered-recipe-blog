# RecipeForge — Design Spec

> **Date** : 2026-07-20
> **Statut** : Validé — prêt pour plan d'implémentation
> **Blueprint de référence** : `ai-blog-builder` (pipeline v13 single-pass, skills, validateurs)

---

## Résumé exécutif

RecipeForge est un outil de génération de recettes de cuisine **ultra-professionnel**, optimisé SEO/GEO/LLM-SEO, aligné stratégie Pinterest Hijacking + PTRA. Il produit du contenu (Markdown + JSON-LD) et des super prompts image (blog + Pinterest) de bout en bout, pour n'importe quelle niche culinaire.

**Contrainte clé** : Nouveau projet séparé de `ai-blog-builder`. Le blog actuel ne change pas — il sert de blueprint (skills, agents, validateurs, pattern de pipeline).

---

## 1. Architecture Globale

### Principe Karpathy

> *"The LLM generates, code enforces quality."*

Séparation stricte : le LLM est créatif, le code est déterministe. Pas de LLM dans l'évaluation qualité.

### Stack

| Couche | Technologie |
|---|---|
| Environnement de dev | Google AI Studio |
| Déploiement prod | Vercel (Next.js 16 App Router) |
| LLM primaire | Gemini 2.5 Pro (T=0.8, 8192 max tokens) |
| LLM fallback | DeepSeek v4 Pro (si Gemini échoue/répond vide) |
| Base de données | Neon PostgreSQL + Drizzle ORM |
| Recherche SERP | Serper.dev (live, pas de briefs pré-calculés) |
| Images | Aucune génération — super prompts uniquement |
| Orchestrateur | Aucun — `async/await` direct (pas d'Inngest) |

### Architecture 4 couches

```
┌─────────────────────────────────────────────────────────────┐
│                    Google AI Studio (DEV)                    │
│                                                             │
│  Skills (3 fichiers .md)                                    │
│  Core Engine (TS pur) → Validators → Exporters              │
│  Niche Registry (profils JSON)                              │
│                                                             │
│  Code → Test → Commit → Push to GitHub                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vercel (PROD)                          │
│                                                             │
│  Next.js 16 App Router                                      │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Dashboard   │  │  API Routes    │  │  Core Engine   │  │
│  │  (React SPA) │  │  /api/generate  │  │  (TS pur)     │  │
│  │              │  │  /api/recipes   │  │  Pipeline      │  │
│  │  Lancement   │  │  /api/export    │  │  Agents        │  │
│  │  Suivi       │  │  /api/niches    │  │  Validators    │  │
│  │  Historique  │  │                 │  │  Exporters     │  │
│  └──────────────┘  └────────────────┘  └────────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  Neon DB │  │ Gemini   │  │ DeepSeek v4 Pro (fallback)│  │
│  │  (PgSQL) │  │  2.5 Pro │  │                          │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ai-blog-builder (BLUEPRINT)                    │
│  Skills / Agents / Validators / Pipeline pattern            │
│  Ne change pas — sert de référence                          │
└─────────────────────────────────────────────────────────────┘
```

### Les 4 couches du Core Engine

**1. Agent Runner** — Exécute le pipeline linéairement
- Appel Gemini pour le Strategist (plan H2, angle, gaps)
- Appel Gemini pour Chef Augustin (contenu complet + image prompt blog)
- Appel Gemini pour Pin Designer (5 pins PTRA + super prompts Pinterest)
- Fallback DeepSeek si Gemini échoue ou répond vide
- Retry automatique sur truncation (max 1 retry, donc 2 tentatives)

**2. Quality Gate** — Enforcement déterministe post-génération
- `ContentValidator` : food safety, banned words, health claims, word count
- `GeoValidator` : claims ≥ 3-5, attributions ≥ 2-3, answer nuggets ≥ 1
- `CulinaryValidator` : ratios ingrédients, temps de cuisson plausibles, cohérence technique
- Score composite : GEO 60% + Content 25% + Structure 15%
- PASS = score ≥ 65 ET zero food safety violations
- RETRY = truncation détectée (ingrédients/instructions incomplets)
- REJECT = food safety violation OU word count < minimum OU score < 40

**3. Niche Registry** — Profils JSON par cuisine
- Injecté dans les skills LLM via `{{nicheProfile}}`
- Configure les seuils GEO et règles food safety par niche
- Sources d'autorité par cuisine pour les citations

**4. Exporters** — Sorties portables
- `MarkdownExporter` : dossier `output/{niche}/{slug}/`
- `JSONExporter` : fichier unique `output/json/{niche}/{slug}.json`
- `WordPressExporter` : interface prête (REST API), implémentation Phase 2

---

## 2. Data Flow & API Design

### Pipeline complet (3 appels LLM, boucle de retry interne)

```
Dashboard (POST /api/generate { keyword, nicheId })
  │
  ▼
1. SERP Phase (Serper.dev live)
   → Top 10 Google, extraction H2 concurrents, FAQs, AI Overview
   → ~1-2s
  │
  ▼
2. Strategist (LLM #1 — Gemini)
   → Input: SERP data + NicheProfile + skill strategist.md
   → Output: StrategyPlan { angle, h2s, faqs, gaps, targetWordCount }
   → Token: ~800 in, ~300 out
   → ~2-3s
  │
  ▼
3. Chef Augustin (LLM #2 — Gemini)
   → Input: StrategyPlan + NicheProfile + skill chef-augustin.md
   → Output: ChefAugustinOutput
   → Token: ~3500 in, ~2500 out
   → ~5-8s
  │
  ▼
4. Quality Gate (code pur)
   ├── PASS (score ≥ 65, zero food safety violations)
   │     │
   │     ▼
   │   5. Pin Designer (LLM #3 — Gemini)
   │     → Input: ChefAugustinOutput + NicheProfile + skill pin-designer.md
   │     → Output: 5 pins
   │     → ~3-5s
   │     │
   │     ▼
   │   6. Persist + Export
   │     → Neon DB: UPDATE recipe + INSERT pins
   │     → Files: /output/{niche}/{slug}/
   │
   ├── RETRY (truncation: ingrédients/instructions incomplets, retries < 2)
   │     → Retour à l'étape 3 (Chef Augustin) avec instruction renforcée
   │
   └── REJECT (food safety violation OU < minWords OU score < 40)
         → Neon DB: UPDATE status='failed', error_reason
```

### API Routes — 7 endpoints

| Method | Route | Rôle |
|---|---|---|
| `POST` | `/api/generate` | Lance une génération, retourne `{ recipeId }` |
| `GET` | `/api/recipes` | Liste paginée (filtres: niche, score, date) |
| `GET` | `/api/recipes/{id}` | Détail complet + preview Markdown + prompts + statut (polling) |
| `DELETE` | `/api/recipes/{id}` | Supprimer une recette (CASCADE sur les pins) |
| `POST` | `/api/recipes/{id}/regenerate` | Relancer même keyword+niche (même si status=failed) |
| `GET` | `/api/recipes/{id}/download` | Télécharger — `?format=zip` (défaut, dossier complet) ou `?format=json` (fichier unique machine) |
| `GET` | `/api/niches` | Liste des profils disponibles |

### Polling (pas SSE)

Les API Routes Vercel serverless coupent les connexions longues (10s Hobby, 60s Pro). Le dashboard fait du polling HTTP :

```
GET /api/recipes/{id}  →  { status, progress: { step, elapsed }, ...recette }
```

Le client appelle toutes les 2 secondes. Latence perçue négligeable. Fiable sur serverless. Si l'utilisateur ferme l'onglet pendant la génération, la génération continue côté serveur — au retour, l'historique affichera le statut `completed` ou `failed`.

### Schema Neon DB — 2 tables

Relation 1:N — une recette a 5 pins. La table `generations` a été fusionnée dans `recipes` (relation 1:1 inutile — Karpathy §2).

```sql
recipes (
  id            UUID PRIMARY KEY
  keyword       TEXT NOT NULL
  niche_id      TEXT NOT NULL
  format        TEXT NOT NULL DEFAULT 'pin-first'
  status        TEXT NOT NULL  -- 'running' | 'completed' | 'failed'
  error_reason  TEXT           -- si failed (ex: "food safety: claim anti-inflammatoire")
  retries       INT DEFAULT 0
  -- Contenu (nullable, rempli seulement si status='completed')
  title         TEXT
  slug          TEXT
  meta          JSONB           -- { description, focusKeyword, canonical }
  content_md    TEXT
  ingredients   JSONB
  instructions  JSONB
  tags          TEXT[]
  total_time    INT
  difficulty    TEXT
  servings      INT
  image_prompt  TEXT            -- super prompt blog 16:9
  json_ld       JSONB           -- @graph complet
  scores        JSONB           -- { total, geo, content, structure }
  started_at    TIMESTAMPTZ
  completed_at  TIMESTAMPTZ
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

pins (
  id            UUID PRIMARY KEY
  recipe_id     UUID REFERENCES recipes(id) ON DELETE CASCADE
  position      INT NOT NULL    -- 1-5
  title         TEXT NOT NULL
  description   TEXT NOT NULL
  image_prompt  TEXT NOT NULL   -- super prompt Pinterest 2:3
  alt_text      TEXT
  board_name    TEXT
  created_at    TIMESTAMPTZ DEFAULT NOW()
)
```

### Error handling — 3 niveaux

| Niveau | Erreur | Comportement |
|---|---|---|
| **RETRY** | Truncation, réponse LLM vide | Retry (max 1), puis REJECT |
| **REJECT** | Food safety violation, < min words | Marqué `failed`, loggé en DB, erreur visible dans le dashboard |
| **CRASH** | API down, timeout, quota Gemini | État précédent intact en DB, l'utilisateur reclique |

---

## 3. Dashboard & Niche Registry

### Page 1 — Generator

- Logo "RecipeForge"
- Formulaire : mot-clé (input text), niche (select alimenté par `/api/niches`), format (radio : pin-first / google-first)
- Bouton "Générer la recette"
- Barre de progression en 5 étapes (✅ ⏳ ⬜) avec temps écoulé (polling `GET /api/recipes/{id}`)
- Résultat : score affiché, preview Markdown expandable (`<details>` + `react-markdown`), prompts pins avec bouton copier, boutons télécharger (dossier + JSON)
- Téléchargements : 📥 dossier `.zip` (via `GET /api/recipes/{id}/download`), 📥 fichier JSON, 📋 copier prompt blog, 📌 5 prompts pins
- Bouton "Regénérer" si score insuffisant

### Page 2 — History

- Table paginée : keyword, niche, score, date, format, statut
- Filtres : niche (select), score min (range), date (date range)
- Actions par ligne : 📥 `.zip`, 📥 JSON, 📋 prompt blog, 📌 pins, 🔄 regenerate, 🗑️ delete
- Lignes "failed" affichées avec raison du rejet + bouton 🔄 pour retenter
- Pagination simple (20 par page)

### Composants React — 7 fichiers

```
components/
├── generate-form.tsx        ← Formulaire: keyword, niche, format
├── progress-tracker.tsx     ← 5 étapes avec statut + temps
├── result-card.tsx          ← Score + preview expandable + exports
├── pin-prompts-list.tsx     ← 5 pins avec titre + copier
├── history-table.tsx        ← Table paginée
├── history-filters.tsx      ← Filtres par niche/score/date
└── ui/                      ← shadcn/ui réutilisés
```

### Niche Registry

Structure : `data/niches/{nicheId}.json`

```typescript
interface NicheProfile {
  id: string                    // "cuisine-italienne"
  name: string                  // "Cuisine Italienne"
  cuisine: string               // "Italian"
  language: string              // "fr" (par défaut)
  difficulty: "easy" | "medium" | "expert"

  vocabulary: {
    signatureIngredients: string[]
    emblematicTechniques: string[]
    register: "rustic" | "bistro" | "fine-dining" | "home-cooking"
    regionalNotes: string
  }

  foodSafety: {
    criticalTemps: Record<string, number>  // { "poultry": 74, "pork": 63 }
    riskyIngredients: string[]
    allergenWarnings: string[]
    bannedClaims: string[]
  }

  authoritySources: {
    name: string
    url: string | null
    type: "institutional" | "chef" | "book" | "tradition"
  }[]

  geoThresholds?: {             // Optionnel — surcharge les valeurs par défaut
    minClaims: number           // Défaut: 5 (mainstream), 3 (niches rares)
    minAttributions: number     // Défaut: 3 (mainstream), 2 (niches rares)
    minAnswerNuggets: number    // Défaut: 1
  }

  semanticField: string[]
}
```

Profil par défaut : `data/niches/default.json` — fallback universel pour les niches sans profil dédié.

### Ce qui n'est PAS dans le dashboard
- Pas d'authentification (usage personnel, basic auth si besoin)
- Pas d'éditeur de recettes intégré
- Pas de mode batch (Phase 2)
- Pas d'analytics (Phase 2)
- Pas de gestion multi-utilisateurs

---

## 4. Skills & LLM Pipeline

### Architecture des appels LLM

```
┌─────────────────────────────────────────────────┐
│              Provider Abstraction                │
│  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ Gemini      │  │ DeepSeek (fallback)      │   │
│  │ 2.5 Pro     │  │ v4 Pro                   │   │
│  │ T=0.8, 8192 │  │ T=0.8, 8192             │   │
│  └─────────────┘  └─────────────────────────┘   │
│  tryFirst()       tryIf Gemini fails            │
└─────────────────────────────────────────────────┘
```

Pattern : le provider tente Gemini en premier. Si réponse vide, tronquée, ou API en erreur → fallback automatique vers DeepSeek. Identique au pattern `provider.ts` du blueprint.

### Les 3 skills

| Skill | Fichier | Rôle | Token estimé |
|---|---|---|---|
| **Strategist** | `skills/strategist.md` | Plan H2, angle, gaps concurrentiels | ~800 in / ~300 out |
| **Chef Augustin** | `skills/chef-augustin.md` | Rédaction complète + image prompt blog + science culinaire | ~3500 in / ~2500 out |
| **Pin Designer** | `skills/pin-designer.md` | 5 pins PTRA + super prompts Pinterest | ~1500 in / ~1200 out |

### Contrats inter-agents

```
Strategist → StrategyPlan {
  angle: string
  h2s: string[]
  faqs: { question: string, answer: string }[]
  gaps: { topic: string, opportunity: string }[]
  targetWordCount: number
}

StrategyPlan → Chef Augustin → ChefAugustinOutput {
  title: string
  meta: { description: string, focusKeyword: string }
  content_md: string
  ingredients: Ingredient[]
  instructions: Instruction[]
  tags: string[]
  totalTime: number
  difficulty: string
  servings: number
  imagePrompt: string          // super prompt blog 16:9
  jsonLd: object               // @graph complet
}

ChefAugustinOutput → Pin Designer → PinDesignerOutput {
  pins: {
    title: string
    description: string
    imagePrompt: string         // super prompt Pinterest 2:3
    altText: string
    boardName: string
  }[]
}
```

### Niche injection

Avant chaque appel LLM, les placeholders sont injectés dans le skill :

```typescript
const prompt = skill
  .replace('{{nicheProfile}}', niche.toPromptSection())
  .replace('{{format}}', params.format)        // "pin-first" | "google"
  .replace('{{keyword}}', params.keyword)
  .replace('{{serpData}}', serpOutput)
  .replace('{{strategyPlan}}', strategyOutput)
```

### Quality Gate — 4 validateurs, 1 score, configuré par format

```
ChefAugustinOutput
  → ContentValidator    : food safety, banned words, health claims, minWords (1200 pin-first / 1800 google-first), meta length
  → GeoValidator        : claims, attributions documentées, answer nuggets, source quality
  → CulinaryValidator   : ratios plausibles, temps de cuisson, cohérence des ingrédients
  → LoopScorer          : composite GEO(60%) + Content(25%) + Structure(15%)

PASS   = score >= 65 AND zero food safety violations
RETRY  = truncation (ingrédients/instructions incomplets) — max 1 retry
REJECT = food safety violation OR word count < minWords OR score < 40
```

Le `minWords` est déterminé par le format choisi :
- `pin-first` : 1200 mots minimum
- `google-first` : 1800 mots minimum

Le format est passé au Quality Gate via `validate(output, { format, nicheProfile })`.

### Adaptations vs le blueprint

| Élément | Blueprint | RecipeForge |
|---|---|---|
| LLM primaire | DeepSeek v4 Pro | Gemini 2.5 Pro |
| LLM fallback | Anthropic Claude | DeepSeek v4 Pro |
| Science Enricher | Agent LLM séparé | Intégré dans le skill Chef Augustin |
| Format | Pin-First uniquement | Pin-First ou Google-First (radio) |
| Niche | "dinners for two" codé en dur | Niche Registry paramétrable |
| Langue | Français uniquement | Configurable par niche (Phase 1: FR uniquement) |
| Inngest | Orchestrateur | Aucun — async/await direct |

### Ce qui est inchangé
- Système de skills Markdown (`lib/skills.ts`)
- JSON repair (`json-utils.ts`)
- JSON-LD @graph (Recipe + BlogPosting + FAQPage + BreadcrumbList)
- Règles food safety USDA
- Pattern provider abstraction
- Rate limiter

---

## 5. Structure du Projet & Migration

### Arborescence

```
recipe-forge/
├── .env.local
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.mjs
│
├── skills/                           ← ⬅️ Copiés du blueprint, adaptés
│   ├── strategist.md
│   ├── chef-augustin.md
│   ├── pin-designer.md
│   └── README.md
│
├── data/niches/                      ← 🆕
│   ├── default.json
│   ├── italienne.json
│   ├── japonaise.json
│   └── ...
│
├── lib/
│   ├── engine/                       ← 🆕
│   │   ├── pipeline.ts
│   │   ├── runner.ts
│   │   └── retry.ts
│   │
│   ├── agents/                       ← ⬅️ Adaptés
│   │   ├── provider.ts
│   │   ├── strategist.ts
│   │   ├── chef-augustin.ts
│   │   ├── pin-designer.ts
│   │   ├── serp.ts
│   │   └── json-utils.ts
│   │
│   ├── validators/                   ← ⬅️ Adaptés
│   │   ├── content-validator.ts
│   │   ├── geo-validator.ts
│   │   ├── culinary-validator.ts
│   │   └── loop-scorer.ts
│   │
│   ├── niche-registry.ts             ← 🆕 Charge les profils, configure skills + validateurs
│   │
│   ├── exporters/                    ← 🆕
│   │   ├── markdown-exporter.ts
│   │   ├── json-exporter.ts
│   │   └── wordpress-exporter.ts
│   │
│   ├── db/                           ← 🆕
│   │   ├── schema.ts                 ← 2 tables: recipes, pins
│   │   └── queries.ts
│   │
│   ├── skills.ts                     ← ⬅️ Copié
│   ├── types.ts                      ← ⬅️ Adapté
│   ├── slug.ts                       ← ⬅️ Copié
│   └── rate-limit.ts                 ← ⬅️ Copié
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      ← Generator
│   ├── history/
│   │   └── page.tsx                  ← History
│   └── api/
│       ├── generate/
│       │   └── route.ts              ← POST (crée une recipe en status='running', lance pipeline async)
│       ├── recipes/
│       │   ├── route.ts              ← GET (liste)
│       │   └── [id]/
│       │       ├── route.ts          ← GET (détail + statut polling) + DELETE
│       │       ├── download/
│       │       │   └── route.ts       ← GET (zip du dossier)
│       │       └── regenerate/
│       │           └── route.ts      ← POST
│       └── niches/
│           └── route.ts              ← GET
│
├── components/
│   ├── generate-form.tsx
│   ├── progress-tracker.tsx
│   ├── result-card.tsx
│   ├── pin-prompts-list.tsx
│   ├── history-table.tsx
│   ├── history-filters.tsx
│   └── ui/
│
├── output/
│   ├── .gitkeep
│   ├── {niche}/{slug}/
│   │   ├── content.md
│   │   ├── meta.json
│   │   ├── blog-image-prompt.txt
│   │   └── pin-prompts.json
│   └── json/{niche}/
│       └── {slug}.json
│
└── __tests__/                        ← ⬅️ Adaptés du blueprint
    ├── content-validator.test.ts
    ├── geo-validator.test.ts
    ├── loop-scorer.test.ts
    └── pipeline.test.ts
```

### .gitignore

```gitignore
# Générations
output/*
!output/.gitkeep

# Secrets
.env.local

# Build
.next/
```

### Scripts npm

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

Pas de `concurrently` — pas d'Inngest à lancer en parallèle.

### Fichiers copiés du blueprint (14 fichiers)

| Source (`ai-blog-builder`) | Destination (`recipe-forge`) | Modification |
|---|---|---|
| `skills/agent-strategist.md` | `skills/strategist.md` | + `{{nicheProfile}}`, `{{format}}` |
| `skills/agent-chef-augustin.md` | `skills/chef-augustin.md` | + Section Science, + `{{nicheProfile}}`, `{{format}}` |
| `skills/agent-pin-designer.md` | `skills/pin-designer.md` | + `{{nicheProfile}}` |
| `lib/agents/provider.ts` | `lib/agents/provider.ts` | Gemini primary, DeepSeek fallback |
| `lib/agents/serp.ts` | `lib/agents/serp.ts` | Inchangé |
| `lib/agents/json-utils.ts` | `lib/agents/json-utils.ts` | Inchangé |
| `lib/content-validator.ts` | `lib/validators/content-validator.ts` | + `nicheId` → foodSafety config |
| `lib/geo-validator.ts` | `lib/validators/geo-validator.ts` | + `nicheId` → thresholds config |
| `lib/culinary-validator.ts` | `lib/validators/culinary-validator.ts` | Inchangé |
| `lib/loop-scorer.ts` | `lib/validators/loop-scorer.ts` | Inchangé |
| `lib/skills.ts` | `lib/skills.ts` | Inchangé |
| `lib/rate-limit.ts` | `lib/rate-limit.ts` | Inchangé |
| `lib/slug.ts` | `lib/slug.ts` | Inchangé |
| `lib/types.ts` | `lib/types.ts` | + NicheProfile, Recipe, Pin |

### Fichiers NON copiés (et pourquoi)

| Fichier blueprint | Raison |
|---|---|
| `lib/inngest/**` | Plus d'Inngest |
| `lib/db/schema.ts` | Nouveau schéma 2 tables |
| `lib/queries.ts` | Nouvelles queries |
| `lib/cluster-resolver.ts` | SEO topical authority — spécifique blog |
| `lib/internal-linker.ts` | Liens internes — blog |
| `lib/topical-map.ts` | Architecture clusters — blog |
| `lib/pre-generation-gate.ts` | Remplacé par Niche Registry (`lib/niche-registry.ts`) |
| `app/recettes/**`, `app/guides/**`, `app/idees/**` | Pages blog |
| `components/recipe-card.tsx`, `article-card.tsx` | Composants blog |
| `data/launch-plan.json` | Spécifique "dinners for two" |
| `data/enriched-briefs.json` | Spécifique "dinners for two" |
| `docs/topical-authority-architecture.md` | Architecture blog |
| `scripts/*` | Scripts batch blog |

### Taille estimée

| Composant | Lignes |
|---|---|
| Core Engine (pipeline + runner + retry) | ~300 |
| Agents (3 runtime + provider + serp) | ~400 |
| Validateurs (4 fichiers) | ~800 |
| Niche Registry | ~100 |
| Exporters (3 fichiers) | ~200 |
| DB (schema 2 tables + queries) | ~130 |
| API Routes (7 endpoints) | ~280 |
| Dashboard (2 pages + 7 composants) | ~500 |
| Skills (3 fichiers Markdown) | ~800 |
| Niche profiles (10 profils JSON) | ~500 |
| Tests | ~400 |
| **Total** | **~4410 lignes** |

Comparaison : `ai-blog-builder` = ~15 000 lignes. RecipeForge = ~4 410 lignes. On retire le blog, Inngest, le SEO topical authority, le frontend public, les scripts batch.

---

## 6. Gouvernance & Contraintes

### Règles Karpathy appliquées

1. **Simplicité d'abord** — Pas d'Inngest alors que async/await suffit. Pas d'éditeur intégré alors que l'export fichier suffit. Pas de batch tant que le mode single n'est pas éprouvé.
2. **Changements chirurgicaux** — Le blueprint ne change pas. On copie 14 fichiers, on les adapte, on construit le nouveau autour.
3. **LLM generates, code enforces** — Quality Gate 100% déterministe. Le LLM est créatif, le code est correctif.
4. **Testabilité** — Core Engine sans dépendance framework, chaque validateur testable en isolation.

### Ce qui est repoussé en Phase 2

- Mode batch (N recettes d'un coup)
- Éditeur de recettes intégré au dashboard
- Publication WordPress live
- Support multilingue (EN, ES, etc.)
- Analytics dashboard (scores par niche, tendances)
- Cache SERP pour mots-clés fréquents
- Export Medium, Substack, Ghost

### Variables d'environnement

```bash
GEMINI_API_KEY=           # Google AI Studio
DEEPSEEK_API_KEY=         # Fallback
SERPER_API_KEY=           # SERP live
DATABASE_URL=             # Neon PostgreSQL
CRON_SECRET=              # (réservé Phase 2 si batch planifié)
```

---

## 7. Validation Design

### Checklist de conformité

- [x] Pipeline linéaire, single-pass, pas de boucle
- [x] 3 appels LLM max par recette (Strategist, Chef Augustin, Pin Designer)
- [x] Quality Gate 100% déterministe (pas de LLM dans l'évaluation)
- [x] LLM + Code = double filet de sécurité
- [x] Skills paramétrés par niche (pas de duplication)
- [x] Exporters isolés (Markdown + JSON + WordPress-ready)
- [x] Dashboard minimal (lancement + suivi, pas d'édition)
- [x] Neon DB pour l'historique, pas pour le serving blog
- [x] Gemini primaire, DeepSeek fallback
- [x] Pas d'Inngest — async/await direct
- [x] Pas de SSE — polling HTTP (compatible Vercel serverless)
- [x] 14 fichiers copiés du blueprint, adaptés de façon chirurgicale
- [x] ~4 410 lignes vs 15 000 (élagage 71%)
- [x] Projet séparé — le blueprint ne change pas
