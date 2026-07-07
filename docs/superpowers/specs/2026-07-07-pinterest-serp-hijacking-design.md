# Pinterest SERP Hijacking — Design Complet

> **Date** : 2026-07-07
> **Status** : Design approuvé, en attente d'implémentation
> **Sessions** : 2026-07-05 (brainstorming Sections 1), 2026-07-07 (Sections 2-6)

---

## Résumé Stratégique

**Pivot** : Remplacer le SEO Google-first par le Pinterest SERP Hijacking.

**Traffic flow** : Google SERP → Pinterest pin/board → Notre compte spécialisé → chefaugustin.com

**Approche A (approuvée)** : Pipeline unique unifié Pinterest-first. Le paramètre `format: "pin-first" | "google"` traverse tous les agents — un seul pipeline, deux formats de sortie.

**Micro-niche** : Easy Weeknight Dinners for Two.

---

## Section 1 — Architecture Globale

### Trois phases

```
Phase 0: Discovery           Phase 1: Pipeline              Phase 2: Distribution
─────────────────────        ─────────────────────          ──────────────────────
Serper "pinterest.com"       SERP Structurer                Pinterest (manuel v1)
        ↓                          ↓                        Board architecture 5 boards
Pin Designer (intake)       Strategist v6.0                 Rich Pins (OG meta)
        ↓                          ↓                        UTM tracking
Pin Designer (scan)         Writer v6.3                     pin_analytics table
        ↓                          ↓
Pin Designer (plan)         Authenticity Auditor v1.0
        ↓                          ↓
Top 10 keywords scorés      Editor v6.0 (correctif)
        ↓                          ↓
Dashboard → sélection       Image Optimizer v3.0
        ↓                          ↓
Pipeline triggered          Pin Designer v1.0
                                   ↓
                            ContentValidator v2
                                   ↓
                            Publication
```

### 7 agents (au lieu de 8)

| # | Agent | Version | Rôle |
|---|---|---|---|
| 1 | SERP Structurer | v2.1 | Extraction Pinterest signals |
| 2 | Strategist | v6.0 | Format-aware, Opportunity Score v2 |
| 3 | Writer | v6.3 | Format-aware, sections conditionnelles |
| 4 | **Authenticity Auditor** | **v1.0** | **NOUVEAU — remplace Auditor + QA** |
| 5 | Editor | v6.0 | Agent correctif (rewrite_instructions) |
| 6 | Image Optimizer | v3.0 | Format-aware, 2:3, process shots |
| 7 | Pin Designer | v1.0 | Inchangé |

### Agents supprimés
- ~~Auditor v5.1~~ → Authenticity Auditor
- ~~QA v1.1~~ → Redondant

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

La discovery utilise les modes existants du Pin Designer (pas de script séparé) :

| Mode | Rôle |
|---|---|
| `intake` | Niche core + problem-solution map |
| `serp_opportunity_scan` | PTRA scores par keyword candidat |
| `editorial_plan` | Clusters + boards → topical map |

### Opportunity Score v2

```
OPPORTUNITY (0-100) = DomainBeatability(35%) + EngagementGap(30%)
                       + SpecializationGap(20%) + URLType(15%)
```

| Score | Action |
|---|---|
| ≥ 75 | High priority |
| 65-74 | Medium priority |
| < 65 | Revisit later |
| DISQUALIFIED | Never |

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
- Ajout extraction Pinterest signals dans `NormalizedCompetitor` :
  - `pinterest_beatable_score` (0-100)
  - `pinterest_url_type` : "pin" | "board" | "none"
  - `pinterest_follower_estimate` : number | null
  - `pinterest_account_type` : "personal" | "brand" | "unknown"

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
- LLM Writing Signature
- Factual Depth
- Rigid Structure
- Mechanical Transitions
- Generic Vocabulary
- Originality & Added Value
- E-E-A-T & Trust
- SEO Over-Optimization
- Internal Consistency
- Recipe-Specific Quality

4 décisions possibles : PASS | MINOR_FIX | MAJOR_REWRITE | REJECT

Output structuré : rapport Markdown + JSON schema + `rewrite_instructions`.

### 3.5 Editor v6.0
- Reçoit `rewrite_instructions` de l'Auditor (plus de passes aveugles)
- Max 2 passes (au lieu de 3) car instructions ciblées
- Ne génère pas de contenu from scratch — applique les corrections demandées

### 3.6 Image Optimizer v3.0
- Pin-First : hero + 4-6 process shots, tout en 2:3 (1000x1500px)
- Google : comportement inchangé (hero + 2 variants paysage)

### 3.7 Pin Designer v1.0
- Inchangé — déjà construit avec PTRA v1.0, 7 modes, 5 Pins par recette
- UTM automatiques ajoutées dans les URLs

---

## Section 4 — Phase 2 : Distribution

### Boards (5 pour le lancement)

