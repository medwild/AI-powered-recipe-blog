# Sitemap / Robots.txt — Findings (audit 2026-08-08)

Source : `https://www.chefaugustin.com/sitemap.xml` (curl + parse python3.12, 18 006 octets), `robots.txt`, comparaison avec `https://www.chefaugustin.com/api/recipes/pins` (46 recettes), crawl de 19 pages internes (home, /recipes, 13 recettes, 2 guides, 1 catégorie, 1 cluster).

## État global
- **96 URLs** dans le sitemap : 46 recettes, 21 hubs (15 /guides + 6 /idees), 16 catégories, 6 clusters, 6 pages statiques (/ , /recipes, /about, /privacy, /terms, /guides, /idees — 7 dont 1 home). XML bien formé, URLs absolues sans slash final, 0 doublon.
- **96/96 HTTP 200** (crawl 08/08 + re-spot-check 11 URLs aujourd'hui : 200 partout, 0 redirect, 0 404, 0 noindex).
- Limites respectées : 96 URLs << 50 000 et << 50 MB. Pas de `news:` sitemap (N/A). Sitemap unique, pas d'index nécessaire.
- GSC : soumis 05/08, 0 erreur / 0 warning — cohérent.

## Validation positive (à conserver)
- **Couverture recettes : 46/46 = 46/46 (match exact)** — aucun slug manquant, aucun extra. Les 46 slugs du sitemap correspondent 1:1 aux slugs de `/api/recipes/pins`. Tableau ci-dessous.
- **lastmod des recettes : réels et frais** (issus DB, format W3C datetime valide) : 1× 2026-08-08, 40× 2026-08-05, 5× 2026-07-30. Le slug `romantic-dinner-for-two-at-home` (fix DB 17→14 du 07/08) est bien à jour (08-08T13:16).
- **robots.txt** : `Sitemap: https://www.chefaugustin.com/sitemap.xml` déclaré ✓ ; `Disallow: /dashboard` et `/api/` pertinents (le endpoint `/api/recipes/pins` est bien bloqué) ; `Allow: /` pour les bots majeurs (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot).
- **Qualité hubs** (4 mesurés : easy-carnivore-recipes ~598 mots, easy-ibs-dinner-recipes ~561, healthy-dinner-ideas-for-two ~585, recipes-for-two ~592) : contenu unique > 200 mots, pas de noindex, pas de duplicate. 0 page location → gates location N/A.

---

## [Sévérité: Medium] 16/21 hubs liés uniquement depuis leur page index — silo recette→hub quasi absent
- Preuve : sur 13 recettes échantillonnées, seules **5 hubs distincts** reçoivent un lien depuis une recette (`/guides/easy-dinner-ideas-for-two`, `/guides/easy-whole30-recipes`, `/guides/recipes-for-two`, `/guides/slow-cooker-recipes-for-two`, `/idees/romantic-dinner-ideas-for-two`). Les 16 autres (10 guides : baking-for-2, crockpot-recipes-for-two, easy-carnivore-recipes, easy-ibs-dinner-recipes, easy-lactose-free-dinner-recipes, easy-low-fodmap-recipes, easy-meals-for-beginners, easy-recipes-for-two, fast-and-easy-dinner-for-2, quick-and-easy-dinner-recipes-for-two ; 6 idees : dinner-recipe-ideas-for-two, dinner-recipes-for-two, easy-meal-ideas-for-two, easy-to-cook-dinner-for-two, healthy-dinner-ideas-for-two, simple-healthy-dinner-ideas-for-two) ne sont liées que depuis `/guides` (14/21) et `/idees` (7/21).
- Contexte : pas d'orphelines stricto sensu (toutes les URLs sont atteignables en ≤2 clics depuis la home via les index), mais le flux inverse hub→recette est massif (une page hub lie ~40 recettes) alors que recette→hub est quasi nul : l'autorité circule mal vers les hubs, qui sont pourtant les pages cibles des clusters (priorité 0.7).
- Recommandation : ajouter 1 lien contextuel vers le hub pertinent dans l'intro ou l'outro de chaque recette (ex. « More easy dinner ideas for two → hub »). Vérifier aussi que les hubs se lient entre eux (actuellement 0 lien hub↔hub ; seul `/guides/easy-recipes-for-two` a été crawlé : 40 liens, tous vers des recettes).

## [Sévérité: Low] lastmod artificiel sur 50/96 URLs (timestamp de génération du sitemap)
- Preuve : 50 URLs partagent exactement `2026-08-08T14:11:02.310Z` : home, /recipes, /about, /privacy, /terms, /guides, /idees, les 16 catégories, les 6 clusters, les 21 hubs. C'est l'heure de build du sitemap (syncedAt de l'API : 14:11:03), pas une vraie date de modification (ex. /about n'a pas changé le 08/08 à 14:11:02.310Z).
- Risque : Google peut dévaloriser les lastmod non fiables, et chaque build « bouge » 50 URLs → bruit de re-crawl inutile.
- Recommandation : utiliser des dates réelles (updatedAt DB, hash de contenu) pour hubs/catégories/clusters, et omettre lastmod pour les pages statiques (/about, /privacy, /terms) — ou au minimum sortir la date de génération.

## [Sévérité: Info] changefreq/priority présents sur 96/96 URLs — tags dépréciés
- Preuve : `changefreq` sur 100 % (daily 2, weekly 91, monthly 3), `priority` sur 100 % (1.0 home → 0.5 legal). Google ignore ces deux tags depuis 2023.
- Hiérarchie des valeurs cohérente (home 1.0 > /recipes 0.9 > recettes 0.8 > hubs/clusters 0.7 > catégories 0.6 > legal 0.5) — donc harmless, suppression possible à l'occasion.

## [Sévérité: Info] /contact absent du sitemap mais indexable et lié dans le nav partout
- Preuve : `/contact` → HTTP 200, lié depuis les 4 pages crawlees (nav), pas de noindex, absent du sitemap.
- Recommandation : choix à faire — l'ajouter au sitemap (1 URL) ou le noindexer ; l'état actuel (lié + indexable + hors sitemap) est incohérent, faible impact.

## [Sévérité: Info] robots.txt : `Allow: /api/recipes/raw` ouvre un endpoint JSON brut aux crawlers
- Preuve : `User-Agent: *` → `Allow: /api/recipes/raw` après `Disallow: /api/` (la règle la plus spécifique gagne : l'endpoint est crawlable). `/api/recipes/pins` reste bien bloqué.
- Recommandation : vérifier que l'exposition de ce raw JSON est intentionnelle (app Gemini/consommation externe) ; sinon retirer la ligne.

---

## Tableau des 46 slugs recettes vs sitemap (match exact 46/46)

| # | Slug | Dans sitemap | HTTP |
|---|------|:---:|:---:|
| 1 | 2-qt-slow-cooker-recipes | ✅ | 200 |
| 2 | chicken-dinner-for-two | ✅ | 200 |
| 3 | chicken-pot-pie-for-2 | ✅ | 200 |
| 4 | chocolate-chip-cookies-for-2 | ✅ | 200 |
| 5 | chocolate-lava-cakes-for-two | ✅ | 200 |
| 6 | cooking-for-two | ✅ | 200 |
| 7 | creamy-mashed-potatoes-for-two | ✅ | 200 |
| 8 | creamy-parmesan-garlic-chicken-orzo-for-two | ✅ | 200 |
| 9 | crockpot-recipes-for-two | ✅ | 200 |
| 10 | dessert-for-2 | ✅ | 200 |
| 11 | dinner-recipe-ideas-for-two | ✅ | 200 |
| 12 | easter-dinner-for-two | ✅ | 200 |
| 13 | easy-4-ingredient-chicken-breast-recipes | ✅ | 200 |
| 14 | easy-and-healthy-dinner-recipes-for-two | ✅ | 200 |
| 15 | easy-beef-ramen-noodle-recipes | ✅ | 200 |
| 16 | easy-chicken-dinners-for-two | ✅ | 200 |
| 17 | easy-chicken-rice-bowls-for-two | ✅ | 200 |
| 18 | easy-chili-colorado-recipe | ✅ | 200 |
| 19 | easy-dinner-ideas-for-two | ✅ | 200 |
| 20 | easy-lasagna-recipe | ✅ | 200 |
| 21 | easy-meal-ideas-for-two | ✅ | 200 |
| 22 | easy-meal-recipes-for-2 | ✅ | 200 |
| 23 | easy-mexican-dinner-recipes | ✅ | 200 |
| 24 | easy-recipes-for-two | ✅ | 200 |
| 25 | easy-slow-cooker-pasta-recipes | ✅ | 200 |
| 26 | easy-to-make-asian-food-recipes | ✅ | 200 |
| 27 | easy-week-of-meals | ✅ | 200 |
| 28 | easy-whole30-recipes | ✅ | 200 |
| 29 | edible-cookie-dough-recipe-for-2 | ✅ | 200 |
| 30 | fast-and-easy-dinner-for-2 | ✅ | 200 |
| 31 | garlic-shrimp-orzo-with-cherry-tomatoes-for-two | ✅ | 200 |
| 32 | healthy-dinner-ideas-for-two | ✅ | 200 |
| 33 | mac-and-cheese-for-2 | ✅ | 200 |
| 34 | mediterranean-chicken-orzo-with-feta-olives-for-two | ✅ | 200 |
| 35 | quick-and-easy-dinner-recipes-for-two | ✅ | 200 |
| 36 | quick-recipes-for-two-for-dinner | ✅ | 200 |
| 37 | recipes-for-two | ✅ | 200 |
| 38 | romantic-dinner-for-two-at-home | ✅ | 200 |
| 39 | romantic-dinner-ideas-for-two | ✅ | 200 |
| 40 | salmon-orzo-with-dill-and-capers-for-two | ✅ | 200 |
| 41 | simple-healthy-dinner-ideas-for-two | ✅ | 200 |
| 42 | slow-cooker-recipes-for-two | ✅ | 200 |
| 43 | steak-dinner-ideas-for-2 | ✅ | 200 |
| 44 | summer-herb-chicken-orzo-with-zucchini-for-two | ✅ | 200 |
| 45 | thanksgiving-dinner-for-two | ✅ | 200 |
| 46 | white-wine-lemon-chicken-orzo-for-two | ✅ | 200 |

Manquants : 0. Extras : 0.
