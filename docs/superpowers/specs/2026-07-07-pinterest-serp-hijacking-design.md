# Pinterest SERP Opportunity Engine — Design Complet v2

> **Date** : 2026-07-07
> **Status** : Design approuvé, révisé après review (v2)
> **Sessions** : 2026-07-05 (Sections 1), 2026-07-07 (Sections 2-6 + révisions)
> **Review** : ChatGPT — 15 points, 10 bloquants corrigés

---

## Résumé Stratégique

**Pivot** : Pinterest-first SERP opportunity selection avec SEO destination quality. On ne remplace pas Google — on change la priorité : Pinterest devient le canal primaire de distribution, Google reste le validateur d'intention et le canal indirect.

**Traffic flow** : Google SERP → Pinterest pin/board → Notre compte spécialisé → chefaugustin.com

**Approche** : Pipeline unique unifié. Le paramètre `format: "pin-first" | "google"` traverse tous les agents — un seul pipeline, deux formats de sortie.

**Micro-niche** : Easy Weeknight Dinners for Two.

**Legacy** : Le cleanup sourdough est déjà terminé (session 2026-07-06 — 16 fichiers, zéro référence restante).

---

## Section 1 — Architecture Globale

### Trois phases

```
Phase 0: Discovery           Phase 1: Pipeline              Phase 2: Distribution
─────────────────────        ─────────────────────          ──────────────────────
Serper "pinterest.com"       SERP Structurer v2.1           Pinterest (manuel v1)
        ↓                          ↓                        Board architecture
Pin Designer (intake)       Strategist v6.0                 5 launch + 5 planned
        ↓                          ↓                        Rich Pins (Schema.org)
Pin Designer (scan)         Writer v6.3                     UTM tracking complet
        ↓                          ↓                        pin_analytics (19 colonnes)
Pin Designer (plan)         Authenticity Auditor v1.0
        ↓                          ↓
Top keywords scorés         Editor v6.0 (correctif)
        ↓                          ↓
Dashboard → sélection       Image Optimizer v3.0
        ↓                          ↓
Pipeline triggered          Pin Designer v1.1 (PTRA V2.1)
                                   ↓
                            ContentValidator v2
                            + ImageValidator v1
                                   ↓
                            Publication
```

### 7 agents (+ 2 legacy en feature flag)

| # | Agent | Version | Rôle |
|---|---|---|---|
| 1 | SERP Structurer | v2.1 | Extraction Pinterest signals + confidence |
| 2 | Strategist | v6.0 | Format-aware, Opportunity Score v2 |
| 3 | Writer | v6.3 | Format-aware, sections conditionnelles |
| 4 | **Authenticity Auditor** | **v1.0** | **NOUVEAU — 10 dimensions d'audit** |
| 5 | Editor | v6.0 | Agent correctif (rewrite_instructions) |
| 6 | Image Optimizer | v3.0 | Format-aware, 2:3, process shots |
| 7 | Pin Designer | v1.1 | PTRA V2.1 compatible |

### Feature flag — Legacy agents conservés

```
USE_AUTHENTICITY_AUDITOR=true  → Authenticity Auditor actif, Auditor+QA en veille
USE_AUTHENTICITY_AUDITOR=false → Auditor v5.1 + QA v1.1 (fallback google)
```

Les fichiers `auditor.ts` et `qa.ts` ne sont **pas supprimés** en Phase 2. Ils restent comme fallback. Suppression après test E2E complet + 10 recettes générées sans erreur.

### Boucle Editor revue

```
Authenticity Auditor → décision ?
  ├─ PASS → Image
  ├─ MINOR_FIX → Editor (1 passe) → Auditor final → Image
  ├─ MAJOR_REWRITE → Editor (1 passe) → Auditor final
  │   ├─ PASS/MINOR_FIX → Image
  │   └─ encore MAJOR_REWRITE/REJECT → draft manuel
  └─ REJECT → draft, notification dashboard
```

---

## Section 2 — Phase 0 : Découverte Automatisée

