
# AI AutoBlog — CLAUDE.md
> MàJ : 2026-06-27 — Sprint 5 SEO/GEO terminé

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
| Cloudflare Workers AI | — | Génération texte (GPT-OSS-120B) + image (FLUX-1-Schnell) |
| NaraRouter | — | LLM primaire (Mistral Medium 3.5, fallback Cloudflare) |
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
  generate-recipe.ts        — Workflow Inngest (12 étapes, 878 lignes)
  agents/strategist.ts      — Agent 1 : plan SEO/GEO (v5.3 — V2 StructuredSerp input)
  agents/writer.ts          — Agent 2 : rédaction Chef Augustin (v5.3)
  agents/auditor.ts         — Agent 3 : évaluation 8 critères + AI score (v5.1)
  agents/editor.ts          — Agent 4 : correction + humanisation (v5.2)
  agents/qa.ts              — Agent 5 : vérification cross-agent (v1.1 LIGHT)
  agents/image-prompt-optimizer.ts — Optimisation prompt image 10 couches (v2.1)
lib/agents/                 — Clients API (serp, serp-structurer, cloudflare, cloudinary, nararouter)
lib/db/                     — Schema Drizzle + connexion pool singleton
skills/                     — System prompts Markdown (6 agents + food-photography)
app/api/                    — 12 routes (recipes CRUD, auth, inngest, calibration, A/B)
app/actions/                — Server Actions (publish, unpublish, delete, cancel, approve)
middleware.ts               — Auth cookie dashboard
lib/queries.ts              — Fonctions DB + getCalibrationStats()
lib/skills.ts               — loadSkillContent() + buildDefaultPrompt()
lib/rate-limit.ts           — Rate limiter in-memory
lib/slug.ts                 — slugify()
lib/utils.ts                — cn() tailwind-merge
```

## Pipeline — 12 étapes

```
SERP → Strategist → Writer → Auditor → [Human Review 7j] → Editor (max 3 passes) → QA → Image Prompt → Image Gen (A/B) → Self-Improvement → Persist → A/B Tracking
```

| # | Agent | Version | Rôle |
|---|---|---|---|
| 1 | Strategist | v5.2 ULTRA | Plan SEO/GEO + competitor weakness exploitation + FAQ 5Q |
| 2 | Writer | v5.3 ULTRA | 1800-2200 mots, FAQ 5Q, Why This Works, Nutrition Highlights |
| 3 | Auditor | v5.1 ULTRA | Évaluation 8 critères + AI Score + corrections factuelles |
| 4 | Editor | v5.2 ULTRA | Correction chirurgicale + humanisation (max 3 passes) |
| 5 | QA | v1.1 LIGHT | Vérification cross-agent (résumés structurés) |
| 6 | Image Optimizer | v2.1 ULTRA | Prompt food photography 10 couches |

## État réel (post-Sprint 5)

✅ 6 agents IA chargés au runtime via `loadSkillContent()`
✅ Boucle feedback fermée (Auditor + QA → self_improvement_logs → Strategist)
✅ QA hard-fail sur REJECT/CRITICAL (throw Error)
✅ Calibration AI Score (endpoint GET /api/self-improvement/calibration)
✅ A/B testing images multi-variant (endpoints track + stats)
✅ PAA fallback (8 questions synthétiques si Serper vide)
✅ Concurrency: 3 (non bloquant)
✅ Audit complet : 89/100 (rapports v1 et v2 disponibles)
✅ SEO Sprint 5 : contenu 1800-2200 mots, FAQ 5Q, @graph JSON-LD (Recipe+FAQPage+BlogPosting+BreadcrumbList), Why This Works, Nutrition Highlights, competitor weakness exploitation, canonical URL, page auteur /about, slug propre
✅ Agent 0 — SERP Data Structurer : transformation déterministe Serper brut → StructuredSerp (competitor normalization, intent classification, topic extraction, question dedup, gap analysis, E-E-A-T). Step 1.5 dans le pipeline.

## Variables d'environnement requises

```env
# Base de données (REQUIS)
DATABASE_URL=

# SERP — Serper.dev (REQUIS)
SERPER_API_KEY=

# IA — Cloudflare Workers AI (REQUIS)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# LLM primaire — NaraRouter (optionnel, fallback Cloudflare si absent)
NARAROUTER_API_KEY=

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
```

## Règles globales

- **Après toute modification du pipeline** : `npx tsc --noEmit` obligatoire
- **Ne jamais renommer un step Inngest** existant (casse le versioning des workflows)
- **Ne jamais modifier un skill Markdown** sans vérifier l'agent runtime correspondant
- **Ne pas changer l'ordre des étapes** du pipeline sans comprendre les dépendances
- Les variables d'env sont documentées dans `.env.example` — ne pas les hardcoder

## Contrats inter-agents (attention)

- Writer v5.2 ne génère PAS `imagePrompt` → Image Optimizer le crée from scratch
- Editor v5.2 aligné avec Writer v5.2 — n'attend plus `imagePrompt` dans son schéma (corrigé)
- QA v1.1 Check 4 n'exige plus `imagePrompt` (corrigé — aligné Writer v5.2)
- Auditor reçoit l'article complet (plus de troncature 3000 chars)
- Strategist limite à 10 leçons max dans le prompt (v5.1 Section 15)
