# Mapping fusion catégories — 123 → ~35

> Date: 2026-08-05 | Source: comptage DB par tag (scripts/_cat-count.ts) + crawl

## Principe
- **Garder** : les tags avec ≥3 recettes (indexables, profonds) — les "vraies" catégories
- **Fusionner (301)** : les tags 1-2 recettes vers leur catégorie parente la plus proche
- **Supprimer** : le template "Our collection of N recipes" (thin content)

## Tags indexables actuels (≥3 recettes) — à GARDER
| Tag | Nb recettes | Slug |
|---|---|---|
| dinner for two | 16 | dinner-for-two |
| weeknight dinner | 10 | weeknight-dinner |
| one-pan | 9 | one-pan |
| easy | 8 | easy |
| chicken | 8 | chicken |
| small batch | 5 | small-batch |
| one pan | 5 | one-pan |
| date night | 5 | date-night |
| weeknight | 4 | weeknight |
| orzo | 4 | orzo |
| quick | 3 | quick |
| comfort food | 3 | comfort-food |

## Fusion proposée (tags 1-2 → catégorie parente)

### Famille TEMPS
| À fusionner | → Canonique |
|---|---|
| 30-minute (2), 30-minute-meals (2), 30-minute-dinner (1) | quick (ou weeknight) |
| 30-minute-meal (1) | quick |

### Famille CHICKEN
| À fusionner | → Canonique |
|---|---|
| chicken breast (2), chicken breast recipes (1) | chicken |
| chicken dinner for two (1) | chicken |
| chicken pot pie (1), herb chicken (1) | chicken |
| one-pan chicken (1), one-pan chicken dinner (1) | one-pan |
| easy-chicken-dinner (1) | easy |

### Famille ONE-PAN
| À fusionner | → Canonique |
|---|---|
| one pan meal (1), one-pan pasta (1), one pot (1) | one-pan |
| sheet pan dinner (2), skillet (1), skillet meal (1), cast iron (1), stovetop (1) | one-pan |
| pan-seared (1) | one-pan |

### Famille DESSERT/BAKING
| À fusionner | → Canonique |
|---|---|
| dessert (2), easy dessert (1) | baking (ou garder dessert si ≥3) |
| chocolate (2), chocolate lava cake (1) | baking |
| cookie dough for two (1), edible cookie dough (1), egg-free cookie dough (1) | baking |
| small-batch dessert (1) | small-batch |
| quick dessert (1) | baking |

### Famille FOR-TWO / OCCASION
| À fusionner | → Canonique |
|---|---|
| for two (1) | dinner-for-two |
| dinners-for-two (1) | dinner-for-two |
| romantic dinner (2) | date-night |
| easter dinner for two (1), thanksgiving for two (1), small thanksgiving (1) | dinner-for-two |
| steak dinner for two (1) | date-night |
| lunch for two (1) | dinner-for-two |

### Famille INGRÉDIENT
| À fusionner | → Canonique |
|---|---|
| lemon (1), lemon butter (1) | orzo (ou easy) |
| parmesan (1), feta (1), feta brine (1), olives (1), capers (1), dill (1) | orzo |
| white wine (1), spring vegetables (1), zucchini (1) | orzo |
| salmon (1), shrimp orzo (1), garlic shrimp (1), seafood (1) | orzo |
| rice bowl (1), rice recipe (1), stir-fry (1) | asian |
| asian (1) | asian |

### Famille CUISINE
| À fusionner | → Canonique |
|---|---|
| italian (1), italian-american (1), italian-inspired (1) | italian |
| mexican (1) | italian (ou easy) |
| mediterranean-chicken (1) | chicken |

### Famille MISC
| À fusionner | → Canonique |
|---|---|
| meal prep (2) | easy (ou weeknight) |
| gluten-free (1) | easy |
| vegetarian (1) | easy |
| beef (1), ground beef (1) | dinner-for-two |
| slow cooker (1), small-batch-cooking (1) | small-batch |
| summer dinner (1) | weeknight |
| side dish (1) | easy |
| mac and cheese (1), mashed potatoes for two (1), creamy mashed potatoes (1) | easy |
| puff pastry (1), gravy (1) | baking |
| quick shrimp recipe (1) | quick |
| easy lunch recipes (1) | easy |
| small-batch recipe (1) | small-batch |

## Catégories canoniques finales (corrigées — les vrais tags profonds)
Les canoniques sont les tags avec ≥3 recettes en DB (indexables). Les tags 1-2
fusionnent vers EUX, pas vers des tags vides (italian/asian/baking sont quasi
vides en DB — 301 vers eux = 404 ou noindex, à éviter).

| Canonique | Nb recettes DB | Absorbe |
|---|---|---|
| dinner-for-two | 16 | for-two, dinners-for-two, cooking-for-two, lunch-for-two, easter, thanksgiving, steak-dinner, easy-to-cook |
| weeknight-dinner | 10 | summer-dinner |
| one-pan | 9+5 | one-pan-meal, one-pan-dinner, one-pan-pasta, one-pot, sheet-pan, skillet, cast-iron, stovetop, pan-seared, one-pan-chicken |
| easy | 8 | easy-dinner, easy-weeknight, easy-lunch, meal-prep, gluten-free, vegetarian, side-dish, mac-and-cheese, mashed-potatoes |
| chicken | 8 | chicken-breast, chicken-dinner, chicken-pot-pie, herb-chicken, easy-chicken, mediterranean-chicken |
| small-batch | 5 | small-batch-dessert, small-batch-recipe, small-batch-cooking, slow-cooker |
| date-night | 5 | romantic-dinner, steak-dinner |
| weeknight | 4 | (proche de weeknight-dinner — garder les 2 distincts) |
| orzo | 4 | lemon, lemon-butter, parmesan, feta, olives, capers, dill, white-wine, salmon, shrimp-orzo, garlic-shrimp, seafood |
| quick | 3 | 30-minute* , 35-minute, quick-dinner, quick-dinner-for-two, quick-shrimp |
| comfort-food | 3 | — |

**Tags vides (1) non canoniques** → fusion vers les profonds :
- italian (1), italian-american, italian-inspired, mexican → easy (ou dinner-for-two)
- asian (1), rice (1), rice-bowl, rice-recipe, stir-fry → one-pan (ou easy)
- baking (2), dessert (2), chocolate (2), cookie-dough*, etc. → **small-batch** (meilleur fit : desserts pour deux)

## ⚠️ Correction du mapping next.config (les 301 vers italian/asian/baking sont À REVOIR)
J'avais mis italian/asian/baking comme destinations — mais ils sont quasi vides.
Corriger les redirects vers les vrais canoniques (easy / one-pan / small-batch).

## Mécanique
- **301** : les slugs fusionnés → canoniques (via `app/recipes/category/[slug]/page.tsx` ou next.config redirects)
- **Sitemap** : ne listera que les canoniques (le gate MIN_RECIPES_FOR_INDEX + le mapping)
- **DB** : optionnellement renommer les tags 1-2 vers le tag canonique (pour que le comptage remonte)
- **Vérif** : après fusion, chaque canonique doit avoir ≥3 recettes (re-crawl + comptage)