### Modes du Pin Designer utilisés

| Mode | Rôle |
|---|---|
| `intake` | Niche core + problem-solution map |
| `serp_opportunity_scan` | PTRA scores par keyword candidat |
| `editorial_plan` | Clusters + boards → topical map |

### Opportunity Score v2 — Contrat strict

```typescript
interface OpportunityScore {
  keyword: string
  pinterest_position: number
  pinterest_url: string
  pinterest_url_type: "pin" | "board" | "profile" | "search_page" | "other" | "none"

  domain_beatability: {
    score: number           // 0-100, weight 35%
    domain: string
    level: "unbeatable" | "very_hard" | "medium" | "weak" | "unknown"
    confidence: "high" | "medium" | "low"
    inputs: string[]        // evidence used
  }

  engagement_gap: {
    score: number           // 0-100, weight 30%
    follower_estimate: number | null
    is_known_brand: boolean
    confidence: "high" | "medium" | "low"
    missing_data_policy: "score_neutral" | "score_penalty" | "disqualify"
    inputs: string[]
  }

  specialization_gap: {
    score: number           // 0-100, weight 20%
    account_type: "personal" | "generalist_cooking" | "semi_specialized" | "very_specialized" | "unknown"
    confidence: "high" | "medium" | "low"
    reason: string
  }

  url_type: {
    score: number           // 0-100, weight 15%
    type: "pin" | "board_small" | "board_large" | "profile" | "search_page" | "other"
    effort_to_beat: "1-3_months" | "3-6_months" | "6-12_months" | "unknown"
    reason: string
  }

  final_opportunity_score: number  // 0-100 weighted sum
  decision: "high_priority" | "medium_priority" | "revisit_later" | "disqualified"
  disqualification_reason?: string
}
```

### Seuils

| Score | Décision |
|---|---|
| ≥ 75 | `high_priority` |
| 65-74 | `medium_priority` |
| < 65 | `revisit_later` |
| domaine unbeatable | `disqualified` |

### Lanceur

Script one-shot `scripts/discover.ts` :
1. Lit les keywords depuis `data/pinterest-keywords.json`
2. Appelle Serper pour chaque keyword
3. Appelle Pin Designer en mode `intake` → `serp_opportunity_scan` → `editorial_plan`
4. Écrit les résultats scorés dans `data/discovery-output.json`
5. Le dashboard lit ce fichier pour afficher les opportunités

---

## Section 3 — Pipeline Agent par Agent

### 3.1 SERP Structurer v2.1
Ajout extraction Pinterest signals dans `NormalizedCompetitor` :
- `pinterest_beatable_score` (0-100)
- `pinterest_url_type` : `"pin" | "board" | "profile" | "search_page" | "other" | "none"`
- `pinterest_follower_estimate` : number | null
- `pinterest_account_type` : `"personal" | "brand" | "unknown"`
- `confidence` : `"high" | "medium" | "low"` sur chaque signal

### 3.2 Strategist v6.0
Format-aware. Deux profils de sortie :

| Paramètre | Google | Pin-First |
|---|---|---|
| Word count | 1800-2200 | 1200-1500 |
| Intro | Standard | 50-80 mots |
| FAQ | 5 questions | 3 questions |
| Nutrition Highlights | Obligatoire | Supprimé |
| Why This Works | Obligatoire | Supprimé |
| Process photos | Non requis | 4-6 descriptions |
| Recipe card | Dans le flow | Above the fold |

Input additionnel : `opportunity_score` (depuis la discovery).

### 3.3 Writer v6.3
- Sections conditionnelles selon `format`
- Pin-First : recipe card en premier, `[IMAGE: description]` placeholders, blocs courts
- Google : comportement inchangé

### 3.4 Authenticity Auditor v1.0
Nouvel agent. 10 dimensions d'audit :
1. LLM Writing Signature
2. Factual Depth
3. Rigid Structure
4. Mechanical Transitions
5. Generic Vocabulary
6. Originality & Added Value
7. E-E-A-T & Trust
8. SEO Over-Optimization
9. Internal Consistency
10. Recipe-Specific Quality

