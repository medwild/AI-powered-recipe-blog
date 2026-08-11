# ACTION PLAN — www.chefaugustin.com

**Audit 2026-08-08 | Score : 79.0/100 | Cible : US/UK/CA/AU**

## Phase 1 — Critical Fixes (cette semaine)

| # | Action | Fichier | Effort |
|---|---|---|---|
| 1 | Retirer le script Vercel Analytics mort (`<Analytics/>` de @vercel/analytics) | `app/layout.tsx` | S |
| 2 | 301 les catégories legacy quasi vides : chicken-for-two→chicken, quick-dinner-for-two→quick, dessert→small-batch | `next.config.mjs` | S |
| 3 | Corriger la soft-404 : /recipes/creamy-garlic-chicken → 410 ou 301 vers creamy-parmesan-garlic-chicken-orzo-for-two | `next.config.mjs` | S |
| 4 | Canonicals manquants /idees/* (7 pages) | `generateMetadata` (page hub) | S |
| 5 | Backfiller nutrition 2-qt-slow-cooker-recipes (vide) + corriger format calories 4 recettes ("580", "650 per serving", "520 kcal", "540" → "N calories") | DB / script | S |
| 6 | Créer le cluster "vegetarian-dinners-for-two" + catégorie vegetarian + 4-6 recettes (intent GSC émergent, 0 URL actuellement) | contenu | L |
| 7 | Créer category/skillet (ou renommer one-pan) + tagger les recettes poêle existantes (12+ recettes, couvre "stove top dinners for two") | contenu + DB tags | M |

## Phase 2 — High-Impact (semaines 2-3)

| # | Action | Fichier | Effort |
|---|---|---|---|
| 6 | Résoudre la cannibalisation category/chicken (39/39) + one-pan (28/29) : fusionner les recettes manquantes côté cluster, puis 301 la catégorie vers le cluster | contenu + `next.config.mjs` | M |
| 7 | Renommer les 13 paires de slugs dupliquées recette/hub (ou canonical croisé) | slugs + `next.config.mjs` | M |
| 8 | Créer le cluster "vegetarian-dinners-for-two" + catégorie vegetarian + 4-6 recettes (intent GSC émergent) | contenu | L |
| 9 | 301 weeknight-dinner → weeknight (doublon strict 11/11) | `next.config.mjs` | S |
| 10 | Corriger og:url par page (absent/erroné → homepage sur /idees/*) | `generateMetadata` | S |
| 11 | Uniformiser recipeCategory (1 valeur unique) + keywords (tags) | `app/recipes/[slug]/page.tsx` | S |
| 12 | Ajouter ItemList aux clusters + BreadcrumbList aux hubs /guides/ | `app/recipes/cluster/*` + hub | M |
| 13 | Corriger le CTA mobile masqué par la bannière cookies + titre recette sous flottaison desktop | CSS/layout | M |
| 14 | Ajouter la ligne "Nutrition information is an estimate" (YMYL, sans section complète) | recettes | S |

## Phase 3 — Content & Authority (mois 2)

| # | Action | Effort |
|---|---|---|
| 15 | Épaissir les 4 clusters coquilles (4-8 liens directs recettes) + ItemList JSON-LD | M |
| 16 | Enrichir les hubs sous plancher (+150-250 mots éditoriaux) | M |
| 17 | Retirer les desserts du cluster quick-healthy-dinners (mismatch) | S |
| 18 | Réécrire les meta descriptions catégories (squelette identique) | M |
| 19 | Recentrer titles/meta hubs sur cible US/UK/CA/AU ("French cooking tips") | M |
| 20 | Grouper les cards sous H2 thématiques sur les collections | M |
| 21 | Ajouter des dates visibles sur hubs/clusters/catégories (fraîcheur) | M |
| 22 | Consolider "romantic dinner for two" : 301 les 2 hubs concurrents vers romantic-dinner-ideas-for-two | M |
| 23 | Construire des backlinks réels (Pinterest d'abord, puis roundups + guest posts DA 20-40) | L |

## Phase 4 — Monitoring & Iteration (ongoing)

| # | Action | Effort |
|---|---|---|
| 23 | Re-request Indexing GSC pour les 2 recettes non indexées (easy-chicken-dinners-for-two, easy-to-make-asian-food-recipes) | S (manuel) |
| 24 | Re-inspect-batch des 46 recettes dans ~1 semaine (valider re-crawl rich results) | S |
| 25 | Re-tester CrUX field data dans 2-4 semaines (trafic Chrome) | S |
| 26 | Corriger les lastmod artificiels (50/96 URLs) | S |
| 27 | Évaluer le retrait du workflowLog IA du HTML client (empreinte "généré par IA") | M |
| 28 | Auditer la précision des FAQ (potentiellement synthétiques) | M |

---

**Légende effort :** S = < 1h · M = 2-4h · L = 1-2 jours

**Référence :** FULL-AUDIT-REPORT.md · findings/*.md · audit-data.json
