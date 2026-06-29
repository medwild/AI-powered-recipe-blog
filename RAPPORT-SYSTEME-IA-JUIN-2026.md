# AI AutoBlog — Rapport Système IA Complet
> Juin 2026 — Analyse technique et sémantique du pipeline de génération de recettes
> Document conçu pour discussion inter-LLM : architecture, contrats, forces, limites

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Architecture technique globale](#2-architecture-technique-globale)
3. [Les 7 agents — Analyse détaillée](#3-les-7-agents--analyse-détaillée)
4. [Contrats inter-agents](#4-contrats-inter-agents)
5. [Boucle d'auto-amélioration](#5-boucle-dauto-amélioration)
6. [Forces et innovations](#6-forces-et-innovations)
7. [Limitations et risques](#7-limitations-et-risques)
8. [Métriques et calibration](#8-métriques-et-calibration)
9. [Recommandations](#9-recommandations)
10. [Annexes — Schémas et types](#10-annexes--schémas-et-types)

---

## 1. Résumé exécutif

Le système **AI AutoBlog** est un pipeline de génération automatique de contenu culinaire SEO/GEO qui produit des articles de recettes publiables avec un minimum d'intervention humaine. Il utilise une architecture **multi-agent séquentielle** (7 agents spécialisés) orchestrée par **Inngest** (background job engine serverless), avec une boucle de feedback fermée pour l'amélioration continue.

### Chiffres clés

| Métrique | Valeur |
|---|---|
| Agents IA spécialisés | 7 (dont 1 déterministe) |
| Étapes du pipeline | 12 |
| Lignes de code (pipeline principal) | 878 |
| Lignes de skills Markdown (prompts) | ~2 200 |
| Mots cible par article | 1 800 — 2 200 |
| Concurrency max | 3 workflows simultanés |
| Temps de génération estimé | ~3-5 minutes (hors review humaine) |
| Modèle LLM primaire | Mistral Medium 3.5 (NaraRouter) |
| Modèle LLM fallback | GPT-OSS 120B (Cloudflare Workers AI) |
| Score d'audit actuel | 89/100 |

### Ce que le système fait

1. Analyse le SERP Google d'un mot-clé culinaire (10 résultats organiques, PAA, related searches, featured snippets, Knowledge Graph, vidéos, images, rich results)
2. Structure ces données brutes en intelligence SEO (Agent 0 — déterministe, sans LLM)
3. Produit un plan éditorial GEO complet (Agent Strategist — H2, entités, FAQ, schémas JSON-LD, exploitation des faiblesses concurrentielles)
4. Rédige l'article dans le persona d'un chef français (Agent Writer — Chef Augustin Lefèvre)
5. Évalue l'article sur 8 critères E-E-A-T + score anti-IA (Agent Auditor)
6. Corrige et humanise l'article en boucle (Agent Editor — max 3 passes)
7. Vérifie la cohérence cross-agent (Agent QA — 5 checks)
8. Optimise le prompt d'image (Agent Image Optimizer — architecture 10 couches)
9. Génère les images en variantes A/B (Cloudflare FLUX-1-Schnell → Cloudinary)
10. Persiste avec JSON-LD Schema.org complet (@graph Recipe + BlogPosting + FAQPage + BreadcrumbList)
11. Initialise le tracking A/B des images
12. Enregistre les leçons d'auto-amélioration pour les générations futures

---

## 2. Architecture technique globale

### 2.1 Stack technologique

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE UTILISATEUR                      │
│  Dashboard (Next.js App Router) │ API Routes (12 endpoints)  │
├─────────────────────────────────────────────────────────────┤
│                    ORCHESTRATION                              │
│  Inngest (concurrency:3, throttle:2/min, retries:3)          │
├─────────────────────────────────────────────────────────────┤
│                    AGENTS IA (7)                              │
│  Strategist → Writer → Auditor → Editor → QA → Image Opt.   │
│  + Agent 0 (SERP Structurer — déterministe)                  │
├─────────────────────────────────────────────────────────────┤
│                    CLIENTS API                                │
│  NaraRouter (Mistral Medium 3.5) → Cloudflare (GPT-OSS 120B) │
│  Serper.dev (SERP) │ Cloudinary (images CDN)                 │
├─────────────────────────────────────────────────────────────┤
│                    PERSISTANCE                                │
│  Neon PostgreSQL (serverless) + Drizzle ORM                  │
│  3 tables : recipes, self_improvement_logs, image_variant_stats│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Flux de données complet (12 étapes)

```
[Trigger: recipe/generate]
        │
        ▼
┌──────────────────────────────────────────────────┐
│ STEP 1 — SERP Analysis (Serper.dev)              │
│   fetchSerp(keyword) → SerpResult                 │
│   Persiste → recipes.serp_data                    │
│   Sleep 2s                                        │
├──────────────────────────────────────────────────┤
│ STEP 1.5 — Agent 0: SERP Data Structurer         │
│   structureSerpData(keyword, serp, options)       │
│   → StructuredSerp (déterministe, < 5ms)          │
│   PAA fallback si vide : 8 questions synthétiques │
│   Sleep 1s                                        │
├──────────────────────────────────────────────────┤
│ STEP 2 — Agent 1: SEO Strategist (V2)            │
│   agentStrategistV2(keyword, structuredSerp,      │
│     pastImprovements) → SeoPlan                   │
│   Charge 15 leçons passées + calibration stats    │
│   Sleep 25s                                       │
├──────────────────────────────────────────────────┤
│ STEP 3 — Agent 2: Writer (Chef Augustin)          │
│   agentWriter(keyword, seoPlan) → RecipeDraft     │
│   Température 0.9, maxTokens 4096                │
│   Sleep 25s                                       │
├──────────────────────────────────────────────────┤
│ STEP 4 — Agent 3: Auditor (8 critères)            │
│   agentAuditor(keyword, draft, entities)           │
│   → AuditReport (verdict: OK | NEEDS_REVISION)    │
│   Température 0.1, maxTokens 6144                │
│   Sleep 2s                                        │
├──────────────────────────────────────────────────┤
│ STEP 5 — Persist draft for human review           │
│   Status → "draft_review"                         │
│   Sleep 2s                                        │
├──────────────────────────────────────────────────┤
│ STEP 6 — Human Review (waitForEvent, timeout 7j)  │
│   AUTO_APPROVE=true → bypass automatique          │
│   Sleep 30s                                       │
├──────────────────────────────────────────────────┤
│ STEP 7 — Agent 4: Editor (max 3 passes)           │
│   Boucle while + re-audit après chaque passe      │
│   agentEditor(keyword, draft, audit, pass)         │
│   Condition d'arrêt : verdict OK ou 3 passes       │
│   Guard post-loop : contentMarkdown ≥ 200 chars   │
├──────────────────────────────────────────────────┤
│ STEP 7.5 — Agent 5: QA (cross-agent)              │
│   agentQA(keyword, plan, draft, audit, final)      │
│   QA NEEDS_FIX → 1 passe Editor supplémentaire    │
│   QA REJECT/CRITICAL → throw Error (hard stop)    │
├──────────────────────────────────────────────────┤
│ STEP 8 — Image Prompt Optimizer                   │
│   agentImagePromptOptimizer(recipe) → prompt      │
│   Fallback programmatique si LLM échoue           │
│   Sleep 1s                                        │
├──────────────────────────────────────────────────┤
│ STEP 9 — Image Generation (FLUX-1-Schnell)        │
│   Multi-variant (2-3, configurable)               │
│   Upload Cloudinary → ImageVariant[]              │
│   Variantes : prompt modifié par angle de vue      │
│   Sleep 3s                                        │
├──────────────────────────────────────────────────┤
│ STEP 10 — Self-Improvement                        │
│   3 sources : Auditor + AI Score + QA             │
│   Persiste dans self_improvement_logs             │
│   Sleep 2s                                        │
├──────────────────────────────────────────────────┤
│ STEP 11 — Persist Final                           │
│   Guards SEO programmatiques (meta title ≤60,      │
│     meta desc ≤155, word count ≥1500)             │
│   JSON-LD @graph (Recipe+BlogPosting+FAQPage+      │
│     BreadcrumbList) construit dans le code         │
│   Status → "draft"                                │
├──────────────────────────────────────────────────┤
│ STEP 12 — Init A/B Tracking                       │
│   image_variant_stats (impressions, clicks)        │
│   Sleep 1s                                        │
└──────────────────────────────────────────────────┘
```

### 2.3 Modèle de données

**Table `recipes`** (24 colonnes) :
- Colonnes scalaires : `id`, `slug`, `keyword`, `title`, `metaTitle`, `metaDescription`, `excerpt`, `contentMarkdown`, `heroImageUrl`, `prepTime`, `cookTime`, `totalTime`, `servings`, `difficulty`, `status`, `publishedAt`, `createdAt`, `updatedAt`
- Colonnes JSONB : `ingredients` (Ingredient[]), `instructions` (Instruction[]), `tags` (string[]), `serpData`, `imageVariants` (ImageVariant[]), `jsonLd`, `workflowLog` (WorkflowLogEntry[])
- Index : status, slug, publishedAt, createdAt

**Table `self_improvement_logs`** (9 colonnes) :
- `id`, `keyword`, `recommendation`, `criterion`, `score` (text, pas numeric), `tags` (jsonb), `source` (auditor|qa), `aiScore` (text), `createdAt`

**Table `image_variant_stats`** (6 colonnes) :
- `id`, `recipeId`, `variantIndex`, `impressions`, `clicks`, `createdAt`
- Index composites : (recipeId), (recipeId, variantIndex)

**Note d'architecture** : Pas de clés étrangères — choix assumé pour la flexibilité en environnement serverless.

### 2.4 Résilience et tolérance aux pannes

| Niveau | Mécanisme | Détail |
|---|---|---|
| **LLM primaire → fallback** | NaraRouter (3 tentatives) → Cloudflare GPT-OSS 120B | runTextAndParseJson avec retry + backoff exponentiel |
| **Cloudflare fallback** | Gemma 4 26B (3 tentatives) → GPT-OSS 120B | Même pattern 3 tentatives |
| **Inngest retries** | 3 retries automatiques | Gère les timeouts et erreurs transitoires |
| **Image fallback** | Erreur par variant ignorée | Continue avec les variants réussis |
| **Concurrency** | Limitée à 3 workflows | Throttle 2/min |
| **Logs atomiques** | `sql` COALESCE + concaténation JSONB | Évite les doublons sur replay Inngest |
| **PAA fallback** | 8 questions synthétiques | Si Serper ne retourne aucune PAA |
| **Image prompt fallback** | `buildDefaultPrompt()` programmatique | Si le LLM échoue à générer un prompt |
| **Content guard** | contentMarkdown < 200 chars → throw | Empêche la persistance de contenu tronqué |

---

## 3. Les 7 agents — Analyse détaillée

### 3.1 Agent 0 — SERP Data Structurer (DÉTERMINISTE)

**Fichier** : `lib/agents/serp-structurer.ts` (1 239 lignes)
**Type** : Fonction pure, pas d'appel LLM
**Position** : Step 1.5

C'est le seul agent non-IA du pipeline. Il transforme le JSON brut de Serper.dev en un package d'intelligence SEO structuré (`StructuredSerp`) que le Strategist consomme directement.

**10 étapes de transformation** :

| # | Étape | Méthode | Sortie |
|---|---|---|---|
| 1 | Data Quality Assessment | Comptage des modules SERP présents/absents | `DataQuality` (complete/partial/weak) |
| 2 | SERP Feature Map | Détection heuristique (YouTube, PAA, recipes, answer box...) | `SerpFeature[]` |
| 3 | Search Intent Classification | Regex + comptage domaines recette/vidéo | `SearchIntent` (dominant + secondary) |
| 4 | Competitor Normalization | Extraction domaine, format, angle, promesse, faiblesse | `NormalizedCompetitor[]` |
| 5 | Topic & Entity Extraction | Regex ingredients, techniques, termes sémantiques | `TopicCluster[]` |
| 6 | User Question Extraction | PAA réelles + inférées (related searches) + bonus | `UserQuestion[]` |
| 7 | Content Opportunity Detection | Gap analysis : substitutions, storage, FAQ schema, visual... | `ContentOpportunity[]` |
| 8 | E-E-A-T Signal Preparation | 7 signaux pré-packagés (testing, mesures, storage, doneness...) | `EEATSignal[]` |
| 9 | Risk Assessment | PAA absente, YouTube concurrence, domains haute autorité | `string[]` |
| 10 | Strategist Input Package Assembly | Synthèse de tout ce qui précède | `StrategistInputPackage` |

**Innovation clé** : En pré-structurant les données SERP de façon déterministe, on réduit la charge cognitive du LLM d'environ 60%. Le Strategist reçoit des insights déjà extraits plutôt que des données brutes à analyser. Coût : $0. Latence : < 5ms.

**Limites** :
- Les patterns regex de détection d'ingrédients sont partiellement spécifiques aux recettes de banana bread (exemples de développement)
- La fonction `dqContains()` est un stub qui retourne toujours `false` (ligne 1056-1058)
- La couverture des formats de recettes est limitée (6 patterns dans `inferFormat()`)

---

### 3.2 Agent 1 — SEO/GEO Strategist (v5.2 ULTRA)

**Fichier runtime** : `lib/inngest/functions/agents/strategist.ts` (210 lignes)
**Fichier skill** : `skills/agent-strategist.md` (336 lignes, v5.1.0-ULTRA)
**Modèle** : Mistral Medium 3.5, température 0.3
**Position** : Step 2

**Rôle** : Transforme l'intelligence SERP structurée en plan éditorial complet (schéma `SeoPlan`).

**Architecture de prompt** :
- **System prompt** (skill Markdown) : 15 sections — priming GEO, checklist pré-planification, classification d'intention, gap analysis 6 dimensions, entity mapping, E-E-A-T planning, content architecture, meta/snippet/schema strategy, validation, output schema, error handling, advanced GEO tactics, filtrage des leçons passées
- **User prompt** (construit dans le code) : SERP data structurée + Agent 0 pre-analysis + leçons passées avec contexte + calibration stats

**Schéma de sortie (`SeoPlan`)** :
```typescript
{
  title, metaTitle, metaDescription, excerpt,
  prepTime, cookTime, totalTime, servings, difficulty,
  tags: string[],
  h2Sections: [{ heading, subheadings, coverPaa, answerNugget?, eeatSignals? }],
  semanticEntities: string[],
  json_ld_recipe_base?,
  targetWordCount?,        // v5.2
  faqItems?,               // v5.2 — 5 Q&A pré-rédigées
  whyThisWorks?,           // v5.2 — 60-80 mots
  competitorWeaknessExploitation?: {   // v5.2
    primaryExploit?,
    secondaryExploit?
  },
  gapAnalysis?,            // v5.0 ULTRA
  citationStrategy?        // v5.0 ULTRA
}
```

**Consomme** :
- `StructuredSerp` (de l'Agent 0)
- `pastImprovements: string[]` (15 leçons + calibration stats)
- Le context filtering se fait côté LLM via les instructions §15 du skill

**Points forts** :
- Framework GEO (Generative Engine Optimization) pas juste SEO — cible les citations dans ChatGPT, Perplexity, Google AI Overviews
- Classification d'intention à 2 niveaux (primaire + sub-intent : anxiété, aspiration, efficience, santé, curiosité)
- Planification de "Answer Nuggets" (blocs 40-80 mots extractibles par les moteurs d'IA)
- Exploitation des faiblesses concurrentielles (primary + secondary exploit)
- Plafonnement à 10 leçons max pour éviter le débordement de contexte

**Faiblesses** :
- Le skill est très dense (336 lignes de règles) — risque de dilution d'attention du LLM sur les sections moins prioritaires
- La classification d'intention est partiellement redondante avec l'Agent 0 (qui classifie déjà l'intent)
- La température 0.3 peut limiter la créativité des plans éditoriaux
- Pas de mécanisme de validation structurée de la sortie (le code ne vérifie que le parsing JSON)

---

### 3.3 Agent 2 — Writer (v5.3 ULTRA)

**Fichier runtime** : `lib/inngest/functions/agents/writer.ts` (119 lignes)
**Fichier skill** : `skills/agent-writer.md` (272 lignes, v5.3.0-ULTRA)
**Modèle** : Mistral Medium 3.5, température 0.9, top_p 0.92, frequency_penalty 0.3, presence_penalty 0.2
**Position** : Step 3

**Rôle** : Rédige l'article complet en incarnant le persona du Chef Augustin Lefèvre, avec des règles anti-AI-slop strictes.

**Architecture de persona** :
- **Identité** : Chef français, 20 ans d'expérience, background Michelin, Le Cordon Bleu Paris
- **Voice tokens** (5 registres obligatoires) : [WARM], [SHARP], [WINK], [GRIT], [GLOW]
- **Niveau de lecture** : 8th grade (US)
- **Pronoms** : I/you (1ère personne + adresse directe au lecteur)

**Mécanismes anti-IA** :
1. **Horoscope Test v2.0** : "Si je remplace le nom du plat par 'toast', est-ce que la phrase a encore du sens ?" Si oui → rejetée
2. **Banned Vocabulary** : 4 tiers — Tier 1 (instant AI tell : "delve", "unlock", "elevate"...) → article rejeté | Tier 2 (weak filler : "delicious", "amazing"...) → banni | Tier 3 (consultant-speak : "leverage", "utilize"...) → banni | Tier 4 (SEO spam) → banni
3. **Banned Structural Patterns** : generic opener, list-stuffing, hedged recommendations, fake questions, vanilla conclusion
4. **Sentence Rhythm Rules** : pas 2 phrases consécutives qui commencent par le même mot, ≥3 phrases ≤5 mots, ≥2 phrases ≥25 mots, max 2 adverbes en -ly par paragraphe, 1 micro-imperfection par ~200 mots
5. **Vibe Coding — Mood Anchoring** : mix de tokens adapté au type de recette (comfort food = 70% WARM, baking = 50% SHARP...)

**Structure d'article imposée** :
```
A. Opening Hook (60-80 mots, avant le premier H2)
B. Body (5-7 H2)
   ├─ H2#1 obligatoire : "Why This [Dish] Recipe Actually Works" (bold summary box 60-80 mots)
   ├─ H2#2 obligatoire : "What Most [Dish] Recipes Get Wrong"
   └─ H2#3-7 : sections du plan Strategist
C. Chef's Tips (3 tips maximum)
D. Variations (2 alternatives)
E. Storage & Reheating (précis)
F. FAQ (5 Q&A — bold questions, réponses 50-80 mots extractibles)
G. Nutrition Highlights (3-4 bullet points)
```

**Cibles de longueur** :
| Élément | Cible | Tolérance |
|---|---|---|
| contentMarkdown total | 1800-2200 mots | ±10% |
| Opening hook | 60-80 mots | ±5 |
| Par H2 section | 180-280 mots | ±20 |
| Chef's Tips | 150-200 mots | ±15 |
| FAQ answers | 50-80 mots chacun | ±5 |

**Points forts** :
- Persona remarquablement détaillé — le plus abouti du pipeline
- Les règles anti-AI sont concrètes et vérifiables (pas de "sois plus humain" vague)
- La structure d'article est exhaustive et optimisée SEO (FAQ, Nutrition Highlights, Why This Works)
- Le contrat est clair : le Writer ne génère PAS `imagePrompt` (délégué à l'Image Optimizer)

**Faiblesses** :
- La densité de règles peut parfois produire des articles qui "cochent toutes les cases" mais manquent de fluidité naturelle
- Température 0.9 + fréquence/presence penalties — le modèle peut dériver vers du texte incohérent sur des sujets techniques
- La contrainte "max 2 adverbes en -ly par paragraphe" peut forcer des formulations artificielles
- Pas de mécanisme pour vérifier que les 5 voice tokens sont effectivement présents (l'Auditor le fait, mais le Writer n'a pas de boucle de vérification interne)

---

### 3.4 Agent 3 — Auditor (v5.1 ULTRA)

**Fichier runtime** : `lib/inngest/functions/agents/auditor.ts` (111 lignes)
**Fichier skill** : `skills/agent-auditor.md` (598 lignes, v5.1.0-ULTRA)
**Modèle** : Mistral Medium 3.5, température 0.1, maxTokens 6144
**Position** : Step 4 (et ré-audit dans la boucle Editor)

**Rôle** : Évalue l'article sur 8 critères E-E-A-T + produit un score anti-IA estimé + corrections factuelles.

**8 critères d'évaluation** :

| # | Critère | Score max | Poids |
|---|---|---|---|
| 1 | **Experience** — First-Hand Familiarity | 20 | HIGH |
| 2 | **Expertise** — Depth & Accuracy | 20 | — |
| 3 | **Authoritativeness** — Source Quality | 20 | — |
| 4 | **Trustworthiness** — Verifiability & Accuracy | 20 | HIGHEST |
| 5 | **SEO / GEO Optimization** | 20 | — |
| 6 | **Readability & Structure** | 20 | — |
| 7 | **Anti-AI-Slop Detection** | 20 | HIGH |
| 8 | **Voice Consistency** (ADAPTIVE v5.1) | 20 | MEDIUM |

**Innovation — Voice Consistency adaptative** : Le nombre de tokens requis dépend de la difficulté de la recette :
- **Easy** : 3/5 tokens ([WARM] + [SHARP] + [WINK])
- **Medium** : 4/5 (+ [GRIT] ou [GLOW])
- **Hard** : 5/5 (tous)

**Formule AI Score v1.0 (heuristique, en cours de calibration)** :
```
aiScore = round(
  (antiAISlopInverted × 0.4) +
  (experienceInverted × 0.3) +
  (voiceConsistencyInverted × 0.2) +
  (readabilityUniformityPenalty × 0.1)
)
```
Avec overrides :
- Tier 1 banned word → aiScore minimum = 25
- Trustworthiness < 10/20 → aiScore minimum = 30
- Content < 1500 mots → +10 au aiScore

**Red Flag Catalog** (11 flags — -3 points chacun) : poultry temp, no leavening, fast caramel, low sear, split sauce, pasta time, rice ratio, room temp storage, egg steam claim, unsourced health claim, thin content < 1500 mots.

**Mécanisme de verdict** :
- **OK** si : overallScore ≥ 70 ET aiScore ≤ 20 ET tous les critères ≥ 14/20 ET 0 correction factuelle ET trustworthiness ≥ 15/20
- **NEEDS REVISION** sinon
- **CRITICAL** si trustworthiness < 10/20 (sécurité alimentaire) — override tous les autres scores

**Points forts** :
- Rubriques de notation extrêmement détaillées avec indicateurs concrets par niveau
- Le Red Flag Catalog couvre les erreurs factuelles de cuisine les plus communes
- L'Adaptive Voice Consistency évite de pénaliser les recettes simples pour un manque de profondeur émotionnelle
- La formule AI Score est documentée avec sa justification théorique et ses limites

**Faiblesses** :
- La formule AI Score est explicitement heuristique et non calibrée empiriquement (le skill le dit : "Until calibration: Use the formula as a directional indicator")
- 8 critères × rubriques détaillées = énorme charge cognitive pour le LLM — risque d'évaluations incohérentes
- Le skill fait 598 lignes — le plus long de tous les agents — risque de dilution d'attention sur la fin
- L'évaluation de la "Voice Consistency" est intrinsèquement subjective et difficile à rendre déterministe même avec température 0.1

---

### 3.5 Agent 4 — Editor (v5.2 ULTRA)

**Fichier runtime** : `lib/inngest/functions/agents/editor.ts` (114 lignes)
**Fichier skill** : `skills/agent-editor.md` (248 lignes, v5.2.0-ULTRA)
**Modèle** : Mistral Medium 3.5, température 0.8, maxTokens 6144
**Position** : Step 7 (boucle max 3 passes)

**Rôle** : Corrige les défauts signalés par l'Auditor et humanise l'article pour réduire le score de détection IA. Approche chirurgicale ("fix only what is flagged, preserve everything that works").

**Mécanisme de boucle** :
```
while (humanizationPass < 3 && verdict !== "OK") {
    humanizationPass++
    corrected = agentEditor(keyword, currentDraft, currentAudit, pass)
    currentAudit = agentAuditor(keyword, corrected, entities)  // ré-audit
}
```

**Stratégie multi-passes avec budget quantifié** :

| Passe | Techniques | Budget |
|---|---|---|
| **Pass 1** — Light Correction | Corrections factuelles + SEO + 2-3 mots sensoriels + Transition Hunt | Pas de micro-imperfections, pas de manipulation de longueur |
| **Pass 2** — Strong Humanization | Sentence Length Audit + 2 micro-imperfections + 1 question rhétorique + 1 hésitation naturelle + Introduction Rewrite si générique | Max 2 micro-imperfections total |
| **Pass 3** — Maximum Humanization | 1 hésitation + 1 expression orale/section + 2 ponctuations émotionnelles + Conclusion Rewrite + Semantic Depth Injection | Ne pas ajouter plus de micro-imperfections |

**Catalogue de correction par critère** (Section 5 du skill) :
- 5.1 SEO : truncation meta, keyword H1, tags
- 5.2 GEO : insertion entités, PAA, extractibilité
- 5.3 Readability : split paragraphes, transitions, jargon
- 5.4 Humanization : 5 templates d'anecdotes, first-person, opinion
- 5.5 Sensory : 6 canaux sensoriels (texture, arôme, saveur, visuel, thermique, son)
- 5.6 Anti-Hallucination : corrections factuelles exactes de l'Auditor
- 5.7 Anti-AI Detection (2026) : 7 techniques avec impact estimé en points

**Règles anti-régression** (non-négociables) : ne jamais supprimer les descripteurs sensoriels, les anecdotes, les variations de rythme, les expressions du Chef Augustin, les temps/températures corrects, les questions rhétoriques, la première personne, les micro-imperfections du Writer.

**Points forts** :
- L'approche chirurgicale avec budgets quantifiés est bien plus efficace qu'un "rewrite tout"
- Les 3 passes graduelles évitent la sur-correction (qui créerait de nouveaux patterns IA)
- Le catalogue de correction par critère donne des techniques concrètes plutôt que des principes vagues
- La section "Before/After Examples" (Section 10) est excellente — elle ancre le LLM dans des transformations réelles

**Faiblesses** :
- La régénération complète de l'article à chaque passe (maxTokens 6144) est coûteuse et peut introduire des changements non sollicités
- Le risque de "regression" (corriger quelque chose qui n'était pas cassé) est réel malgré les garde-fous — le QA est censé le détecter, mais c'est une correction en aval
- Pas de mécanisme de "diff" pour que l'Editor sache exactement ce qui a changé entre les passes

---

### 3.6 Agent 5 — QA (v1.1 LIGHT)

**Fichier runtime** : `lib/inngest/functions/agents/qa.ts` (297 lignes)
**Fichier skill** : `skills/agent-qa.md` (423 lignes, v1.1.0-ULTRA)
**Modèle** : Mistral Medium 3.5, température 0.1, maxTokens 2048
**Position** : Step 7.5

**Rôle** : Dernière porte avant publication. Vérifie la cohérence cross-agent en utilisant des résumés structurés (pas les documents complets) pour éviter le débordement de contexte LLM.

**Innovation — Résumés structurés (LIGHT)** : Au lieu d'envoyer les 4 documents complets au LLM (ce qui dépasserait le contexte), le code extrait des résumés :
- **strategist_summary** : ≤500 mots (H2, entités, PAA, meta)
- **writer_summary** : ≤800 mots (anecdotes, détails sensoriels, voice tokens, rythme, micro-imperfections)
- **auditor_summary** : ≤600 mots (verdict, score, corrections, issues par critère, mustFix)
- **editor_output** : document complet (le seul envoyé intégralement)

L'extraction des résumés est faite par des heuristiques dans le code TypeScript (regex + comptage), pas par le LLM. Cela garantit la fidélité et évite les hallucinations de résumé.

**5 checks de vérification** :

| # | Check | Poids | Méthode |
|---|---|---|---|
| 1 | **Factual Corrections Applied** | 20 pts | Vérifie que chaque correction de l'Auditor est dans l'Editor |
| 2 | **Writer Voice Preservation** | 20 pts | Vérifie que l'Editor n'a pas détruit les anecdotes, détails sensoriels, voice tokens |
| 3 | **Strategist Structure Alignment** | 20 pts | Vérifie que les H2, entités, PAA du plan sont respectés |
| 4 | **JSON Validity & Completeness** | 20 pts | Vérifie les champs requis, la parseabilité, l'absence de HTML |
| 5 | **Anti-Regression Sweep** | 20 pts | Vérifie que l'Editor n'a pas introduit de nouveaux problèmes |

**Verdicts et actions** :

| Verdict | Condition | Action pipeline |
|---|---|---|
| **PASS** | qaScore == 100, tous les checks PASS | → Food Photo (Step 8) |
| **NEEDS_FIX** | qaScore ≥ 60 | → 1 passe Editor supplémentaire avec les issues QA |
| **REJECT** | qaScore < 60 ou Check 1 FAIL ou Check 4 FAIL | → Hard stop, retour Writer |
| **CRITICAL** | Check 2 : toutes les anecdotes supprimées OU Check 3 : >2 H2 manquants | → Hard stop, retour Writer |

**Points forts** :
- L'approche LIGHT est pragmatique — le problème de contexte LLM est réel et cette solution est élégante
- Les vérifications sont concrètes et vérifiables (pas de "vérifie que c'est bon" vague)
- La détection de régression (Check 5) est cruciale pour la boucle Editor → QA
- Les heuristiques d'extraction dans le code (anecdotes, détails sensoriels, voice tokens) sont bien conçues

**Faiblesses** :
- Les heuristiques d'extraction sont fragiles — si le Writer change son style, les regex peuvent ne plus matcher
- Le check 3 (Strategist Alignment) ne vérifie que la présence des H2, pas leur contenu
- La détection de "micro-imperfections" est basique (6 patterns regex)
- Pas de vérification de la qualité du JSON-LD (le code le reconstruit de toute façon au Step 11)

---

### 3.7 Agent 6 — Image Prompt Optimizer (v2.1 ULTRA)

**Fichier runtime** : `lib/inngest/functions/agents/image-prompt-optimizer.ts` (114 lignes)
**Fichier skill** : `skills/food-photography.md` (514 lignes, v2.1.0-ULTRA)
**Modèle** : Mistral Medium 3.5, température 0.7, maxTokens 512
**Position** : Step 8

**Rôle** : Transforme les données de la recette en un prompt d'image optimisé pour FLUX-1-Schnell/FLUX-2, selon une architecture 10 couches de photographie culinaire professionnelle.

**Architecture 10 couches** (implémentée dans `buildDefaultPrompt()` en fallback, pilotée par le LLM en mode normal) :
1. Style visuel (rustic gourmet, fine dining, comfort food, healthy, dessert, street food)
2. Sujet principal (attributs spécifiques)
3. Contexte (environnement, surface, plating)
4. Cadrage + Angle (matrice par type de plat : pizza=overhead, burger=45°, etc.)
5. Éclairage (5 setups : natural window, dramatic side, golden hour, studio softbox, bright overhead)
6. Composition (règle des tiers, flat lay, negative space)
7. Palette de couleurs (avec hex codes pour ancrage FLUX)
8. Détails techniques (Sony A7R IV, 90mm macro, f/2.8, ISO 400)
9. Format/Ratio (3:4 Pinterest, 1:1 Instagram/delivery, 9:16 Stories, 16:9 YouTube)
10. Exclusions (formulées positivement — "clean background" pas "no clutter")

**Fallback à 3 niveaux** :
1. LLM (Mistral Medium) → prompt optimisé
2. `buildDefaultPrompt()` programmatique → prompt construit depuis les données recette
3. `FALLBACK_PROMPT` constante → prompt de secours absolu

**Stratégie Low-Visual Recipe** (Section 13 du skill) : Pour les plats sans sujet visuel fort (bouillon, riz, purée), 4 stratégies alternatives :
- A : Focus ingrédients (photographier les ingrédients avant cuisson)
- B : Action/process (photographier la cuisson)
- C : Lifestyle context (plat servi dans un cadre de vie)
- D : Textural close-up (zoom sur une texture)

**Points forts** :
- Le skill est d'une richesse exceptionnelle — 514 lignes de vocabulaire photographique professionnel
- La matrice par type de plat (framing, angle, vocabulaire de texture) est directement exploitable
- La stratégie low-visual est une innovation réelle (peu de systèmes y pensent)
- Les exemples complets (braised short ribs + vegetable broth) ancrent le LLM dans des transformations concrètes

**Faiblesses** :
- Le skill produit un JSON multi-variant complexe... mais le code n'extrait que `imagePrompt` (string unique) et ignore les variants par plateforme
- Les exemples sont très longs et consomment du contexte précieux
- La température 0.7 peut produire des prompts incohérents sur des plats atypiques
- La validation post-LLM est minimaliste (juste `length >= 50`)

---

## 4. Contrats inter-agents

### 4.1 Chaîne de dépendance des types

```
StructuredSerp (Agent 0)
    ↓
SeoPlan (Agent 1 — Strategist)
    ↓
RecipeDraft (Agent 2 — Writer)
    ↓
AuditReport (Agent 3 — Auditor)
    ↓
RecipeDraft corrigé (Agent 4 — Editor)
    ↓
QAReport (Agent 5 — QA)
    ↓
string (Agent 6 — Image Optimizer)
```

### 4.2 Contrats critiques

| Contrat | Détail | Version |
|---|---|---|
| **Writer → Image Optimizer** | Writer v5.2+ ne génère PAS `imagePrompt` | Aligné v5.2 |
| **Writer → Editor** | Même schéma `RecipeDraft` (incluant `imagePrompt?`) | Aligné v5.2 |
| **Writer → QA** | QA Check 4 n'exige plus `imagePrompt` | Corrigé Sprint 5 |
| **Auditor → Editor** | L'Auditor inclut `tokensRequired` et `tokensFound` dans Voice Consistency | v5.1 |
| **Auditor → Strategist** | Critères < 16/20 → self_improvement_logs → prochaine génération | v2.0 |
| **QA → Strategist** | Verdict ≠ PASS → self_improvement_logs avec source="qa" | v1.1 |
| **Step 11 → code** | JSON-LD @graph reconstruit programmatiquement (ne fait pas confiance au LLM) | v5.2 |

### 4.3 Points de fragilité dans les contrats

1. **Le SeoPlan du Strategist peut contenir `faqItems` avec réponses pré-rédigées** — le Writer doit les utiliser, mais le contrat ne spécifie pas si c'est obligatoire ou optionnel
2. **L'Editor modifie le `contentMarkdown` mais le code réutilise `draft` (Writer original) pour le QA** — le contrat QA compare l'Editor contre le Writer original, ce qui est correct mais non documenté explicitement
3. **Les `semanticEntities` du Strategist sont consommées par l'Auditor** pour vérifier leur présence — mais si l'Editor les déplace ou les reformule, l'Auditor peut les manquer

---

## 5. Boucle d'auto-amélioration

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SOURCES DE LEÇONS                       │
│  1. Auditor : critères < 16/20                           │
│  2. Auditor : AI Score (systématique)                    │
│  3. QA : verdict ≠ PASS                                  │
├─────────────────────────────────────────────────────────┤
│                   STOCKAGE                                │
│  self_improvement_logs (PostgreSQL)                      │
│  Colonnes : keyword, criterion, score, recommendation,   │
│             tags, source, aiScore, createdAt             │
├─────────────────────────────────────────────────────────┤
│                   RÉCUPÉRATION                            │
│  15 plus récentes + calibration stats                    │
│  Formatées avec contexte (mot-clé, critère, score)       │
├─────────────────────────────────────────────────────────┤
│                   APPLICATION                             │
│  Strategist : filtrage contextuel (côté LLM)             │
│  Plafonnement : max 10 leçons dans le prompt             │
│  Calibration : moyenne AI Score + critères faibles        │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Calibration stats (endpoint + injection Strategist)

La fonction `getCalibrationStats()` (dans `lib/queries.ts`) calcule :
- Nombre total de points de données
- AI Score moyen (global + tendance récente 10 articles)
- Critères les plus faibles (top 3)
- Tags avec le plus haut AI Score (risque de détection par type de recette)
- Breakdown par source (auditor vs qa)

Ces stats sont injectées dans le prompt du Strategist avec deux formats :
- **v2.0** (≥50 points) : "Average AI Score: X/100 across Y articles. Recent trend: Z/100 — improving/watch closely. Weakest criteria: [...]. Highest AI risk tags: [...]"
- **v1.0** (<50 points) : Version simplifiée sans analyse de tendance

### 5.3 Filtrage contextuel

Le skill Strategist (§15) définit 3 étapes de filtrage :
1. **Relevance Filtering** : éliminer les leçons incompatibles (baking → soup = skip)
2. **Plafonnement** : max 10 leçons, si >10 sur le même tag → top 5 par tag overlap
3. **Integration** : adapter, ne pas copier-coller

Ce filtrage est entièrement côté LLM (pas de code), ce qui le rend à la fois flexible et non déterministe.

---

## 6. Forces et innovations

### 6.1 Innovations architecturales

1. **Agent 0 déterministe** : Le SERP Structurer est une innovation majeure. En extrayant l'intelligence SEO du SERP de façon déterministe (regex + heuristiques) avant d'appeler le premier LLM, on réduit la charge cognitive, le coût, et le risque d'hallucination. C'est un pattern applicable à tout pipeline SEO automatisé.

2. **QA LIGHT avec résumés structurés** : L'approche qui consiste à extraire des résumés dans le code plutôt que d'envoyer les documents complets au LLM résout élégamment le problème de contexte sans perdre les signaux de vérification essentiels.

3. **Boucle Editor-Auditor avec budget quantifié** : Les 3 passes graduelles avec budgets explicites (micro-imperfections, hésitations, expressions orales) sont plus efficaces que les approches "rewrite until score passes" qui tendent à sur-corriger.

4. **Boucle de feedback fermée avec calibration** : Le système ne se contente pas d'apprendre de ses erreurs — il mesure sa propre calibration (AI Score moyen, tendances, critères faibles) et injecte ces métriques dans la planification.

5. **JSON-LD @graph construit dans le code** : Le fait de ne pas faire confiance au LLM pour le JSON-LD (qui est trop important pour le SEO) et de le reconstruire programmatiquement au Step 11 est une décision architecturale sage.

### 6.2 Innovations sémantiques

1. **Persona Chef Augustin Lefèvre** : Un des personas d'agent les plus détaillés observés — 5 registres vocaux, règles de rythme, mood anchoring par type de recette, Horoscope Test, banned vocabulary sur 4 tiers. La plupart des systèmes de génération de contenu s'arrêtent à "écris comme un chef français".

2. **Framework GEO (pas juste SEO)** : La distinction entre "ranker dans le top 10 Google" et "être cité dans les réponses des moteurs d'IA" (ChatGPT, Perplexity, Google AI Overviews) est visionnaire. Les "Answer Nuggets" (blocs 40-80 mots conçus pour être extraits et cités) sont une tactique GEO concrète.

3. **E-E-A-T comme framework d'évaluation, pas juste une checklist** : L'Auditor évalue l'Experience avec des critères comme "anecdote with specific time/place/context" et "failure story with consequence" — des signaux que Google valorise réellement en 2026.

4. **Food Photography 10 couches** : La décomposition d'un prompt d'image en 10 couches indépendantes (style → sujet → contexte → cadrage → éclairage → composition → palette → technique → format → exclusions) est une architecture de prompt engineering réutilisable au-delà de la photographie culinaire.

5. **Low-Visual Recipe Fallback** : La reconnaissance qu'un bouillon ou une purée n'a pas de sujet visuel fort, et les 4 stratégies alternatives (ingrédients, process, lifestyle, texture) montrent une compréhension nuancée des limites de la génération d'images.

---

## 7. Limitations et risques

### 7.1 Limitations techniques

| Limitation | Impact | Sévérité |
|---|---|---|
| **Pas de mécanisme de cache pour les skills** | Chaque appel d'agent lit le fichier Markdown depuis le disque | Faible (I/O rapide) |
| **Pas de mécanisme de retry par step** | Si un step échoue, tout le workflow retry depuis le début (3 fois) | Moyen |
| **`dqContains()` est un stub** | La fonction retourne toujours `false` — fausse certaines vérifications dans le package Strategist | Faible |
| **Pas de validation de schéma sur les sorties LLM** | Seul le parsing JSON est vérifié — pas la présence des champs obligatoires ni leurs types | Moyen |
| **Le skill Image Optimizer produit un JSON multi-variant mais le code n'extrait que `imagePrompt`** | Gaspillage de tokens LLM | Faible |
| **Les timeouts Inngest peuvent être atteints** | Si 3 passes Editor + QA + ré-édition prennent trop de temps | Moyen |
| **Pas de gestion de file d'attente** | Throttle 2/min + concurrency 3 = max 6 workflows en file | Faible (acceptable) |
| **`appendLog()` fait un UPDATE par log** | ~15-20 UPDATEs par workflow — acceptable mais pas optimal | Faible |
| **Pas de transactions DB** | Les updates partiels entre les steps pourraient laisser un état incohérent si le workflow crash | Faible (Inngest gère les retries) |

### 7.2 Limitations sémantiques

| Limitation | Impact | Sévérité |
|---|---|---|
| **Formule AI Score non calibrée** | Les scores AI sont directionnels, pas absolus | Élevé |
| **Filtrage contextuel côté LLM uniquement** | Le filtrage des leçons dépend de la compréhension du LLM — non déterministe | Moyen |
| **Pas de feedback humain dans la boucle** | La review humaine est binaire (approve/reject) — pas de feedback qualitatif | Moyen |
| **Biais culturel français/américain** | Le persona est un chef français écrivant pour un public US — peut produire des incohérences culturelles | Faible |
| **Pas de gestion de la saisonnalité** | Les recettes ne tiennent pas compte de la saison (fraise en décembre ?) | Faible |
| **Pas de vérification de plagiat** | Le contenu généré pourrait accidentellement reproduire des passages de concurrents | Faible |
| **Dépendance aux données SERP** | Si Serper.dev est down ou retourne des données partielles, la qualité dégrade significativement | Élevé |
| **Pas de personalization par recette précédente** | Chaque génération est indépendante — pas de "style consistency" global du blog | Faible |

### 7.3 Risques opérationnels

1. **Coûts API LLM** : 6 appels LLM par recette (Strategist, Writer, Auditor, Editor×1-3, QA, Image Optimizer). Une recette qui nécessite 3 passes Editor + 1 passe QA fix = 10 appels LLM. À ~$0.50-1.00 par recette en coûts LLM, un blog de 500 recettes coûte $250-500.

2. **Dépendance à NaraRouter** : Si le service est down, le fallback Cloudflare (GPT-OSS 120B) peut avoir une qualité différente — les skills sont optimisés pour Mistral Medium 3.5.

3. **Qualité variable des modèles** : Le fallback Cloudflare GPT-OSS 120B n'a peut-être pas la même compréhension des instructions complexes que Mistral Medium 3.5.

4. **Coûts Serper.dev** : 1 appel par recette. Le plan gratuit est limité à 50 requêtes/mois. Au-delà, c'est payant.

5. **Coûts Cloudinary** : Stockage + bande passante pour les images générées. 2-3 images par recette.

---

## 8. Métriques et calibration

### 8.1 Indicateurs de qualité

| Métrique | Où | Comment |
|---|---|---|
| **Audit Score** | AuditReport.overallScore | Moyenne pondérée des 8 critères (0-100) |
| **AI Score** | AuditReport.score_ia_estimation | Formule heuristique v1.0 (0-100) |
| **QA Score** | QAReport.qaScore | 5 checks × 20 points (0-100) |
| **Word Count** | Code Step 11 | Comptage programmatique (cible : 1800-2200) |
| **Image Variant Stats** | image_variant_stats | Impressions + clics par variant |

### 8.2 Tableau de bord de calibration

L'endpoint `GET /api/self-improvement/calibration` expose :
- Nombre total d'articles analysés
- AI Score moyen (global + tendance récente)
- Critères les plus faibles (top 3)
- Tags avec le plus haut risque de détection IA
- Breakdown par source (auditor vs qa)

### 8.3 Seuils d'alerte

| Condition | Signification |
|---|---|
| overallScore < 70 | Article sous le seuil de publication |
| aiScore > 35 | Fort risque de détection IA |
| Trustworthiness < 10/20 | Verdict CRITICAL — sécurité alimentaire |
| contentMarkdown < 1500 mots | Thin content flag (avertissement, pas blocage) |
| QA REJECT/CRITICAL | Hard stop — retour Writer |

---

## 9. Recommandations

### 9.1 Court terme (prochain sprint)

1. **Réparer `dqContains()`** : La fonction stub dans `serp-structurer.ts:1056` doit être implémentée ou supprimée — elle fausse les vérifications `must_verify` dans le package Strategist.

2. **Calibrer la formule AI Score** : Collecter 50 vrais scores de détection IA (GPTZero, Originality.ai) sur les articles générés, puis faire une régression linéaire pour ajuster les poids (0.4/0.3/0.2/0.1).

3. **Ajouter une validation de schéma post-LLM** : Vérifier que les champs obligatoires du `SeoPlan`, `RecipeDraft`, et `AuditReport` sont présents après parsing JSON — aujourd'hui seul le parsing est vérifié.

4. **Optimiser le skill Image Optimizer** : Le code ignore les variants par plateforme — soit les exploiter, soit simplifier le skill pour ne pas gaspiller de tokens.

5. **Ajouter un check de contenu tronqué dans l'Editor** : Vérifier que le `contentMarkdown` régénéré fait bien ≥ 1500 mots après chaque passe Editor.

### 9.2 Moyen terme

1. **Filtrage contextuel côté code** : Déplacer la logique de filtrage des leçons du LLM vers le code TypeScript (tag overlap, incompatibilité de type de recette). Plus déterministe, moins de tokens.

2. **Ajouter un Agent 7 — YouTube/E-E-A-T** : Génération de contenu vidéo complémentaire (scripts, descriptions, timestamps). Mentionné dans les next steps.

3. **Mécanisme de feedback humain qualitatif** : Permettre au reviewer humain de laisser des notes spécifiques (pas juste approve/reject) qui alimentent le self_improvement_logs.

4. **Cache des skills** : Mettre en cache le contenu des skills Markdown en mémoire pour éviter les lectures disque répétées.

5. **Optimisation des coûts LLM** : Explorer si des steps peuvent utiliser un modèle plus petit (Gemma 4 26B pour le QA ? Gemma pour l'Image Optimizer ?).

6. **Boucle de cohérence globale** : Vérifier que le ton, le vocabulaire, et la structure sont cohérents entre toutes les recettes du blog (style consistency).

### 9.3 Long terme

1. **Fine-tuning d'un modèle sur le persona Chef Augustin** : Si le volume de recettes est suffisant (>100), fine-tuner un modèle open-source sur les articles corrigés pour réduire les coûts et améliorer la cohérence.

2. **Architecture multi-modèle** : Utiliser des modèles différents par step (Mistral Large pour Strategist, Mistral Small pour QA, etc.) pour optimiser le rapport qualité/coût.

3. **Détection de plagiat intégrée** : Ajouter un check de similarité contre les concurrents SERP avant publication.

4. **Pipeline de test automatisé** : Exécuter le pipeline complet sur un jeu de 10 mots-clés variés et mesurer la variance des scores.

---

## 10. Annexes — Schémas et types

### 10.1 Schéma complet des flux inter-agents

```
                          ┌──────────────┐
                          │  Serper.dev  │
                          │  (Google API)│
                          └──────┬───────┘
                                 │ SerpResult
                                 ▼
                    ┌─────────────────────────┐
                    │   Agent 0               │
                    │   SERP Structurer        │
                    │   (déterministe)          │
                    │   structureSerpData()    │
                    └────────────┬────────────┘
                                 │ StructuredSerp
                                 ▼
              ┌──────────────────────────────────┐
              │  Agent 1 — SEO Strategist v5.2   │
              │  agentStrategistV2()              │
              │  Inputs: StructuredSerp           │
              │          + pastImprovements[15]   │
              │          + calibrationStats       │
              │  Output: SeoPlan                  │
              └──────────────┬───────────────────┘
                             │ SeoPlan
                             ▼
              ┌──────────────────────────────────┐
              │  Agent 2 — Writer v5.3            │
              │  agentWriter()                    │
              │  Persona: Chef Augustin Lefèvre   │
              │  Output: RecipeDraft              │
              │  (PAS de imagePrompt)             │
              └──────────────┬───────────────────┘
                             │ RecipeDraft
                             ▼
              ┌──────────────────────────────────┐
              │  Agent 3 — Auditor v5.1           │
              │  agentAuditor()                   │
              │  8 critères E-E-A-T + AI Score    │
              │  Output: AuditReport              │
              │  Verdict: OK | NEEDS_REVISION     │
              └──────────────┬───────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                 OK │                 │ NEEDS_REVISION
                    ▼                 ▼
              ┌──────────┐   ┌──────────────────────────┐
              │  Passe   │   │  Agent 4 — Editor v5.2    │
              │  directe │   │  agentEditor()            │
              │  au QA   │   │  Boucle max 3 passes      │
              └────┬─────┘   │  + ré-audit après chaque  │
                   │         └────────────┬─────────────┘
                   │                      │ RecipeDraft corrigé
                   └──────────┬───────────┘
                              │
                              ▼
              ┌──────────────────────────────────┐
              │  Agent 5 — QA v1.1 LIGHT         │
              │  agentQA()                        │
              │  5 checks cross-agent             │
              │  Entrée: résumés structurés       │
              │  Verdict: PASS | NEEDS_FIX |      │
              │           REJECT | CRITICAL       │
              └──────────────┬───────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
           PASS │     NEEDS_FIX │    REJECT/CRITICAL
              ▼              ▼              ▼
              │     ┌──────────────┐  ┌──────────┐
              │     │ 1 passe      │  │ HARD     │
              │     │ Editor + QA  │  │ STOP     │
              │     │ recheck      │  │ (throw)  │
              │     └──────┬───────┘  └──────────┘
              │            │
              └────────────┘
                     │
                     ▼
       ┌──────────────────────────────────┐
       │  Agent 6 — Image Optimizer v2.1  │
       │  agentImagePromptOptimizer()     │
       │  Architecture 10 couches         │
       │  Output: string (prompt optimisé)│
       └──────────────┬───────────────────┘
                      │
                      ▼
       ┌──────────────────────────────────┐
       │  FLUX-1-Schnell (Cloudflare)     │
       │  → Cloudinary upload             │
       │  2-3 variants (A, B, C)          │
       └──────────────┬───────────────────┘
                      │
                      ▼
       ┌──────────────────────────────────┐
       │  Step 10 — Self-Improvement      │
       │  3 sources → self_improvement_logs│
       └──────────────┬───────────────────┘
                      │
                      ▼
       ┌──────────────────────────────────┐
       │  Step 11 — Persist Final         │
       │  SEO guards + JSON-LD @graph     │
       │  4 types: Recipe + BlogPosting   │
       │  + FAQPage + BreadcrumbList      │
       └──────────────┬───────────────────┘
                      │
                      ▼
       ┌──────────────────────────────────┐
       │  Step 12 — A/B Tracking          │
       │  image_variant_stats init        │
       └──────────────────────────────────┘
```

### 10.2 Table des modèles et paramètres

| Agent | Modèle | Température | maxTokens | Autres params |
|---|---|---|---|---|
| Strategist v5.2 | Mistral Medium 3.5 | 0.3 | 4096 | — |
| Writer v5.3 | Mistral Medium 3.5 | 0.9 | 4096 | top_p 0.92, freq_penalty 0.3, pres_penalty 0.2 |
| Auditor v5.1 | Mistral Medium 3.5 | 0.1 | 6144 | — |
| Editor v5.2 | Mistral Medium 3.5 | 0.8 | 6144 | — |
| QA v1.1 | Mistral Medium 3.5 | 0.1 | 2048 | — |
| Image Optimizer v2.1 | Mistral Medium 3.5 | 0.7 | 512 | — |

### 10.3 Liste des fichiers clés

| Fichier | Lignes | Rôle |
|---|---|---|
| `lib/inngest/functions/generate-recipe.ts` | 878 | Pipeline principal Inngest (12 steps) |
| `lib/agents/serp-structurer.ts` | 1 239 | Agent 0 — SERP structurer déterministe |
| `lib/inngest/functions/agents/strategist.ts` | 210 | Agent 1 runtime |
| `lib/inngest/functions/agents/writer.ts` | 119 | Agent 2 runtime |
| `lib/inngest/functions/agents/auditor.ts` | 111 | Agent 3 runtime |
| `lib/inngest/functions/agents/editor.ts` | 114 | Agent 4 runtime |
| `lib/inngest/functions/agents/qa.ts` | 297 | Agent 5 runtime (inclut heuristiques d'extraction) |
| `lib/inngest/functions/agents/image-prompt-optimizer.ts` | 114 | Agent 6 runtime |
| `skills/agent-strategist.md` | 336 | Skill Strategist |
| `skills/agent-writer.md` | 272 | Skill Writer (le plus dense) |
| `skills/agent-auditor.md` | 598 | Skill Auditor (le plus long) |
| `skills/agent-editor.md` | 248 | Skill Editor |
| `skills/agent-qa.md` | 423 | Skill QA |
| `skills/food-photography.md` | 514 | Skill Image Optimizer |
| `skills/self-improvement.md` | 126 | Documentation self-improvement |
| `lib/agents/nararouter.ts` | 140 | Client LLM primaire (+ fallback Cloudflare) |
| `lib/agents/cloudflare.ts` | 287 | Client LLM fallback + extractJson |
| `lib/agents/serp.ts` | 113 | Client Serper.dev |
| `lib/skills.ts` | 243 | Loader de skills + buildDefaultPrompt |
| `lib/db/schema.ts` | 121 | Schéma Drizzle (3 tables) |
| `lib/queries.ts` | 254 | Fonctions de requête + getCalibrationStats |
| **TOTAL** | **~5 500** | |

---

*Rapport généré le 29 juin 2026 à partir de l'analyse complète du codebase AI AutoBlog (Sprint 5).*
*Destiné à la discussion inter-LLM et à l'évaluation architecturale.*
