# Review — easy dinner recipes for two (2e recette Gemini Kit)

> Date : 17/08/2026 — Modèle : Gemini Pro — Session 5 messages, **1 loop externe** (P0 cannibalisation)
> JSON : `gemini-outputs/easy-dinner-recipes-for-two.json` (round 2 + 2 corrections pré-publication)

## Déroulé

- **Round 1 (draft poulet-tomate-riz)** : FAIL — P0 cannibalisation (plat dupliquant #96, niche saturée 13 recettes) + 3 P1 (title≠H1/sans keyword, métriques inventées, paragraphes >90) + 1 P2 (2871 mots). → retour Gemini.
- **Round 2 (garlic butter shrimp + zucchini)** : P0 résolu (plat distinct — les 3 recettes shrimp/zucchini/salmon publiées sont des orzo), title==H1 avec keyword, 0 métrique inventée, 1 seul paragraphe >90 (93 mots). **2 P1 restants corrigés mécaniquement avant publication** (métadonnées + référence fabriquée) :
  - metaDescription 140 → **157 chars** (contrat 150-160)
  - référence « a sheet-pan salmon recipe » (recette INEXISTANTE sur le blog) → lien réel `[salmon orzo for two](/recipes/salmon-orzo-with-dill-and-capers-for-two)` (markdown + jsonLd synchronisés)

## 1. Validation mécanique (round 2 final)

| Check | Résultat |
|---|---|
| Parse Zod | ✅ PASS |
| Quality gate | ✅ PASS |
| Slug unique | ✅ `easy-dinner-recipes-for-two` |
| metaTitle | ✅ 43 chars, keyword premier |
| metaDescription | ✅ 157 chars (150-160) |
| Word count | ✅ 2341 (floor 1200 ; cible 1800-2200 dépassée de +141 — P2 différé, même classe que le pilot) |
| H2 / FAQ | ✅ 14 H2 / 8 FAQ |
| Mots bannis | ✅ 0 |
| USDA | ✅ 145°F / 63°C (shrimp) step 3 text ET temperature |
| IMAGE | ✅ 1 au début |
| Liens | ✅ 1 lien (salmon orzo, réel vérifié DB) |
| Squelette corpus | ✅ (check 15 : étapes tôt, What Most Recipes Get Wrong, 3 tips, FAQ en dernier, scène) |
| Tags hubs | ✅ dinner for two, easy, one-pan, weeknight, small batch, date night |
| Excerpt ≠ 1re phrase | ✅ |
| title == H1 | ✅ « Easy Dinner Recipes for Two: 30-Minute Garlic Butter Shrimp » |

## 2. Audit sémantique

- **Les 5 leçons du kit tiennent** : squelette ✅, tags vocabulaire ✅, excerpt distinct ✅, zéro métrique inventée ✅ (les 4 patterns du round 1 ont disparu), scannabilité ~OK (1 paragraphe à 93 mots, toléré).
- Voix : hook (« The mistake I keep seeing… »), 3 tips signés avec POURQUOI, lignes de sagesse (« A perfectly timed pan sauce demands total presence… »), clôture en scène ✅.
- E-E-A-T : science exacte (Maillard, emulsification beurre-limon, 16/20 count shrimp), substitutions (frozen shrimp, medium shrimp, yellow squash), FAQ answer-first avec chiffres.
- « I have spent years analyzing why this happens » — claim credential flou (P2, persona backstory — pas un « 20 years » quantifié, toléré).

## 3. Verdict

**PASS** — gate PASS + 0 P0 + 2 P1 corrigés mécaniquement avant publication + 2 P2 différés (2341 mots, 93 mots/paragraphe). **Publiée : Recipe #111 `easy-dinner-recipes-for-two`** (image Ideogram V4).

## 4. Leçons pour le kit (à envisager)

1. **metaDescription** : le check Étape 3 #9 « à vérifier par comptage externe » a été raté par Gemini (140 < 150). Renforcer le system prompt §4 : « metaDescription 150-160 chars — compter précisément, 150 minimum ».
2. **Références fabriquées** : la FAQ citait une recette inexistante (« sheet-pan salmon »). Règle §3 à préciser : « JAMAIS de référence à une recette non fournie dans CANDIDATE LINKS — ni lien, ni mention de nom ».
3. **DISH BLACKLIST** (prévention cannibalisation) : ajouter au packet une section `## EXISTING DISHES` listant les plats déjà publiés (4-6 slugs/titres) pour éviter le round-1 coûteux. Claude Code la fournit.