| Board | Rôle | Intent |
|---|---|---|
| Easy Dinners for Two | Principal | quick_solution |
| 30-Minute Meals for Two | Vitesse | quick_solution |
| Small-Batch Slow Cooker | Volume 12.5K | step_by_step |
| Budget Meals for Two | Prix <$5 | budget_friendly |
| Chicken Dinners for Two | Volume 15.6K | ingredient_spotlight |

### Rich Pins
Open Graph tags déjà présents dans le layout Next.js. Vérification à faire.

### Tracking
Nouvelle table `pin_analytics` :
- `id`, `recipe_id`, `pin_index` (0-4), `board`, `utm_source`, `created_at`
- UTM automatiques : `?utm_source=pinterest&utm_medium=pin&utm_campaign={board_slug}`

### Publication
- v1 semi-manuel : dashboard prépare les Pins, humain publie en 2 minutes
- Pas d'API Pinterest (risque de ban)
- Table `pin_drafts` existante

---

## Section 5 — ContentValidator v2

### Architecture deux niveaux

```
Authenticity Auditor (LLM)  → décision qualitative
         ↓
ContentValidator v2 (code)  → gates bloquants déterministes
         ↓
Publication ou draft
```

### Nouveaux checks

| Check | Type | Seuil |
|---|---|---|
| Auditor decision = REJECT | Bloquant | draft |
| Recipe card position (pin-first) <300 chars | Bloquant | draft |
| Intro length (pin-first) >80 mots | Warning | Log |
| Process shots <4 `[IMAGE:` | Warning | Log |
| Image aspect ratio (pas de 2:3) | Bloquant | draft |
| Pin overlay >40 chars | Warning | Log |

### Checks conservés
- Banned words Tier 1 (auto-remediation)
- Internal vibe tokens
- Word count <1000 (pin-first) / <1500 (google)
- Title/ingrédients/instructions vides
- Health claims (auto-remediation)

### Format-aware
Le ContentValidator reçoit `format` et adapte ses seuils.

---

## Section 6 — Plan de Migration

### Phase 0 : Fondations (4 nouveaux)

| Fichier | Action |
|---|---|
| `skills/agent-authenticity-auditor.md` | Créer |
| `skills/references/audit-framework.md` | Créer |
| `skills/references/ai-signals-taxonomy.md` | Créer |
| `skills/references/recipe-quality-rules.md` | Créer |

### Phase 1 : Agents (8 modifiés)

| Fichier | Action |
|---|---|
| `lib/agents/serp-structurer.ts` | Modifier — Pinterest signals |
| `skills/agent-strategist.md` | Modifier v5.3→v6.0 |
| `lib/inngest/functions/agents/strategist.ts` | Modifier |
| `skills/agent-writer.md` | Modifier v6.2→v6.3 |
| `lib/inngest/functions/agents/writer.ts` | Modifier |
| `skills/agent-editor.md` | Modifier v5.2→v6.0 |
| `lib/inngest/functions/agents/editor.ts` | Modifier |
| `skills/food-photography.md` | Modifier v2.1→v3.0 |

### Phase 2 : Pipeline (6 fichiers, 2 supprimés)

| Fichier | Action |
|---|---|
| `lib/inngest/functions/agents/authenticity-auditor.ts` | Créer |
| `lib/inngest/functions/generate-recipe.ts` | Modifier |
| `lib/inngest/functions/steps/agent-phase.ts` | Modifier |
| `lib/inngest/functions/steps/editor-qa-loop.ts` | Modifier |
| `lib/inngest/functions/steps/persist-phase.ts` | Modifier |
| `lib/content-validator.ts` | Modifier |
| `lib/inngest/functions/agents/auditor.ts` | Supprimer |
| `lib/inngest/functions/agents/qa.ts` | Supprimer |

### Phase 3 : Distribution (4 fichiers)

| Fichier | Action |
|---|---|
| `scripts/discover.ts` | Créer |
| `lib/db/schema.ts` | Modifier — table pin_analytics |
| `lib/inngest/functions/steps/pin-phase.ts` | Modifier — UTM |
| `app/dashboard/page.tsx` | Modifier — affichage Pins |

### Récapitulatif

| Phase | Nouveaux | Modifiés | Supprimés |
|---|---|---|---|
| 0 — Fondations | 4 | 0 | 0 |
| 1 — Agents | 0 | 8 | 0 |
| 2 — Pipeline | 1 | 5 | 2 |
| 3 — Distribution | 1 | 3 | 0 |
| **Total** | **6** | **16** | **2** |

### Ordre de déploiement
1. Phase 0 — zéro risque (fichiers statiques)
2. Phase 1 — agents modifiés, pipeline tourne encore sur l'ancien flow
3. Phase 2 — critique : switch pipeline. Commit + `tsc --noEmit` + test e2e
4. Phase 3 — discovery et tracking

### Rollback
Si Phase 2 casse : revert commit. Les fichiers supprimés (auditor.ts, qa.ts) sont dans git. Les skills modifiés sont backward-compatible (google reste le défaut).