4 décisions : `PASS` | `MINOR_FIX` | `MAJOR_REWRITE` | `REJECT`

Output structuré : rapport Markdown + JSON schema + `rewrite_instructions` précises.

### 3.5 Editor v6.0
- Reçoit `rewrite_instructions` de l'Auditor (plus de passes aveugles)
- Max 2 passes (au lieu de 3) car instructions ciblées
- Ne génère pas de contenu from scratch — applique les corrections demandées

### 3.6 Image Optimizer v3.0
- Pin-First : hero + 4-6 process shots, tout en 2:3 (1000x1500px)
- Google : comportement inchangé (hero + 2 variants paysage)

### 3.7 Pin Designer v1.1 — PTRA V2.1 compatible
Mise à jour depuis v1.0. Changements :
- Ajout `micro_niche` validation
- Ajout `destination_quality_status`
- Ajout `visual_uniqueness` check
- Ajout `ptra_coherence_score` détaillé
- Ajout `fresh_pin_rule_status`
- Ajout `board_fit_status`
- Ajout `measurement_fields`
- UTM automatiques dans les URLs des Pins (incluant `utm_content` pour distinguer les 5 Pins)

---

## Section 4 — Phase 2 : Distribution

### Boards

**Launch (5 boards actifs) :**

| Board | Rôle | Intent |
|---|---|---|
| Easy Dinners for Two | Principal | quick_solution |
| 30-Minute Meals for Two | Vitesse | quick_solution |
| Small-Batch Slow Cooker | Volume 12.5K | step_by_step |
| Budget Meals for Two | Prix <$5 | budget_friendly |
| Chicken Dinners for Two | Volume 15.6K | ingredient_spotlight |

**Planned (5 boards — activés après les 30 premières recettes) :**

| Board | Rôle |
|---|---|
| One-Pan Dinners for Two | Cluster one-pan (18.2K vol) |
| Ground Beef Dinners for Two | Protéine économique |
| Asian-Inspired Dinners for Two | Cluster outer |
| Seafood Dinners for Two | Protéine saisonnière |
| Mini Crockpot Recipes for Two | Sous-cluster slow cooker |

### Rich Pins — Gate complet

```typescript
interface RichPinReadiness {
  claimed_domain: "verified" | "missing" | "unknown"
  recipe_schema_present: boolean        // Schema.org Recipe JSON-LD
  open_graph_present: boolean           // OG tags
  required_recipe_fields_present: boolean // name, image, ingredients, instructions
  canonical_url_valid: boolean
  image_url_valid: boolean
  status: "pass" | "fail" | "warning"
}
```

Vérification basée sur Schema.org Recipe (pas seulement OG). Les champs obligatoires Pinterest pour les Recipe Rich Pins : `name`, `image`, `ingredients`, `instructions`, `prepTime` ou `cookTime`.

### Tracking — Table `pin_analytics` (19 colonnes)

```sql
pin_analytics:
  id              serial PRIMARY KEY
  recipe_id       integer NOT NULL REFERENCES recipes(id)
  pin_draft_id    integer REFERENCES pin_drafts(id)
  pinterest_pin_url text
  pinterest_pin_id  text              -- nullable (publication manuelle v1)
  board           text NOT NULL
  board_slug      text NOT NULL
  pin_index       integer NOT NULL    -- 0-4
  pin_title       text NOT NULL
  overlay_hook    text
  visual_type     text                -- close-up | plated | process | lifestyle
  intent          text NOT NULL
  utm_source      text DEFAULT 'pinterest'
  utm_medium      text DEFAULT 'pin'
  utm_campaign    text                -- board_slug
  utm_content     text                -- pin_index pour distinguer les 5 Pins
  publish_status  text DEFAULT 'draft' -- draft | ready | published | archived
  published_at    timestamptz
  impressions     integer DEFAULT 0
  saves           integer DEFAULT 0
  pin_clicks      integer DEFAULT 0
  outbound_clicks integer DEFAULT 0
  outbound_click_rate numeric(5,2)
  save_rate       numeric(5,2)
  last_metrics_sync_at timestamptz
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
```

