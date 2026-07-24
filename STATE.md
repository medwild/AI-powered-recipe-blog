# AI AutoBlog — Project State
> Last updated: 2026-07-24 | Session: Pipeline v14.1 — Root Cause Fix + Karpathy Simplification

## Pipeline v14.1 — Stable ✅

### Root cause fix (Zod v4)
- `zodToJsonSchema` in `chef-augustin.ts` was written for Zod v3 API (`def.typeName`)
- Zod v4 uses `def.type` — every field fell through to `{ type: "string" }`
- Gemini's `responseSchema` told it `ingredients` and `instructions` were strings, not arrays
- **Fixed**: converter rewritten for Zod v4 — `def.type`, `def.element`, `field.description`

### Before/After (recipe #70 — "lemon butter shrimp pasta for two")
| Metric | Before (avg #67-#69) | After (#70) |
|--------|---------------------|-------------|
| Ingredients (JSON) | 1.7 items (semicolon-packed) | 11 items (clean strings) |
| Instructions (JSON) | 0.7 steps | 6 steps (structured objects) |
| Parse quality | Garbage | Clean quantity/name pairs |

### Changes — 2026-07-24
| File | Change |
|------|--------|
| `lib/pipeline/agents/chef-augustin.ts` | Zod v4 converter, removed semicolon hack, simplified fallback, fixed parseIngredient regex |
| `lib/quality-gate.ts` | Include `instructions[].temperature` in USDA food safety scan (P0 audit) |
| `skills/chef-augustin-mega.md` | New §7 (HARD CONSTRAINT — templates, quantity targets), §3/§5 dual-output language |

### 5-step pipeline
SERP → Mega-Skill (Gemini Flash 3) → Quality Gate (4 checks) → Persist → Image (Ideogram V4) → SEO Gate
- CLI: `npx tsx scripts/generate.ts "keyword"` — ~70s, 1200-1500+ mots
- Primary model: Gemini Flash 3 (gratuit, 4-key rotation, structured output)
- Fallback: gpt-oss-120b (Cloudflare Workers AI)
- Escalade: Claude Opus 4.8 (via ZenMux — pages piliers)

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

### Bug fixes & enhancements (2026-07-24)
- **ROOT CAUSE**: `zodToJsonSchema` Zod v3→v4 — Gemini recevait `{ type: "string" }` pour les arrays
- `lib/pipeline/agents/chef-augustin.ts` — `normalizeRecipeArticle()`, extraction markdown (indexOf, pas regex lookahead), `### N.` + `### Step N` support
- `lib/quality-gate.ts` — défense types, scan `temperature` field, minimum 3 H2
- `lib/agents/provider.ts` — GeminiProvider (structured output natif, key rotation 4 clés), cleanSchema
- `lib/agents/ideogram.ts` — V4 upgrade (multipart/form-data, `text_prompt`)
- `components/recipe-article-body.tsx` — `stripDuplicateSections()` conditionnel

### Created (2026-07-24)
- `data/pinterest-boards.json` — 13 board definitions ✅
- `scripts/pin-brief.ts` — 5 variants par recette ✅
- `lib/agents/provider.ts` — GeminiProvider + CloudflareProvider
- Tested: 3 recipes generated (#67-#69), root cause identified, #70 validates the fix

### Next
1. **Générer volume** — ~25 articles pour candidature AdSense
2. **Créer `scripts/weekly-generate.ts`** — batch generator
3. **Vérifier Rich Pins** — 24h après 1er Pin → check metadata
4. **Ajouter email capture + Shop this recipe** (Spec V2)
5. **Créer pages About/Contact** pour AdSense

### Strategy Summary
- 13 boards keyword-rich, PTRA-aligned
- 5 pin variants per recipe (different text overlay angles)
- 1-3 fresh pins/day, 3 articles/week cadence
- 70 articles planned across 5 clusters
- Pinterest (amorçage M1-M6) → Google SEO (relais M6+)

## DB State
- 9 published (legacy bread + test recipes)
- 1 draft (#70 — lemon butter shrimp pasta, clean structured data — validates v14.1 fix)
- ~6 drafts from failed Zod v3 attempts (#61-#67 "one pan garlic herb" — cannibalization, can be cleaned)

## Key Files
| File | Purpose |
|---|---|
| `docs/superpowers/specs/2026-07-23-pinterest-strategy-design.md` | Full Pinterest strategy (13 boards, specs, timeline) |
| `docs/superpowers/plans/2026-07-23-pinterest-implementation.md` | Implementation plan (7 tasks, Rich Pins step OBSOLETE) |
| `data/pinterest-boards.json` | Board definitions (13 boards) ✅ |
| `scripts/pin-brief.ts` | Pin brief generator — 5 variants per recipe ✅ |
| `scripts/weekly-generate.ts` | Weekly batch generator (to be created) |
