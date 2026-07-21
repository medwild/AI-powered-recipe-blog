# 🔬 Audit Karpathy — Pipeline v13 Single-Pass
> **Date** : 2026-07-18 | **Auditeur** : Analyse chirurgicale façon Andrej Karpathy
> **Périmètre** : Core AI system — agents, skills, validateurs, pipeline Inngest, provider
> **Méthode** : Lecture exhaustive de 30+ fichiers (~5000 lignes de code source), 4 agents d'exploration parallèles
> **Fichiers analysés** : 5 skills markdown, 5 agents runtime, 4 validateurs, 4 phases Inngest, provider, helpers, state, config

---

## Résumé exécutif

Le pipeline v13 est structurellement solide mais contient **3 bugs critiques** (code mort, fonctions manquantes, validations jamais exécutées) et **5 problèmes de qualité** qui dégradent silencieusement la sortie. Le principe Karpathy — "le LLM génère, le code vérifie" — est bien implémenté mais **les vérifications code ne couvrent que ~60% de ce qu'elles devraient**.

**Score de fiabilité estimé** : 72/100 → **85/100 après corrections**.

---

## 🔴 CRITICAL — 3 bugs bloquants

### BUG #1 : `loop-scorer.ts` — 3 fonctions manquantes, tests cassés

**Fichier** : `lib/loop-scorer.ts:89`
**Impact** : `__tests__/loop-scorer.test.ts` importe `thresholdMet`, `isDiminishing`, `buildLoopFeedback` — **aucune n'existe dans le fichier source**.

```typescript
// __tests__/loop-scorer.test.ts:2 — CES FONCTIONS N'EXISTENT PAS
import { computeLoopScore, thresholdMet, isDiminishing, buildLoopFeedback } from "@/lib/loop-scorer"
```

`grep -rn "thresholdMet\|isDiminishing\|buildLoopFeedback" lib/` → **zéro résultat**.

Ces fonctions étaient dans la v12 (Evaluator-Optimizer loop) et ont été supprimées lors du passage en single-pass v13, mais les tests n'ont pas été mis à jour.

