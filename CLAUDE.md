# AI AutoBlog — CLAUDE.md
> MàJ : 2026-07-11 — Pipeline v11 Loop-Engineered, Agent Unique Chef Augustin

## Stack

| Technologie | Version | Usage |
|---|---|---|
| Next.js (App Router) | 16.2.9 | Framework full-stack React |
| React | 19 | UI components |
| TypeScript | 5.7.3 | Langage |
| Tailwind CSS | 4.2.0 | Styling utility-first |
| shadcn/ui | 4.8.0 | Composants UI |
| Drizzle ORM | 0.45.2 | ORM TypeScript type-safe |
| Drizzle Kit | 0.31.10 | Push de schéma |
| Neon (PostgreSQL) | serverless | Base de données |
| Inngest | 4.7.0 | Background job engine |
| Anthropic (Claude Sonnet 4.6) | — | LLM primaire — Agent Chef Augustin |
| DeepSeek v4 Pro | — | LLM fallback (via proxy Anthropic-compatible) |
| Cloudflare Workers AI | — | Fallback image (FLUX-1-Schnell) |
| Ideogram v4 Turbo | — | Génération image food photography 2:3 (fallback Cloudflare) |
| Serper.dev | — | Analyse SERP Google |
| Cloudinary | 2.10.0 | Hébergement CDN images |
| React Markdown | 10.1.0 | Rendu Markdown → HTML |
| Sonner | 2.0.7 | Toast notifications |

## Commandes

- `npm run dev` — Next.js (Turbopack, port 3000) + Inngest Dev (port 8288)
- `npm run dev:next` — Next.js uniquement
- `npm run inngest:dev` — Inngest Dev uniquement
- `npm run build` — Build production
- `npm run start` — Serveur production
- `npm run lint` — ESLint
- `npm run test:e2e` — Test workflow complet (nécessite serveur running + clés API)
- `npx drizzle-kit push` — Sync schéma → Neon
- `npx drizzle-kit studio` — Explorer la DB (Drizzle Studio)
- `npx tsc --noEmit` — Vérification types (obligatoire après modification pipeline)

## Architecture

```
lib/inngest/functions/
  generate-recipe.ts              — Workflow Inngest (8 étapes, orchestrateur v11)
  agents/chef-augustin.ts         — Agent unique : contenu + SEO + JSON-LD + image prompt
  agents/pin-designer.ts          — Agent Pin Designer : 5 pins par recette
  steps/
    serp-phase.ts                 — Google SERP analysis (Serper API)
    content-loop-phase.ts         — Evaluator-Optimizer (Writer → Validators → Feedback, max 3 passes)
    image-phase.ts                — FLUX-1 → Cloudinary
    persist-phase.ts              — Validation + DB write (double safety net)
    pin-phase.ts                  — Pin Designer orchestration
lib/agents/                       — Clients API (serp, serp-structurer, cloudflare, cloudinary, anthropic)
lib/db/                           — Schema Drizzle + connexion pool singleton
skills/                           — System prompts Markdown (agent-chef-augustin, agent-pin-designer)
app/api/                          — 12 routes (recipes CRUD, auth, inngest, calibration, A/B)
app/actions/                      — Server Actions (publish, unpublish, delete, cancel, approve)
middleware.ts                     — Auth cookie dashboard
lib/queries.ts                    — Fonctions DB + getCalibrationStats()
lib/skills.ts                     — loadSkillContent() + buildDefaultPrompt()
lib/rate-limit.ts                 — Rate limiter in-memory
lib/slug.ts                       — slugify()
lib/utils.ts                      — cn() tailwind-merge
```

## Pipeline — 8 étapes (v11 Loop-Engineered)

```
SERP → Content Loop (Evaluator-Optimizer, max 3 passes) → Persist Draft → Human Review → Images → Final Persist + Validation → A/B Stats → Pin Designer
```

### Agent Unique — Chef Augustin

| Paramètre | Valeur |
|---|---|
| Modèle primaire | Claude Sonnet 4.6 |
| Modèle fallback | DeepSeek v4 Pro (via proxy Anthropic-compatible) |
| Temperature | 0.8 |
| Max tokens | 8192 |
| Skill | `skills/agent-chef-augustin.md` |

L'agent unique gère en un seul appel LLM : analyse SERP interne, structuration de l'article (format Google ou Pin-First), rédaction complète, auto-édition, génération de prompt image, et production JSON-LD.

### Content Loop (Evaluator-Optimizer)

Le pattern loop-engineering (Cobus Greyling) appliqué à la génération de contenu :
- **Maker** : Agent Chef Augustin (LLM) — génère le contenu
- **Checker** : Validateurs déterministes (code pur, pas de LLM) — évalue la qualité
- **Feedback** : `buildLoopFeedback()` — instructions structurées injectées dans le prompt du passage suivant
- **Stopping rules** : seuil de qualité atteint, rendements décroissants, max 3 passes

