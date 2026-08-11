# Schema / Structured Data — Findings (audit 2026-08-08)

Pages auditées (8, toutes HTTP 200, curl + parse python3.12) :
- `/` (home), `/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two` (R1), `/recipes/chocolate-lava-cakes-for-two` (R2), `/recipes/2-qt-slow-cooker-recipes` (R3), `/guides/easy-dinner-ideas-for-two` (hub), `/recipes/category/chicken` (catégorie), `/recipes/cluster/one-pan-dinners-for-two` (cluster) + 5 recettes de contrôle (whole30, crockpot, slow-cooker-rice, chili-colorado, lava-cakes).
Tous les blocs se parsent (0 JSON mal formé), @context https://schema.org, URLs absolues, dates ISO 8601, @type valides schema.org.

## Validation positive (à conserver)
- Recettes : Recipe complet (name, image, recipeIngredient, recipeInstructions en HowToStep avec text+image+position, author Person avec url /about, datePublished/dateModified, prepTime+cookTime=totalTime vérifié sur 3/3, recipeCuisine déterministe, recipeYield) + BlogPosting (mainEntity → `{"@id":"#recipe"}`, publisher Organization) + BreadcrumbList.
- ItemList hub (41) et catégorie (30) : numberOfItems = nombre réel, positions séquentielles, 0 doublon, 0 item sans url/name.
- FAQPage : 5-6 questions par recette, toutes avec acceptedAnswer non vide.
- Home : Organization (name, url, logo, sameAs ×3) + WebSite avec SearchAction.

---

## [Sévérité: High] Recipe 2-qt-slow-cooker-recipes : NutritionInformation vide (aucune valeur)
- URL : https://www.chefaugustin.com/recipes/2-qt-slow-cooker-recipes
- Preuve : `"nutrition": {"@type": "NutritionInformation", "servingSize": "1 serving"}` — aucun calories/macros.
- Contexte : les 7 autres recettes contrôlées ont calories+macros (ex. `"calories": "620 calories", "fatContent": "44 g", ...`). Contredit la note « nutrition 46/46 backfill » du 07/08 : au moins une recette est restée sans valeurs.
- Recommandation : backfiller calories + macros pour cette recette (et vérifier les 46 par script : nutrition doit contenir `calories`).

## [Sévérité: Medium] recipeCategory = liste de tags séparés par virgules dans un champ Text unique
- URLs : les 3 recettes (ex. R1 : `"recipeCategory": "mediterranean chicken, one-pan dinner, orzo"`, R2 : `"dessert for two, chocolate lava cake, small batch"`, R3 : `"slow cooker, chicken, dinner for two"`).
- Problème : schema.org/Google attend une catégorie unique (ex. "Chicken", "Dessert"). La valeur multi-tags est redondante avec `keywords` et brouille la sémantique.
- Recommandation : `recipeCategory` = une valeur unique ; garder les tags dans `keywords`.

## [Sévérité: Medium] Format calories incohérent ("580" sans unité)
- URL : https://www.chefaugustin.com/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two
- Preuve : `"calories": "580"` vs R2 `"calories": "620 calories"` (format Google : "270 calories").
- Recommandation : uniformiser avec l'unité (« 580 calories »).

## [Sévérité: Medium] Page cluster sans ItemList
- URL : https://www.chefaugustin.com/recipes/cluster/one-pan-dinners-for-two
- Preuve : seul bloc = BreadcrumbList. Le hub (`/guides/...`, ItemList 41) et la catégorie (`/recipes/category/chicken`, ItemList 30) en ont un.
- Recommandation : ajouter ItemList (même structure que la catégorie : ListItem position/url/name, numberOfItems exact).

## [Sévérité: Medium] Hub sans BreadcrumbList
- URL : https://www.chefaugustin.com/guides/easy-dinner-ideas-for-two
- Preuve : seul bloc = ItemList. Toutes les autres pages non-home ont un BreadcrumbList (recettes, catégorie, cluster).
- Recommandation : ajouter BreadcrumbList `Home > Guides > Easy Dinner Ideas for Two`.

## [Sévérité: Low] Organization.logo = URL nue, pas un ImageObject
- URL : https://www.chefaugustin.com/
- Preuve : `"logo": "https://www.chefaugustin.com/hero-kitchen.png"`.
- Valide schema.org mais sous-optimal pour le logo knowledge panel ; vérifier que c'est bien un logo carré (112×112+ px) et pas une image hero. Recommandation : `"logo": {"@type": "ImageObject", "url": "..."}` + dimensions.

## [Sévérité: Low] SearchAction en format legacy
- URL : https://www.chefaugustin.com/
- Preuve : `"query-input": "required name=search_term_string"` — les docs actuelles Google utilisent `"query-input": "required"` (l'ancien format reste accepté).
- Recommandation : moderniser (cosmétique, faible priorité).

## [Sévérité: Low] recipeYield incohérent
- Preuve : R1 `"recipeYield": "2"` vs R2/R3 `"2 servings"`. Les deux sont valides.
- Recommandation : uniformiser « 2 servings ».

## [Sévérité: Info] FAQPage présent sur toutes les recettes — plus de rich result Google
- Preuve : R1 6 questions, R2/R3 5 questions, toutes bien formées.
- Contexte : Google a retiré les rich results FAQPage pour TOUS les sites (mai 2026). Aucun bénéfice SERP ; bénéfice AI/GEO non confirmé.
- Recommandation : ne rien faire ou retirer selon préférence — ne pas ajouter de nouvelles FAQPage en espérant un rich result.

## [Sévérité: Info] aggregateRating absent (correct)
- Aucune recette n'a de note auto-générée — c'est conforme (Google pénalise les notes sans vraies reviews). Ne pas en ajouter sans système de reviews réel.

## [Sévérité: Info] @id="#recipe" relatif (correct)
- Fragment référencé par BlogPosting.mainEntity dans le même @graph — pattern JSON-LD valide, pas de doublon d'@id dans un même document.

## [Sévérité: Info] Organisation absente sur hub/catégorie/cluster
- Non requis : l'Organization de la home + `publisher` inline dans les BlogPosting couvrent le site. Profondeur de breadcrumb variable (3 vs 4 niveaux selon recette) — cosmétique, valide.
