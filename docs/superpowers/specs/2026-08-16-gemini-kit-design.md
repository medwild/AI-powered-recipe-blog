# Design — Gemini Kit : système d'instructions externe pour génération de recettes

**Date** : 2026-08-16
**Statut** : Validé en brainstorming (16/08/2026)
**Périmètre** : Recettes uniquement (VAGUE 3 et suivantes). Articles et collections hors scope.

---

## 1. Contexte & objectif

Le blog génère aujourd'hui ses recettes via le pipeline interne v14.3 (Tokenmix → `generate-recipe-pure.ts` → gate → persistance). Objectif : **créer un système d'instructions professionnel et autonome** permettant de générer des recettes avec **Gemini (Google AI Studio)**, puis de les **reviewer dans Claude Code** avant validation et publication.

Le livrable est un **kit de documents** indépendant du workflow existant — pas une modification du pipeline.

## 2. Contraintes absolues

1. **Zéro modification du système actuel** : `generate.ts`, `chef-augustin-mega.md`, `quality-gate.ts`, `generate-recipe-pure.ts`, `persist-phase.ts`, `image-phase.ts` → **intouchés**
2. Le kit vit dans **`gemini-kit/`** à la racine (hors `skills/` qui appartient au pipeline)
3. **Loop pur** : Claude n'écrit jamais de contenu — il audite et produit un feedback que Gemini exécute
4. Le gate code reste la **seule autorité** sur les comptages et les blocages (le self-audit Gemini est un pré-filtre)
5. Le kit est **supprimable sans trace** : le pipeline Tokenmix reste le fallback, intact

## 3. Architecture du flux

```
[serper.dev manuel] → packet SERP
        │
        ▼
GOOGLE AI STUDIO (Gemini)
  [system prompt stable]  → collé une fois
  [packet + Étape 1]      → analyse SERP + angle  ← checkpoint humain (optionnel)
  Étape 2                 → draft complet (JSON 14 champs)
  Étape 3                 → auto-audit strict (9 checks, 3 couches)
  Étape 4                 → correction → JSON final   (loop interne borné : max 2 passes)
        │ JSON copié
        ▼
CLAUDE CODE (review)
  1. Mécanique : Zod + quality-gate.ts (7 checks, lecture seule) + slug unique
  2. Sémantique : voix, E-E-A-T, cannibalisation, liens internes, clôture
  3. Décision : PASS → publication | FAIL → rapport feedback P0/P1/P2
        │ feedback collé dans le chat AI Studio (la recette est déjà en contexte)
        ▼
Étape 4 bis (loop externe, itérable jusqu'à PASS)
        │
        ▼
PUBLICATION : scripts/import-gemini-recipe.ts (colle sur l'existant, jetable)
```

## 4. Livrables

| Fichier | Rôle | Stabilité |
|---|---|---|
| `gemini-kit/gemini-system-prompt.md` | Persona, contraintes critiques, voix, contrat de sortie (14 champs) | Stable |
| `gemini-kit/gemini-stage-sequence.md` | Les 4 étapes du loop, chacune = bloc copiable | Semi-stable (évolue avec feedbacks) |
| `gemini-kit/review-protocol.md` | Protocole Claude Code : gate + audit + format feedback | Stable |
| `scripts/import-gemini-recipe.ts` | Publication d'un JSON validé (optionnel au début, requis pour le volume) | Jetable |

## 5. Packet SERP (entrée de l'Étape 1)

Format structuré et léger, extrait manuellement de serper.dev :

```markdown
## KEYWORD
<keyword exact>

## TOP RESULTS (from serper.dev)
1. [TITLE] <URL>
   <snippet>
2. ... (3-5 résultats)

## PEOPLE ALSO ASK
- <question>

## RELATED SEARCHES
- <related>

## CUISINE CONTEXT (optionnel)
<thème spécifique : mexicain, italien… — fourni par Claude Code ou l'utilisateur>
```

- 3-5 résultats suffisent (titre + URL + snippet)
- Le contexte cuisine **général** (small-batch pour deux, technique française) est stable → dans le system prompt ; le **thème spécifique** varie → dans le packet
- Bloc `CANDIDATE LINKS` optionnel : `{anchor, slug}` fourni par Claude Code (connaît la DB) — demandé à Claude avant la session AI Studio si l'utilisateur veut des liens internes ; sinon **0 lien interne, jamais de lien inventé**

## 6. `gemini-system-prompt.md` — contenu

Transformation du talent de `chef-augustin-mega.md` en format optimisé Gemini :

