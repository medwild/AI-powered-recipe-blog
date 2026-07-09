# Pipeline Simplification v10 — Design Spec

**Date**: 2026-07-09
**Status**: Approved
**Goal**: Système AI puissant produisant du contenu de qualité supérieure, optimisé hitjacking PTRA + référencement LLM, capable de faire apparaître les URLs Pinterest en 1ère page Google.

## 1. Diagnostic

La pipeline actuelle (12 étapes, 6 agents) souffre d'overengineering hérité :

1. **Historique** : conçue pour des modèles faibles (Llama, Mistral) où la séparation des tâches avait un sens
2. **Mode** : les pipelines multi-agents sont la tendance 2025-2026
3. **Fausse précision** : les schémas JSON inter-agents contraignent la qualité au lieu de l'améliorer
4. **Théâtre** : l'Auditor note le Writer = le même LLM se note lui-même

Avec DeepSeek v4 Pro (128K contexte), un seul appel peut remplacer 6 agents.

## 2. Architecture Cible

```
Étape 1: SERP (Serper API)          ← données Google réelles, irremplaçable
    ↓
Étape 2: Agent Unique (DeepSeek)    ← 1 appel, 1 prompt, toutes les tâches :
    ├─ Analyse keyword + SERP             (ex-Strategist)
    ├─ Plan éditorial                     (ex-Strategist)
    ├─ Rédaction pin-first 1200-1500 mots (ex-Writer)
    ├─ Auto-critique + correction         (ex-Auditor + Editor)
    ├─ Prompt image food photography      (ex-Image Optimizer)
    └─ JSON-LD complet                    (ex-Strategist output)
    ↓
Étape 3: Image Gen (FLUX-1 → Ideogram) ← génération image 2:3
    ↓
Validation Déterministe ($0) :
    ├─ GEO Validator      (claims + attributions ≥ seuil)
    ├─ ContentValidator   (banned words, health claims)
    ├─ SEO Gate           (schema, meta, cannibalisation)
    └─ Citation Readiness (scorecard dashboard)
    ↓
Pin Designer (1 appel DeepSeek)      ← 5 pins Pinterest par recette
    ↓
Publication
```

## 3. Ce qu'on garde

| Composant | Raison |
|---|---|
| SERP (Serper API) | Données Google réelles — seule source externe irremplaçable |
| GEO Validator | Déterministe, $0, bloque contenu sous-standard (claims/attributions) |
| ContentValidator | Déterministe, $0, bloque banned words et health claims |
| SEO Gate | Déterministe, $0, vérifie schema/meta/cannibalisation |
| Citation Readiness | Scorecard dashboard, prédit extractabilité LLM |
| Pin Designer | 5 pins Pinterest/recette, cœur de la stratégie hitjacking |
| External Sources | 26 faits food science sourcés, injectés dans le prompt |
| Image Gen (FLUX) | Fallback gratuit, Ideogram quand clé dispo |

## 4. Ce qu'on vire

| Composant | Raison |
|---|---|
| SERP Structurer (Agent 0) | L'agent unique peut analyser le SERP brut |
| Strategist (Agent 1) | Fondu dans l'agent unique |
| Writer (Agent 2) | Fondu dans l'agent unique |
| Auditor (Agent 3) | Le LLM qui se note = théâtre |
| Editor (Agent 4) | L'auto-critique dans le même appel = plus efficace |
| QA (Agent 5) | Vérifie des problèmes créés par la pipeline elle-même |
| Image Optimizer (Agent 6) | Fondu dans l'agent unique |
| NaraRouter | Plus utilisé (DeepSeek direct) |
| Cloudflare Workers AI (texte) | Plus utilisé |
| Circuit Breaker | Plus nécessaire |
| Self-Improvement Logs | Feedback loop cassée (LLM se note lui-même) |
| Contrats inter-agents | 6 schémas JSON de validation |
| Skills séparés (6 fichiers) | Remplacés par 1 skill unifié |

## 5. Agent Unique — System Prompt

Fichier : `skills/agent-chef-augustin.md` (~300 lignes)

```
§1  IDENTITY — Chef Augustin persona, ton, voix
§2  INPUT — keyword + SERP data brute + external sources matchées
§3  STRATEGY — analyse SERP, identifie gaps concurrents, définit angle
§4  STRUCTURE — pin-first (recette au-dessus, 1200-1500 mots, FAQ 3Q)
§5  WRITING — inverted pyramid, 4 patterns attribution, vocabulary precis
§6  SELF-EDIT — checklist 12 points, corrige avant output
§7  IMAGE — food photography prompt 2:3
§8  JSON-LD — Recipe + BlogPosting + BreadcrumbList
§9  OUTPUT — JSON unique (pas de contrats inter-agents)
```

## 6. Output Schema (unique)