Validateurs déterministes utilisés :
- `lib/geo-validator.ts` : Citability score (claims, attributions, answer nuggets)
- `lib/content-validator.ts` : Banned words, health claims, structure, word count
- `lib/loop-scorer.ts` : Score composite (GEO 50% + Content 30% + Structure 20%)

### Pin Designer

| Paramètre | Valeur |
|---|---|
| Modèle | Claude Sonnet 4.6 |
| Skill | `skills/agent-pin-designer.md` |
| Output | 5 pins par recette (titles, descriptions, image prompts) |

## État réel (post-Sprint 6 — 2026-07-11)

✅ Agent unique Chef Augustin (1 LLM call au lieu de 6)
✅ Content Loop Evaluator-Optimizer (max 3 passes)
✅ Validateurs déterministes (GEO citability + Content validation)
✅ Boucle feedback structurée (prompt injection)
✅ GEO thresholds calibrés pour Claude Sonnet 4.6
✅ Autopilot mode (AUTOPILOT=true)
✅ A/B testing images multi-variant
✅ PAA fallback (8 questions synthétiques si Serper vide)
✅ ContentValidator + SEO Gate (double filet de sécurité)
✅ JSON-LD @graph (Recipe + BlogPosting + FAQPage + BreadcrumbList)
✅ STATE.json pour le suivi d'état (format JSON natif)
✅ Batch generation script (`scripts/batch-generate.mjs`)

## Variables d'environnement requises

```env
# Base de données (REQUIS)
DATABASE_URL=

# SERP — Serper.dev (REQUIS)
SERPER_API_KEY=

# IA — Anthropic (REQUIS pour Claude Sonnet 4.6)
ANTHROPIC_API_KEY=

# IA — Cloudflare Workers AI (REQUIS pour fallback image)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# IA — DeepSeek (optionnel, fallback texte si Anthropic indisponible)
# Configurer ANTHROPIC_BASE_URL=https://api.deepseek.com/v1
# et ANTHROPIC_AUTH_TOKEN=<clé DeepSeek>

# Images — Cloudinary (REQUIS)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Dashboard auth (REQUIS — openssl rand -hex 32)
DASHBOARD_SECRET_TOKEN=

# Rate limiting (optionnel, défaut: 3)
RATE_LIMIT_MAX_PER_MINUTE=3

# Image variants A/B (optionnel, défaut: 2, max: 3)
IMAGE_VARIANT_COUNT=2

# Paramètres géographiques SERP (défaut: us/en)
SERP_GL=us
SERP_HL=en

# Auto-approve (défaut: false — bypass review humaine pour CI/test)
AUTO_APPROVE=false

# Autopilot (défaut: false — mode zéro intervention humaine)
AUTOPILOT=false

# GEO thresholds (défaut calibré Claude Sonnet 4.6)
GEO_CLAIMS_MIN=6
GEO_ATTRIBUTIONS_MIN=4
GEO_NUGGETS_MIN=4
GEO_BLOCK_THRESHOLD=70
GEO_WARN_THRESHOLD=70

# Content Loop
LOOP_MAX_PASSES=3
```

## Règles globales

- **Avant toute modification** : lire `.claude/rules/global.md` — 15 règles absolues NEVER + checklist
- **Avant toute modification du routing** : lire `.claude/rules/routing-seo.md` — architecture, SEO, content_type, patterns intouchables
- **Après toute modification du pipeline** : `npx tsc --noEmit` obligatoire
- **Ne jamais renommer un step Inngest** existant (casse le versioning des workflows)
- **Ne jamais modifier un skill Markdown** sans vérifier l'agent runtime correspondant
- **Ne pas changer l'ordre des étapes** du pipeline sans comprendre les dépendances
- Les variables d'env sont documentées dans `.env.example` — ne pas les hardcoder

## Contrats inter-agents

Un seul agent (Chef Augustin) — pas de contrats inter-agents. Le Content Loop gère la qualité via feedback déterministe.

- **Chef Augustin → Content Loop** : `ChefAugustinOutput` (JSON complet : titre, meta, contenu markdown, ingrédients, instructions, tags, temps, imagePrompt, jsonLd)
- **Content Loop → Persist** : Meilleur `ChefAugustinOutput` après max 3 passes d'évaluation

## Self-Improvement (boucle fermée)

- Les logs d'amélioration sont écrits dans `self_improvement_logs` (DB) via `persist-phase.ts`
- Le Content Loop est le mécanisme principal d'amélioration qualité (feedback déterministe injecté dans le prompt)
- Les validateurs déterministes (GEO citability + Content validation) sont la source de vérité
