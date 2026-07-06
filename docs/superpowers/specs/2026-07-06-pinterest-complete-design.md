# Pinterest SERP Hijacking — Design Complet

> **Status:** Draft — awaiting user review
> **Date:** 2026-07-06
> **Sections:** 1-6 (complet)
> **Parent strategy:** [[pinterest-serp-hijacking-strategy]]

---

## Section 1 — Architecture Globale (rappel — approuvée 2026-07-05)

### 1.1 Pivot stratégique

Google-first SEO → **Pinterest SERP Hijacking** : cibler les keywords où Pinterest rank déjà sur Google page 1, concurrencer sur la plateforme Pinterest, pas Google directement.

**Traffic flow:** Google SERP → Pinterest pin/board → Compte spécialisé → chefaugustin.com

### 1.2 Architecture

```
Phase 0: Discovery          Phase 1: Pipeline           Phase 2: Distribution
───────────────────         ──────────────────          ─────────────────────
Semrush export              Inngest (12 steps)           Pinterest boards
     │                            │                     Rich Pins
     ▼                            ▼                     Engagement tracking
Opportunity Scorer          Strategist (Pin-First)
     │                      Writer (Pin-First)           PTRA Editorial
     ▼                      Auditor (seuils unifiés)     Architect
Cluster Builder             Editor (inchangé)
     │                      QA (plage dynamique)
     ▼                      Image Optimizer
Batch Caller ──────────→    Pin Designer
                            ContentValidator
```

### 1.3 Contenu Pin-First

| Attribut | Google-first (actuel) | Pin-First (nouveau) |
|---|---|---|
| Longueur | 1800-2200 mots | 1200-1500 mots |
| Intro | Standard | 50-80 mots max |
| FAQ | 5 Q&A | 3 Q&A |
| Nutrition Highlights | Obligatoire | Supprimé |
| Recipe card | Dans le flux | Au-dessus de la ligne de flottaison |
| JSON-LD | Recipe+FAQ+Blog+Breadcrumb | Recipe+Breadcrumb |

---

## Section 2 — Phase 0 : Découverte automatisée

### 2.1 Data Flow

```
data/pinterest-input.json          ← Export Semrush → JSON
        │
        ▼
scripts/score-opportunities.ts     ← Opportunity Score v2
        │
        ▼
data/pinterest-scored.json
        │
        ▼
scripts/build-clusters.ts          ← Token overlap + mapping sémantique
        │
        ▼
data/pinterest-clusters.json
        │
        ▼
scripts/generate-pinterest-batch.ts ← POST /api/recipes/generate
```

### 2.2 Opportunity Score v2

```
OPPORTUNITY (0-100) = DomainBeatability(35%) + EngagementGap(30%) + SpecializationGap(20%) + URLType(15%)
```

| Facteur | Poids | Logique |
|---|---|---|
| DomainBeatability | 35% | unbeatable=0, very-hard=20, medium=60, weak=90, unknown=100 |
| EngagementGap | 30% | <50→100, 50-200→80, 200-1000→50, 1000-5000→20, 5000+→0. Brand → -30 |
| SpecializationGap | 20% | personal→100, generalist→70, semi-specialized→40, very-specialized→10 |
| URLType | 15% | pin→100, board-small→60, board-large→20 |

**Seuils:** ≥75 HIGH, 65-74 MEDIUM, <65 LOW, domain unbeatable → DISQUALIFIED

### 2.3 Input Format (`data/pinterest-input.json`)

```json
[{
  "keyword": "dirty soda recipes",
  "google_position": 3,
  "pinterest_url_type": "pin",
  "competitor_domain": null,
  "competitor_followers": 101,
  "competitor_account_type": "personal",
  "search_volume": 18100,
  "trending": true,
  "user_problem": "HYPOTHESIS",
  "solution_promise": "HYPOTHESIS"
}]
```

### 2.4 Topical Cluster Builder

Algorithme : token overlap (≥2 tokens significatifs en commun, hors stop words). Fallback : mapping sémantique manuel. Keywords isolés → `orphans`.

### 2.5 PTRA Alignment

- `--niche` requis (Micro-Niche Lock)
- Keywords hors niche → `niche_mismatch`
- Champs manquants → `HYPOTHESIS` (jamais assumés)
- Chaque cluster a `pinterest_intent` + `primary_board`

### 2.6 Scripts

| Script | Usage |
|---|---|
| `score-opportunities.ts` | `npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "..."` |
| `build-clusters.ts` | `npx tsx scripts/build-clusters.ts data/pinterest-scored.json` |
| `generate-pinterest-batch.ts` | `npx tsx scripts/generate-pinterest-batch.ts data/pinterest-clusters.json` |

---

## Section 3 — Phase 1 : Pipeline Pin-First

### 3.1 Approche : seuils unifiés

Plutôt qu'un `mode` propagé dans chaque agent, on unifie les seuils pour fonctionner avec les deux formats. Le format est piloté par le template `{{format}}` passé au Strategist et Writer uniquement.

### 3.2 Seuils unifiés

| Check | Actuel | Nouveau |
|---|---|---|
| Word count — erreur | < 1500 | **< 1000** |
| Word count — warning | < 1800 | **< 1200** |
| FAQ minimum | 5 Q&A | **3 Q&A** |
| Nutrition Highlights | Obligatoire | **Optionnel** |

### 3.3 Propagation

```typescript
// app/api/recipes/generate/route.ts
const { keyword, cuisine, aorCategory, mode } = body  // mode: "google" | "pin-first"
```

