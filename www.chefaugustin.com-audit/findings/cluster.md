# Cluster / Architecture hub-and-spoke — Findings (audit 2026-08-08)

Méthode : `curl -s` (HTTP status + HTML) + comptage `grep -o 'href="/recipes/[^"]*"' | sort -u` sur 6 clusters, 4 catégories, 3 recettes échantillon, sitemap.xml (96 URLs, 46 recettes). Toutes les requêtes passent par le CDN (HTTP 200 avec HTML plein).

## Inventaire vérifié

| Cluster hub | HTTP | Liens /recipes/ uniques | dont recettes | dont autres hubs |
|---|---|---|---|---|
| /recipes/cluster/chicken-dinners-for-two | 200 | 42 | 23 | 19 hubs |
| /recipes/cluster/one-pan-dinners-for-two | 200 | 32 | 13 | 16 hubs |
| /recipes/cluster/quick-healthy-dinners | 200 | 21 | 2 | 16 hubs |
| /recipes/cluster/asian-inspired-dinners | 200 | 20 | 1 | 16 hubs |
| /recipes/cluster/budget-meals-for-two | 200 | 20 | 1 | 16 hubs |
| /recipes/cluster/small-batch-slow-cooker | 200 | 20 | 1 | 16 hubs |

Catégories (16 dans le sitemap) : chicken, chicken-breast, comfort-food, date-night, dinner-for-two, easy, ground-beef, one-pan, orzo, pasta, quick, rice, slow-cooker, small-batch, weeknight, weeknight-dinner.

## Validation positive (à conserver)
- Les 6 pages cluster existent (HTTP 200) et sont indexables (présentes dans le sitemap).
- Retour spoke→hub : 3/3 recettes échantillonnées lient vers leur cluster (chicken-dinner-for-two, chicken-pot-pie-for-2, creamy-parmesan-garlic-chicken-orzo-for-two → toutes `href="/recipes/cluster/chicken-dinners-for-two"`). La direction hub↔spoke est saine.
- Cluster pages sans ItemList JSON-LD : déjà signalé par schema.md, confirmé ici (seul BreadcrumbList).

---

