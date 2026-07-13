# AI AutoBlog — Rapport de Maturité Complet
> **Date :** 2026-07-13 | **Version :** 1.0 | **Auteur :** Claude (Codex) — Revue de codebase  
> **Objectif :** Document conçu pour être discuté avec un autre LLM (DeepSeek, ChatGPT, Claude) comme peer review de l'architecture.

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Objectif et Positionnement du Projet](#2-objectif-et-positionnement-du-projet)
3. [Architecture du Workflow IA](#3-architecture-du-workflow-ia)
4. [La Pipeline v11 — Décomposition Étape par Étape](#4-la-pipeline-v11--décomposition-étape-par-étape)
5. [Les Agents IA et leurs Skills](#5-les-agents-ia-et-leurs-skills)
6. [Le Content Loop — Pattern Evaluator-Optimizer](#6-le-content-loop--pattern-evaluator-optimizer)
7. [Les Validateurs Déterministes](#7-les-validateurs-déterministes)
8. [Le Provider Layer — Abstraction Multi-LLM](#8-le-provider-layer--abstraction-multi-llm)
9. [Stratégie SEO / GEO / LLM Citation](#9-stratégie-seo--geo--llm-citation)
10. [Stratégie Pinterest & PTRA](#10-stratégie-pinterest--ptra)
11. [Stratégie Cross-Channel](#11-stratégie-cross-channel)
12. [État de Production Readiness](#12-état-de-production-readiness)
13. [Matrice de Maturité par Dimension](#13-matrice-de-maturité-par-dimension)
14. [Analyse des Forces](#14-analyse-des-forces)
15. [Analyse des Faiblesses & Gaps](#15-analyse-des-faiblesses--gaps)
16. [Roadmap — Ce qu'il manque](#16-roadmap--ce-quil-manque)
17. [Annexes — Fichiers Clés](#17-annexes--fichiers-clés)

---

## 1. Résumé Exécutif

**AI AutoBlog** (chefaugustin.com) est un système de génération automatique de contenu culinaire full-stack. Il produit des articles de recettes optimisés pour Google (SEO), les AI Overviews (GEO), et Pinterest (PTRA), avec une intervention humaine minimale.

### Chiffres clés

| Métrique | Valeur |
|---|---|
| **Score de maturité global** | **73/100** (potentiel 78-82 avec Claude Sonnet 4.6) |
| **Agents IA** | 3 (Strategist, Chef Augustin, Judge) + 1 (Pin Designer) |
| **Appels LLM par recette** | 5-8 (Strategist ×1, Writer ×1-3, Judge ×1-3, Pin Designer ×1) |
| **Coût estimé par recette** | ~$0.15 (Claude Sonnet 4.6) |
| **Validateurs déterministes** | 4 (GEO, Content, Culinary, Loop Scorer) |
| **Briefs enrichis prêts** | 14 DUAL_CHAMPIONS |
| **Recettes générées (historique)** | 160+ |
| **Pipeline steps** | 5 (SERP → Content Loop → Images → Persist → Pins) |
| **Banned words bloqués** | 22 Tier 1 + 6 Tier 2 + 5 Tier 3 |

### Verdict

Le projet est **architecturalement mature** (73/100) mais **opérationnellement bloqué** par l'absence de clé API Anthropic. La qualité du contenu dépend fortement du modèle utilisé : Claude Sonnet 4.6 délivre une qualité publication-ready, tandis que DeepSeek v4 Pro nécessite des seuils de validation abaissés et produit un contenu de qualité inférieure.

---

## 2. Objectif et Positionnement du Projet

### 2.1 Vision

Créer un blog culinaire autonome qui génère du contenu de **haute qualité**, **factuellement exact**, et **hyper-optimisé** pour les 3 canaux d'acquisition modernes :

1. **Google Search** — SEO traditionnel (featured snippets, rich results)
2. **AI Overviews / LLMs** — GEO (citabilité pour ChatGPT, Google AI Overviews, Perplexity)
3. **Pinterest** — PTRA (Pinterest Topical Resonance Authority) + Content Graph

### 2.2 Niche

**"Easy Weeknight Dinners for Two"** — Recettes en small-batch pour couples/solo, rapides, abordables.

### 2.3 Stack Technique

| Technologie | Rôle |
|---|---|
| Next.js 16 (App Router) | Framework full-stack |
| React 19 + Tailwind CSS 4 + shadcn/ui | Frontend |
| Drizzle ORM + Neon PostgreSQL | Base de données |
| Inngest 4.7 | Orchestrateur de workflow (background jobs) |
| Anthropic API (Claude Sonnet 4.6) | LLM primaire |
| DeepSeek v4 Pro | LLM fallback |
| Serper.dev | Analyse SERP Google |
| Ideogram v4 Turbo / Cloudflare FLUX-1 | Génération d'images |
| Cloudinary | CDN d'images |

### 2.4 Modes de Fonctionnement

| Mode | Description | Intervention humaine |
|---|---|---|
| **Standard** | SERP → Content Loop → Draft → Human Review → Images → Publish | Oui (approbation manuelle) |
| **Autopilot** (`AUTOPILOT=true`) | Content Loop validators → warn-only. Publication automatique. | Non (zéro intervention) |
| **Batch** | `scripts/batch-generate.mjs` — génération par lot depuis enriched-briefs.json | Non (autopilot obligatoire) |

---

## 3. Architecture du Workflow IA

### 3.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│                   INNGEST WORKFLOW ENGINE                     │
│                                                              │
│  ┌────────┐   ┌──────────────┐   ┌────────┐   ┌──────────┐ │
│  │ SERP   │──▶│ CONTENT LOOP │──▶│ IMAGES │──▶│ PERSIST  │ │
│  │ Phase  │   │ (Evaluator-  │   │ Phase  │   │ Phase    │ │
│  │        │   │  Optimizer)  │   │        │   │ + A/B    │ │
│  └────────┘   └──────┬───────┘   └────────┘   └────┬─────┘ │
│                      │                              │       │
│   ┌──────────────────┘                              ▼       │
│   │                                         ┌──────────┐   │
│   │  ┌──────────┐  ┌──────────┐             │   PIN    │   │
│   │  │Strategist│  │  Judge   │             │ DESIGNER │   │
│   │  │ (Plan)   │  │(Eval LLM)│             │  (PTRA)  │   │
│   │  └────┬─────┘  └────▲─────┘             └──────────┘   │
│   │       │             │                                   │
│   │       ▼             │                                   │
│   │  ┌──────────┐  ┌────┴──────┐                           │
│   │  │  Chef    │  │Validateurs│                           │
│   │  │Augustin  │──▶│(GEO+Cont) │                           │
│   │  │ (Write)  │  │pure code  │                           │
│   │  └──────────┘  └───────────┘                           │
│   │       ▲                                                 │
│   │       │ Feedback structuré (si score < seuil)           │
│   │       └───────────────────────────────────┘             │
│   │         Max 3 passes                                    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Flux de données

```
Keyword → Serper API → SERP Data
                            ↓
                     Strategist (LLM) → StrategyPlan
                            ↓
              ┌─ Content Loop (max 3 passes) ─┐
              │  Writer (LLM) → Output         │
              │       ↓                        │
              │  Judge (LLM) → QualityVerdict  │
              │       ↓                        │
              │  GEO Validator (code)          │
              │  Content Validator (code)      │
              │       ↓                        │
              │  Loop Scorer → Score/100       │
              │       ↓                        │
              │  Score ≥ threshold? → BREAK    │
              │  Diminishing? → BREAK          │
              │  Else → Feedback → Writer ↩    │
              └────────────────────────────────┘
                            ↓
                   Best Output (max score)
                            ↓
                   Persist Draft → DB
                            ↓
                   Human Review (ou auto-approve)
                            ↓
                   Image Phase (FLUX-1 → Cloudinary)
                            ↓
                   Final Persist + ContentValidator
                            ↓
                   A/B Image Variant Stats
                            ↓
                   Pin Designer (5 pins PTRA)
```

---

## 4. La Pipeline v11 — Décomposition Étape par Étape

### Step 1 : SERP Phase (`serp-phase.ts`)

**Rôle :** Analyser la SERP Google pour le mot-clé cible.

- Appelle Serper.dev API
- Récupère : résultats organiques (top 10), People Also Ask, Related Searches
- Fallback PAA : 8 questions synthétiques si l'API Serper est vide
- Timeout : 30s
- Output : `SerpPhaseResult` (organic, relatedQuestions, relatedSearches)

### Step 2 : Content Loop (`content-loop-phase.ts`)

**C'est le cœur du système.** Pattern Evaluator-Optimizer (Cobus Greyling).

#### 2.1 — Strategist (1 appel LLM)
- Modèle : Claude Sonnet 4.6 (temperature 0.7, max 4096 tokens)
- Input : keyword, format, SERP data
- Output : `StrategyPlan` (angle, H2s, FAQ, competitor gaps, semantic entities)
- Échec → plan minimal de fallback (non-bloquant)

#### 2.2 — Writer Loop (1-3 appels LLM)
- Modèle : Claude Sonnet 4.6 (temperature 0.8, max 8192 tokens)
- Input : StrategyPlan + keyword + format + feedback (si passe >1)
- Output : `ChefAugustinOutput` (JSON complet)
- Skill : `skills/agent-chef-augustin.md` (210 lignes, 10 sections)

#### 2.3 — Judge (1-3 appels LLM, optionnel)
- Modèle : Claude Haiku 4.5 (temperature 0.3, max 2048 tokens) — économique
- Input : article complet + StrategyPlan
- Output : `QualityVerdict` (4 dimensions × /100, verdict PUBLISH/REVISE/REJECT)
- Échec → verdict neutre (non-bloquant)

#### 2.4 — Validateurs (code pur, pas de LLM)
- GEO Validator → CitabilityReport (claims, attributions, nuggets)
- Content Validator → ValidationResult (banned words, health claims, word count, structure)

#### 2.5 — Loop Scorer (code pur)
- Composite : Judge 40% + GEO 30% + Content 20% + Structure 10%
- Score /100

#### 2.6 — Stopping Rules
1. **Seuil atteint** : `score.total >= GEO_BLOCK_THRESHOLD` (70) + pas d'erreurs critiques → BREAK
2. **Rendements décroissants** : score ≤ previous_score pendant 2 passes consécutives → BREAK
3. **Max passes** : 3 (configurable via `LOOP_MAX_PASSES`)

#### 2.7 — Feedback Builder
Si le loop continue, `buildLoopFeedback()` génère un feedback structuré injecté dans le prompt de la passe suivante :
```
## ⚠️ QUALITY FEEDBACK — Pass 2/3
Score: 54/100. Fix ALL issues below before outputting.

### ❌ ATTRIBUTIONS: 2/4
Add 2 more source attributions using the 4 patterns from §5.2...

### ❌ ANSWER NUGGETS: 1/4
Add 3 more self-contained FAQ answers...

### ❌ BANNED AI VOCABULARY FOUND
- Remove "delve" — rewrite the entire sentence naturally...
```

### Step 3 : Image Phase (`image-phase.ts`)
- Génération d'image food photography 2:3 (Pinterest standard)
- Primaire : Ideogram v4 Turbo → fallback : Cloudflare FLUX-1-Schnell
- Upload → Cloudinary CDN
- A/B variants (1-3, configurable via `IMAGE_VARIANT_COUNT`)

### Step 4 : Persist Phase (`persist-phase.ts`)
- **Double safety net :**
  1. `scrubBannedWords()` — remplacement déterministe des mots bannis résiduels
  2. `validateContent()` — ContentValidator complet
- Si `AUTOPILOT=true` : validateurs → warn-only (log, pas de blocage)
- Seules les erreurs structurelles (recette vide) et similarité >60% bloquent encore
- Écriture DB + JSON-LD + self_improvement_logs

### Step 5 : Pin Phase (`pin-phase.ts`)
- Agent Pin Designer → 5 pins par recette
- Modèle : Mistral Medium 3.5 (temperature 0.5, max 4096 tokens)
- Output : 5 PinDraft objets (titles, descriptions, image prompts, boards, PTRA scores)
- Insertion DB : `pinDrafts` + `pinAnalytics` (UTM tracking)

---

## 5. Les Agents IA et leurs Skills

### 5.1 Agent Strategist

| Attribut | Valeur |
|---|---|
| **Fichier runtime** | `lib/inngest/functions/agents/strategist.ts` (117 lignes) |
| **Skill** | `skills/agent-strategist.md` (63 lignes) |
| **Modèle** | Claude Sonnet 4.6 |
| **Temperature** | 0.7 |
| **Max tokens** | 4096 |
| **Rôle** | Planifier la structure de l'article avant écriture |
| **Input** | keyword, format, SERP data (organic, PAA, related searches) |
| **Output** | `StrategyPlan` (angle, H2s avec purpose, FAQs, competitor gaps, semantic entities) |
| **Fallback** | Plan minimal (4 H2s génériques) — non-bloquant |

**Design decision clé :** Le Strategist a été séparé du Chef Augustin pour respecter la séparation Plan/Write (pattern "Plan-then-Write"). Avant la v11, le Chef Augustin faisait tout en un seul appel — la séparation permet un meilleur contrôle qualité.

### 5.2 Agent Chef Augustin (Writer)

| Attribut | Valeur |
|---|---|
| **Fichier runtime** | `lib/inngest/functions/agents/chef-augustin.ts` (149 lignes) |
| **Skill** | `skills/agent-chef-augustin.md` (210 lignes, 10 sections) |
| **Modèle** | Claude Sonnet 4.6 (fallback DeepSeek v4 Pro) |
| **Temperature** | 0.8 |
| **Max tokens** | 8192 |
| **Rôle** | Exécuter le StrategyPlan — rédiger l'article complet |
| **Input** | keyword, format, StrategyPlan, feedback (si loop), linkTargets, externalSources |
| **Output** | `ChefAugustinOutput` (JSON : title, metaTitle, metaDescription, excerpt, contentMarkdown, ingredients[], instructions[], tags[], prepTime, cookTime, totalTime, servings, difficulty, imagePrompt, jsonLd) |

**Le skill (§4.7) est le plus riche du système :**

| Section | Contenu |
|---|---|
| §1 Identity | Persona Chef Augustin Lefèvre, voice profile, transparence |
| §2 Input Contract | Ce que l'agent reçoit |
| §3 Article Structure | Pin-First vs Google format, règles structurelles |
| §4 Writing Rules | Inverted pyramid, attributions, banned vocabulary (3 tiers), horoscope test, E-E-A-T signals, culinary precision |
| §4.7 GEO Optimization | **Answer Nuggets** (≥4), **Citation-Ready Claims** (claim+mécanisme+anchor), **Structured Data Points** (dual °F/°C, temps exacts, volume+poids), **LLM-Friendly Formatting** (numbered steps, X vs Y, short paragraphs) |
| §5 Self-Check | 9 items à vérifier avant output |
| §6 Image Prompt | Format 2:3 food photography |
| §7 JSON-LD | Pin-First vs Google schema |
| §8 Output Schema | JSON schema complet |
| §9 External Sources | Intégration de sources food science |
| §10 Loop Feedback | Comment traiter le feedback structuré |

### 5.3 Agent Judge (Quality Evaluator)

| Attribut | Valeur |
|---|---|
| **Fichier runtime** | `lib/inngest/functions/agents/judge.ts` (125 lignes) |
| **Skill** | `skills/agent-judge.md` (non lu — skill externe) |
| **Modèle** | Claude Haiku 4.5 (économique) |
| **Temperature** | 0.3 |
| **Max tokens** | 2048 |
| **Rôle** | Évaluer la qualité de l'article sur 4 dimensions |
| **Output** | `QualityVerdict` (totalScore, verdict PUBLISH/REVISE/REJECT, 4 dimensions × /100, criticalIssues[], strengths[]) |
| **Fallback** | Verdict neutre (60/100, REVISE) — non-bloquant |

**Les 4 dimensions évaluées :**
1. **Culinary Accuracy** — les techniques et températures sont-elles correctes ?
2. **Narrative Quality** — le contenu est-il engageant et bien écrit ?
3. **Usefulness** — le lecteur peut-il réellement cuisiner avec ces instructions ?
4. **Structure & Flow** — l'article est-il bien organisé ?

**Design decision :** Le Judge utilise Haiku 4.5 plutôt que Sonnet pour réduire les coûts — l'évaluation nécessite moins de puissance que la génération. Le Judge est non-bloquant : s'il échoue, le loop continue avec un score neutre.

### 5.4 Agent Pin Designer

| Attribut | Valeur |
|---|---|
| **Fichier runtime** | `lib/inngest/functions/agents/pin-designer.ts` |
| **Skill** | `skills/agent-pin-designer.md` (374 lignes, 11 sections) |
| **Modèle** | Mistral Medium 3.5 (via NaraRouter) |
| **Temperature** | 0.5 |
| **Max tokens** | 4096 |
| **Rôle** | Générer 5 Pinterest Pins par recette selon le framework PTRA v2.2 |
| **Output** | `PinDraft[]` (pin_title, overlay_text, description, image_prompt, board, intent, ptra_score, micro_niche_validated, destination_quality_status, visual_uniqueness, ptra_coherence_breakdown, fresh_pin_rule_status, board_fit_status) |

**Le skill Pin Designer est le plus sophistiqué :**

- **§3 Pinterest Intent Taxonomy** — 8 intents (quick_solution, beginner_guide, step_by_step, mistake_avoidance, before_after, checklist, ingredient_spotlight, budget_friendly)
- **§3.1 Content Graph Signal → Intent Mapping** — chaque intent mappe à un signal du Content Graph Pinterest (Saves, Topic Relevance, Domain Quality, Visual)
- **§4 Ethical Hook Rules** — hooks vérifiables, pas de clickbait
- **§5 Fresh Pin Rule** — chaque image doit être distincte (pas juste un overlay différent)
- **§5.1 Pinterest Lens CV Optimization** — optimisation pour la computer vision de Pinterest
- **§6 PTRA Scoring /100** — 11 facteurs (Micro-Niche Focus, Problem-Solution Fit, Semantic Fit, Visual Fit, Board Fit, Destination Fit, Ethical Hook Fit, Consistency Fit, Trend Timing, Measurement Readiness)
- **§7 Pinterest Account Safety Gate** — anti-spam checks (duplicate creative, same URL frequency, description repetition)
- **§8 Destination Quality Gate** — validation de la page avant publication
- **§9 Board Architecture** — 6 boards (Easy Dinners for Two, 30-Minute Meals, Small-Batch Slow Cooker, Budget Meals, Chicken Dinners, Asian-Inspired)
- **§9.1 First-Save Board Signal** — stratégie Content Graph : le premier board où un pin est sauvegardé est le signal de classification le plus fort

### 5.5 Tableau Récapitulatif des Agents

| Agent | Modèle | Tokens | Coût estimé | Critique ? | Fallback |
|---|---|---|---|---|---|
| Strategist | Claude Sonnet 4.6 | 4096 | ~$0.01 | Non | Plan minimal |
| Chef Augustin | Claude Sonnet 4.6 | 8192 | ~$0.10 | **Oui** | DeepSeek v4 Pro |
| Judge | Claude Haiku 4.5 | 2048 | ~$0.002 | Non | Score neutre |
| Pin Designer | Mistral Medium 3.5 | 4096 | ~$0.02 | Non | Aucun |
| **Total/recette** | | **~24K tokens** | **~$0.15** | | |

---

## 6. Le Content Loop — Pattern Evaluator-Optimizer

### 6.1 Design Pattern

Le Content Loop implémente le pattern **Evaluator-Optimizer** (Cobus Greyling, "Loop Engineering") :

```
┌─────────────────────────────────────────┐
│              CONTENT LOOP               │
│                                         │
│  ┌──────────┐     ┌──────────┐         │
│  │  MAKER   │────▶│ CHECKER  │         │
│  │ (Writer) │     │(Validat.)│         │
│  │  LLM     │     │ Pure Code│         │
│  └──────────┘     └────┬─────┘         │
│       ▲                │               │
│       │                ▼               │
│       │         ┌──────────┐           │
│       │         │ SCORER   │           │
│       │         │ Composite│           │
│       │         └────┬─────┘           │
│       │              │                 │
│       │     ┌────────▼──────────┐      │
│       │     │ STOPPING RULES    │      │
│       │     │ - Threshold met?  │      │
│       │     │ - Diminishing?    │      │
│       │     │ - Max passes?     │      │
│       │     └───┬──────────┬────┘      │
│       │         │NO        │YES        │
│       │         ▼          ▼           │
│       │  ┌──────────┐  ┌────────┐     │
│       └──│FEEDBACK  │  │ RETURN │     │
│          │BUILDER   │  │ BEST   │     │
│          └──────────┘  └────────┘     │
└─────────────────────────────────────────┘
```

### 6.2 Pourquoi c'est important

1. **Maker (LLM) vs Checker (code)** — le LLM n'évalue pas sa propre qualité. Les validateurs déterministes (code pur) sont la source de vérité.
2. **Feedback structuré** — pas de "improve the article" vague. Instructions précises : "Ajoute 4 attributions en utilisant le pattern Named Authority + Claim."
3. **Stopping rules explicites** — pas de loop infini. Le système sait exactement quand s'arrêter.
4. **Best-of-N** — on garde le meilleur output sur toutes les passes, pas juste le dernier.

### 6.3 Performance observée

| Métrique | DeepSeek v4 Pro | Claude Sonnet 4.6 (attendu) |
|---|---|---|
| Score moyen | 54-87/100 | 75-92/100 |
| Passes typiques | 2-3 | 1-2 |
| Answer Nuggets | 0/4 | ≥3/4 |
| Attributions | 1-3/6 | ≥5/6 |
| Banned words | 0-3 | 0 |

---

## 7. Les Validateurs Déterministes

Ces 4 validateurs sont du **code pur** — pas de LLM, pas d'API, pas d'effets de bord. Ils sont la source de vérité du système.

### 7.1 GEO Validator (`lib/geo-validator.ts` — 286 lignes)

**Mesure la "citabilité" — probabilité qu'un LLM extraie et cite ce contenu.**

| Composant | Poids | Patterns |
|---|---|---|
| **Claims** (40%) | min 6 | Numbered facts, quantified comparisons, causal claims |
| **Attributions** (25%) | min 4 | Named authority + claim (même paragraphe), first-person testing, causal attribution |
| **Answer Nuggets** (20%) | min 4 | Question H2 + réponse 25-120 mots avec nombre/entité |
| **Density** (15%) | — | (claims + attr + nuggets) / wordCount × 1000 |

**Seuils :**
- ≥70 : passed (strong citability)
- 60-69 : passed (warning)
- <60 : FAILED — bloqué

**Seuils configurables par env :**
```
GEO_CLAIMS_MIN=6
GEO_ATTRIBUTIONS_MIN=4
GEO_NUGGETS_MIN=4
GEO_BLOCK_THRESHOLD=70
```
Pour DeepSeek (qualité inférieure) : `GEO_ATTRIBUTIONS_MIN=2`, `GEO_NUGGETS_MIN=2`, `GEO_BLOCK_THRESHOLD=40`.

### 7.2 Content Validator (`lib/content-validator.ts` — 654 lignes)

**Dernier rempart avant publication. Vérifications :**

| Check | Sévérité | Description |
|---|---|---|
| **Banned words Tier 1** (22 termes) | ERROR | "delve", "robust", "elevate", "game-changer", etc. |
| **Internal vibe tokens** | ERROR | [WARM], [SHARP], <!--GLOW-->, etc. |
| **Word count < 1000** | ERROR | Contenu trop court |
| **Word count < 1200** | WARNING | Sous la cible |
| **GEO citability < 60** | ERROR | Score GEO trop bas |
| **GEO citability < 70** | WARNING | Score GEO marginal |
| **Title vide** | ERROR | Requis pour SEO |
| **Meta title > 60 chars** | WARNING | Trop long pour Google |
| **Meta description < 120 ou > 160** | WARNING | Hors specs |
| **Health claims non sourcés** | ERROR | 9 patterns (probiotics, gut health, detox, anti-inflammatory, etc.) |
| **Ingrédients < 50% match** | ERROR | Ingrédients listés pas dans le contenu |
| **USDA températures** | WARNING | Food safety check |
| **Sentence rhythm** | WARNING | -ly adverbs, consecutive same openings, short/long sentence count |
| **Culinary validation** | WARNING | Ratios ingrédients, temps de cuisson, températures |
| **Pin-First structural rules** | ERROR/WARNING | Sections interdites, recipe card position, intro length, IMAGE placeholders |
| **Content similarity > 60%** | ERROR | Jaccard bigram — détection de contenu dupliqué |

### 7.3 Loop Scorer (`lib/loop-scorer.ts` — 278 lignes)

**Score composite qui pilote la décision d'arrêt du loop.**

| Composant | Poids | Source |
|---|---|---|
| **Judge quality** | 40% | `QualityVerdict.totalScore` (LLM) |
| **GEO citability** | 30% | `CitabilityReport.score` (code) |
| **Content validation** | 20% | `ValidationResult` (code) |
| **Structure** | 10% | Erreurs critiques (code) |

**Stopping rules implémentées :**
- `thresholdMet()` — score ≥ GEO_BLOCK_THRESHOLD ET pas d'erreurs ET citability passed
- `isDiminishing()` — stagnation ≥ 2 passes consécutives

### 7.4 Culinary Validator (`lib/culinary-validator.ts`)

Valide la cohérence culinaire : ratios ingrédients, temps de cuisson réalistes, températures plausibles.

---

## 8. Le Provider Layer — Abstraction Multi-LLM

`lib/agents/provider.ts` (263 lignes) est une abstraction qui permet de switcher entre fournisseurs LLM.

### 8.1 Interface

```typescript
interface LlmProvider {
  runText(systemPrompt: string, userPrompt: string, options?: LlmProviderOptions): Promise<string>
}
```

### 8.2 Providers implémentés

| Provider | Modèle par défaut | Particularités |
|---|---|---|
| **AnthropicProvider** | Claude Sonnet 4.6 | Prompt caching natif (ephemeral), système prompt en cache_control |
| **DeepSeekProvider** | DeepSeek v4 Pro | API Anthropic-compatible, pas de prompt caching, system prompt en string simple |

### 8.3 Sélection du provider

```typescript
// Si LLM_PROVIDER=deepseek ou ANTHROPIC_BASE_URL est défini → DeepSeek
// Sinon → Anthropic (défaut)
```

### 8.4 Résilience

- **Retry automatique** : 1 retry après 5s sur erreurs recoverable (network, rate-limit, timeout, 403, 408, 429, 5xx)
- **Timeout** : 300s par défaut (configurable)
- **JSON extraction** : `extractJson<T>()` parse la réponse LLM (supporte les markdown fences, trailing commas)

---

## 9. Stratégie SEO / GEO / LLM Citation

### 9.1 SEO Traditionnel

| Aspect | Implémentation |
|---|---|
| **Meta titles** | ≤60 chars, keyword first, naturel (pas de truncate mécanique) |
| **Meta descriptions** | 120-160 chars, value proposition + keyword |
| **H2 structure** | Planifiée par le Strategist, exécutée par le Writer |
| **Internal linking** | 2-3 liens contextuels par article (linkTargets du Strategist) |
| **Breadcrumbs** | Cluster-aware (Topical Authority SEO) |
| **Related recipes sidebar** | Cluster-aware (même cluster sémantique) |
| **Sitemap** | Dynamique, toutes les recettes + articles + pages statiques |
| **Robots.txt** | Généré dynamiquement |
| **RSS Feed** | `app/feed.xml/route.ts` |
| **llm.txt** | `app/llm.txt/route.ts` — pour les crawlers LLM |

### 9.2 GEO — AI Overview Citability (§4.7 du skill Chef Augustin)

**C'est l'innovation principale du Sprint 12 (juillet 2026).**

4 piliers proactifs :

1. **Answer Nuggets (≥4)** — Blocs autonomes de 1-3 phrases répondant à une question spécifique. Format : "[Nombre/mécanisme] because [raison]."
   - *Exemple : "A 30-minute rest at room temperature raises steak core temp by 8°F, cutting sear time by 40%."*

2. **Citation-Ready Claims** — Chaque claim factuel inclut : (1) le claim, (2) le mécanisme causal, (3) une ancre d'attribution nommée.
   - *Pattern : Chef Augustin Lefèvre recommande [X] because [Y].*

3. **Structured Data Points** — Températures en °F et °C, temps exacts (pas de "10-15 minutes"), quantités en volume ET poids, termes techniques précis.

4. **LLM-Friendly Formatting** — Étapes numérotées, comparaisons X vs Y, paragraphes courts (pas d'instructions critiques dans des paragraphes >4 lignes).

### 9.3 JSON-LD Schema.org

| Format | @graph nodes |
|---|---|
| **Pin-First** | Recipe + BreadcrumbList |
| **Google** | Recipe + BlogPosting + FAQPage + BreadcrumbList |

URL canonique : `https://chefaugustin.com/recettes/{slug}`

### 9.4 E-E-A-T Signals

Le skill Chef Augustin exige des signaux quantifiables :
- **Experience** ≥3 : connaissances culinaires observables
- **Expertise** ≥3 : technique avec POURQUOI, conséquences des substitutions
- **Authoritativeness** ≥2 : principes de science culinaire (Maillard, dénaturation des protéines)
- **Trustworthiness** ≥3 : températures food safety, difficulté honnête, stockage, pas de claims santé non sourcés

---

## 10. Stratégie Pinterest & PTRA

### 10.1 PTRA Framework v2.2

**Pinterest Topical Resonance Authority** — framework propriétaire en 11 facteurs (/100).

| Facteur | Points |
|---|---|
| Micro-Niche Focus | 10 |
| Problem-Solution Fit | 10 |
| Value-Added Fit | 10 |
| Semantic Fit | 12 |
| Visual Fit | 12 |
| Board Fit | 10 |
| Destination Fit | 10 |
| Ethical Hook Fit | 10 |
| Consistency Fit | 8 |
| Trend Timing | 4 |
| Measurement Readiness | 4 |

### 10.2 Content Graph Optimization

Le skill Pin Designer intègre les 4 signaux du Content Graph Pinterest :

1. **Topic Relevance** — board/keyword match pour les unbranded searches
2. **Saves (Engagement)** — le signal d'engagement le plus fort
3. **Domain Quality** — temps sur page, bounce-back rate
4. **Visual (Pinterest Lens)** — computer vision classification

### 10.3 Règles Clés

- **Fresh Pin Rule** : chaque pin doit avoir une image visuellement distincte (pas juste un overlay différent)
- **First-Save Board Signal** : le premier board où un pin est sauvegardé est le signal de classification le plus fort → toujours assigner au board le PLUS spécifique
- **Account Safety Gate** : anti-spam checks avant publication (duplicate creative, URL frequency, description repetition)
- **Destination Quality Gate** : la page doit exister, charger en <3s, être mobile-friendly, avoir les Rich Pins metadata

### 10.4 Board Architecture

| Board | Rôle stratégique |
|---|---|
| Easy Dinners for Two | Board primaire — toute la niche |
| 30-Minute Meals for Two | Quick solution intent |
| Small-Batch Slow Cooker | Sub-cluster slow cooker |
| Budget Meals for Two | Angle économique |
| Chicken Dinners for Two | Protein-specific |
| Asian-Inspired Dinners for Two | Test cluster secondaire |

---

## 11. Stratégie Cross-Channel

### 11.1 Analyse 3-way (Session 2026-07-12)

**Sources croisées :**
1. **Semrush** — 26 keywords Google (volume, KD)
2. **Pinclicks** — 28 keywords Pinterest (search volume)
3. **Pin Data** — 101 pins avec performance data

### 11.2 Résultats

| Catégorie | Nombre |
|---|---|
| **DUAL_CHAMPIONS** (Google + Pinterest) | 14 |
| PINTEREST_PLAYS (Pinterest only) | 7 |
| GEO opportunities | 12 |

### 11.3 Top 4 priorités

| # | Keyword | Dual Score | Google Vol | Pinterest Vol |
|---|---|---|---|---|
| 1 | healthy dinner recipes for two | 82 | 74,000 | 18,894 |
| 2 | easy dinner recipes for two | 70 | 8,100 | 96,091 |
| 3 | dinner for two recipes | 68 | 3,600 | 11,013 |
| 4 | quick dinner recipes for two | 68 | 590 | 1,283 |

### 11.4 Enriched Briefs

14 briefs prêts dans `data/enriched-briefs.json`. Chaque brief contient :
- **SEO strategy** : H2 structure, format, internal link targets
- **Pinterest strategy** : PTRA board, pin count, competition level
- **GEO strategy** : answer nugget topics, citation anchors, structured data targets
- **Agent-ready input** : keyword, format, strategyPlan, geoInstructions

---

## 12. État de Production Readiness

### 12.1 Ce qui fonctionne

| Composant | Statut | Note |
|---|---|---|
| Pipeline Inngest | ✅ Production-ready | 5 steps, retries, throttling, error recovery |
| Content Loop | ✅ Production-ready | Evaluator-Optimizer, max 3 passes, stopping rules |
| Validateurs | ✅ Production-ready | 4 validateurs déterministes, 654+286+278 lignes |
| Provider multi-LLM | ✅ Production-ready | Anthropic + DeepSeek, retry, timeout, JSON parsing |
| Frontend | ✅ Production-ready | Next.js 16, Tailwind 4, dark mode, responsive |
| SEO technique | ✅ Production-ready | Sitemap, robots.txt, RSS, JSON-LD, meta tags |
| GEO §4.7 | ✅ Implémenté | Proactive AI Overview citability dans le skill |
| PTRA Pin Designer | ✅ Production-ready | 5 pins/recette, 11-facteurs, Content Graph |
| Cross-channel analysis | ✅ Outil permanent | `scripts/analyze-cross-channel.ts` |
| Autopilot mode | ✅ Production-ready | Zéro intervention humaine |
| Batch generation | ✅ Prêt | `scripts/batch-generate.mjs` + 14 enriched briefs |
| Dashboard | ✅ Fonctionnel | Auth, génération, review, logs |
| A/B testing images | ✅ Implémenté | Multi-variant, tracking, stats |
| Content similarity | ✅ Implémenté | Jaccard bigram, détection >60% |

### 12.2 Ce qui bloque

| Bloqueur | Impact | Solution |
|---|---|---|
| **⛔ ANTHROPIC_API_KEY** | **CRITICAL** | Impossible de générer du contenu. DeepSeek produit un contenu de qualité insuffisante (0/4 nuggets, 1-3/6 attributions). |
| **⚠️ Pas de monitoring** | HIGH | Pas d'alerting, pas de dashboards de production, pas de health checks |
| **⚠️ Pas de CI/CD** | MEDIUM | Tests manuels, pas de déploiement automatisé |
| **⚠️ Pas de backup strategy** | MEDIUM | `drizzle-kit push` direct, pas de rollback |
| **⚠️ ContentValidator gap articles** | LOW | Le ContentValidator ne s'exécute pas pour les articles AOR |

---

## 13. Matrice de Maturité par Dimension

| Dimension | Score /100 | Détail |
|---|---|---|
| **Architecture pipeline** | 85 | Pattern Evaluator-Optimizer mature, separation Plan/Write, stopping rules explicites |
| **Qualité du contenu (Claude)** | 80 | E-E-A-T signals, précision culinaire, voice cohérente, GEO §4.7 |
| **Qualité du contenu (DeepSeek)** | 45 | Ne suit pas les instructions GEO, 0/4 nuggets, 1-3/6 attributions |
| **SEO** | 75 | Meta tags, JSON-LD, sitemap, internal linking, cluster-aware breadcrumbs |
| **GEO / LLM Citation** | 65 | §4.7 implémenté mais non testé avec Claude. Validateur GEO solide. |
| **Pinterest / PTRA** | 80 | Framework 11-facteurs, Content Graph, Fresh Pin Rule, Safety Gate |
| **Validation** | 82 | 4 validateurs déterministes, double safety net, banned words, health claims |
| **Résilience** | 70 | Retry, fallback, degraded mode, timeout — mais pas de circuit breaker |
| **Multi-LLM** | 72 | Provider abstraction propre, 2 providers, mais DeepSeek qualité insuffisante |
| **Frontend / UX** | 78 | Next.js 16, Tailwind 4, dark mode, Jump to Recipe, responsive |
| **Monitoring** | 25 | Logs Inngest + STATE.json + loop-run-log.md. Pas d'alerting. |
| **Testing** | 35 | Tests unitaires (3 fichiers), pas d'intégration, pas d'e2e automatisé |
| **Documentation** | 80 | CLAUDE.md, 9 fichiers rules, 18 mémoires, rapport comparatif |
| **Sécurité** | 70 | Rate limiting, auth dashboard, validation entrées — mais pas de CSP, HSTS |
| **Coût** | 85 | ~$0.15/recette avec Claude, efficace |
| **Scalabilité** | 60 | Concurrency limit 3, throttle 2/min — ok pour small scale, pas pour mass production |
| **TOTAL** | **73/100** | |

---

## 14. Analyse des Forces

### Forces architecturales

1. **Evaluator-Optimizer Loop** — Le pattern le plus solide du système. Séparation Maker/Checker, feedback structuré, stopping rules explicites. C'est du "loop engineering" appliqué correctement.

2. **Validateurs déterministes** — 4 validateurs en code pur, pas de LLM dans le chemin d'évaluation. C'est la bonne approche : le LLM génère, le code vérifie.

3. **Provider abstraction** — Interface propre, facile d'ajouter OpenAI, Gemini, ou n'importe quel provider. Le switch est une variable d'env.

4. **Plan-then-Write** — La séparation Strategist/Writer est une bonne décision architecturale. Le Strategist fait l'analyse SERP une fois, le Writer exécute.

5. **Skill system** — Les skills Markdown sont versionnés, documentés, et chargés dynamiquement. Modifier un skill = modifier le comportement du LLM sans toucher au code.

6. **Pin Designer PTRA** — Framework sophistiqué à 11 facteurs avec Content Graph optimization, Pinterest Lens CV, Safety Gate. C'est du travail de niveau professionnel.

### Forces opérationnelles

7. **Autopilot mode** — Zéro intervention humaine. Le Content Loop est le quality gate.

8. **Batch generation** — 14 briefs prêts, un script pour tout générer d'un coup.

9. **Cross-channel analysis** — Outil permanent pour ré-évaluer les opportunités quand de nouvelles données arrivent.

10. **Content similarity detection** — Jaccard bigram >60% → bloque les doublons.

---

## 15. Analyse des Faiblesses & Gaps

### Faiblesses bloquantes

1. **Dépendance à un seul modèle pour la qualité** — Sans Claude Sonnet 4.6, le système produit du contenu médiocre. DeepSeek ne suit pas les instructions GEO (0/4 nuggets). Il n'y a pas de 3ème option (OpenAI, Gemini).

2. **Pas de test réel du GEO §4.7** — La section §4.7 du skill Chef Augustin a été écrite mais jamais testée avec Claude Sonnet 4.6 (bloqué par API key). On ne sait pas si elle produit l'effet escompté (+15-20 points GEO).

### Faiblesses architecturales

3. **Content Loop sans LLM-as-Judge fort** — Le Judge (Haiku 4.5) pèse 40% du score composite mais est le modèle le moins capable. Si le Judge se trompe, le score composite est biaisé.

4. **Pas de diversification des formats de contenu** — Uniquement des recettes. Pas d'articles techniques, guides, comparaisons. La niche "Dinner for Two" est étroite.

5. **Pas de feedback loop long-terme** — Le self-improvement est limité aux logs. Pas d'analyse de performance post-publication (Google Search Console, Pinterest Analytics) réinjectée dans le pipeline.

6. **Pin Designer sur Mistral** — Le seul agent qui n'utilise pas Claude. La cohérence cross-agent pourrait en souffrir.

### Faiblesses opérationnelles

7. **Pas de monitoring de production** — Si le pipeline échoue silencieusement, personne n'est alerté.

8. **Pas de CI/CD** — Déploiement manuel, pas de tests automatisés dans le pipeline.

9. **Pas de stratégie de backup DB** — `drizzle-kit push` est destructif. Pas de rollback.

10. **Tests insuffisants** — 3 fichiers de test pour un système de cette complexité.

11. **Pas de gestion des erreurs de contenu factuel** — Le ContentValidator vérifie la forme, pas le fond. Si le LLM invente une température de cuisson dangereuse, seul le culinary validator (warning-only) la détecte.

---

## 16. Roadmap — Ce qu'il manque

### Pour atteindre 80/100 (production fiable)

| # | Action | Impact | Effort |
|---|---|---|---|
| 1 | **Obtenir ANTHROPIC_API_KEY** | Débloque tout | 5 min |
| 2 | **Test réel GEO §4.7** — générer 4 PILOT, mesurer le score GEO | Validation du investissement GEO | 1h |
| 3 | **Ajouter un 3ème provider** (OpenAI GPT-5 ou Gemini) | Résilience multi-LLM | 2h |
| 4 | **Circuit breaker** — arrêter le pipeline si 3 échecs consécutifs | Résilience | 1h |
| 5 | **Alerting** — webhook/email si erreur critique | Monitoring | 2h |

### Pour atteindre 85/100 (production excellente)

| # | Action | Impact | Effort |
|---|---|---|---|
| 6 | **ContentValidator pour les articles AOR** | Gap connu comblé | 2h |
| 7 | **Feedback loop long-terme** — GSC + Pinterest Analytics → Strategist | Self-improvement | 8h |
| 8 | **Tests d'intégration** — workflow complet mocké | Qualité | 8h |
| 9 | **Health check endpoint** — `/api/health` (DB, APIs, Inngest) | Monitoring | 1h |
| 10 | **Content performance dashboard** — analytics par recette | Opérations | 8h |

### Pour atteindre 90+/100 (world-class)

| # | Action | Impact | Effort |
|---|---|---|---|
| 11 | **Diversification formats** — articles techniques, guides, comparaisons | SEO topical authority | 40h |
| 12 | **Multi-niche support** — au-delà de "Dinner for Two" | Scale | 80h |
| 13 | **Human-in-the-loop UI** — review interface riche pour les éditeurs humains | Qualité | 40h |
| 14 | **A/B testing contenu** — variantes de titre, structure, angle | Optimisation | 40h |
| 15 | **Automated fact-checking** — cross-reference avec bases de données USDA | Exactitude | 80h |

---

## 17. Annexes — Fichiers Clés

### Fichiers du pipeline

```
lib/inngest/functions/
  generate-recipe.ts              — Workflow orchestrateur (125 lignes)
  agents/
    strategist.ts                 — Agent Strategist (117 lignes)
    chef-augustin.ts              — Agent Chef Augustin (149 lignes)
    judge.ts                      — Agent Judge (125 lignes)
    pin-designer.ts               — Agent Pin Designer
  steps/
    serp-phase.ts                 — SERP analysis
    content-loop-phase.ts         — Content Loop (244 lignes)
    image-phase.ts                — Génération images
    persist-phase.ts              — Validation + DB write
    pin-phase.ts                  — Pin Designer orchestration
```

### Fichiers de validation

```
lib/
  geo-validator.ts                — GEO citability (286 lignes)
  content-validator.ts            — Content validation (654 lignes)
  loop-scorer.ts                  — Composite scoring (278 lignes)
  culinary-validator.ts           — Culinary validation
  loop-state.ts                   — STATE.json management (205 lignes)
```

### Skills (system prompts LLM)

```
skills/
  agent-strategist.md             — Strategist (63 lignes)
  agent-chef-augustin.md          — Chef Augustin (210 lignes) ⭐
  agent-pin-designer.md           — Pin Designer (374 lignes) ⭐
  agent-judge.md                  — Judge (skill externe)
```

### Data files

```
data/
  enriched-briefs.json            — 14 briefs prêts pour génération
  cross-channel-analysis.json     — 28 keywords, 3-channel scoring
  cluster-landscape.json          — Topical clusters
  editorial-plan.json             — Plan éditorial
```

### Documentation

```
docs/
  rapport-maturite-ai-autoblog-2026-07-13.md  — Ce document
  superpowers/specs/                           — Spécifications techniques
  superpowers/plans/                           — Plans d'implémentation
```

---

## Conclusion

**AI AutoBlog est un système architecturalement mature (73/100) avec un potentiel de 78-82/100 une fois débloqué par la clé API Anthropic.**

Les fondations sont solides :
- Pipeline Evaluator-Optimizer bien conçu
- Validateurs déterministes complets
- Stratégie multi-canal (SEO + GEO + Pinterest) cohérente
- Provider abstraction propre
- 14 briefs prêts à générer

Le gap principal est **opérationnel**, pas architectural : l'absence de clé API Anthropic empêche de valider les améliorations GEO §4.7 et de lancer la production.

La dépendance à Claude Sonnet 4.6 pour la qualité est à la fois une force (meilleur modèle pour l'écriture créative) et une faiblesse (single point of failure). L'ajout d'un 3ème provider (OpenAI, Gemini) est recommandé pour la résilience.

---

> **Prochain reviewer LLM** : Les questions à se poser :
> 1. Le pattern Evaluator-Optimizer est-il correctement implémenté ? Y a-t-il des risques de boucle infinie ou de dégradation ?
> 2. Le poids du Judge (40% du score composite) sur un modèle faible (Haiku 4.5) est-il un risque ?
> 3. La stratégie GEO §4.7 est-elle suffisante pour obtenir des citations dans les AI Overviews ?
> 4. Le PTRA framework à 11 facteurs est-il sur-spécifié ou manque-t-il des signaux importants ?
> 5. Quels autres providers LLM devraient être ajoutés pour la résilience ?
