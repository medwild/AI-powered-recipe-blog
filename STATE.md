# AI AutoBlog — Project State
> Last updated: 2026-07-21 | Session: Préparation déploiement Hostinger

## ⛔ Critical Blocker
**ANTHROPIC_AUTH_TOKEN** — DeepSeek v4 Pro API key required for content generation.
Anthropic Claude available as secondary provider via `LLM_PROVIDER=anthropic`.

## Architecture Status

### Pipeline v13 — Single-Pass ✅
5 steps: SERP → Strategist → Writer → Quality Gate → Persist → Images → Pins
2 agents: Strategist (LLM plan) → Chef Augustin (LLM write)
Science Enricher (LLM, retry-only, food science enrichment)
4 validators: GEO, Content (654 lines), Loop Scorer, Culinary, Image

### Audit Karpathy v13 (2026-07-18) ✅
- Score initial: 72/100 → Score final: **92/100** (+20 points)
- 6 phases de corrections, 27 fichiers modifiés
- 3 bugs critiques corrigés (scoring, culinary dead, tests cassés)
- 3 fichiers morts archivés: `serp-structurer.ts` (1448 lignes), `judge.ts` (129 lignes), `agent-judge.md` (97 lignes)
- Science Enricher intégré dans la boucle de retry (non-bloquant)
- Pipeline Inngest: error handler memoized, pin inserts idempotent, structuredSERP supprimé

### Historique (2026-07-13)
- ✅ P0 — USDA CRITICAL tier: Food safety violations now ERROR (block even in Autopilot)
- ✅ P1 — Judge rebalancing (v12, superseded by v13 single-pass without Judge)
- ✅ Route `/idees`: New category route created

### Topical Authority Architecture ✅
- Central entity: "Easy Weeknight Dinners for Two"
- 5 clusters (3 Core + 2 Outer), 5 pillar pages, Hub & Spokes linking
- 70 keywords niche-pure mapped, 146,980 vol/mensuel
- Full architecture: `docs/topical-authority-architecture.md`

### Keyword Research ✅
- 178 keywords analyzed across 5 CSVs + ~40 manual curation
- 70 niche-pure keywords identified
- 20 quick wins (KD < 20), 32 mid tier (KD 20-25), 18 high KD (26+)
- Launch plan JSON: `data/launch-plan.json`
- Batch script: `scripts/generate-launch-batch.mjs`
  - Usage: `node scripts/generate-launch-batch.mjs --wave 1 [--dry-run]`

### Deployment ✅
- Cible : **Hostinger Business** (Node.js) — pas Vercel
- `vercel.json` conservé comme backup
- Routes ready: `/`, `/recettes`, `/recettes/[slug]`, `/idees`, `/idees/[slug]`, `/guides`, `/guides/[slug]`, `/about`, `/dashboard`
- Sitemap, robots.txt, RSS, JSON-LD all configured

## Next Actions — 2026-07-22

### Déploiement Hostinger Business (Node.js)
**Prérequis déjà remplis :**
- [x] `engines.node: ">=20.9"` dans `package.json`
- [x] `build` + `start` scripts OK
- [x] `package-lock.json` présent (npm détecté automatiquement)
- [x] Bloc `pnpm.overrides` nettoyé
- [x] Pages publiques lisent PostgreSQL directement (Server Components + ISR)
- [x] Aucune API LLM/Inngest nécessaire côté production

**À faire sur hPanel :**
1. **Add Website → Node.js Web App** → Connect with GitHub → repo + branche `main`
2. **Node.js version** : sélectionner **22.x**
3. **Variables d'environnement** :
   - `DATABASE_URL` = `postgresql://...` (Neon, serveur uniquement)
   - `NEXT_PUBLIC_SITE_URL` = `https://chefaugustin.com`
4. **Déployer**
5. **Vérifier** le build log — si échec, debugger
6. **Tester** : homepage, /recettes, /recettes/{slug}, /techniques, /guides, etc.

**Architecture hybride :**
```
Local (dev) : Pipeline IA complet → Inngest → LLM → génération → Neon DB
Hostinger (prod) : Next.js SSR/ISR → lecture Neon DB → pages publiques
```

### Content Generation (quand API keys dispo)
1. Set `ANTHROPIC_API_KEY` ou `DEEPSEEK_API_KEY` dans `.env.local`
2. Start server: `npm run dev` + Inngest Dev
3. Dry-run test: `node scripts/generate-launch-batch.mjs --wave 1 --dry-run`
4. Generate Wave 1: `node scripts/generate-launch-batch.mjs --wave 1`
5. Monitor: `http://localhost:8288` (Inngest Dev)
6. Submit sitemap to Google Search Console
7. Create Pinterest account + 6 boards + seed engagement

## Important Files

| File | Purpose |
|---|---|
| `docs/topical-authority-architecture.md` | Complete semantic architecture |
| `docs/rapport-maturite-ai-autoblog-2026-07-13.md` | Maturity report for LLM peer review |
| `data/launch-plan.json` | 70 articles in 4 waves |
| `data/enriched-briefs.json` | 14 DUAL_CHAMPION briefs with SEO/Pinterest/GEO strategy |
| `scripts/generate-launch-batch.mjs` | Batch generator from launch-plan.json |
| `scripts/analyze-cross-channel.ts` | Permanent cross-channel analysis tool |
| `.env.example` | All required environment variables |