**Fix chirurgical** : Supprimer les tests des 3 fonctions obsolètes (elles n'ont plus de sens en single-pass) OU implémenter des stubs qui documentent la décision architecturale.

---

### BUG #2 : Judge agent — 100% dead code, 20% du scoring composite = 0

**Fichier** : `lib/inngest/functions/agents/judge.ts` (129 lignes) + `skills/agent-judge.md` (97 lignes)
**Impact** : Le Judge n'est **jamais appelé** dans le pipeline v13.

```typescript
// content-loop-phase.ts:145 — LE JUDGE N'EST JAMAIS PASSÉ
const score = computeLoopScore(geo, val)  // ← judgeVerdict? manquant = 0 permanent

// loop-scorer.ts:53
const judgeScore = judgeVerdict?.totalScore ?? 0  // ← TOUJOURS 0 en production
```

**Conséquences** :
- Le score composite max réel est **80/100** (50 GEO + 20 Content + 10 Structure), pas 100
- La dimension "Voice Authenticity" n'est jamais évaluée automatiquement
- Les logs affichent `Judge:0/100→0` en permanence — aucune valeur diagnostique
- 226 lignes de code + skill maintenues pour rien

**Fix chirurgical** : Deux options :
1. **Intégrer le Judge** dans `content-loop-phase.ts` après la génération (coût : +1 appel LLM, +2-3s, bénéfice : évaluation voix + culinary accuracy)
2. **Supprimer le Judge** du scoring composite, recalibrer les poids à GEO 60% + Content 25% + Structure 15% = 100%, supprimer les fichiers orphelins

**Recommandation** : Option 2. Le Judge coûte un appel LLM pour une évaluation non-bloquante. Les validateurs déterministes (GEO + Content) sont plus fiables. Recalibrer les poids.

---

### BUG #3 : Science Enricher — 100% dead code, enrichissements jamais injectés

**Fichier** : `lib/inngest/functions/agents/science-enricher.ts` (163 lignes) + `skills/agent-science-enricher.md` (82 lignes)
**Impact** : Le `formatEnrichmentsForWriter()` n'est **jamais appelé**. Les enrichissements food science ne sont jamais injectés dans les articles.

```typescript
// science-enricher.ts:135 — formatEnrichmentsForWriter() existe mais...
// content-loop-phase.ts — ...le feedback n'est jamais passé à agentChefAugustin()

// chef-augustin.ts:107 — le paramètre feedback? existe mais...
// content-loop-phase.ts:131 — ...il n'est jamais fourni
const res = await agentChefAugustin({
  keyword, format, strategyPlan, cuisineReplacements,
  // feedback: undefined ← JAMAIS FOURNI
})
```

**Conséquences** :
- Aucun enrichissement food science dans les articles générés
- Perte de citabilité GEO (les claims scientifiques sont un signal fort pour AI Overviews)
- 245 lignes de code + skill maintenues pour rien

**Fix chirurgical** : Appeler `agentScienceEnricher` après la génération initiale du Writer, puis passer le résultat via `feedback` dans le `buildUserPrompt` si un retry est nécessaire. Coût : +0-1 appel LLM (uniquement sur retry).

---

## 🟠 HIGH — 5 problèmes de qualité

### HIGH #1 : Double check GEO avec seuils divergents

**Fichiers** : `content-validator.ts:152` + `persist-phase.ts:222-224`
**Impact** : `checkCitability()` est appelée 2 fois avec des seuils différents qui peuvent diverger.

| Emplacement | Seuil BLOCK | Seuil WARN | Configurable ? |
|---|---|---|---|
| `validateContent()` (content-loop) | 60 (hardcodé) | 70 (hardcodé) | ❌ Non |
| `persist-phase.ts` (final) | `GEO_BLOCK_THRESHOLD` (défaut 60) | `GEO_WARN_THRESHOLD` (défaut 70) | ✅ Oui |
| `.env.example` (valeurs suggérées) | `40` | `55` | — |

**Problème** : `.env.example` suggère `GEO_BLOCK_THRESHOLD=40` et `GEO_WARN_THRESHOLD=55` — **beaucoup plus bas que les défauts code de 60/70**. Si un opérateur copie `.env.example` sans modifier ces valeurs, le GEO gate en persist-phase laisse passer du contenu que le content-loop-phase aurait bloqué.

**Fix chirurgical** : Aligner `.env.example` sur les défauts code (60/70), ou rendre les seuils de `validateContent()` configurables via les mêmes env vars.

---

### HIGH #2 : `validateCulinary` appelé avec `null` pour les temps — checks jamais exécutés

**Fichier** : `content-validator.ts:233-241`
**Impact** : Les validations de ratios d'ingrédients, cohérence des temps de cuisson, et températures de cuisson **ne s'exécutent jamais sur des données réelles**.

```typescript
// content-validator.ts:233-241
const culinaryErrors = validateCulinary({
  ingredients: (draft.ingredients as Ingredient[]) ?? null,
  instructions: (draft.instructions as { text?: string }[]) ?? null,
  prepTime: null,    // ← "not available at validation time"
  cookTime: null,    // ← "checked in persist-phase"
  totalTime: null,   // ← sauf que persist-phase ne l'appelle JAMAIS
  servings: null,    // ← JAMAIS
})
```

Dans `persist-phase.ts`, `validateCulinary` n'est **pas appelée du tout**. Seul `validateContent` est appelé, qui lui-même appelle `validateCulinary` avec des `null`. Résultat : les checks de `culinary-validator.ts` sont effectivement **morts**.

**Fix chirurgical** : Passer les vrais `prepTime`, `cookTime`, `totalTime`, `servings` depuis le `RecipeDraft` dans `persist-phase.ts`. Ces données SONT disponibles à ce stade.

---

### HIGH #3 : Fallback image prompt dans `image-phase.ts` ignore le builder sophistiqué

**Fichier** : `image-phase.ts:33-35` vs `skills.ts:146-245`
**Impact** : Quand le Writer ne génère pas d'`imagePrompt`, `image-phase.ts` utilise un fallback 1-ligne au lieu du builder 10-couches de `skills.ts`.

```typescript
// image-phase.ts:33-35 — Fallback PAUVRE (1 ligne)
const imagePrompt = recipe.imagePrompt?.trim()
  ? recipe.imagePrompt
  : `Professional food photography of ${recipe.title}, natural window light, styled on rustic ceramic plate, overhead flat-lay composition, shallow depth of field, warm tones, 2:3 vertical aspect ratio, editorial food photography`

// skills.ts:146-245 — buildDefaultPrompt() RICHE (10 couches)
// Sujet → Contexte → Cadrage → Style → Éclairage → Composition → Couleur → Technique → Format → Exclusions
```

Le builder 10-couches détecte le type de plat (italien, dessert), choisit le cadrage adapté, spécifie la température de couleur et l'ouverture. Le fallback 1-ligne est générique.

**Fix chirurgical** : Remplacer le fallback inline par un appel à `optimizeImagePrompt()` depuis `skills.ts`.

---

### HIGH #4 : Aspect ratio incohérent — 2:3 vs 3:4

**Fichiers** : `skills/agent-chef-augustin.md:105` vs `skills.ts:226`

| Source | Ratio spécifié |
|---|---|
| Skill Chef Augustin §6 | **2:3** (Pinterest) |
| Skill Pin Designer §5 | **2:3** (1000×1500px) |
| `skills.ts:226` (`buildDefaultPrompt`) | **3:4** ❌ |
| `image-phase.ts:35` (fallback) | **2:3** ✓ |
| Ideogram API (`ideogram.ts:35`) | **ASPECT_2_3** ✓ |

`buildDefaultPrompt()` génère `"3:4 vertical aspect ratio, suitable for Pinterest and Instagram"` — Pinterest standard est 2:3 (1000×1500), pas 3:4. Instagram accepte les deux mais Pinterest non.

**Fix chirurgical** : Changer `skills.ts:226` de `"3:4"` en `"2:3"`.

---

### HIGH #5 : Truncation inconsistante entre Judge et Science Enricher

**Fichiers** : `judge.ts:74` (8000 chars) vs `science-enricher.ts:61` (12000 chars)
**Impact** : Deux agents qui lisent le même contenu le tronquent à des longueurs différentes, sans constante partagée. Si l'article fait 10000 chars, le Judge rate les 2000 derniers (FAQ, tips), le Science Enricher voit tout.

**Note** : Le Judge étant dead code (BUG #2), ce problème est latent mais deviendrait actif si le Judge était réactivé.

**Fix chirurgical** : Définir une constante `AGENT_CONTENT_TRUNCATION = 12000` dans `helpers.ts` et l'utiliser dans les deux agents.

---

## 🟡 MEDIUM — 4 défauts de conception

### MEDIUM #1 : Logique `isRecoverable` dupliquée entre `provider.ts` et `helpers.ts`

```typescript
// provider.ts:269-271
function isRecoverable(msg: string): boolean {
  return RECOVERABLE_PATTERNS.some(p => msg.includes(p))
}

// helpers.ts:56-76
export function isRecoverableError(err: Error): boolean {
  const msg = err?.message ?? ""
  return (msg.includes("No JSON found") || msg.includes("403") || ...)
}
```

Deux implémentations, deux APIs différentes (`string` vs `Error`), patterns quasi-identiques. `isRecoverable` est utilisé par `runTextAndParseJson`, `isRecoverableError` est utilisé par `generate-recipe.ts`. Si on ajoute un pattern à l'un sans l'autre, divergence silencieuse.

**Fix chirurgical** : `helpers.ts:isRecoverableError` doit appeler une fonction exportée depuis `provider.ts`, ou les patterns doivent être extraits dans une constante partagée.

---

### MEDIUM #2 : `MAX_PASSES=1` mais boucle de retry = 2

```typescript
// content-loop-phase.ts:59
startGeneration(recipeId, keyword, 1)  // ← STATE.json dit "1 max"

// content-loop-phase.ts:119
for (let attempt = 1; attempt <= 2; attempt++) { ... }  // ← Mais on retry 2 fois
```

Le STATE.json affichera `pass 1 of 1` même pendant le retry. L'idempotency guard de `startGeneration` préserve le pass counter mais le maxPasses est trompeur.

**Fix chirurgical** : `startGeneration(recipeId, keyword, 2)` pour refléter la réalité.

---

### MEDIUM #3 : Variables d'env `ANTHROPIC_*` utilisées pour DeepSeek

Le provider DeepSeek lit `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`. Ces noms sont trompeurs — on configure DeepSeek avec des variables préfixées `ANTHROPIC_`. Le code justifie ça par "guard against stale shell env vars" mais ça reste une source de confusion.

**Fix chirurgical** : Supporter `DEEPSEEK_BASE_URL`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` en fallback, avec dépréciation progressive des noms `ANTHROPIC_*`. Documenter dans `.env.example`.

---

### MEDIUM #4 : 3 validateurs defined but never called

| Fichier | Fonction | Lignes |
|---|---|---|
| `lib/image-validator.ts` | `validateImage()` | 147 |
| `lib/content-validator.ts` | `computeOriginalityScore()` | 25 |
| `lib/content-validator.ts` | `validateCulinary()` (effectivement) | 210 |

`validateImage` et `computeOriginalityScore` n'ont **aucun import** dans le code de production. `validateCulinary` est appelée mais avec des `null` (HIGH #2).

**Fix chirurgical** : Supprimer `computeOriginalityScore` (score non utilisé), intégrer `validateImage` dans `image-phase.ts` avant upload, corriger l'appel à `validateCulinary` (HIGH #2).

---

## 🟢 LOW — 3 améliorations

### LOW #1 : Patterns de health claims trop larges

`/\bprobiotics?\b/i` flaggerait toute mention de probiotiques, y compris dans un contexte légitime de fermentation. Le validator bloque sans mécanisme de vérification de source.

### LOW #2 : `stripHtmlComments` + `stripBracketTokens` = double sécurité mais le skill dit déjà de les supprimer

Le skill §7.5 demande au LLM de ne pas inclure `[WARM]`, `[SHARP]`, etc. Si le LLM les inclut quand même, les strippers déterministes les nettoient. C'est du belt-and-suspenders correct mais le log "Writer/Editor missed them" est trompeur — il n'y a plus d'Editor en v13.

### LOW #3 : `logAgentTrace` utilise `if (data.chars)` (falsy check)

Si `chars` est `0`, le log ignore le champ. Remplacer par `if (data.chars != null)`.

---

## 📊 Score de fiabilité par couche

| Couche | Composants | Score | Notes |
|---|---|---|---|
| **Provider** | AnthropicProvider, DeepSeekProvider, JSON repair | 85/100 | Robuste. Retry 3x, timeout, abort. URL construction suspecte selon config. |
| **Agents LLM** | Strategist, ChefAugustin, Judge, ScienceEnricher, PinDesigner | 55/100 | 2/5 agents sont du dead code. Strategist + ChefAugustin OK. PinDesigner OK. |
| **Validateurs** | GEO, Content, Culinary, Loop Scorer, SEO Gate | 60/100 | GEO solide mais double-check. ContentValidator OK. Culinary checks morts. Tests cassés. |
| **Pipeline** | generate-recipe, content-loop, image-phase, persist-phase | 70/100 | Flow correct. Retry sur truncation fonctionnel. Manque integration Judge+Enricher. |
| **Skills** | 5 markdown files | 80/100 | Bien structurés. Cohérents entre eux. Aspect ratio bug dans buildDefaultPrompt. |
| **State Mgmt** | STATE.json, loop-state.ts | 90/100 | Simple, idempotent, fiable. MAX_PASSES cosmétique. |
| **GLOBAL** | — | **72/100** | — |

---

## 🎯 Plan de correction chirurgicale (ordre de priorité)

### Phase 1 — Bugs critiques (30 min)

| # | Action | Fichier(s) | Impact |
|---|---|---|---|
| 1 | Supprimer `thresholdMet`, `isDiminishing`, `buildLoopFeedback` des tests | `__tests__/loop-scorer.test.ts` | Tests passent |
| 2 | Recalibrer `computeLoopScore` — poids GEO 60% + Content 25% + Structure 15% (sans Judge) | `lib/loop-scorer.ts:56-72` | Score max = 100 |
| 3 | Supprimer le code mort Judge du scoring (garder l'agent pour usage futur) | `lib/loop-scorer.ts:53,71,73` | Score reflète la réalité |
| 4 | Corriger `validateCulinary` — passer vrais temps/servings | `lib/content-validator.ts:233-241` | Checks culinaires actifs |

### Phase 2 — Qualité (45 min)

| # | Action | Fichier(s) | Impact |
|---|---|---|---|
| 5 | Aligner `.env.example` GEO thresholds sur défauts code (60/70) | `.env.example:127-128` | Cohérence config |
| 6 | Remplacer fallback image prompt par `optimizeImagePrompt()` | `lib/inngest/functions/steps/image-phase.ts:33-35` | Qualité images |
| 7 | Corriger aspect ratio `3:4` → `2:3` | `lib/skills.ts:226` | Pinterest standard |
| 8 | Intégrer Science Enricher dans la boucle de retry | `lib/inngest/functions/steps/content-loop-phase.ts:119-188` | Food science dans les articles |
| 9 | Extraire `AGENT_CONTENT_TRUNCATION` constante | `lib/inngest/functions/helpers.ts` | Cohérence troncation |

### Phase 3 — Dette technique (1h)

| # | Action | Fichier(s) | Impact |
|---|---|---|---|
| 10 | Unifier `isRecoverable` / `isRecoverableError` | `provider.ts` + `helpers.ts` | DRY |
| 11 | Corriger `MAX_PASSES=1` → `2` | `content-loop-phase.ts:59` | STATE.json précis |
| 12 | Supprimer `computeOriginalityScore` (dead code) | `lib/content-validator.ts:460-485` | Nettoyage |
| 13 | Intégrer `validateImage` dans `image-phase.ts` | `lib/inngest/functions/steps/image-phase.ts` | Validation images |
| 14 | Documenter les noms d'env vars `ANTHROPIC_*` pour DeepSeek | `.env.example:28-41` | Clarté config |

---

## ✅ Ce qui fonctionne BIEN

1. **`extractJson` + `jsonrepair`** — Robuste, gère la troncation, les fences, les virgules trailing. Excellente décision d'avoir remplacé les ~100 lignes de repair custom.
2. **Stratégie de fallback des agents** — Strategist → plan minimal, Judge → score neutre, ScienceEnricher → null. Le pipeline ne crashe jamais sur un échec d'agent auxiliaire.
3. **`validateFoodSafety`** — Détection USDA avec patterns de température contextuels. Bloque la publication même en autopilot. Exactement ce qu'il faut.
4. **`checkContentSimilarity`** — Détection de contenu dupliqué par bigram Jaccard. Simple, rapide, efficace.
5. **`persist-phase.ts` double safety net** — Scrub banned words → re-validate → SEO gate → JSON-LD integrity. Couche défensive solide.
6. **Skills markdown** — Bien structurés, frontmatter YAML + contenu, système de placeholders `{{variable}}`. Exactement le bon niveau d'abstraction.
7. **`loop-state.ts`** — JSON natif au lieu de regex sur Markdown (v11→v12 migration). Idempotent pour Inngest replays. Simple et fiable.

---

## 📝 Note méthodologique

Cet audit applique le principe Karpathy : **"Le LLM génère, le code vérifie."** La vérification a porté sur :
- **Exhaustivité** : chaque fichier lu en entier, chaque fonction tracée
- **Traçabilité** : chaque appel de fonction → vérification que l'appelant existe et passe les bons paramètres
- **Cohérence** : chaque constante/threshold → vérification qu'elle est identique partout où elle est utilisée
- **Vivacité** : chaque export → vérification qu'il est importé quelque part dans le code de production

Les bugs trouvés sont tous des bugs de **désynchronisation** — entre la spec (CLAUDE.md, skills), le code, et la réalité du pipeline. C'est typique d'une migration architecturale (v12→v13) où du code a été laissé orphelin.

---

## Annexe A — Findings supplémentaires (Skills + Config)

### A1. Skill frontmatter `temperature` / `max_tokens` = documentation morte

Les 5 skills déclarent `temperature` et `max_tokens` dans leur frontmatter YAML, mais **les runtimes les ignorent**. Chaque agent runtime (`strategist.ts`, `chef-augustin.ts`, etc.) hardcode ses propres valeurs. Modifier le frontmatter n'a aucun effet — c'est un piège de maintenance.

| Skill | Frontmatter `temperature` | Runtime `temperature` | Cohérent ? |
|---|---|---|---|
| agent-strategist | 0.7 | 0.7 | ✅ Oui (coïncidence) |
| agent-chef-augustin | 0.8 | 0.8 | ✅ Oui (coïncidence) |
| agent-judge | 0.3 | 0.3 | ✅ Oui (coïncidence) |
| agent-science-enricher | 0.4 | 0.4 | ✅ Oui (coïncidence) |
| agent-pin-designer | 0.5 | 0.5 | ✅ Oui (coïncidence) |

Ils sont actuellement cohérents **par coïncidence**. Si quelqu'un modifie le frontmatter en pensant changer le comportement, rien ne se passera.

### A2. PTRA version numbers : 3 versions dans le même fichier

`skills/agent-pin-designer.md` contient **trois** numéros de version différents pour le framework PTRA :
- Titre §1 : "PTRA Framework **v1.0**"
- Description frontmatter : "PTRA **V2.1** framework"
- Champ `framework:` du frontmatter : "PTRA v**2.2**"

### A3. `global.md` référence des agents fantômes (v11)

`.claude/rules/global.md` Rule 8 décrit le pipeline comme :
`SERP → Strategist → Writer → Auditor → Human Review → Editor/QA → Image → Persist → A/B Stats → AOR`

Mais en v13, **Auditor**, **Editor/QA**, et **AOR** n'existent plus. Le pipeline réel est :
`SERP → Strategist → Writer → Quality Gate → Persist Draft → Human Review → Images → Final Persist + Validation → A/B Stats → Pin Designer`

`global.md` est censé primer sur tout ("prime sur tout") — mais il décrit un pipeline obsolète.

### A4. Domaine hardcodé dans le skill Chef Augustin

`skills/agent-chef-augustin.md:134` : `https://chefaugustin.com/recettes/{slug}` — le domaine est hardcodé dans le skill, ignorant `NEXT_PUBLIC_SITE_URL`.

### A5. "incitative" — mot français dans un skill anglais

`skills/agent-pin-designer.md:74` : "Hooks MUST be incitative AND honest" — "incitative" n'est pas un mot anglais. Remplacer par "compelling" ou "enticing".

### A6. Variables d'env utilisées mais absentes de `.env.example`

| Variable | Utilisée dans | Défaut |
|---|---|---|
| `IDEOGRAM_MODEL` | `lib/agents/ideogram.ts:9` | `V_4_TURBO` |
| `IMAGE_VARIANT_COUNT` | `lib/inngest/functions/steps/image-phase.ts:14` | `2` |
| `DEBUG` | `lib/agents/json-utils.ts:54,83` | (non défini) |

### A7. GEO thresholds `.env.example` factuellement incorrects

`.env.example` documente `GEO_CLAIMS_MIN=5` comme défaut "DeepSeek v4 Pro", mais le code utilise **6**. Les valeurs documentées ne correspondent ni aux défauts code, ni aux valeurs "Anthropic" documentées. Voir tableau dans HIGH #1.

---

## Annexe B — Findings supplémentaires (Pipeline + Inngest)

### B1. Error handler hors `step.run` — pas memoized par Inngest

```typescript
// generate-recipe.ts:114-125 — TOUT ce bloc est hors step.run()
} catch (err) {
  if (isRecoverableError(err as Error)) throw err
  await logPipelineError({...})
  await db.update(recipes).set({ status: "draft", ... }).where(...)
  // ↑ Ré-exécuté à chaque replay Inngest — peut écraser un statut correct
}
```

### B2. `structuredSERP` — appel LLM gaspillé

`serp-phase.ts` fait un appel LLM pour structurer les données SERP, mais **personne ne consomme** `SerpPhaseResult.structuredSerp`. `content-loop-phase.ts` utilise `serpResult.serp` (données brutes). Coût : ~$0.01-0.02 par run.

### B3. `persistFinalDraft` ne throw pas → Pin generation sur contenu rejeté

Quand `persistFinalDraft` bloque le contenu (validation failure), il fait `return` sans throw. Le pipeline continue vers `generatePins` — gaspillage d'un appel LLM Pin Designer (~$0.02) sur du contenu rejeté.

### B4. Race condition : `waitForApproval` timeout → "expired" → "draft"

Le timeout 7j set status `"expired"`, puis l'outer catch écrase immédiatement avec `"draft"`. Le statut "expired" n'est jamais visible.

### B5. Pin Designer inserts non-idempotents

`pin-phase.ts` insère dans `pinDrafts` et `pinAnalytics` sans contrainte d'unicité. Sur Inngest replay, **lignes dupliquées**.

### B6. Tests mock le Judge et ScienceEnricher… qui ne sont jamais appelés

`__tests__/pipeline-e2e.test.ts` définit `mockJudge` et `mockScienceEnricher` et les configure dans `setupGoodPass()`. Mais ces agents ne sont **jamais invoqués** par le pipeline v13. Les mocks sont du dead code dans les tests.

### B7. `updateGenerationProgress` — définie mais jamais appelée

`lib/loop-state.ts:128` exporte `updateGenerationProgress()` mais `content-loop-phase.ts` appelle seulement `startGeneration()` et `finishGeneration()`. Le suivi de progression par passe est mort.

### B8. `buildFallbackImagePrompt` (helpers.ts) — définie, jamais utilisée

`helpers.ts:130` exporte `buildFallbackImagePrompt()` mais `image-phase.ts` a son **propre** fallback inline. Fonction orpheline.

---

## Annexe C — Score de fiabilité détaillé

| Couche | Fichiers | Lignes | Score | Notes |
|---|---|---|---|---|
| **Provider** | `provider.ts`, `json-utils.ts`, `ideogram.ts` | 420 | 85/100 | Robuste. URL construction suspecte. Module-level env reads. |
| **Agents LLM** | 5 agents + 5 skills | 1700 | 55/100 | 2/5 agents dead code. Skills bien écrits mais runtime ignore leur config. |
| **Validateurs** | `geo-validator`, `content-validator`, `culinary-validator`, `loop-scorer` | 1100 | 60/100 | GEO solide. Culinary checks morts. Tests cassés. Fonctions orphelines. |
| **Pipeline** | `generate-recipe`, 4 phases, `helpers` | 900 | 70/100 | Flow correct. Retry truncation OK. Manque idempotency pin inserts. Error handler hors step. |
| **State Mgmt** | `loop-state.ts` | 225 | 90/100 | Simple, fiable. `updateGenerationProgress` unused. |
| **Config** | `.env.example`, `next.config.mjs`, `CLAUDE.md` | 250 | 65/100 | GEO thresholds incorrects. Docs obsolètes (global.md). Missing env vars. |
| **Tests** | 6 fichiers vitest + scripts manuels | 800 | 50/100 | Tests cassés (loop-scorer). Mocks dead code. Couverture faible. |
| **GLOBAL** | — | **~5400** | **72/100** | — |