| Bloc | Contenu |
|---|---|
| Persona & transparence | Chef Augustin Lefèvre, persona de marque, pas de fausses credentials, anglais uniquement |
| Contraintes critiques | Températures USDA (poultry 165°F/74°C, ground 160°F/71°C, whole muscle 145°F/63°C, œufs pasteurisés, medium-rare : citer USDA d'abord), mots bannis (union skill + gate), titre = temps TOTAL |
| Voix | Les 7 patterns humains (≥5), dual output cohérent |
| Qualité d'écriture | Précision (°F+°C, volume+poids « 1 cup (140g) », sel Diamond Crystal), attributions ≥4, Answer Nuggets ≥5, 1800-2200 mots cible |
| Contrat de sortie | Les 14 champs du schéma Zod `RecipeArticle` (tableau ci-dessous) + JSON-LD + nutrition + sortie JSON pur `{`→`}`, pas de fences |
| Anti-patterns | Liste bannie complète (union), anti-truncation (`TRUNCATED` + « continue »), jamais de complétion silencieuse |

**Contrat de sortie (14 champs, vérifié dans `lib/schemas/recipe-article.ts`) :**

| Champ | Contrainte |
|---|---|
| `title` | H1, keyword first |
| `metaTitle` | ≤60 chars, keyword first |
| `metaDescription` | 150-160 chars, actionable |
| `excerpt` | 1-2 phrases, hook |
| `contentMarkdown` | Article complet : H2 sections, FAQ `## Question?`, 1800-2200 mots |
| `ingredients[]` | 8-15, format `"quantity name, notes"` |
| `instructions[]` | 6-12, `{step: number, text, duration?, temperature?}` — températures dans `text` **et** `temperature` (le gate scanne les deux) |
| `tags[]` | 4-8, lowercase |
| `prepTime` / `cookTime` / `totalTime` | ISO 8601 (`PT15M`) |
| `servings` | `"2 servings"` |
| `difficulty` | `Easy` / `Medium` / `Hard` |
| `jsonLd` | `@graph` : Recipe (image `<placeholder>`, nutrition, **author**) + BlogPosting + FAQPage + BreadcrumbList |

**Exclu du contrat** (dérivés à la persistance) : slug, dates, image, `content_type`, catégorie.

**Banned words — liste union** (le gate = blocage dur, la liste du prompt = prévention) :
- Skill : healthy, good for you, nutritious, better than, probiotics, gut health, immune boost, detox, anti-inflammatory, fat-burning, miracle, superfood, cleanse, cure, heal, treat, all-natural, clinically proven, scientifically proven
- Gate (`lib/quality-gate.ts`) : + process-speak (serp, search results, first page, top results, top ten, top 10, top-ranked, top ranked, competitor, competing recipe, seo, ranking, scan the top, scroll through, our angle, the angle here, my angle here, that's the angle)

## 7. `gemini-stage-sequence.md` — le loop (4 étapes)

Chaque étape = bloc copiable envoyé comme nouveau message dans le chat AI Studio (le system prompt reste collé en haut).

**Étape 1 — Analyse SERP & angle** (prompt « stratège SEO »)
- Entrée : packet. Sortie structurée : `ANGLE` (formulé en observation de cuisine, jamais en langage SERP), `H1`, `META TITLE`, `META DESCRIPTION`, `FAQ CANDIDATES` (5-7), `H2 ROADMAP` (6-8)
- Checkpoint humain optionnel : « continue » ou ajustement (30 s, évite une recette sur un mauvais angle)

**Étape 2 — Draft complet** (prompt « écris l'article complet »)
- Entrée : analyse Étape 1 (en contexte). Sortie : JSON complet 14 champs, 1800-2200 mots, dual output cohérent, JSON pur
- Anti-truncation : `TRUNCATED` → l'utilisateur répond « continue »

**Étape 3 — Auto-audit strict** (prompt « auditeur de conformité »)
- Entrée : draft. Sortie : tableau `PASS/FAIL` + preuve (champ/étape n°), **sans corrections** (séparation générateur/validateur)
- 9 checks en 3 couches :
  - **Gate** (réplique des 7 checks code) : food safety, word count (floor dynamique 600/800/1200 + cible 1800-2200), mots bannis (union, process-speak inclus), metaTitle ≤60, H2 ≥3, JSON-LD author, répétition tokens
  - **Contrat** : 14 champs + types, ISO 8601, metaDescription 150-160, cohérence dual output
  - **Éditorial** : angle de l'Étape 1 livré, FAQ ≥5, nutrition présente
- ⚠️ **Les comptages exacts ne sont pas fiables par LLM** : le self-audit fait du structurel + spot-check et marque les longueurs « à vérifier par comptage externe » — le vrai comptage est fait par le gate code en review. Le self-audit est un **pré-filtre, jamais l'autorité finale**.

**Étape 4 — Correction**
- Entrée : audit + draft (contexte). Sortie : JSON final appliquant tous les FAIL
- **Loop interne borné** : après Étape 4, re-audit (Étape 3 bis) ; max 2 passes ; si encore FAIL → livrer tel quel + audit attaché (la review Claude tranche)
- **Étape 4 = aussi le point d'entrée du loop externe** (feedback Claude Code → recollé → même bloc de correction)
- **Loop externe borné** : max 3 retours (P0/P1) ; au-delà, décision humaine — si les mêmes erreurs reviennent, c'est le kit qu'il faut améliorer, pas la recette

**Réglages** (recommandations, à valider au pilot dans l'UI AI Studio) : Étape 1-2 créatif (0.8-0.9), Étape 3 strict (0.2), Étape 4 modéré (0.5) ; si l'UI ne permet pas par-génération → 0.7 unique.
Le loop complet ≈ 25k tokens de contexte — largement dans la fenêtre Gemini (modèle exact à confirmer au pilot).

## 8. `review-protocol.md` — protocole Claude Code

**1. Validation mécanique (code = seule autorité)**
- Zod parse `RecipeArticle` (14 champs)
- `quality-gate.ts` (7 checks) — import lecture seule
- Slug unique contre la DB (boucle `generate.ts`)

**2. Audit sémantique (Claude)**
- Voix/persona : 7 patterns ≥5, cohérence avec les 46 recettes existantes
- E-E-A-T : attributions ≥4, précision, zéro claim santé
- Cannibalisation : titre/synonymes proches d'une recette existante (requête DB)
- Liens internes : vérifiés contre la DB s'ils existent ; 0 = OK
- Clôture en scène (jamais « Enjoy! »), FAQ qualitatives (25-120 mots, chiffres/entités), angle livré

**3. Rapport de feedback (le livrable du loop)**
- **P0** bloquant (gate FAIL, schéma, claim santé, cannibalisation) → retour Gemini obligatoire
- **P1** qualité (voix, structure, angle faible) → retour recommandé
- **P2** nits optionnels
- Format item : `[P0] <check> — <localisation champ/étape> — <observation> — <correctif attendu>` — **instruction à Gemini, jamais de contenu réécrit**
- Seuil PASS : gate code + zéro P0 + ≤2 P1 (paramètre ajustable)
- UX du loop : coller **seulement le feedback** dans le chat AI Studio (la recette est en contexte) ; **max 3 retours** — au-delà, le problème vient du kit, pas de la recette

**4. Traçabilité** : `gemini-outputs/<slug>.json` + rapport archivés — les échecs récurrents alimentent l'amélioration du kit (mécanisme d'auto-optimisation)

## 9. Publication — `scripts/import-gemini-recipe.ts`

Script autonome et jetable, colle uniquement sur l'existant (pattern vérifié sur la route `app/api/internal/regenerate-recipe/route.ts`, en prod) :

1. Lit `<keyword>` + `<fichier JSON>` (sortie Gemini)
2. Zod parse → `RecipeArticle`
3. `qualityGate()` — 7 checks
4. Insert draft : slug unique (boucle `scripts/generate.ts`) + status
5. `recipeArticleToChefAugustinOutput(article)` — **existe déjà** (`lib/pipeline/agents/chef-augustin.ts`) → `persistFinalDraft(id, legacy, gateStatus, false)`
6. `runImagePhase(id, article, keyword)` — **existe déjà** (`lib/pipeline/steps/image-phase.ts`) : génère l'image Ideogram + remplace `<placeholder>` dans le markdown ; non-blocking (échec = warning)

Aucun fichier existant modifié. Suppression du script = zéro trace.

## 10. Pilot — validation sur 1 recette

1. 1 keyword de VAGUE 3 (slug déjà planifié)
2. Extraction SERP (serper.dev) → packet → kit dans AI Studio → JSON
3. Review ici → publication ou 1-2 loops
4. **Critères de succès** : PASS gate code + audit sémantique + publiée + qualité comparable à une top recette existante (comparaison côte à côte)
5. Itération : les échecs du pilot → mises à jour du kit (seul composant qui évolue)
6. Décision finale : concluant → VAGUE 3 en volume via le kit ; non concluant → Tokenmix reste le fallback

## 11. Hors scope

- Génération d'articles (content_type article) et collections
- Appel API Gemini programmatique (le flux est manuel par choix)
- Modification/suppression du pipeline Tokenmix
- Outillage de review automatisé (un script de review pourra être ajouté si le volume le justifie)

## 12. Points à vérifier au pilot (non assertés ici)

- Modèle Gemini exact disponible dans AI Studio (et sa fenêtre de contexte)
- Réglages UI AI Studio : température par génération, max output tokens
- Tarifs/quotas serper.dev actuels
