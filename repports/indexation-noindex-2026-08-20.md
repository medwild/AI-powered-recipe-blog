# Audit GSC « Exclues par noindex » — 2026-08-20

> Source : GSC *Page indexing* → « Exclue par la balise noindex » (Dernière mise à jour : 17/08/2026, **74 pages**).
> Méthode : catégorisation des 74 URLs + test live (statut HTTP + meta robots) + comparaison avec les 48 slugs actifs (API `/api/recipes/raw`) + lecture des 135 redirects dans `next.config.mjs`.

---

## Résultat en une phrase

**La grande majorité des 74 pages est un noindex VOLONTAIRE (filtres, catégories thin, dashboard/login). Le vrai problème : 7 anciens slugs de recettes renommées renvoient 404 au lieu de 301 vers leur successeur actif** — ils polluent le rapport GSC et perdent du jus de lien.

---

## Catégorisation des 74 URLs

### ✅ A. Noindex volontaire — RAS (~50 URLs)

| Groupe | Exemples | Source noindex |
|---|---|---|
| Filtres `?cat=` / `?cluster=` | `/recipes?cat=baking`, `/recipes?cat=chicken`, `/recettes?cluster=chicken-dinners-for-two` (~18) | Middleware `X-Robots-Tag: noindex, follow` |
| Catégories thin (<3 recettes) | `/recipes/category/4-ingredient`, `/baking`, `/cookies`, `/lasagna`, `/mexican` (~23) | `MIN_RECIPES_FOR_INDEX = 3` dans `category/[slug]/page.tsx` |
| Admin | `/dashboard`, `/login` | `noindex` explicite + robots.txt |
| `/recettes/*` | `/recettes/one-pot-lemon-chicken-for-two` (308 → `/recipes/*`) | 301 permanent vers `/recipes/*` |

Toutes ces exclusions sont **intentionnelles** : les pages de filtres et les catégories thin ne doivent pas être indexées.

### 🔴 B. VRAI PROBLÈME — 7 slugs recette 404 MAIS successeur actif (301 manquant)

Ces slugs ont été **renommés** (le titre de l'ancien slug = titre de la recette actuelle) mais **aucun 301** ne pointe vers le nouveau slug. Ils servent 404 + noindex (meta auto Next.js sur not-found), Google les garde dans le rapport.

| Ancien slug (404) | → Successeur actif (200, index) | Correspondance titre |
|---|---|---|
| `/recipes/easy-whole30-chicken-skillet-for-two` | `/recipes/whole30-chicken-skillet-tomatoes-garlic` | « Easy Whole30 Chicken Skillet for Two with Tomatoes and Garlic » ✅ |
| `/recipes/one-pan-chicken-vegetable-skillet-for-two` | `/recipes/one-pan-chicken-vegetable-skillet` | « One-Pan Chicken and Vegetable Skillet for Two » ✅ |
| `/recipes/4-ingredient-feta-brine-chicken-breast` | `/recipes/easy-4-ingredient-chicken-breast-recipes` | « 4-Ingredient Feta Brine Chicken Breast for Two » ✅ |
| `/recipes/easy-meal-ideas-for-two-one-pan-chicken-tomato-rice` | `/recipes/one-pan-chicken-tomato-rice` | « Easy Meal Ideas for Two: One-Pan Chicken and Tomato Rice » ✅ |
| `/recipes/easy-4-ingredient-chicken-breast-recipes-2` | `/recipes/easy-4-ingredient-chicken-breast-recipes` | Doublon suffixe `-2` → slug canonique ✅ |
| `/recipes/slow-cooker-chicken-and-rice-for-two` | `/recipes/slow-cooker-chicken-rice-for-two` | « Slow Cooker Chicken and Rice for Two » ✅ |
| `/recipes/whole30` | `/recipes/whole30-chicken-skillet-tomatoes-garlic` | Slug générique → recette Whole30 ✅ |

### ✅ C. 404 sans successeur — RAS (correct)

`sourdough-bread-for-two-small-loaves`, `banana-bread`, `honey-garlic-salmon-for-two`, `one-pot-lemon-chicken-for-two`, `dinners-for-two`, `easy-lunch-recipes`, `one-pot-lemon-chicken-for-two-1`, `easy-4-ingredient-chicken-breast-recipes-2` (déjà couvert) — recettes supprimées sans équivalent. **404 natif est le bon comportement** (commentaire `next.config.mjs:99-103`). Elles disparaîtront du rapport au prochain crawl Google.

### ⚠️ D. Catégories 404 (ex-thin) — mineur

`/recipes/category/chef-augustin`, `/creamy-mushroom-pasta`, `/honey-garlic`, `/mushroom-recipe` → 404 (tags vidés/fusionnés). Correct, mais un 301 vers la catégorie parente récupérerait le peu d'équité restante. Faible priorité.

---

## Vérifications de contrôle (toutes PASS)

- ✅ **48/48 recettes actives** servent 200 sans meta noindex (indexable par défaut).
- ✅ **13/13 catégories du sitemap** (`chicken-breast`, `pasta`, `orzo`, …) servent `index, follow`.
- ✅ **6/6 collections (piliers)** servent `index, follow`.
- ✅ Filtres `?cat=*` : header `X-Robots-Tag: noindex, follow` bien présent.
- ✅ `/recettes/*` → 308 vers `/recipes/*` (wildcard opérationnelle).

---

## Plan d'action

1. **Ajouter 7 redirects 301** dans `next.config.mjs` (section « GSC noindex » lignes 99-115) pour les slugs du tableau B.
2. `npx tsc --noEmit` (règle CLAUDE.md après modif pipeline).
3. Push → redeploy Hostinger auto → re-crawl GSC (les 7 URLs quitteront le rapport noindex et pointeront vers leurs recettes indexées).

Le rapport GSC passera naturellement de 74 → ~65-67 (les 404 sans successeur + filtres + thin restent, mais c'est **normal**).
