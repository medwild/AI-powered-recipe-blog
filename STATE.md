# AI AutoBlog — Project State
> Last updated: 2026-07-13 | Session: Lancement Prep

## ⛔ Critical Blocker
**ANTHROPIC_API_KEY** — Claude Sonnet 4.6 API key required for content generation.
DeepSeek v4 Pro is available as fallback but produces subpar content (0/4 nuggets, 1-3/6 attributions).

## Architecture Status

### Pipeline v11 — Loop-Engineered ✅
5 steps: SERP → Content Loop (Evaluator-Optimizer, max 3 passes) → Images → Persist → Pins
3 agents: Strategist (LLM plan) → Chef Augustin (LLM write) → Judge (LLM eval)
4 validators: GEO (286 lines), Content (654 lines), Loop Scorer (278 lines), Culinary

### Fixes Applied (2026-07-13)
- ✅ **P0 — USDA CRITICAL tier**: Food safety violations now ERROR (block even in Autopilot)
  - Chicken <165°F, ground meat <160°F, pork/fish <145°F → BLOCKED
  - `validateFoodSafety()` severity: "warning" → "error" with "CRITICAL Food safety:" prefix
  - `persist-phase.ts` hasStructuralErrors includes food safety
  - `loop-constraints.md` updated
- ✅ **P1 — Judge rebalancing**: Weight reduced from 40% → 20%, GEO from 30% → 50%
  - Eliminates systemic evaluation distortion from weak Haiku 4.5 model
  - `lib/loop-scorer.ts` updated with new v2 weighting
- ✅ **Route `/idees`**: New category route created
  - `app/idees/page.tsx` + `app/idees/[slug]/page.tsx`
  - `CategoryListing` CATEGORY_LABELS updated
  - `sitemap.ts` updated
  - `routing-seo.md` updated (§1.2 + §1.4)

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
- `vercel.json` configured (Next.js, region cdg1)
- Routes ready: `/`, `/recettes`, `/recettes/[slug]`, `/idees`, `/idees/[slug]`, `/guides`, `/guides/[slug]`, `/about`, `/dashboard`
- Sitemap, robots.txt, RSS, JSON-LD all configured

## Next Steps (when ANTHROPIC_API_KEY is available)

1. Set `ANTHROPIC_API_KEY=<key>` in `.env.local`
2. Start server: `npm run dev` + Inngest Dev
3. Dry-run test: `node scripts/generate-launch-batch.mjs --wave 1 --dry-run`
4. Generate Wave 1: `node scripts/generate-launch-batch.mjs --wave 1`
5. Monitor: `http://localhost:8288` (Inngest Dev)
6. Deploy to Vercel: `vercel --prod`
7. Submit sitemap to Google Search Console
8. Create Pinterest account + 6 boards + seed engagement

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
