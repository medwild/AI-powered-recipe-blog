# Rapport d'Évaluation — Pipeline AI AutoBlog

> **Date** : 2026-06-27
> **Auditeur** : Claude (analyse complète codebase)
> **Périmètre** : Pipeline de génération complet (12 étapes, 6 agents IA, 7 skills, 3 services externes, schéma DB)
> **Version du projet** : Sprint 3 terminé

---

## 📋 Résumé Exécutif

Le pipeline AI AutoBlog est un système **mature et bien architecturé** de génération automatique de recettes de cuisine optimisées SEO. Construit sur Inngest (workflow engine) avec 6 agents IA spécialisés, il produit des articles de qualité professionnelle avec images, JSON-LD Schema.org, et boucle d'auto-amélioration.

### Score global : **78/100**

| Dimension | Score | Statut |
|---|---|---|
| Architecture pipeline | 85/100 | ✅ Solide |
| Qualité des agents IA | 82/100 | ✅ Bonne |
| Skills (prompt engineering) | 80/100 | ✅ Bonne |
| Gestion d'erreurs | 70/100 | 🟡 Perfectible |
| Performance / Coûts | 60/100 | 🟡 Préoccupant |
| Sécurité / Robustesse | 75/100 | 🟡 Quelques gaps |
| Observabilité | 72/100 | 🟡 Correcte |
| Maintenabilité | 85/100 | ✅ Bonne |

### Top 3 forces
1. **Architecture multi-agents asynchrones** avec Inngest — retry, annulation, observabilité
2. **Prompt engineering de haute qualité** — persona cohérent, anti-AI slop, rubriques calibrées
3. **Boucle d'auto-amélioration fermée** — feedback Auditor → QA → Strategist

### Top 3 risques
1. 🔴 **Contexte LLM saturé** — l'agent QA reçoit 4 documents complets (~50 KB), risque d'overflow
2. 🔴 **Goulot d'étranglement singleton** — 1 workflow à la fois, bloqué 7 jours par la review humaine
3. 🟡 **Bug schéma** — `serial` sur `imageVariantStats.impressions/clicks` au lieu d'`integer`

---

## 1. Architecture du Pipeline

### 1.1 Vue d'ensemble

```
┌──────────┐    ┌───────────┐    ┌────────┐    ┌──────────┐    ┌──────┐    ┌──────────────┐    ┌───────┐
│  SERP    │ → │ Strategist │ → │ Writer │ → │ Auditor  │ → │Human │ → │ Editor (loop) │ → │  QA   │
│ Analysis │    │   Agent 1  │    │Agent 2 │    │  Agent 3 │    │Review│    │   Agent 4     │    │Agent 5│
└──────────┘    └───────────┘    └────────┘    └──────────┘    └──────┘    └──────────────┘    └───────┘
                                                                                                  │
                                                              ┌───────────────────────────────────┘
                                                              ▼
┌──────────────┐    ┌──────────┐    ┌──────────────────┐    ┌────────────┐
│ A/B Tracking │ ← │ Persist  │ ← │ Self-Improvement │ ← │ Image Gen  │
│   Step 12    │    │ Step 11  │    │     Step 10      │    │  Steps 8-9 │
└──────────────┘    └──────────┘    └──────────────────┘    └────────────┘
```

### 1.2 Flux détaillé (12 étapes)

| Step | Nom | Agent | Sleep | Description |
|---|---|---|---|---|
| 1 | `analyze-serp` | Serper.dev | 2s | Récupération données Google (top 10, PAA, related searches) |
| 2 | `agent-1-strategist` | Strategist v5.0 | 25s | Plan éditorial SEO/GEO + PAA fallback si <2 questions |
| 3 | `agent-2-writer` | Writer v5.1 | 25s | Rédaction anti-AI persona Chef Augustin Lefèvre |
| 4 | `agent-3-auditor` | Auditor v5.1 | 2s | Évaluation 8 critères + AI score estimation |
| 5 | `persist-draft-for-review` | — | 2s | Sauvegarde brouillon, status = `draft_review` |
| 6 | `wait-for-approval` | Humain | 30s | Attente approbation (7j timeout, bypassable) |
| 7 | `agent-4-editor-pass-N` | Editor v5.0 | 2s×N | Corrections + humanisation (max 3 passes) |
| 7.5 | `agent-5-qa` | QA v1.0 | 2s | Vérification cross-agent (5 checks) + boucle NEEDS_FIX |
| 8 | `optimize-image-prompt` | ImageOptimizer | 1s | Optimisation prompt 10 couches (fallback programmatique) |
| 9 | `generate-and-upload-images` | FLUX-1 | 3s | Génération 1-3 variants image + upload Cloudinary |
| 10 | `self-improvement` | — | 2s | Enregistrement leçons (Auditor + AI Score + QA) |
| 11 | `persist-draft-final` | — | — | Sauvegarde finale (JSON-LD, meta, imageVariants) |
| 12 | `init-variant-stats` | — | 1s | Initialisation tracking A/B |

