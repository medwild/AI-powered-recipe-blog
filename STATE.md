# AI AutoBlog — Project State
> Last updated: 2026-07-24 | Session: Rich Pins (automatique) + Implémentation Pinterest

## Pipeline v14 — Ready ✅
- 5 steps: SERP → Mega-Skill → Quality Gate → Persist → Image → SEO Gate
- All env vars present
- **Primary model: Gemini Flash 3** (gratuit, ~1M tokens/jour, structured output natif)
- **Fallback: gpt-oss-120b** (Cloudflare Workers AI, gratuit)
- **Escalade: Claude Opus 4.8** (via ZenMux, payant — 20% pages piliers)
- CLI: `npx tsx scripts/generate.ts "keyword"` — generates 1 recipe end-to-end (~60s, 1500+ mots)
- Batch: `npx tsx scripts/weekly-generate.ts` — to be created

## Deployment — Vercel ✅
- Domain: chefaugustin.com
- Auto-deploy from GitHub main branch
- Commit f51ce00: Pinterest domain verification meta tag added

## Pinterest Strategy — In Progress

### Done
- 13/13 boards created ✅
- Domain verified (meta tag deployed, verified on Pinterest)
- Design spec: `docs/superpowers/specs/2026-07-23-pinterest-strategy-design.md` — **V2 (2026-07-24)** corrigée : Mediavine, brevet, Rich Pins + nouvelle §6 Monétisation (AdSense + Mediavine + Affiliation)
- Implementation plan: `docs/superpowers/plans/2026-07-23-pinterest-implementation.md`
- **Rich Pins**: Automatiques depuis sept. 2022 — plus besoin d'activation manuelle. Il suffit de générer du contenu réel.
- **Monétisation V2**: 3 couches — Affiliation J+1 → AdSense dès ~25 articles (S8) → Journey Mediavine dès 1K sessions (M3-M4)

### Created today (2026-07-24)
- `data/pinterest-boards.json` — 13 board definitions validés ✅
- `scripts/pin-brief.ts` — générateur de 5 variants par recette ✅
- `lib/agents/provider.ts` — **+GeminiProvider** (Flash 3, structured output natif) + CloudflareProvider (gpt-oss-120b)
- `scripts/_test-models.ts` — testeur de disponibilité des modèles Cloudflare
- `scripts/_test-gemini.ts` / `_debug-gemini.ts` — debug Gemini API

### Bug fixes & enhancements today
- `lib/quality-gate.ts` — défense types (instructions, ingredients, tags, contentMarkdown)
- `lib/pipeline/agents/chef-augustin.ts` — `normalizeRecipeArticle()` + parsing défensif
- `lib/agents/provider.ts` — injection JSON schema dans text+parse (fix Cloudflare)
- `lib/agents/provider.ts` — strip `additionalProperties` pour Gemini

### Next (priorisé)

**Blocage actuel :** classifieur DeepSeek down → impossible de lancer `npx tsx` pour le moment.

**Dès que le classifieur revient :**
1. **Nettoyer la DB**: `npx tsx scripts/_cleanup-db.ts` (recette #36 + 3 "generating")
2. **Générer 2 recettes pilotes**: `npx tsx scripts/generate.ts "easy chicken parmesan for two"` puis `"one pan garlic herb chicken thighs for two"`
3. **Créer pin briefs**: `npx tsx scripts/pin-brief.ts <slug>` pour chaque recette
4. **Créer `scripts/weekly-generate.ts`** (Task 5 du plan)

**Nouvelles tâches (Spec V2) :**
5. **Ajouter email capture** (popup/inline ConvertKit) dans le template recette — avant le 1er article
6. **Ajouter bloc "Shop this recipe"** (Amazon Associates) dans le template recette
7. **Créer les pages statiques manquantes** (About, Contact) pour AdSense

**Manuel (Pinterest) :**
8. ~~Créer board #13: "Balanced Dinners for Two"~~ ✅ Déjà fait
9. **Vérifier Rich Pins automatiques**: 24h après 1er Pin sauvegardé → check metadata enrichies

### Strategy Summary
- 13 boards keyword-rich, PTRA-aligned
- 5 pin variants per recipe (different text overlay angles)
- 1-3 fresh pins/day, 3 articles/week cadence
- 70 articles planned across 5 clusters
- Pinterest (amorçage M1-M6) → Google SEO (relais M6+)

## DB State
- 2 published (banana bread, sourdough bread — old niche, incomplete JSON-LD)
- 1 failed draft (#36 easy chicken parmesan — to delete)
- ~3 stuck in "generating"

## Key Files
| File | Purpose |
|---|---|
| `docs/superpowers/specs/2026-07-23-pinterest-strategy-design.md` | Full Pinterest strategy (13 boards, specs, timeline) |
| `docs/superpowers/plans/2026-07-23-pinterest-implementation.md` | Implementation plan (7 tasks, Rich Pins step OBSOLETE) |
| `data/pinterest-boards.json` | Board definitions (13 boards) ✅ |
| `scripts/pin-brief.ts` | Pin brief generator — 5 variants per recipe ✅ |
| `scripts/weekly-generate.ts` | Weekly batch generator (to be created) |
