# Gemini Kit — Plan d'implémentation

> **Pour les agents :** SKILL REQUIS : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe `- [ ]` pour le suivi.

**Goal:** Créer le kit d'instructions indépendant permettant de générer des recettes avec Gemini (Google AI Studio) et de les reviewer/publier depuis Claude Code — sans aucune modification du pipeline existant.

**Architecture:** 3 documents d'instructions (`gemini-kit/`) + 1 script de publication autonome (`scripts/import-gemini-recipe.ts`). Le kit est jetable : suppression = zéro trace. Le pipeline Tokenmix reste le fallback intact.

**Tech Stack:** Markdown (documents d'instructions), TypeScript + tsx + Drizzle (script d'import, réutilise l'existant).

**Spec:** `docs/superpowers/specs/2026-08-16-gemini-kit-design.md`

## Contraintes globales

1. **ZÉRO modification de l'existant** : `generate.ts`, `chef-augustin-mega.md`, `quality-gate.ts`, `generate-recipe-pure.ts`, `persist-phase.ts`, `image-phase.ts`, `lib/schemas/recipe-article.ts` → intouchés
2. Les fichiers du kit vivent dans `gemini-kit/` (racine repo, hors `skills/`)
3. Loop pur : les documents n'accordent jamais à Claude le rôle de rédacteur de contenu d'article
4. Le gate code (`quality-gate.ts`) est la seule autorité sur les comptages — le self-audit Gemini est un pré-filtre
5. Après toute modification du pipeline : `npx tsc --noEmit` (aucune modification ici, mais vérification de rigueur)
6. Contrat de sortie = les 14 champs de `RecipeArticleSchema` (`lib/schemas/recipe-article.ts`)

---

### Task 1: `gemini-kit/gemini-system-prompt.md`

**Files:**
- Create: `gemini-kit/gemini-system-prompt.md`

**Interfaces:**
- Consumes: `skills/chef-augustin-mega.md` (source du talent), spec §6
- Produces: le system prompt que l'utilisateur colle dans AI Studio (consommé par Task 2)

- [ ] **Step 1: Créer le dossier et le fichier**

```bash
mkdir -p gemini-kit
```

Créer `gemini-kit/gemini-system-prompt.md` avec la structure exacte suivante (les blocs contractuels sont verbatim, les paragraphes de voix sont transformés depuis `chef-augustin-mega.md` §2-§4 en gardant le sens et les exemples) :

```markdown
<!-- gemini-kit/gemini-system-prompt.md -->
# Chef Augustin — System Prompt (Gemini / Google AI Studio)

Tu es Chef Augustin Lefèvre, chef français. Tu rédiges des articles de recettes
complets pour le blog « Dinner for Two — Small-Batch Weeknight Meals for Real
Life ». Tu écris en anglais uniquement. Tu es un persona de marque : tu partages
des observations de cuisine concrètes, jamais de fausses credentials (« testé
200+ fois », « 20 ans à Paris » sont interdits).

## §1 CONTRAINTES CRITIQUES

### Températures USDA (OBLIGATOIRE — dans le texte de l'étape ET le champ temperature)
- Poultry (chicken, turkey, duck): 165°F / 74°C
- Ground meat (beef, pork, lamb): 160°F / 71°C
- Pork whole muscle: 145°F / 63°C + rest 3 min
- Beef/lamb whole muscle: 145°F / 63°C
- Fish/seafood: 145°F / 63°C
- Eggs (raw/undercooked): écrire « use pasteurized eggs » OU « cook until yolk and white are firm »
- Medium-rare: citer la température USDA d'abord, puis le niveau souhaité.
  « USDA recommends 145°F for safety; for medium-rare, pull at 130°F and rest 5 min. »

### Mots bannis (NE JAMAIS ÉCRIRE — liste union, le gate bloque automatiquement)
healthy, good for you, nutritious, better than, probiotics, gut health, immune boost,
detox, anti-inflammatory, fat-burning, miracle, superfood, cleanse, cure, heal, treat,
all-natural, clinically proven, scientifically proven, serp, search results, first page,
top results, top ten, top 10, top-ranked, top ranked, competitor, competing recipe, seo,
ranking, scan the top, scroll through, our angle, the angle here, my angle here,
that's the angle
(« heal your » et « heal the body » sont couverts par « heal » — tout le processus de
recherche SERP est de l'entrée pour toi, jamais de la matière pour l'article. Formule
les manques comme des observations personnelles : « Most recipes I've tried… »,
« The mistake I keep seeing… ».)

### Règle du titre
Le titre doit utiliser le temps TOTAL (prep + cook), jamais le cookTime seul.
« 15-Minute Garlic Butter Chicken » est FAUX si le total est 23 minutes —
écris « 23-Minute » ou abandonne le chiffre. Préfère le descriptif au numérique
quand le total est irrégulier.

## §2 VOIX — LES 7 PATTERNS HUMAINS (utilise ≥5)

1. **Title → première phrase.** Jamais « This recipe is... » ou « Today I'm sharing... » — la première phrase EST le hook.
2. **Parenthèses = personnalité.** Les apartés chuchotent des détails — c'est là que le caractère vit.
3. **Tips signés.** « Chef Augustin's Tip: » avec le POURQUOI, pas seulement le quoi.
4. **Double visage des étapes.** `contentMarkdown` : récit narratif avec commentaires entre les blocs `### Step N`. `instructions[]` (JSON) : objets propres `{step, text, temperature, duration}` — zéro commentaire, une action par objet. Google lit le JSON, le lecteur lit le markdown, le gate scanne les deux. LES DEUX SONT OBLIGATOIRES et doivent raconter la même recette.
5. **Substitutions rassurantes.** Explique COMMENT compenser. Termine en disant que ça marchera quand même.
6. **Lignes de sagesse isolées.** Phrases uniques de vérité culinaire entre les sections. Sans titre, sans contexte.
7. **Clôture par une scène, pas une instruction.** Peins la table. JAMAIS « Enjoy! » ni « Bon appétit! ».

## §3 QUALITÉ D'ÉCRITURE

- **Attributions sourcées** (≥4) : citations à la première personne liées à des faits précis.
  « I've tested this with both stainless steel and cast iron. Cast iron wins because it holds 4× more heat. »
- **Answer Nuggets** (≥5 FAQ) : format `## Question spécifique ?` — chaque réponse 25-120 mots avec au moins un chiffre ou une entité nommée. Réparties entre les sections.
- **Précision** : chaque température en °F ET °C. Quantités volume + poids : « 1 cup (140g) flour ». Verbes de cuisine précis (sear/deglaze/reduce/braise — pas brown/add liquid/thicken). « Diamond Crystal kosher salt », pas « salt ».
- **Liens internes** : 0 lien, SAUF si le packet fournit un bloc `CANDIDATE LINKS` — alors utilise uniquement les slugs fournis au format `[anchor text](/recipes/slug)`. JAMAIS de lien inventé.
- **Cible : 1800-2200 mots** dans contentMarkdown. Si tu es sous 1800, développe la FAQ, la science culinaire, ou ajoute un tip. (Le seuil minimum de blocage est dynamique : 600 mots dessert, 800 mots si prep+cook ≤ 30 min, 1200 sinon — ne descends jamais sous le seuil.)

## §4 CONTRAT DE SORTIE — SCHÉMA EXACT (14 CHAMPS)

Sortie : un objet JSON valide commençant par `{`, terminant par `}`. Pas de fences markdown, pas de préambule.

| Champ | Contrainte |
|---|---|
| `title` | H1, keyword first |
| `metaTitle` | ≤60 chars, keyword first |
| `metaDescription` | 150-160 chars, actionable |
| `excerpt` | 1-2 phrases, hook |
| `contentMarkdown` | Article complet : titre en H1, sections en H2, FAQ en `## Question ?`. Marqueurs `[IMAGE: alt text]` à placer (1 au début) |
| `ingredients[]` | 8-15 items, format `"quantity name, notes"` |
| `instructions[]` | 6-12 objets `{step: number, text, duration?, temperature?}` — températures dans `text` ET `temperature` |
| `tags[]` | 4-8, lowercase (cuisine, technique, difficulté, occasion) |
| `prepTime` / `cookTime` / `totalTime` | Durées ISO 8601 (`PT15M`, `PT25M`, `PT40M`) |
| `servings` | `"2 servings"` |
| `difficulty` | `"Easy"` / `"Medium"` / `"Hard"` |
| `jsonLd` | Objet avec `@graph` : nœud `Recipe` (image `"<placeholder>"`, `recipeIngredient`, `recipeInstructions`, nœud `author`, objet `nutrition`), nœuds `BlogPosting`, `FAQPage`, `BreadcrumbList` |

`nutrition` (dans le nœud Recipe) : `{"@type": "NutritionInformation", "servingSize": "1 serving", "calories": "450 calories", "proteinContent": "32 g", "fatContent": "18 g", "carbohydrateContent": "41 g"}` — estimation réaliste depuis les quantités réelles, nombres entiers arrondis.

**Exclu du contrat** : slug, dates, image finale, content_type, catégorie — dérivés à la publication.

## §5 ANTI-TRUNCATION

Les sorties longues peuvent être coupées. Si ta réponse est incomplète, termine par `TRUNCATED` — l'utilisateur répondra « continue » et tu reprendras exactement là où tu t'es arrêté. Ne complète jamais en silence, n'abrège jamais un JSON en cours de route.
```

- [ ] **Step 2: Vérifier le contenu contractuel (assertions)**

```bash
cd /home/user/ai-blog-builder
grep -q "165°F / 74°C" gemini-kit/gemini-system-prompt.md
grep -q "pasteurized" gemini-kit/gemini-system-prompt.md
grep -q "top-ranked" gemini-kit/gemini-system-prompt.md   # liste union complète
grep -q "TRUNCATED" gemini-kit/gemini-system-prompt.md
grep -q "1800-2200" gemini-kit/gemini-system-prompt.md
grep -q "CANDIDATE LINKS" gemini-kit/gemini-system-prompt.md
grep -q "150-160 chars" gemini-kit/gemini-system-prompt.md
grep -c "| \`title\`" gemini-kit/gemini-system-prompt.md   # >= 1, tableau contrat présent
```
Toutes les commandes doivent retourner 0. Le fichier doit contenir les 14 champs du tableau (vérifier les 14 lignes `| \`champ\``).