```
POST /api/recipes/generate  ← mode (défaut: "google")
        │
        ▼
generate-recipe.ts          ← {{format}} = mode === "pin-first" ? "pin-first" : "google"
        │
        ▼
Strategist                  ← lit {{format}}, ajuste le plan
Writer                      ← lit {{format}}, ajuste le contenu
Auditor                     ← seuils unifiés (1000/1200)
QA                          ← plage lue depuis strategist_summary
ContentValidator            ← seuils unifiés (1000/1200)
```

### 3.4 Changements par agent

**Strategist v5.1 → v5.2:**
- Template `{{format}}` : si `pin-first`, plan vise 1200-1500 mots, 3 FAQ, recipe card above fold, pas de Nutrition Highlights
- Si `google`, comportement inchangé

**Writer v6.2 → v6.3:**
- Template `{{format}}` : si `pin-first`, structure Pin-First (intro 50-80 mots, recipe card above fold, 3 FAQ, pas de Nutrition Highlights ni Why This Works)
- Si `google`, comportement inchangé

**Auditor v5.1 → v5.2:**
- Criterion 8 (Thin content) : `< 1500` → `< 1000`
- Criterion 4 (Structure) : retire "1800-2200 words", remplace par "respecte le format cible"

**QA v1.1 → v1.2:**
- `targetWordCount` lu depuis `strategist_summary`, pas hardcodé `"1800-2200"`
- Check word count : plage dynamique selon le format

**ContentValidator:**
- `MIN_WORD_COUNT_ERROR`: 1500 → 1000
- `MIN_WORD_COUNT_WARNING`: 1800 → 1200

### 3.5 Fichiers touchés

| Fichier | Changement |
|---|---|
| `app/api/recipes/generate/route.ts` | Accepter `mode` optionnel |
| `lib/inngest/functions/generate-recipe.ts` | Propager `{{format}}` |
| `skills/agent-strategist.md` | v5.2 — `{{format}}` + consignes Pin-First |
| `skills/agent-writer.md` | v6.3 — `{{format}}` + structure Pin-First |
| `skills/agent-auditor.md` | v5.2 — seuils unifiés |
| `skills/agent-qa.md` | v1.2 — plage dynamique |
| `lib/content-validator.ts` | Seuils 1000/1200 |
| `lib/inngest/functions/agents/strategist.ts` | Passer `format` au template |
| `lib/inngest/functions/agents/writer.ts` | Passer `format` au template |

---

## Section 4 — Phase 2 : Distribution

Déjà couvert par l'existant :

| Besoin | Couvert par |
|---|---|
| Board architecture | `ptra-editorial-architect/SKILL.md` |
| Pin metadata | Agent Pin Designer (pipeline step 11) |
| Rich Pins | JSON-LD Recipe schema existant |
| Images 2:3 | Image Optimizer → FLUX → Cloudinary |

**Post-publication :** Un script d'analyse d'engagement (Pin Analytics → Scale/Refine/Pause/Reject) sera conçu après les premiers batches. Non bloquant.

---

## Section 5 — ContentValidator v2

Inclus dans Section 3 (seuils unifiés). Les checks structurels Pin-First (position recipe card, longueur intro) sont vérifiés par l'Auditor, pas par le ContentValidator.

---

## Section 6 — Plan de migration

### 6.1 Nouveaux fichiers (6)

```
scripts/score-opportunities.ts
scripts/build-clusters.ts
scripts/generate-pinterest-batch.ts
data/pinterest-input.json          (template avec 1 exemple)
data/.gitkeep
```

### 6.2 Fichiers modifiés (9)

```
app/api/recipes/generate/route.ts
lib/inngest/functions/generate-recipe.ts
lib/inngest/functions/agents/strategist.ts
lib/inngest/functions/agents/writer.ts
skills/agent-strategist.md
skills/agent-writer.md
skills/agent-auditor.md
skills/agent-qa.md
lib/content-validator.ts
```

### 6.3 Fichiers NON touchés

```
lib/topical-map.ts                  → Coexiste, dépréciation future
lib/db/schema.ts                    → pin_drafts déjà créé
skills/agent-editor.md              → Aucun impact
skills/agent-pin-designer.md        → Déjà PTRA-compatible
lib/inngest/functions/steps/*       → Ordre intact
Tous les steps Inngest              → Noms intacts
```

### 6.4 Gitignore

```gitignore
data/pinterest-scored.json
data/pinterest-clusters.json
```

### 6.5 Ordre d'implémentation

```
1. Scripts Phase 0 (score-opportunities.ts, build-clusters.ts)
2. ContentValidator (seuils 1000/1200)
3. Skills (Strategist, Writer, Auditor, QA) — v+1
4. Agents runtime (strategist.ts, writer.ts) — passer {{format}}
5. Pipeline (generate-recipe.ts) — propager {{format}}
6. Route API (generate/route.ts) — accepter mode
7. Batch caller (generate-pinterest-batch.ts)
8. Template input (data/pinterest-input.json)
9. npx tsc --noEmit
```

### 6.6 Rollback

Aucun rollback nécessaire. `mode` défaut = `"google"` → pipeline inchangé. Pin-First est opt-in.

### 6.7 Vérification post-implémentation

```bash
npx tsc --noEmit                                    # Types
npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "sourdough discard recipes"  # Scorer
npx tsx scripts/build-clusters.ts data/pinterest-scored.json  # Clusters
# Vérifier que le pipeline Google-first existant produit le même résultat
curl -s http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword":"sourdough discard crackers","cuisine":"sourdough"}'  # Doit fonctionner sans mode
```