Index : `(recipe_id)`, `(board_slug)`, `(publish_status)`, `(published_at)`.

### Publication
- **v1 semi-manuel** : dashboard prépare les Pins (titre, description, image, board), humain publie en 2 minutes
- **API Pinterest** : envisageable plus tard via OAuth officiel, rate-limiting, et comportement policy-compliant. Pas de risque de ban automatique si l'API est utilisée correctement — mais le v1 manuel réduit le risque opérationnel.

---

## Section 5 — Validation Gates

### Architecture trois niveaux

```
Authenticity Auditor (LLM)   → décision qualitative
         ↓
ContentValidator v2 (code)   → gates texte/structure
         ↓
ImageValidator v1 (code)     → gates image (dimensions, ratio, format)
         ↓
Publication ou draft
```

### ContentValidator v2 — Checks texte

| Check | Type | Seuil | Format |
|---|---|---|---|
| Auditor decision = REJECT | Bloquant | — | both |
| Recipe card position | Bloquant | <300 chars from start | pin-first |
| Intro length | Warning | >80 mots | pin-first |
| Process shot placeholders | Warning | <4 `[IMAGE:` | pin-first |
| Pin overlay length | Warning | >40 chars | pin-first |
| Banned words Tier 1 | Bloquant | — | both (auto-remediation) |
| Internal vibe tokens | Bloquant | — | both |
| Word count min | Bloquant | <1000 (pin-first) / <1500 (google) | format-aware |
| Title/ingredients/instructions vides | Bloquant | — | both |
| Health claims | Bloquant | — | both (auto-remediation) |

### ImageValidator v1 — Checks image (nouveau)

| Check | Type | Seuil |
|---|---|---|
| Aspect ratio | Bloquant | Pas 2:3 (1000x1500px) |
| Image dimensions réelles | Bloquant | <1000px width ou <1500px height |
| Alt text présent | Warning | Vide |
| Format supporté | Bloquant | Pas JPEG/PNG/WebP |
| URL accessible | Bloquant | HTTP status ≠ 200 |
| Poids image | Warning | >2MB |

L'ImageValidator s'exécute APRÈS la génération des images (pas sur les placeholders `[IMAGE:`).

---

## Section 6 — Contrats Inter-Agents (Schemas Zod)

Avant de modifier le pipeline, créer les schemas stricts :

```
lib/schemas/
  serp.schema.ts        — SERP Structurer input/output
  strategy.schema.ts    — Strategist output (format-aware)
  article.schema.ts     — Writer output
  audit.schema.ts       — Authenticity Auditor output
  editor.schema.ts      — Editor input (rewrite_instructions) / output
  image.schema.ts       — Image Optimizer output
  pin.schema.ts         — Pin Designer output
  validation.schema.ts  — ContentValidator + ImageValidator output
```