### 1.3 Configuration Inngest

```typescript
concurrency: { key: "generate-recipe-singleton", limit: 1 }  // ⚠️ 1 seul workflow à la fois
throttle:   { key: "recipe-generation-throttle", limit: 2, period: "1m" }
retries:    3
cancelOn:   [{ event: "recipe/cancel", match: "data.recipeId" }]
```

**Problème** : Le singleton + review humaine 7 jours = pipeline entièrement bloqué si une recette attend approbation.

---

## 2. Analyse Agent par Agent

### 2.1 Strategist v5.0 ULTRA

| Critère | Note |
|---|---|
| **LOC** | 116 |
| **Type principal** | `SeoPlan` (21 champs, bien structuré) |
| **Température** | 0.7 (élevée pour un rôle analytique) |
| **Max tokens** | 3072 |
| **Qualité du code** | ⭐⭐⭐⭐ |

**Forces :**
- Type `SeoPlan` riche : H2 sections, entités, gap analysis, citation strategy
- Contextual filtering des leçons passées (tag overlap, incompatibilité recette)
- Intégration calibration stats pour planification data-driven

**Faiblesses :**
- Pas de validation d'entrée — `serp` peut être vide
- `pastImprovements` non plafonné — risque de dépassement de contexte
- `new Date().toISOString()` dans le prompt casse le cache LLM

---

### 2.2 Writer v5.1 ULTRA

| Critère | Note |
|---|---|
| **LOC** | 103 |
| **Type principal** | `RecipeDraft` (20 champs + optionnels erreur) |
| **Température** | 0.9 (créativité) + `top_p: 0.92` + penalties |
| **Max tokens** | 3072 |
| **Qualité du code** | ⭐⭐⭐⭐ |

**Forces :**
- Température et pénalités bien calibrées pour la création
- Contrat clair avec le SeoPlan (metadata exacts, PAA naturelles)
- Type `eeatSignals` pour conformité E-E-A-T

**Faiblesses :**
- `imagePrompt` généré par le Writer puis remplacé par l'Optimizer → redondance
- Champs erreur optionnels dans `RecipeDraft` → pollution du type succès
- 3072 tokens serrés pour un article 800-1200 mots + JSON

---

### 2.3 Auditor v5.1 ULTRA

| Critère | Note |
|---|---|
| **LOC** | 99 |
| **Type principal** | `AuditReport` (5 champs + `factual_corrections[]`) |
| **Température** | 0.1 (déterministe) |
| **Max tokens** | 3072 |
| **Qualité du code** | ⭐⭐⭐⭐ |

**Forces :**
- Clamping post-processing des scores (0-100 / 0-20)
- `factual_corrections` avec source — traçable
- Score clamping défensif contre les hallucinations numériques

**Faiblesses :**
- 🔴 **Troncature à 3000 caractères** — l'Auditor ne voit que le début de l'article
- Verdict binaire `OK | NEEDS_REVISION` sans gradation
- `score_ia_estimation` — nom franglais, incohérent avec le reste du codebase
- Pas de validation du nombre de critères retournés

---

### 2.4 Editor v5.0 ULTRA

| Critère | Note |
|---|---|
| **LOC** | 114 |
| **Type principal** | `RecipeDraft` (retourne le même type que Writer) |
| **Température** | 0.8 (élevée pour un éditeur) |
| **Max tokens** | 3072 |
| **Qualité du code** | ⭐⭐⭐ |

**Forces :**
- Prompt riche : verdict contextuel, corrections factuelles obligatoires, bloc humanization conditionnel
- Constante `MAX_HUMANIZATION_PASSES = 3` pour borner les itérations
- Humanization conditionnelle (seulement si verdict NEEDS_REVISION + AI score ≥ 20)

**Faiblesses :**
- **Code mort** : `forceOk` calculé (ligne 33) mais jamais utilisé
- `contentMarkdown` complet dans le prompt (pas de troncature) → risque overflow
- `changes_summary` fragile — basé sur le compte d'issues
- Pas de validation que les corrections ont été appliquées (délégué au QA)

---

### 2.5 QA v1.0 ULTRA

