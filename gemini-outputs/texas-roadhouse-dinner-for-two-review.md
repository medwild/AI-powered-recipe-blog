# Review — texas roadhouse dinner for two (pilot Gemini Kit)

> Date : 17/08/2026 — Modèle AI Studio : à confirmer (utilisateur) — Session 5 messages selon `gemini-kit/texas-roadhouse-dinner-for-two.md`
> JSON : `gemini-outputs/texas-roadhouse-dinner-for-two.json`

## 1. Validation mécanique (code = seule autorité)

| Check | Résultat |
|---|---|
| Parse Zod (14 champs) | ✅ PASS (dry-run `import-gemini-recipe.ts`) |
| Quality gate (7 checks) | ✅ **PASS** |
| Slug unique | ✅ `texas-roadhouse-dinner-for-two` — 0 ligne DB (vérifié avant) |
| metaTitle | ✅ 54 ≤ 60 chars — « 45-Minute Texas Roadhouse Dinner for Two: Steak Recipe » |
| metaDescription | ✅ 155 chars (150-160) |
| Word count | ✅ 2347 mots — floor 1200 dépassé ; cible 1800-2200 dépassée de +147 (P2, non bloquant) |
| H2 | ✅ 14 ≥ 3 (6 sections + 7 FAQ + intro) |
| FAQ | ✅ 7 ≥ 5, réponses 25-120 mots avec chiffres/entités |
| Mots bannis | ✅ 0 trouvé (scan liste union complète, JSON entier) |
| Répétition tokens | ✅ aucune (« word word ») |
| IMAGE marker | ✅ 1 au début |
| USDA | ✅ step 5 : 145°F / 63°C dans text ET temperature (« pull at 130°F for medium-rare » = pattern contractuel) |
| Liens internes | ✅ exactement les 2 CANDIDATE LINKS (vérifiés publiés en DB) |
| jsonLd | ✅ 4 nœuds : Recipe (author, nutrition 780 cal / 48g / 52g / 30g — entiers, réaliste pour 8oz sirloin + beurre + pain) + BlogPosting + FAQPage (7 Q) + BreadcrumbList |
| Placeholders | ✅ non publiés : image `<placeholder>` → heroImageUrl au rendu (`app/recipes/[slug]/page.tsx:121`) ; BreadcrumbList `example.com` → nœud ignoré au rendu (Breadcrumbs émis globalement) |

## 2. Audit sémantique

- **Patterns humains : 7/7** ✅ — hook première phrase (« The unmistakable aroma of rendered beef fat… »), parenthèses de caractère (2), tip signé (Chef Augustin's Tip — never press down on a steak), dual output cohérent (6 étapes identiques markdown/JSON), substitutions rassurantes (sirloin→NY strip avec technique du fat cap, honey→maple/agave, « it will work beautifully »), lignes de sagesse isolées (2), clôture en scène (« Two forks, one sharp knife, and a quiet, unhurried evening ahead. »)
- **Attributions sourcées : 5** ✅ — cast iron 4× heat, Diamond Crystal 10g vs table salt 19g, butterfats seize at 60°F (15°C), 5% surface water loss, préférence achat 16oz partagée
- **E-E-A-T / exactitude** ✅ — science culinaire précise (Maillard >285°F/140°C, smoke points, thermal mass) ; zéro claim santé ; température exacte Diamond Crystal 10g/tbsp (factuel)
- **Cannibalisation** : proche de `steak-dinner-ideas-for-2` (Pan-Seared Steak Dinner for Two) mais keyword ≠ (« texas roadhouse… » vs « steak dinner ideas »), angle ≠ (copycat roadhouse vs technique pan-seared) → non bloquant (P2, lien interne déjà en place)
- **Angle livré** : l'article est intégralement « recréer l'expérience roadhouse à la maison » — le gap identifié au SERP (0 résultat recette, 100% transactionnel). Vérifié par cohérence (le verbatim de l'Étape 1 n'a pas été fourni — P2 process)
- **Règle du titre** ✅ : « 45-Minute » = totalTime PT45M (pas cookTime seul)
- **Cohérence existante** : cohérent avec les 46 recettes (format, longueur, structure FAQ, [IMAGE:])

## 3. Rapport de feedback (format protocole)

**VERDICT : PASS** — gate code PASS + 0 P0 + 1 P1 (format, corrigé mécaniquement, sans retour Gemini nécessaire) + 3 P2 → **publication**

- [P1] Contrat §4 (format) — sortie — Le JSON est sorti enveloppé dans un tableau `[{...}]` au lieu d'un objet nu « commence par {, termine par } ». Corrigé localement (extraction mécanique, contenu intact). Pour les prochaines sessions : s'assurer que la copie depuis AI Studio ne garde pas les crochets, sinon re-demander via Étape 4.
- [P2] Word count — contentMarkdown — 2347 mots, cible 1800-2200 dépassée de +147. Non bloquant (le gate n'a pas de plafond). Ne rien faire ; à surveiller si ça se reproduit sur les recettes suivantes.
- [P2] Cannibalisation douce — title/tags — « 45-Minute Texas Roadhouse Dinner for Two » vs « Pan-Seared Steak Dinner for Two » existante : même public « steak dinner for two », angles distincts. Surveiller le rang des deux ; le lien interne mutuel est en place.
- [P2] Process — Étape 1 — Le verbatim de l'angle (sortie Étape 1) n'a pas été joint au JSON. Pour les prochaines sessions : copier aussi la sortie de l'Étape 1 dans la review (check 11 par comparaison directe).