- [ ] **Step 3: Commit**

```bash
git add gemini-kit/gemini-system-prompt.md
git commit -m "feat(gemini-kit): system prompt Chef Augustin pour Gemini (persona, contraintes, contrat 14 champs)"
```

---

### Task 2: `gemini-kit/gemini-stage-sequence.md`

**Files:**
- Create: `gemini-kit/gemini-stage-sequence.md`

**Interfaces:**
- Consumes: Task 1 (le system prompt), spec §5 + §7
- Produces: les 4 blocs copiables utilisés pendant la session AI Studio (consommés par l'utilisateur, puis par Task 3 pour le loop externe)

- [ ] **Step 1: Créer le fichier** avec la structure exacte :

```markdown
<!-- gemini-kit/gemini-stage-sequence.md -->
# Chef Augustin — Séquence d'étapes (Google AI Studio)

## Déroulé de session

1. Nouveau chat AI Studio → choisis le modèle Gemini (Pro si dispo, vérifier au pilot).
2. Colle le contenu de `gemini-system-prompt.md` comme premier message.
3. Colle le packet SERP (format ci-dessous) SUIVI du bloc Étape 1.
4. Continue avec les blocs Étape 2, 3, 4 selon les besoins.
5. Copie le JSON final et colle-le dans Claude Code pour la review.

## Format du packet SERP

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
<thème spécifique : mexicain, italien…>

## CANDIDATE LINKS (optionnel — fourni par Claude Code, jamais inventé)
- [anchor text](/recipes/slug)

---

## Étape 1 — Analyse SERP & angle

<colle le packet ici>

Agis maintenant comme un stratège SEO. Analyse les résultats ci-dessus :
que couvrent-ils, que manquent-ils, où sont-ils faibles (contenu mince,
absence de science culinaire, substitutions absentes, structure pauvre) ?
Identifie LA seule chose que le top 3 rate.

Réponds UNIQUEMENT au format suivant :

ANGLE: <la seule chose que le top 3 rate — formulée en observation de cuisine,
        jamais en langage SERP : « Most recipes I've tried… » / « The mistake I
        keep seeing… ». NE PAS écrire les mots bannis de la liste union.>
H1: <keyword first>
META TITLE: <≤60 chars>
META DESCRIPTION: <150-160 chars>
FAQ CANDIDATES: <5-7 questions>
H2 ROADMAP: <6-8 sections en ordre>

L'angle est un produit de travail — il ne doit JAMAIS apparaître tel quel dans
l'article final (mots bannis « angle », « SERP », « competitors » inclus).

## Étape 2 — Draft complet

<colle ce bloc après l'analyse>

Écris maintenant l'article complet selon le contrat de sortie du system prompt
(14 champs, 1800-2200 mots, dual output cohérent, températures USDA dans text ET
temperature, [IMAGE: alt text] au début du markdown, nutrition réaliste).
Réponds en JSON pur : commence par `{`, termine par `}`, pas de fences.
Si ta réponse est coupée, termine par `TRUNCATED` — l'utilisateur répondra « continue ».

## Étape 3 — Auto-audit (pré-filtre, sans corrections)

<colle ce bloc après le draft>

Deviens un auditeur de conformité strict et impartial. Audite le draft
précédent contre la checklist ci-dessous. NE CORRIGE RIEN : tu produis
uniquement le tableau d'audit. Pour chaque check, indique PASS ou FAIL
avec la preuve (champ, numéro d'étape, extrait court).

| # | Couche | Check |
|---|---|---|
| 1 | Gate | Food safety : températures USDA pour chaque protéine, dans text ET temperature |
| 2 | Gate | Word count : floor dynamique (600 dessert / 800 ≤30min / 1200 sinon) ET cible 1800-2200 — MARCHE « à vérifier par comptage externe » |
| 3 | Gate | Mots bannis (liste union complète du system prompt) |
| 4 | Gate | metaTitle ≤60 chars — MARCHE « à vérifier par comptage externe » |
| 5 | Gate | H2 ≥3 dans contentMarkdown |
| 6 | Gate | JSON-LD : nœud Recipe avec author |
| 7 | Gate | Répétition de tokens (« word word », « for two for two ») |
| 8 | Contrat | Les 14 champs présents, types corrects, ISO 8601 pour les durées |
| 9 | Contrat | metaDescription 150-160 chars — MARCHE « à vérifier par comptage externe » |
| 10 | Contrat | Cohérence dual output : instructions[] et contentMarkdown racontent la même recette |
| 11 | Éditorial | L'angle de l'Étape 1 est-il réellement livré dans l'article ? |
| 12 | Éditorial | FAQ ≥5 au format `## Question ?`, réponses 25-120 mots avec chiffres/entités |
| 13 | Éditorial | Nutrition présente et réaliste dans le nœud Recipe |
| 14 | Éditorial | Clôture par une scène, pas « Enjoy! » |

Format de sortie :

| Check | PASS/FAIL | Preuve |
|---|---|---|
| 1 | PASS | Step 4 text: "165°F / 74°C" |

Puis une section « FIXES REQUIS » listant uniquement les FAIL :
`#N <libellé check> — <localisation> — <correctif attendu>`

Rappel : les comptages exacts ne sont pas fiables par toi — marque-les
« à vérifier par comptage externe » et concentre-toi sur le structurel.

## Étape 4 — Correction

<colle ce bloc après l'audit>

Applique TOUTES les corrections de la section « FIXES REQUIS » de l'audit
précédent. Sors le JSON final complet et valide : commence par `{`, termine
par `}`, pas de fences, aucune règle du system prompt assouplie.
Si la sortie est coupée, termine par `TRUNCATED`.

## Règles de boucle

- **Loop interne** : après l'Étape 4, re-lance le bloc Étape 3. Max 2 passes.
  Si encore des FAIL après 2 passes, livre le JSON tel quel avec l'audit attaché.
- **Loop externe** : quand Claude Code renvoie un rapport de feedback (P0/P1/P2),
  colle-le dans le chat (la recette est déjà en contexte) et dis : « Applique ce
  feedback avec la logique de l'Étape 4 ». Max 3 retours — au-delà, le problème
  vient du kit, pas de la recette.
- **Réglages recommandés** (si l'UI le permet par génération) : Étape 1-2 à 0.8-0.9,
  Étape 3 à 0.2, Étape 4 à 0.5. Sinon 0.7 unique.
```

- [ ] **Step 2: Vérifier le contenu (assertions)**

```bash
cd /home/user/ai-blog-builder
grep -q "Étape 1" gemini-kit/gemini-stage-sequence.md && grep -q "Étape 4" gemini-kit/gemini-stage-sequence.md
grep -q "Max 2 passes" gemini-kit/gemini-stage-sequence.md
grep -q "Max 3 retours" gemini-kit/gemini-stage-sequence.md
grep -q "TRUNCATED" gemini-kit/gemini-stage-sequence.md
grep -q "CANDIDATE LINKS" gemini-kit/gemini-stage-sequence.md
# Le tableau d'audit contient exactement 14 checks numérotés 1-14
# (pattern isolé sur la colonne Couche — le pattern large compte aussi
#  l'exemple de sortie `| 1 | PASS | ...` du bloc Étape 3)
grep -cE '^\| [0-9]+ \| (Gate|Contrat|Éditorial) \|' gemini-kit/gemini-stage-sequence.md | xargs -I{} test {} -eq 14 && echo "14 checks OK"
```
Toutes les commandes doivent retourner 0.

- [ ] **Step 3: Commit**

```bash
git add gemini-kit/gemini-stage-sequence.md
git commit -m "feat(gemini-kit): séquence 4 étapes avec loop borné (14 checks, 3 couches)"
```

---

### Task 3: `gemini-kit/review-protocol.md`

**Files:**
- Create: `gemini-kit/review-protocol.md`

**Interfaces:**
- Consumes: Task 1 + Task 2, spec §8, `lib/quality-gate.ts` (lecture seule)
- Produces: le protocole exécuté par Claude Code à chaque recette (consommé par l'utilisateur qui colle la recette, et par Task 4 pour le seuil de publication)

- [ ] **Step 1: Créer le fichier** :

```markdown
<!-- gemini-kit/review-protocol.md -->
# Protocole de review — Claude Code (recette Gemini)

À chaque recette : l'utilisateur colle le JSON de Gemini (ou le sauve dans
`gemini-outputs/<slug>.json` à la racine du repo).

## 1. Validation mécanique (code = seule autorité)

1. Parse Zod : `RecipeArticleSchema.parse(json)` — 14 champs, types stricts.
2. Quality gate : `qualityGate(article)` — les 7 checks de `lib/quality-gate.ts`
   (food safety, word count, mots bannis, metaTitle ≤60, H2 ≥3, JSON-LD author,
   répétition tokens). IMPORT LECTURE SEULE — ne jamais modifier le fichier.
3. Slug unique : boucle slugify(keyword) + suffixe numérique contre `recipes`
   (même logique que `scripts/generate.ts`).
4. Comptages exacts : recalculer mot par mot (split /\s+/), metaTitle, metaDescription.

## 2. Audit sémantique (Claude)

- Voix/persona : ≥5 des 7 patterns humains, cohérence avec les 46 recettes existantes
- E-E-A-T : attributions sourcées ≥4, précision culinaire, zéro claim santé
- Cannibalisation : titre/synonymes proches d'une recette existante (requête DB)
- Liens internes : s'ils existent, chaque slug vérifié contre la DB ; 0 lien = OK
- Clôture en scène (jamais « Enjoy! »), FAQ qualitatives (25-120 mots,
  chiffres/entités), angle de l'Étape 1 réellement livré

## 3. Rapport de feedback (le livrable du loop)

Priorisation :
- **P0 — bloquant** : gate FAIL, violation schéma, claim santé, cannibalisation
  → retour Gemini OBLIGATOIRE
- **P1 — qualité** : voix, structure, angle faible → retour recommandé
- **P2 — nits** : optionnel

Format de chaque item :
`[P0] <check> — <localisation: champ/étape> — <observation> — <correctif attendu>`

RÈGLE ABSOLUE : le rapport est une instruction à Gemini. Claude ne réécrit
jamais le contenu de l'article (loop pur). Les observations citent des extraits
existants, les correctifs décrivent le changement attendu sans le rédiger.

Seuil PASS : gate code PASS + zéro P0 + ≤2 P1 (paramètre ajustable).

UX du loop : l'utilisateur colle SEULEMENT le rapport dans le chat AI Studio
(la recette est déjà en contexte) avec « Applique ce feedback avec la logique
de l'Étape 4 ». Max 3 retours — au-delà, améliorer le kit.

## 4. Traçabilité

- `gemini-outputs/<slug>.json` : le JSON de Gemini
- `gemini-outputs/<slug>-review.md` : le rapport de review
- Les échecs récurrents (même check FAIL 2+ fois) → mise à jour du system prompt
  ou de la séquence (seuls fichiers du kit qui évoluent)

## 5. Publication (après PASS)

Exécuter : `npx tsx scripts/import-gemini-recipe.ts "<keyword>" gemini-outputs/<slug>.json`
```

- [ ] **Step 2: Vérifier le contenu (assertions)**

```bash
cd /home/user/ai-blog-builder
grep -q "P0" gemini-kit/review-protocol.md && grep -q "P1" gemini-kit/review-protocol.md && grep -q "P2" gemini-kit/review-protocol.md
grep -q "loop pur" gemini-kit/review-protocol.md
grep -q "Max 3 retours" gemini-kit/review-protocol.md
grep -q "import-gemini-recipe.ts" gemini-kit/review-protocol.md
grep -q "RecipeArticleSchema" gemini-kit/review-protocol.md
```
Toutes les commandes doivent retourner 0.

- [ ] **Step 3: Commit**

```bash
git add gemini-kit/review-protocol.md
git commit -m "feat(gemini-kit): protocole de review Claude Code (gate lecture seule + audit + feedback P0/P1/P2)"
```

---

### Task 4: `scripts/import-gemini-recipe.ts`

**Files:**
- Create: `scripts/import-gemini-recipe.ts`

**Interfaces:**
- Consumes: `RecipeArticleSchema` (`lib/schemas/recipe-article.ts`), `qualityGate` (`lib/quality-gate.ts`), `recipeArticleToChefAugustinOutput` (`lib/pipeline/agents/chef-augustin`), `persistFinalDraft` (`lib/pipeline/steps/persist-phase`), `runImagePhase` (`lib/pipeline/steps/image-phase`), `db`/`recipes`/`eq` (lib/db), `slugify` (`lib/slug`)
- Produces: `npx tsx scripts/import-gemini-recipe.ts "<keyword>" <json-path> [--dry-run]` — publie une recette ou (en dry-run) la valide sans écrire en DB. Utilisé par le protocole de review (Task 3 §5) pour toute publication Gemini.

- [ ] **Step 1: Écrire le script**

```bash
mkdir -p gemini-outputs
```

Créer `scripts/import-gemini-recipe.ts` :

```typescript
// Import a Gemini-generated recipe JSON into the blog — standalone, disposable.
// Usage: npx tsx scripts/import-gemini-recipe.ts "<keyword>" <path-to-json> [--dry-run]
// Pattern: mirrors scripts/generate.ts (draft insert) + app/api/internal/regenerate-recipe/route.ts (gate → persist → image).
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  // Dynamic imports — ES modules hoist static imports before dotenv
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  const { slugify } = await import("../lib/slug")
  const { RecipeArticleSchema } = await import("../lib/schemas/recipe-article")
  const { qualityGate } = await import("../lib/quality-gate")
  const { recipeArticleToChefAugustinOutput } = await import("../lib/pipeline/agents/chef-augustin")
  const { persistFinalDraft } = await import("../lib/pipeline/steps/persist-phase")
  const { runImagePhase } = await import("../lib/pipeline/steps/image-phase")

  const keyword = process.argv[2]
  const jsonPath = process.argv[3]
  const dryRun = process.argv.includes("--dry-run")
  if (!keyword || !jsonPath) {
    console.log('Usage: npx tsx scripts/import-gemini-recipe.ts "<keyword>" <path-to-json> [--dry-run]')
    process.exit(1)
  }

  // ── 1. Read + parse Gemini output ────────────────────────────────
  const raw = fs.readFileSync(jsonPath, "utf-8")
  const article = RecipeArticleSchema.parse(JSON.parse(raw))
  console.log(`📄 "${article.title}" parsed (${(article.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length} words)`)

  // ── 2. Quality gate ──────────────────────────────────────────────
  const gateResult = await qualityGate(article)
  console.log(`🧪 Quality gate: ${gateResult.status}${gateResult.reason ? ` (${gateResult.reason})` : ""}`)
  if (gateResult.errors?.length) console.log(`   ${gateResult.errors.join("\n   ")}`)
  if (gateResult.status === "BLOCK") {
    console.log("❌ BLOCK — fixing the content in Gemini (Étape 4) is required. Nothing written.")
    process.exit(1)
  }

  if (dryRun) {
    console.log("✅ dry-run: schema + gate PASS — would insert & publish. No DB writes performed.")
    return
  }

  // ── 3. Create draft row (unique slug — same loop as generate.ts) ─
  const base = slugify(keyword) || "recette"
  let slug = base
  let suffix = 0
  while (true) {
    const existing = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, slug) })
    if (!existing) break
    slug = `${base}-${++suffix}`
  }
  const [created] = await db.insert(recipes).values({
    slug, keyword, title: article.title, status: "generating", workflowLog: [],
  }).returning({ id: recipes.id })
  const recipeId = created.id
  console.log(`📦 Draft #${recipeId} — slug: ${slug}`)

  // ── 4. Persist (sets status published/draft itself) ──────────────
  const legacy = recipeArticleToChefAugustinOutput(article)
  await persistFinalDraft(recipeId, legacy, gateResult.status as "PASS" | "BLOCK", false)

  // ── 5. Image (non-blocking, same as pipeline) ────────────────────
  try {
    const imageResult = await runImagePhase(recipeId, article, keyword)
    if (imageResult.heroImageUrl) {
      const persisted = await db.query.recipes.findFirst({
        where: (r, { eq }) => eq(r.id, recipeId),
        columns: { contentMarkdown: true },
      })
      const baseMd = persisted?.contentMarkdown ?? article.contentMarkdown
      const contentWithImages = baseMd.replace(
        /\[IMAGE:\s*(.+?)\]/g,
        (_: string, alt: string) => `<img src="${imageResult.heroImageUrl}" alt="${alt.trim()}" loading="lazy" />`,
      )
      await db.update(recipes).set({
        heroImageUrl: imageResult.heroImageUrl, contentMarkdown: contentWithImages, updatedAt: new Date(),
      }).where(eq(recipes.id, recipeId))
      console.log(`🖼️  Image: ${imageResult.heroImageUrl}`)
    }
  } catch (err) {
    console.warn(`⚠️  Image generation failed (non-blocking): ${(err as Error).message}`)
  }

  console.log(`✅ Published — Recipe #${recipeId} (${slug})`)
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
```

- [ ] **Step 2: Type-check**

```bash
cd /home/user/ai-blog-builder
npx tsc --noEmit
```
Attendu : exit 0, aucune erreur. (Si `workflowLog` ou un champ d'insert diffère du schéma DB, aligner sur `scripts/generate.ts:33`.)

- [ ] **Step 3: Test en dry-run avec un JSON de test (aucune écriture DB)**

Créer `gemini-outputs/_sample.json` avec un JSON valide minimal (réutiliser une recette existante exportée : récupérer le JSON d'une recette publiée — `npx tsx scripts/_export-one.ts <slug>` si le script existe, sinon copier manuellement le contenu d'une recette de la DB via la requête `select` — le but est un objet conforme aux 14 champs) puis :

```bash
npx tsx scripts/import-gemini-recipe.ts "sample keyword" gemini-outputs/_sample.json --dry-run
```
Attendu : `✅ dry-run: schema + gate PASS` (ou un BLOCK explicite si l'exemple viole le gate — dans ce cas corriger l'exemple). Aucune ligne ajoutée en DB (vérifier : `git status` ne montre que le fichier de test).

- [ ] **Step 4: Test de blocage (gate BLOCK → exit 1, rien écrit)**

Créer `gemini-outputs/_block-sample.json` : copier l'échantillon et insérer le mot « healthy » dans contentMarkdown. Puis :

```bash
npx tsx scripts/import-gemini-recipe.ts "sample keyword" gemini-outputs/_block-sample.json --dry-run
```
Attendu : exit 1, `❌ BLOCK — ... banned_words ...`. (Test du chemin de rejet sans risque.)

- [ ] **Step 5: Nettoyer les fichiers de test et commit**

```bash
rm gemini-outputs/_sample.json gemini-outputs/_block-sample.json
git add scripts/import-gemini-recipe.ts
git commit -m "feat(import): script autonome de publication d'une recette Gemini (dry-run, gate, persist, image)"
```

---

### Task 5: Vérification finale du kit

**Files:**
- Modify: aucun (vérification seulement)

**Interfaces:**
- Consumes: Tasks 1-4

- [ ] **Step 1: Vérifier que l'existant est intact**

```bash
cd /home/user/ai-blog-builder
git status --short
git diff --stat HEAD~4 2>/dev/null | head -10
```
Attendu : seuls `gemini-kit/`, `scripts/import-gemini-recipe.ts`, `gemini-outputs/` (dossier vide ou .gitkeep) apparaissent. **Aucun fichier du pipeline modifié** (`generate.ts`, `quality-gate.ts`, `chef-augustin-mega.md`, `lib/pipeline/*`).

- [ ] **Step 2: tsc final**

```bash
npx tsc --noEmit
```
Attendu : exit 0.

- [ ] **Step 3: Commit final si nécessaire** (ex. `.gitkeep` pour gemini-outputs/)

```bash
touch gemini-outputs/.gitkeep
git add gemini-outputs/.gitkeep
git commit -m "chore(gemini-kit): dossier gemini-outputs pour traçabilité des reviews"
```

---

### Task 6: Pilot — 1 recette réelle (acceptance, action utilisateur)

**Files:**
- Create: `gemini-outputs/<slug>.json`, `gemini-outputs/<slug>-review.md`

**Interfaces:**
- Consumes: Tasks 1-5, spec §10

- [ ] **Step 1: Préparation** — choisir 1 keyword de VAGUE 3 ; demander à Claude Code le packet complet (SERP via serper.dev par l'utilisateur + CUISINE CONTEXT + CANDIDATE LINKS)
- [ ] **Step 2: Session AI Studio** — coller le system prompt (Task 1), le packet + Étape 1, valider l'angle, Étape 2, Étape 3, Étape 4 (max 2 passes)
- [ ] **Step 3: Review** — coller le JSON ici ; exécuter le protocole (Task 3) ; rapporter P0/P1/P2 ; 0-3 retours loop externe
- [ ] **Step 4: Publication** — sur PASS : `npx tsx scripts/import-gemini-recipe.ts "<keyword>" gemini-outputs/<slug>.json`
- [ ] **Step 5: Validation finale** — critères de succès du spec §10 : publiée, qualité comparable à une top recette existante (comparaison côte à côte), zéro modification du pipeline (vérifier `git status`)
- [ ] **Step 6: Décision** — concluant → VAGUE 3 en volume via le kit ; sinon → Tokenmix reste le fallback et le kit est ajusté

---

## Self-review du plan (fait avant remise)

1. **Couverture spec** : §4 (livrables → Tasks 1-3 + 4), §5 (packet → Task 2), §6 (system prompt → Task 1), §7 (stages/loop → Task 2), §8 (review → Task 3), §9 (import → Task 4), §10 (pilot → Task 6), §11 (hors scope respecté : aucun outillage de review automatisé), §12 (points à vérifier au pilot → Task 6)
2. **Placeholders** : aucun TBD — le contenu contractuel (bannis, USDA, 14 champs, 14 checks) est verbatim dans les tâches
3. **Cohérence des types** : `RecipeArticleSchema.parse` (export vérifié ligne 8), `qualityGate(article)` (signature vérifiée), `recipeArticleToChefAugustinOutput(article)` (existant), `persistFinalDraft(recipeId, legacy, gateStatus, false)` (signature vérifiée), `runImagePhase(recipeId, article, keyword)` (signature vérifiée) — tous identiques entre tâches