| Critère | Note |
|---|---|
| **LOC** | 193 |
| **Type principal** | `QAReport` (qaScore, verdict, checks[], summary) |
| **Température** | 0.1 (déterministe) |
| **Max tokens** | 2048 |
| **Qualité du code** | ⭐⭐⭐⭐⭐ |

**Forces :**
- Architecture cross-agent la plus complète — touche tous les autres agents
- 5 checks avec méthodes de vérification explicites (pas juste "vérifie si c'est bon")
- Verdict normalisation défensive (fallback si verdict LLM invalide)
- Anti-regression sweep (Check 5) — détecte les nouveaux problèmes introduits par l'Editor

**Faiblesses :**
- 🔴 **4 documents complets en entrée** — risque sérieux de saturation du contexte LLM
- `details: Record<string, unknown>` — échappatoire type-safety
- Pas de validation du nombre de checks retournés (5 attendus)
- L'agent le plus récent (v1.0) — moins éprouvé que les v5.x

---

### 2.6 Image Prompt Optimizer

| Critère | Note |
|---|---|
| **LOC** | 115 |
| **Type de retour** | `string` (pas de JSON — seul agent sans parsing structuré) |
| **Température** | 0.7 |
| **Max tokens** | 512 |
| **Qualité du code** | ⭐⭐⭐⭐⭐ |

**Forces :**
- 🛡️ **Meilleur design défensif** : fallback programmatique `buildDefaultPrompt()` si le LLM échoue
- Validation de longueur (≥50 caractères) avant acceptation
- Architecture 10 couches dans le fallback (sujet → exclusions)
- Branching par type de plat (italien vs dessert vs générique)

**Faiblesses :**
- Utilise `runText` (sans retry) au lieu de `runTextAndParseJson`
- Fallback avec valeurs hardcodées (Sony A7R IV, 90mm macro) — peut ne pas correspondre au plat
- Ne reçoit pas les entités sémantiques du Strategist → opportunité manquée
- Pas de multi-variant dans l'optimizer lui-même (géré en aval)

---

## 3. Skills — Évaluation Prompt Engineering

### 3.1 Qualité par skill

| Skill | Taille | Prompt Engineering | Structure | Token Budget | Score |
|---|---|---|---|---|---|
| `agent-strategist` | 15.5 KB | ⭐⭐⭐ | ⭐⭐⭐⭐ | 3072 ✅ | 75 |
| `agent-writer` | 17 KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3072 ⚠️ serré | 90 |
| `agent-auditor` | 32 KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3072 🔴 lourd | 70 |
| `agent-editor` | 14 KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3072 ✅ | 82 |
| `agent-qa` | 19 KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2048 ✅ | 85 |
| `food-photography` | 30 KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 3072 🔴 lourd | 80 |
| `self-improvement` | 5 KB | N/A (spec) | ⭐⭐⭐ | N/A | 60 |

### 3.2 Motifs de prompt engineering notables

**Forces :**
- 🎭 **Voice anchor tokens** (Writer) — [WARM], [SHARP], [WINK], [GRIT], [GLOW] créent un signal de persona mesurable
- 🔍 **Horoscope Test** (Writer) — heuristique anti-AI-slup concrète et actionnable
- 📊 **Rubriques calibrées** (Auditor) — bandes 0/5/10/15/20 avec indicateurs détaillés
- 🔬 **Diff mental model** (QA) — le LLM doit comparer deux versions du même article
- 🎨 **Architecture 10 couches** (Food Photo) — budget de mots par couche, contraintes précises
- 🛡️ **Regression prevention checklist** (Editor) — liste explicite de ce qu'il NE FAUT PAS toucher

**Faiblesses :**
- 🔴 L'Auditor et le Food Photo ont ~30 KB d'instructions chacun — le contexte LLM est saturé avant même de recevoir l'input
- 🔴 Le QA reçoit 4 documents complets — probablement 40-50 KB d'input total
- `self-improvement.md` n'est pas un skill mais une spec d'architecture — pollue le dossier skills/

---

## 4. Infrastructure & Services

### 4.1 Services externes

| Service | Rôle | Fallback | Résilience |
|---|---|---|---|
| **Serper.dev** | SERP Google | ❌ Aucun | Erreur remonte |
| **NaraRouter** (Mistral Medium 3.5) | LLM primaire | → Cloudflare GPT-OSS 120B | 3 tentatives |
| **Cloudflare Workers AI** | LLM fallback + Image (FLUX-1) | ❌ Aucun après 3 tentatives | 3 tentatives |
| **Cloudinary** | Hébergement images | ❌ Aucun | Erreur capturée par variant |

### 4.2 Chaîne de fallback LLM

