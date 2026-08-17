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
5. Scan manuel de la liste union complète du system prompt (le gate ne couvre qu'un
   sous-ensemble — ex. "healthy" n'y est pas).

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