Chaque schema contient :
- Input type (ce que l'agent reçoit)
- Output type (ce que l'agent doit produire)
- Validation function — appelée après chaque agent, avant de passer au suivant
- Fallback si JSON invalide (log + retry ou degraded flag)

---

## Section 7 — Plan de Migration

### Phase 0 : Fondations (12 nouveaux)

| Fichier | Action |
|---|---|
| `skills/agent-authenticity-auditor.md` | Créer — skill principal |
| `skills/references/audit-framework.md` | Créer |
| `skills/references/ai-signals-taxonomy.md` | Créer |
| `skills/references/recipe-quality-rules.md` | Créer |
| `lib/schemas/serp.schema.ts` | Créer |
| `lib/schemas/strategy.schema.ts` | Créer |
| `lib/schemas/article.schema.ts` | Créer |
| `lib/schemas/audit.schema.ts` | Créer |
| `lib/schemas/editor.schema.ts` | Créer |
| `lib/schemas/image.schema.ts` | Créer |
| `lib/schemas/pin.schema.ts` | Créer |
| `lib/schemas/validation.schema.ts` | Créer |

### Phase 1 : Agents (9 modifiés)

| Fichier | Action |
|---|---|
| `lib/agents/serp-structurer.ts` | Modifier — Pinterest signals + confidence |
| `skills/agent-strategist.md` | Modifier v5.3→v6.0 |
| `lib/inngest/functions/agents/strategist.ts` | Modifier |
| `skills/agent-writer.md` | Modifier v6.2→v6.3 |
| `lib/inngest/functions/agents/writer.ts` | Modifier |
| `skills/agent-editor.md` | Modifier v5.2→v6.0 |
| `lib/inngest/functions/agents/editor.ts` | Modifier |
| `skills/food-photography.md` | Modifier v2.1→v3.0 |
| `skills/agent-pin-designer.md` | Modifier v1.0→v1.1 (PTRA V2.1) |

### Phase 2 : Pipeline (7 fichiers, 0 supprimés)

| Fichier | Action |
|---|---|
| `lib/inngest/functions/agents/authenticity-auditor.ts` | Créer |
| `lib/inngest/functions/generate-recipe.ts` | Modifier — feature flag `USE_AUTHENTICITY_AUDITOR` |
| `lib/inngest/functions/steps/agent-phase.ts` | Modifier — nouveau flow conditionnel |
| `lib/inngest/functions/steps/editor-qa-loop.ts` | Modifier — devient editor-auditor-loop |
| `lib/inngest/functions/steps/persist-phase.ts` | Modifier — format-aware |
| `lib/content-validator.ts` | Modifier — v2 |
| `lib/image-validator.ts` | Créer — v1 |

**`auditor.ts` et `qa.ts` ne sont PAS supprimés.** Ils restent comme fallback. Feature flag :

```typescript
const USE_AUTHENTICITY_AUDITOR = process.env.USE_AUTHENTICITY_AUDITOR !== "false"
```

Si `false` → pipeline legacy (google). Si `true` (défaut) → Authenticity Auditor.

### Phase 3 : Distribution & Discovery (5 fichiers)

| Fichier | Action |
|---|---|
| `scripts/discover.ts` | Créer |
| `lib/db/schema.ts` | Modifier — table `pin_analytics` (19 colonnes) |
| `lib/inngest/functions/steps/pin-phase.ts` | Modifier — UTM complets |
| `app/dashboard/page.tsx` | Modifier — affichage Pins |
| `app/recettes/[slug]/page.tsx` | Modifier — Rich Pins gate (Schema.org Recipe) |

### Migration DB

```bash
# Dev
npx drizzle-kit push

# Vérification pré-prod
npx tsc --noEmit
npm run test:e2e

# Rollback DB (si nécessaire)
# La table pin_analytics est additive — pas de DROP nécessaire
# Supprimer la table si rollback : DROP TABLE IF EXISTS pin_analytics;
```

### Récapitulatif

| Phase | Nouveaux | Modifiés | Supprimés |
|---|---|---|---|
| 0 — Fondations | 12 | 0 | 0 |
| 1 — Agents | 0 | 9 | 0 |
| 2 — Pipeline | 2 | 5 | 0 |
| 3 — Distribution | 1 | 4 | 0 |
| **Total** | **15** | **18** | **0** |

### Ordre de déploiement
1. **Phase 0** — zéro risque (fichiers statiques + schemas)
2. **Phase 1** — agents modifiés, pipeline tourne encore en mode legacy
3. **Phase 2** — feature flag : activer `USE_AUTHENTICITY_AUDITOR=true`, tester, puis supprimer legacy après 10 recettes OK
4. **Phase 3** — discovery, tracking, Rich Pins gate

### Rollback
- `USE_AUTHENTICITY_AUDITOR=false` → retour immédiat au pipeline Auditor+QA
- Aucun fichier supprimé → git revert sans perte
- Table `pin_analytics` additive → DROP si nécessaire, pas de corruption des données existantes
- Skills modifiés backward-compatible (google reste le défaut)