```
NaraRouter Mistral Medium 3.5 (tentative 1)
  ↓ échec (5s délai)
NaraRouter Mistral Medium 3.5 (tentative 2)
  ↓ échec (10s délai)
Cloudflare GPT-OSS 120B (tentative 3 — dernier recours)
```

**Problèmes :**
- Si `NARAROUTER_API_KEY` n'est pas définie → tout passe sur Cloudflare Gemma 4 26B (qualité inférieure)
- La différence de qualité entre Mistral 128B et Gemma 4 26B est significative mais transparente pour l'utilisateur
- `runText` (utilisé par Image Optimizer) n'a PAS ce fallback → va directement au catch

---

## 5. Schéma Base de Données

### 5.1 Tables

| Table | Colonnes | Index | Note |
|---|---|---|---|
| `recipes` | 27 | 4 (status, slug, publishedAt, createdAt) | Table principale |
| `self_improvement_logs` | 9 | 0 | Leçons d'auto-amélioration |
| `image_variant_stats` | 6 | 2 (recipeId, recipeId+variantIndex) | Tracking A/B |

### 5.2 Anomalies détectées

| # | Sévérité | Problème | Impact |
|---|---|---|---|
| 1 | 🔴 Haute | `imageVariantStats.impressions` et `clicks` typés `serial` au lieu d'`integer` | Auto-incrémente à l'insert — données invalides |
| 2 | 🟡 Moyenne | `selfImprovementLogs.score` stocké en `text` | Pas d'agrégation SQL directe (AVG, SUM) |
| 3 | 🟡 Moyenne | Pas de clés étrangères entre `imageVariantStats.recipeId` ↔ `recipes.id` | Lignes orphelines possibles |
| 4 | 🟢 Basse | Pas de FK entre `selfImprovementLogs` et `recipes` | Lignes orphelines possibles |
| 5 | 🟢 Basse | `serial` utilisé partout au lieu d'`integer` + `generatedAlwaysAsIdentity` | Pattern Drizzle moderne recommandé |

---

## 6. Analyse des Risques

### 🔴 Critiques (action immédiate requise)

| # | Risque | Localisation | Impact |
|---|---|---|---|
| **R1** | **Saturation contexte LLM** — QA reçoit 4 documents complets, Auditor 32 KB d'instructions | `qa.ts`, `auditor.ts` | Échec silencieux, vérifications non fiables |
| **R2** | **Singleton pipeline bloqué 7 jours** — `concurrency: 1` + review humaine | `generate-recipe.ts:79-81` | Aucune recette générée si une est en attente |
| **R3** | **Bug `serial` sur colonnes analytics** — `impressions`/`clicks` auto-incrémentés | `schema.ts:56-57` | Données A/B testing invalides |
| **R4** | **Auditor tronque à 3000 chars** — ne voit que le début de l'article | `auditor.ts:63` | Faux négatifs sur la qualité du contenu |

### 🟡 Moyens (à corriger dans le sprint suivant)

| # | Risque | Localisation | Impact |
|---|---|---|---|
| **R5** | Pas de hard-fail sur QA REJECT/CRITICAL — continue avec warnings | `generate-recipe.ts:558-576` | Contenu incorrect peut atteindre "draft" |
| **R6** | `pastImprovements` non plafonné — peut saturer le prompt Strategist | `strategist.ts:58-91` | Dépassement coûteux du contexte |
| **R7** | `imagePrompt` Writer redondant avec Image Optimizer | `writer.ts`, `image-prompt-optimizer.ts` | Travail LLM gaspillé |
| **R8** | Pas de retry sur `uploadImage` (Cloudinary) | `generate-recipe.ts:638` | Perte d'image sur erreur réseau transitoire |
| **R9** | Code mort `forceOk` dans l'Editor | `editor.ts:33` | Maintenance confuse |
| **R10** | `RecipeDraft` pollué par champs erreur | `writer.ts:38-44` | Type-safety dégradée |

### 🟢 Basse priorité (dette technique)

| # | Risque | Localisation |
|---|---|---|
| **R11** | `new Date().toISOString()` dans le prompt Strategist casse le cache | `strategist.ts:63` |
| **R12** | Nommage franglais (`score_ia_estimation`, `eeatSignals`) | `auditor.ts`, `writer.ts` |
| **R13** | `details: Record<string, unknown>` dans QAReport | `qa.ts:31` |
| **R14** | Pas de timeout global sur le workflow | `generate-recipe.ts` |
| **R15** | PAA synthétiques toujours en anglais | `generate-recipe.ts:45-58` |

---