```json
{
  "title": "H1 optimisé SEO",
  "metaTitle": "≤60 chars",
  "metaDescription": "150-160 chars",
  "excerpt": "1-2 phrases",
  "contentMarkdown": "## Intro\n...\n## FAQ\n...",
  "ingredients": [...],
  "instructions": [...],
  "tags": [...],
  "prepTime": "15 min",
  "cookTime": "30 min",
  "totalTime": "45 min",
  "servings": "2 servings",
  "difficulty": "Easy",
  "imagePrompt": "Food photography prompt...",
  "jsonLd": { "@graph": [...] }
}
```

## 7. Validation Post-Génération

Pipeline Inngest en 4 steps :

```
Step 1: runSerpPhase        → Serper API → SERP brute
Step 2: runAgentPhase       → DeepSeek (1 appel) → output JSON complet
Step 3: runImagePhase       → FLUX-1 → Cloudinary
Step 4: validateAndPersist  → GEO + ContentValidator + SEO Gate + persist
         [Pin Designer]     → si mode pin-first → 5 pins
```

Si validation échoue → `status: "draft"` + log erreur. Pas de retry automatique (le contenu sous-standard ne s'améliore pas en bouclant).

## 8. Fichiers Impactés

| Fichier | Action |
|---|---|
| `skills/agent-chef-augustin.md` | **NOUVEAU** — system prompt unifié |
| `lib/inngest/functions/generate-recipe.ts` | **REWRITE** — 12 steps → 4 steps |
| `lib/inngest/functions/steps/agent-phase.ts` | **REWRITE** — 1 agent au lieu de Strategist→Writer→Auditor |
| `lib/inngest/functions/agents/chef-augustin.ts` | **NOUVEAU** — runtime agent unique |
| `lib/inngest/functions/agents/strategist.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/agents/writer.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/agents/auditor.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/agents/editor.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/agents/qa.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/agents/image-prompt-optimizer.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/agents/aor-writer.ts` | **SUPPRIMÉ** |
| `lib/inngest/functions/steps/editor-qa-loop.ts` | **SUPPRIMÉ** |
| `lib/agents/nararouter.ts` | **SUPPRIMÉ** |
| `lib/agents/contract-validator.ts` | **SUPPRIMÉ** |
| `lib/circuit-breaker.ts` | **SUPPRIMÉ** |
| `skills/agent-strategist.md` | **ARCHIVÉ** → `skills/archive/` |
| `skills/agent-writer.md` | **ARCHIVÉ** |
| `skills/agent-auditor.md` | **ARCHIVÉ** |
| `skills/agent-editor.md` | **ARCHIVÉ** |
| `skills/agent-qa.md` | **ARCHIVÉ** |
| `skills/food-photography.md` | **ARCHIVÉ** |
| `skills/agent-aor-writer.md` | **ARCHIVÉ** |
| `lib/inngest/functions/agents/pin-designer.ts` | **CONSERVÉ** |
| `lib/geo-validator.ts` | **CONSERVÉ** |
| `lib/content-validator.ts` | **CONSERVÉ** |
| `lib/citation-readiness.ts` | **CONSERVÉ** |
| `lib/external-sources.ts` | **CONSERVÉ** |
| `lib/agents/anthropic.ts` | **CONSERVÉ** |
| `lib/agents/cloudflare.ts` | **CONSERVÉ** (fallback images) |
| `lib/inngest/functions/steps/persist-phase.ts` | **MODIFIÉ** — simplifié |
| `lib/inngest/functions/steps/serp-phase.ts` | **CONSERVÉ** |
| `lib/inngest/functions/steps/image-phase.ts` | **CONSERVÉ** |
| `lib/inngest/functions/steps/pin-phase.ts` | **CONSERVÉ** |

## 9. Bénéfices

| Métrique | Avant | Après |
|---|---|---|
| Appels LLM par recette | 6-8 | 1-2 |
| Temps de génération | 8-15 min | 2-3 min |
| Points de défaillance | 6 agents + 3 providers | 1 agent + 1 provider |
| Fichiers skills | 7 | 1 |
| JSON inter-agents | 6 schémas | 0 |
| Coût DeepSeek estimé | ~0.30$/recette | ~0.05$/recette |
| Surface de bugs | Élevée (contrats, parsing) | Faible (sortie unique) |
| Taille codebase | ~4000 lignes (agents) | ~500 lignes (agent unique) |

## 10. Risques

| Risque | Mitigation |
|---|---|
| Prompt unique trop long → LLM ignore certaines instructions | Skills concis (~300 lignes), checklist sortie obligatoire |
| DeepSeek qualité inférieure à Claude pour la rédaction | Switch à Claude Sonnet 4.6 quand clé dispo (même prompt) |
| Perte de la boucle self-improvement | Remplacée par validation déterministe + feedback manuel dashboard |
| JSON malformé (problème connu DeepSeek) | repairJson amélioré + maxTokens 8192 + retry 2× |
