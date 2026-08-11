# Content Quality — Findings (seo-content)

Audit : www.chefaugustin.com — 2026-08-08
Échantillon : homepage, 4 recettes, 2 hubs, 1 index guides, 2 catégories, 1 cluster, about, privacy, + 4 pages de contrôle (catégories legacy, hub /recipes/).
Méthode : fetch_page.py / render_page.py (raw+auto) → extraction texte principal (nav/footer retirés), comptage mots, structure H1-H6, meta, JSON-LD.

## Score global : 72/100

- E-E-A-T : 68/100 (Expérience 16/20, Expertise 19/25, Autorité 9/25, Confiance 24/30)
- AI citation readiness : 78/100
- Les recettes (page type principale) sont fortes ; les pages de collection (hubs/clusters/catégories) tirent le score vers le bas.

---

## 1. E-E-A-T

### [Good] Recettes — signaux d'expérience et d'expertise solides
Preuve : 4 recettes échantillonnées (1505-2869 mots) avec technique précise — températures internes (165°F/74°C poulet, 145°F saumon), taille de poêle (10-inch skillet), anecdote première personne (« I keep one clipped to my apron — it's a $12 guarantee against overcooked fish »), sections « Why This Recipe Works », tips, storage/reheat, FAQ.
URLs : /recipes/salmon-orzo-with-dill-and-capers-for-two, /recipes/white-wine-lemon-chicken-orzo-for-two, /recipes/romantic-dinner-for-two-at-home (One-Pan Baked Ziti), /recipes/chocolate-chip-cookies-for-2.
Recommandation : maintenir ce niveau ; c'est le meilleur atout E-E-A-T du site.

### [Info] Persona transparent mais aucun auteur humain vérifiable
Preuve : /about (516 mots) déclare explicitement « Chef Augustin Lefèvre is the house persona of Easy Weeknight Dinners for Two ». Conforme à la règle « pas de fausses credentials » (transparence), mais aucun auteur humain réel, aucune bio photo ou crédit → pour Google, l'Expertise reste non vérifiable.
Recommandation : envisager un auteur/rédacteur réel (nom + profil LinkedIn/GitHub) en plus du persona, même un seul, pour les recettes clés.

### [Medium] Nutrition uniquement en JSON-LD, aucun disclaimer visible sur la page
Preuve : « NutritionInformation » présent dans le schema Recipe (640 calories, 32g fat… pour le saumon) mais 0 occurrence visible de « nutrition »/« calorie »/« disclaimer » dans le texte rendu des 4 recettes. Seul lien footer « Terms & Disclaimer ». Site food = YMYL : l'absence de mention nutritionnelle visible (et de disclaimer d'estimation) affaiblit la confiance.
URLs : toutes les /recipes/*.
Recommandation : ajouter une ligne visible type « Nutrition information is an estimate » près des temps de cuisson ou en pied d'article, sans en faire une section complète (politique AdSense du projet).

### [Info] Pas de date de publication visible sur hubs/catégories/clusters
Preuve : htmldate retombe sur des valeurs par défaut (cluster → 2015-01-01, hubs → 2025-01-01) alors que les recettes ont une vraie date (cookies → 2026-07-30). Les ~30 pages de collection n'exposent pas de date → signal fraîcheur absent.
Recommandation : ajouter datePublished/dateModified visibles sur hubs et clusters (le site est mis à jour en continu, c'est un atout).

---

## 2. Thin content

### [High] Catégories legacy quasi vides, toujours servies en 200
Preuve :
- /recipes/category/chicken-for-two : **63 mots** de contenu principal (« This chicken for two recipe is scaled for two people — tested at two-serving size… » + 1 card). robots `noindex, follow`, canonical self → page morte servie 200.
- /recipes/category/quick-dinner-for-two : **249 mots**, canonical → /recipes/category/quick mais `index, follow` (pas de noindex) → la version indexable est la plus pauvre des deux.
- /recipes/category/dessert : **138 mots**, toujours 200 (4 cards), hors sitemap.
Recommandation : 301 permanent vers la catégorie canonique (chicken-for-two → chicken, quick-dinner-for-two → quick, dessert → small-batch qui existe déjà) ; supprimer les liens internes vers ces URL. Vérifier les autres slugs legacy (-for-two) : même traitement.

### [Medium] Hubs (guides/idees) sous le plancher d'une page de fond
Preuve : /guides/easy-dinner-ideas-for-two = **705 mots** (dont ~40 titres de cards ; prose unique ≈ 150-200 mots) ; /idees/healthy-dinner-ideas-for-two = **585 mots** ; index /guides = **447 mots**. Plancher page « hub/collection » : 500-800.
Recommandation : enrichir chaque hub d'un contenu éditorial propre (150-250 mots de plus : critères de sélection, variations, erreurs à éviter) — les intros actuelles sont de bonne qualité, il faut les allonger, pas les réécrire.

### [Medium] Clusters : page à dominante grille de cards
Preuve : /recipes/cluster/one-pan-dinners-for-two = **272 mots** de contenu (intro de qualité : « 13 recipes, ~38 min avg », « 10-inch surface ») + 16 cards. Acceptable en page de collection, mais sous le plancher.
Recommandation : ajouter 1 section « technique » propre au thème (ex. ordre de cuisson one-pan) + 2-3 liens internes contextuels vers les recettes phares.

### [Info] Catégories canoniques au-dessus du plancher
Preuve : /recipes/category/chicken = 654 mots, 30 cards ; /recipes/category/quick = ~434 mots. OK.

---

## 3. Duplicate content

### [High] Même slug servi sous /recipes/ ET /guides/ ou /idees/ (13 paires dans le sitemap)
Preuve vérifiée : /recipes/easy-dinner-ideas-for-two (H1 « Easy Dinner Ideas for Two: One-Pan Garlic Butter Chicken with Tomato Orzo », recette, canonical self, index) vs /guides/easy-dinner-ideas-for-two (H1 « Easy Dinner Ideas for Two », hub, **aucun canonical**). Les deux sont dans le sitemap, indexables. Paires similaires listées au sitemap : simple-healthy-dinner-ideas, quick-and-easy-dinner-recipes, healthy-dinner-ideas, romantic-dinner-ideas, easy-meal-ideas, dinner-recipe-ideas, slow-cooker-recipes, crockpot-recipes, easy-recipes, recipes-for-two, fast-and-easy-dinner-for-2, easy-whole30-recipes (13 au total).
Impact : Google doit arbitrer entre recette et hub pour des requêtes quasi identiques (« easy dinner ideas for two ») ; crawl dupliqué, dilution.
Recommandation : soit renommer les slugs des hubs (/guides/easy-dinner-ideas-for-two → /guides/30-minute-dinner-ideas), soit ajouter canonical croisé ; dans tous les cas ajouter un canonical au hub /guides/easy-dinner-ideas-for-two (manquant).

### [Low] Meta descriptions à squelette identique sur catégories
Preuve : « Browse our collection of chicken for two recipes — tested, scaled for two, ready tonight. » vs « Browse our collection of quick recipes — tested, scaled for two, ready tonight. » (cat_chicken-for-two vs cat_quick-dinner-for-two). Hors ce pattern, les descriptions de l'échantillon sont uniques et bien écrites (140-160 chars).
Recommandation : réécrire les descriptions des catégories restantes sur le modèle des bonnes intros (angle + bénéfice).

### [Info] Chevauchement des grilles de cards entre collections
Preuve : Easy Whole30 Chicken Skillet et Salmon Orzo apparaissent dans hub1, hub2, cluster et cat_quick. Normal pour du maillage, mais 5 pages listant les mêmes cards en tête affaiblit la différenciation sémantique.
Recommandation : varier l'ordre/la sélection par collection (recettes les plus pertinentes au thème d'abord).

---

## 4. Lisibilité

### [Good] Recettes : phrases courtes, structure H1/H2/H3 saine
Preuve : avg 17.8-19.6 mots/phrase ; 15-26 phrases >25 mots sur 72-135 (≈20%) ; H1 unique + 12-15 H2 + H3.

### [Low] Homepage : phrases longues
Preuve : avg **26.4 mots/phrase**, 18/46 phrases (39%) >25 mots (H2 x7, H3 x16 — structure OK).
Recommandation : raccourcir 4-5 phrases d'intro.

### [Medium] Hiérarchie H2/H3 des pages de collection
Preuve : hubs : **1 H2 + 35-41 H3** (chaque titre de card est un H3 non groupé) ; catégories : 2 H2 + 14 H3 ; cluster : 3 H2 + 16 H3. Les intros des hubs forment un seul bloc de ~150-250 mots (moyenne « phrase » mesurée à 176-195 mots = paragraphe monolithique).
Recommandation : grouper les cards sous des H2 thématiques (ex. « One-pan favorites », « 30-minute pastas »), et découper les intros en 2-3 paragraphes.

---

## 5. AI citation readiness

### [Good] Recettes très citables (AI Overviews / GEO)
Preuve : FAQ auto-suffisantes (« How can I tell when the salmon is done without a thermometer? » → réponse directe 145°F + test du doigt), intro répond à la requête dès le premier paragraphe (« Why This Recipe Works »), JSON-LD Recipe + FAQPage + BreadcrumbList (domaine réel vérifié), nutrition 5 champs, réponses de 60-90 mots extractibles telles quelles.
Score citation recettes : 8.5/10.

### [Medium] FAQ possiblement « synthétiques » — provenance à vérifier
Preuve : log de pipeline embarqué dans le HTML des recettes : « No PAA questions — using 8 synthetic fallbacks » (SERP agent). Les questions FAQ peuvent ne pas refléter de vraies People-Also-Ask.
Recommandation : auditer la précision des Q/R FAQ existantes ; sur les prochaines générations, alimenter les FAQ depuis de vraies données SERP quand disponibles.

### [Info] Artefacts de pipeline exposés dans le HTML
Preuve : le HTML des 4 recettes embarque le workflowLog complet (agents « SERP », « MegaSkill », « QualityGate PASS — 2448 words », « SeoGate error: 5 warning(s)… score: 75 », « Opus 4.8 mega-skill », horodatages) dans un script d'hydratation ; contient aussi un BreadcrumbList de test en example.com (le breadcrumb live, lui, utilise chefaugustin.com — vérifié). Invisible à l'écran, mais lisible dans la source → empreinte « généré par IA » traçable.
Recommandation : ne pas sérialiser le workflowLog dans le HTML client (le garder côté base de données), ou le masquer derrière un flag de dev.

### [Good] Intros de hubs/clusters citables
Preuve : stats concrètes (« 13 recipes, ~38 min avg », « 25-minute one-pan garlic herb chicken ») et promesses précises (10-inch skillet) → bons candidats extraits par les LLM.

---

## Recommandations prioritaires (ordre d'impact)

1. **301 des catégories legacy** (-for-two, dessert) vers les canoniques + supprimer liens internes [High]
2. **Dédoublonner les 13 paires /recipes/<slug> vs /guides|/idees/<slug>** (renommage ou canonical, ajouter le canonical manquant sur le hub) [High]
3. **Enrichir hubs (585-705 mots) et clusters (272 mots)** de 150-250 mots éditoriaux chacun [Medium]
4. **Disclaimer nutrition visible sur les recettes** (une ligne, YMYL) [Medium]
5. **Hiérarchie H2 sur les pages de collection** + découpage des intros [Medium]
6. **Nettoyer le workflowLog du HTML client** [Info]