## 7. Métriques de Coût et Performance

### 7.1 Appels LLM par recette

| Scénario | Appels LLM | Délai estimé |
|---|---|---|
| Minimal (audit OK, pas d'édition) | 4 (Strategist, Writer, Auditor, Image Opt) | ~60s |
| Standard (1 passe Editor, QA PASS) | 7 (+Editor, +Re-Audit, +QA) | ~90s |
| Maximum (3 passes Editor + QA fix) | 12 (+Editor×2, +Re-Audit×2, +QA, +Editor-QA, +QA-recheck) | ~150s |

### 7.2 Coûts estimés par recette (tarifs NaraRouter Mistral Medium 3.5)

| Poste | Tokens input | Tokens output | Coût estimé |
|---|---|---|---|
| Strategist | ~2K | ~500 | $0.003 |
| Writer | ~3K | ~2.5K | $0.007 |
| Auditor | ~5K | ~1K | $0.008 |
| Editor (×1) | ~4K | ~2.5K | $0.008 |
| QA | ~8K | ~1K | $0.012 |
| Image Optimizer | ~2K | ~0.3K | $0.003 |
| **Total standard** | **~24K** | **~7.8K** | **~$0.041** |

> ⚠️ Estimations basées sur Mistral Medium 3.5 pricing public. Multiplier par ~1.5-2× en cas de fallback Cloudflare.

---

## 8. Recommandations

### Priorité 1 — Critique (Sprint 4)

| # | Recommandation | Effort | Impact |
|---|---|---|---|
| **R1** | **Truncation intelligente pour QA** — envoyer uniquement les sections pertinentes, pas le markdown complet | 2h | 🔴 Évite saturation contexte |
| **R2** | **Supprimer le singleton** — `concurrency: 3` avec file d'attente par statut (ne pas bloquer sur `draft_review`) | 1h | 🔴 Débloque le pipeline |
| **R3** | **Corriger `serial` → `integer`** sur `imageVariantStats` + `drizzle-kit push` | 15min | 🔴 Répare les analytics |
| **R4** | **Auditor sans troncature** — envoyer l'article complet ou utiliser un résumé intelligent | 1h | 🔴 Audit fiable |

### Priorité 2 — Important (Sprint 5)

| # | Recommandation | Effort |
|---|---|---|
| **R5** | **Hard-fail sur QA CRITICAL** — ne pas publier si Check 2 (Voice) ou Check 3 (Structure) FAIL | 1h |
| **R6** | **Plafonner `pastImprovements`** à 10 leçons avec résumé automatique | 1h |
| **R7** | **Supprimer `imagePrompt` du Writer** — le Writer ne génère plus ce champ, l'Optimizer le crée from scratch | 30min |
| **R8** | **Retry Cloudinary** — wrapper avec 2 tentatives comme le client NaraRouter | 30min |
| **R9** | **Nettoyer `forceOk`** — supprimer le code mort ou le câbler | 15min |

### Priorité 3 — Dette technique

| # | Recommandation | Effort |
|---|---|---|
| **R10** | **Discriminated union pour RecipeDraft** — `RecipeDraft | RecipeDraftError` | 1h |
| **R11** | **Renommer `score_ia_estimation`** → `aiDetectionScore` (cohérence anglais) | 30min |
| **R12** | **Timeout global workflow** — 30 minutes + cleanup automatique | 30min |
| **R13** | **Validation Zod/Valibot sur les sorties LLM** — détecter la dérive de modèle | 2h |
| **R14** | **PAA fallback multilingue** — utiliser `SERP_HL` pour générer dans la bonne langue | 30min |

---

## 9. Conclusion

Le pipeline AI AutoBlog est un **système de génération de contenu mature et bien conçu**. L'architecture multi-agents avec Inngest offre une résilience et une observabilité de niveau production. Le prompt engineering est de haute qualité, avec des patterns sophistiqués (voice tokens, Horoscope Test, rubriques calibrées, diff mental model).

Les risques principaux sont **opérationnels** (goulot singleton + review humaine) et **de capacité LLM** (saturation de contexte sur QA et Auditor), pas architecturaux. Les corrections sont bien ciblées et peuvent être résolues en un sprint.

**Le pipeline est prêt pour un déploiement en production**, avec les réserves documentées ci-dessus. Le Sprint 4 devrait adresser les 4 risques critiques identifiés (section 8, priorité 1) avant la mise en production.

---

> **Fichier généré le 2026-06-27**
> **Analyse par Claude (Anthropic) — couverture complète du codebase**
> **Projet** : https://github.com/user/ai-blog-builder (non versionné)