## [Sévérité: High] Cannibalisation category/chicken vs cluster/chicken-dinners-for-two (39/39 recettes identiques)
- URLs : https://www.chefaugustin.com/recipes/category/chicken vs https://www.chefaugustin.com/recipes/cluster/chicken-dinners-for-two
- Preuve : 39 recettes liées par le cluster, 46 par la catégorie — **39/39 identiques** (overlap 100%, `comm -12`). La catégorie est un sur-ensemble strict du cluster. Titres quasi identiques : `<title>Chicken Recipes for Two` vs `<title>Chicken Dinners for Two` (même H1 modulo 2 mots). Les deux pages sont indexées (sitemap).
- Contexte : deux URLs en concurrence pour le même intent GSC émergent "chicken dinners for two" — Google doit choisir entre deux pages au contenu identique → dilution du link equity (42 vs 46 liens internes) et CTR partagé.
- Recommandation : garder UNE page. Soit la catégorie devient la page canonique (elle a plus de recettes), soit le cluster (URL alignée sur l'intent de requête). 301 de l'autre + consolidation des liens internes entrants. Le cluster doit rester le pilier : y ajouter les 7 recettes manquantes (easy-chicken-rice-bowls-for-two, easy-whole30-recipes, etc.) pour le rendre strictement supérieur en contenu, puis 301 la catégorie vers le cluster.

## [Sévérité: High] Cannibalisation category/one-pan vs cluster/one-pan-dinners-for-two (28/29 recettes identiques)
- URLs : https://www.chefaugustin.com/recipes/category/one-pan vs https://www.chefaugustin.com/recipes/cluster/one-pan-dinners-for-two
- Preuve : cluster 29 recettes, catégorie 47, overlap **28/29** (96%). Titres : "One-Pan Recipes for Two" vs "One-Pan Dinners for Two".
- Recommandation : même traitement que chicken — une seule page indexée. Note : la catégorie apporte 19 recettes supplémentaires utiles à l'intent "skillet/one-pan" ; les fusionner côté pilier puis 301.

## [Sévérité: High] Gap couverture "vegetarian meals for two" (requête GSC émergente) — 0 page
- URLs testées : /recipes/category/vegetarian → **HTTP 308** vers /recipes/category/easy ; /recipes/cluster/vegetarian → **HTTP 404** ; sitemap : **0 URL** contenant vegetarian/vegan.
- Preuve : `grep -icE 'veget|vegan'` sur les 96 loc = 0. L'intent émergent n'a ni pilier, ni catégorie, ni recette.
- Contexte : requête émergente GSC non couverte — le redirect vers "easy" fait perdre la sémantique (un utilisateur qui cherche "vegetarian meals for two" atterrit sur une page générique "Easy Recipes for Two").
- Recommandation : créer le cluster `/recipes/cluster/vegetarian-dinners-for-two` (pilier) + catégorie `/recipes/category/vegetarian` (avec vrai contenu, pas un redirect) + 4-6 recettes végétariennes pour deux (les hubs whole30 existants peuvent en fournir 2-3). Priorité haute : requête déjà émergente.

## [Sévérité: Medium] 4 clusters sur 6 sont des coquilles : 1-2 spokes directes seulement
- URLs : /recipes/cluster/asian-inspired-dinners (1 membre), /recipes/cluster/budget-meals-for-two (1), /recipes/cluster/quick-healthy-dinners (2), /recipes/cluster/small-batch-slow-cooker (1)
- Preuve : composition des liens — ces pages lient 16 catégories (nav) + 3 clusters (cross-link) + 1-2 pages de contenu. Les "membres" sont eux-mêmes des hubs/guides, pas des recettes : asian-inspired → easy-to-make-asian-food-recipes (guide, 6 recettes), budget → easy-meal-ideas-for-two (guide, 8 recettes), slow-cooker → crockpot-recipes-for-two (guide, 6 recettes).
- Contexte : chaîne cluster → guide → recettes (profondeur 2). Un pilier hub-and-spoke doit lister directement ses spokes : le PageRank passe par un nœud intermédiaire, et la page cluster n'offre quasiment pas de contenu propre à l'intent (ex. "budget meals for two" sans liste de recettes budget).
- Recommandation : ajouter 4-8 liens directs vers les recettes membres sur chaque cluster (les guides existants listent déjà les slugs à reprendre), + ajouter un ItemList JSON-LD (voir schema.md).

## [Sévérité: Medium] Mismatch thématique dans quick-healthy-dinners : desserts dans un cluster de dîners healthy
- URL : https://www.chefaugustin.com/recipes/cluster/quick-healthy-dinners
- Preuve : les 2 seuls membres sont `dessert-for-2` et `edible-cookie-dough-recipe-for-2` — des desserts, pas des dîners rapides healthy. Aucune recette de dîner healthy n'est liée directement.
- Contexte : le hub lié (dessert-for-2, 6 recettes) est lui-même hors-sujet pour "quick healthy dinners" ; l'intent de la requête GSC émergente est partiellement traité par le guide /guides/quick-and-easy-dinner-recipes-for-two, mais le cluster ne le référence pas.
- Recommandation : retirer les 2 membres dessert, lier le cluster aux vraies recettes healthy rapides (ex. celles du guide quick-and-easy) et au guide lui-même.

## [Sévérité: Medium] Doublon de catégories weeknight vs weeknight-dinner (sous-ensemble strict)
- URLs : /recipes/category/weeknight (30 recettes) vs /recipes/category/weeknight-dinner (11 recettes)
- Preuve : overlap **11/11** — weeknight-dinner est un sous-ensemble strict de weeknight (100%). Deux URLs indexées pour le même intent.
- Recommandation : 301 /recipes/category/weeknight-dinner → /recipes/category/weeknight.

## [Sévérité: Medium] Intent "mexican meals for two" (émergent GSC) : 1 hub isolé, pas de pilier
- URLs : /recipes/easy-mexican-dinner-recipes (HTTP 200, 9 recettes) ; /recipes/cluster/mexican → **404** ; /recipes/category/mexican → **308** vers easy.
- Preuve : 1 seule URL du sitemap contient "mexican". Le hub existe et a 9 recettes, mais il n'est ni cluster ni catégorie, et n'apparaît pas dans la nav catégorie.
- Recommandation : promouvoir en cluster `/recipes/cluster/mexican-dinners-for-two` (même gabarit que les autres piliers), ou créer la catégorie /recipes/category/mexican avec les 9 recettes + redirect du hub si fusion.

## [Sévérité: Low] Intent "skillet recipes" non couvert directement (redirect vers one-pan)
- URL : /recipes/category/skillet → **HTTP 308** vers /recipes/category/one-pan.
- Preuve : pas de page "skillet" dans le sitemap ; l'intent émergent GSC est absorbé par one-pan.
- Contexte : "skillet" et "one-pan" sont proches sémantiquement — le redirect est acceptable, mais le H1 "One-Pan Recipes for Two" ne matche pas le terme "skillet" de la requête. Suggestion : titre "One-Pan & Skillet Recipes for Two" pour capturer les deux formulations.
- Recommandation : retitrer la catégorie one-pan pour inclure "skillet" (pas de nouvelle page nécessaire).

## [Sévérité: Low] Redirects 308 category/vegetarian et category/mexican → category/easy : perte de sémantique
- URLs : /recipes/category/vegetarian → /recipes/category/easy ; /recipes/category/mexican → /recipes/category/easy
- Preuve : les deux requêtes émergentes GSC (vegetarian, mexican) redirigent vers une page catch-all "Easy Recipes for Two" (60 liens recettes). Aucune correspondance sémantique.
- Recommandation : remplacer ces 308 par de vraies pages (voir gaps ci-dessus) ou, à défaut, les désindexer (noindex) pour ne pas gaspiller le crawl budget sur un redirect non sémantique.

---

## Recommandations consolidées (priorité)

1. **P0 — Résoudre la cannibalisation** : 2 paires catégorie/cluster au contenu identique (chicken 39/39, one-pan 28/29) + doublon weeknight/weeknight-dinner (11/11). Garder le cluster (intent-aligned), fusionner le contenu de la catégorie, 301 l'autre URL.
2. **P1 — Créer le pilier "vegetarian meals for two"** : cluster + catégorie + 4-6 recettes. Requête émergente GSC, 0 couverture actuelle.
3. **P1 — Créer le pilier "mexican meals for two"** : promouvoir easy-mexican-dinner-recipes (9 recettes existantes) en cluster.
4. **P2 — Épaissir les 4 clusters coquilles** : 4-8 liens directs recettes par pilier + ItemList JSON-LD ; corriger le mismatch desserts de quick-healthy-dinners.
5. **P3 — SEO mineur** : retitrer one-pan → "One-Pan & Skillet", noindex les 308 non sémantiques tant que les piliers n'existent pas.

## Checklist validation du modèle hub-and-spoke
- [x] 6 hubs HTTP 200 et dans le sitemap
- [x] Retour spoke→hub vérifié sur échantillon (3/3)
- [ ] Pas de page orpheline : 4 clusters ne relient que 1-2 spokes (échec partiel)
- [ ] Pas de doublon de pages : échec (3 paires identiques)
- [ ] Couverture des intents GSC émergents : échec partiel (vegetarian 0, mexican 1 hub, skillet absorbé, chicken/one-pan OK mais cannibalisés)
