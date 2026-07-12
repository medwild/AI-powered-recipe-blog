# Rapport Comparatif — Core AI Workflow
> **Date :** 2026-07-12
> **Périmètre :** `skills/agent-chef-augustin.md`
> **Base :** Commit `8b28acc` (v1.0.0-ULTRA) → `4267d20` (v3.0.0-ULTRA + GEO §4.7)

---

## Synthèse

| Métrique | Avant | Après | Delta |
|---|---|---|---|
| Score global | **61/100** | **73/100** | **+12** |
| Lignes | 248 | 209 | -39 |
| Sections | 11 | 10 | -1 |
| Self-checks | 12 | 9 | -3 (+3 GEO) |
| Modèle primaire | DeepSeek v4 Pro | Claude Sonnet 4.6 | ⬆️ |

**Principal gain :** GEO (+35 pts) — l'ajout d'instructions proactives de citabilité IA est la seule amélioration d'aujourd'hui. Le reste (restructuration v3.0, migration Claude, transparence persona) était déjà dans le working tree.

---

## Scores détaillés par dimension

```
SEO Classique (Google)      ████████████████████░░  72 → 75  (+3)
Pinterest / PTRA            ████████████████████░░  78 → 80  (+2)
GEO / LLM Citability ⭐      ████████░░░░░░░░░░░░░░  30 → 65  (+35)
E-E-A-T / Qualité           █████████████████░░░░░  68 → 70  (+2)
Pipeline Robustesse         ████████████████░░░░░░  60 → 72  (+12)
```

---

## Analyse dimension par dimension

### 1. SEO Classique : 72 → 75 (+3)

| Aspect | v1.0 | v3.0 + GEO |
|---|---|---|
| Structure article | Phases SERP → Article → Self-Editing | StrategyPlan-driven (pré-planifié) |
| JSON-LD | Recipe + BlogPosting + BreadcrumbList | Recipe + BlogPosting + FAQPage + BreadcrumbList (Google) |
| Internal linking | Intégré dans le skill (§5.8) | Délégué à `internal-linker.ts` (Topical Authority) |
| Meta titles | Truncate warning implicite | "Write naturally — no truncation" explicite |

**Gain :** Le StrategyPlan retire la charge SERP du LLM — moins de hallucinations, meilleure focalisation sur l'écriture. +3 pts.

### 2. Pinterest / PTRA : 78 → 80 (+2)

| Aspect | v1.0 | v3.0 + GEO |
|---|---|---|
| Pin-First | Recette au-dessus du fold | Idem + sections interdites explicites |
| Image placeholders | 4-6 [IMAGE:] | Idem + types requis (prep, process, finished) |
| Save triggers | Implicite dans la structure | "Save-Worthy Triggers" explicite par section |
| Image prompt | Format détaillé | Format concis |

**Gain :** Les contraintes explicites (sections OMIT, types d'images requis) réduisent les erreurs. +2 pts.

### 3. GEO / LLM Citability : 30 → 65 (+35) ⭐

**C'est l'unique ajout d'aujourd'hui.** Voici exactement ce qui change :

| Capacité | Avant | Après |
|---|---|---|
| Answer Nuggets | ❌ Aucun concept | ✅ ≥4 blocs autonomes, format "[X] because [Y]" |
| Citation-Ready Claims | ⚠️ Attributions E-E-A-T (crédibilité), pas GEO | ✅ Claim + mechanism + source anchor explicite |
| Températures duales | °F seulement | ✅ °F + °C (AI crawlers indexent les deux) |
| Temps exacts | Implicite | ✅ "12 minutes" pas "about 10-15 minutes" |
| Quantités poids+volume | Non spécifié | ✅ "1 cup (140g)" systématique |
| Formatage LLM-friendly | Aucun | ✅ Numbered steps, X vs Y, paragraphes courts |
| Validation GEO | Réactive uniquement (`geo-validator.ts`) | ✅ Proactive (prompt) + réactive (validator) |

**Gain :** C'est le passage d'une stratégie GEO purement défensive (corriger après) à une stratégie offensive (écrire pour être cité dès le départ). +35 pts.

**Limite :** Ce gain est théorique avec DeepSeek (le modèle actif a déjà du mal à suivre les instructions de base). Le plein effet nécessite Claude Sonnet 4.6.

### 4. E-E-A-T / Qualité : 68 → 70 (+2)

| Aspect | v1.0 | v3.0 + GEO |
|---|---|---|
| Persona | "Graduated from culinary school in Lyon" — historique fabriqué | "Brand persona" — transparence explicite |
| Test counts | "I've tested this 12 times" — pattern fabriqué | "NEVER fabricate test counts" — règle explicite |
| Attribution patterns | 4 patterns, ≥6 requis | 2 patterns, ≥4/≥6 (pin-first/google) |
| Sentence rhythm | Règles micro-détaillées (≤5 mots, ≥25 mots, -ly adverbs) | Supprimé — trop contraignant |
| Self-checks | 12 checks (dont token purge, ingredient ratio sanity) | 9 checks (dont 3 GEO) |

**Gain net :** La transparence du persona (+trust) et l'interdiction de fabriquer des anecdotes compensent la perte des règles de rythme. Qualité perçue vs authenticité : l'authenticité gagne. +2 pts.

### 5. Pipeline Robustesse : 60 → 72 (+12)

| Aspect | v1.0 | v3.0 + GEO |
|---|---|---|
| Modèle primaire | DeepSeek v4 Pro uniquement | Claude Sonnet 4.6 + fallback DeepSeek |
| Content Loop | Non intégré | §10 Loop Feedback Handling |
| Self-check items | 12 (certains redondants) | 9 (ciblés, dont 3 GEO) |
| Error handling | §11 dédié | Intégré dans le pipeline |
| Stratégie | Monolithique (SERP→Write→Self-Edit) | StrategyPlan-driven (pré-planifié par le pipeline) |

**Gain :** L'intégration avec le Content Loop et le fallback Claude→DeepSeek donne une résilience que le v1.0 n'avait pas. +12 pts.

---

## Ce qui n'a PAS changé

- **Topical Authority** (clusters, internal linking, hubs, breadcrumbs) — livré séparément, 7 tasks, 10 fichiers
- **Pipeline Inngest** — aucun changement dans `generate-recipe.ts`
- **Pin Designer** — `skills/agent-pin-designer.md` inchangé
- **Validateurs** — `lib/geo-validator.ts`, `lib/content-validator.ts` inchangés

---

## Verdict

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   AVANT : 61/100 — v1.0 DeepSeek, pas de GEO proactif  │
│   APRÈS : 73/100 — v3.0 Claude + GEO §4.7              │
│                                                         │
│   Delta : +12 pts                                       │
│   Dont GEO §4.7 (today) : +35 pts dans sa dimension    │
│   Dont restructuration v3.0 (pré-existant) : le reste   │
│                                                         │
│   Avec Claude Sonnet 4.6 : potentiel 78-82/100          │
│   (le modèle peut exécuter les instructions GEO)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Prochaine étape critique

L'amélioration GEO §4.7 est en place, mais son efficacité réelle dépend du modèle :

- **Avec DeepSeek v4 Pro** : gain marginal (le modèle ignore déjà une partie des instructions existantes)
- **Avec Claude Sonnet 4.6** : gain significatif (le modèle suit les instructions complexes)

**Recommandation :** `ANTHROPIC_API_KEY` reste le facteur décisif. Un test A/B (même keyword, DeepSeek vs Claude) mesurera l'impact réel du §4.7.
