# Audit SEMRUSH — Analyse approfondie & comparaison
> Source : `www.chefaugustin.com_mega_export_20260806.csv` (export Site Audit, 2026-08-06)
> Rédigé le : 2026-08-06 — Chef Augustin (AI AutoBlog)

## ✅ P1 implémenté le 2026-08-06 (6 fichiers + 1 migration DB)
**P1.1 — Tags ≥3 recettes non canoniques (10)**
- **Merge DB approuvé + exécuté** (14 recettes, backup loggé) : « one pan »→« one-pan » (page one-pan : 5→25 recettes — bug d'affichage corrigé), « dinners for two »+« dinners-for-two »→« dinner for two » (page dinner-for-two : 24→33 recettes). 301 dinners-for-two→dinner-for-two déjà en place (next.config.mjs:102)
- **CANONICAL_CATEGORIES 11→16** : + ground beef (4), pasta (3), chicken breast (3), slow cooker (4), rice (5) — tous indexables, sitemap + nav automatiques
- Redirects retirés (next.config.mjs + CATEGORY_REDIRECTS) : rice→one-pan, ground-beef→dinner-for-two, slow-cooker→small-batch
- Résolutions vérifiées : 16/16 canoniques résolvent leur propre slug avec ≥3 recettes (dont small-batch→"small batch" 7 recettes, one-pan→"one-pan" 25)

**P1.2 — Intros catégories étendues** (app/recipes/category/[slug]/page.tsx) : 16 intros canoniques réécrites ~50→180-220 mots (3 paragraphes, factuelles sur les recettes réelles). Clé « one pan » renommée « one-pan ». ~24 entrées au total (8 thin non canoniques intactes)

**P1.3 — 6 descriptions clusters étendues** (lib/topical-map.ts) : ~40→150-200 mots + rendu multi-paragraphes (split \n\n) dans app/recipes/cluster/[slug]/page.tsx

**P1.4 — h1 homepage ≠ title** (components/homepage/homepage-hero.tsx) : title « Easy Weeknight Dinners for Two » / h1 « Easy Dinners, Made for Two »

**P1.5 — Vérifications** : tsc ✅, résolution slugs 16/16 ✅, redirects ✅, `next build` exit 0 ✅ (6 fichiers, +96/-23).

## ✅ Corrections finales (même session, avant commit)
- **Word count vérifié dans le HTML buildé** : intros catégories présentes (3 paragraphes), clusters 449-678 mots visibles → les 17 pages fines passent le seuil Semrush
- **301 coquilles vides** (next.config.mjs) : `/techniques → /guides`, `/histoire → /about`, `/equipement → /guides` — 0 article publié en DB pour ces catégories (vérifié) → noindex shells éliminés, equity préservée
- **2 recettes "Content not optimized"** (DB) :
  - `creamy-parmesan-garlic-chicken-orzo-for-two` — excerpt réécrit aligné sur le plat (30-min, parmesan, orzo, une poêle)
  - `summer-herb-chicken-orzo-with-zucchini-for-two` — excerpt réécrit aligné (zucchini, basilic/persil/ciboulette) ; vérifié que le contenu était déjà correct (seul l'excerpt citait le mauvais plat)
- **P2 restant (déféré)** : ratio texte/HTML (185 KB/recette — template lourd, CWV), re-crawl Semrush de validation

## ✅ P0 implémenté le 2026-08-06 (6 fichiers)
- `lib/category-consolidation.ts` — helper `canonicalCategories()` (filtre aux 11 tags canoniques)
- `app/recipes/page.tsx` — chips "Browse by category" → 11 canoniques (fini les 138 tags) + lien "View all" → /techniques retiré
- `components/homepage/homepage-categories.tsx` — même filtre (remplace `slice(0,15)` qui montrait les 15 premiers tags alphabétiques, tous morts)
- `components/site-header.tsx` — lien "Techniques" retiré de la nav
- `components/site-footer.tsx` — liens Techniques/History/Equipment retirés
- `components/homepage/homepage-articles.tsx` — lien "View all" → /techniques retiré
- Vérifié : `tsc --noEmit` ✅, `next build` ✅ (133 pages catégories), 11 canoniques tous ≥3 recettes ✅, 0 lien résiduel vers /equipement //histoire //techniques ✅
- Inchangé (volontairement) : `generateStaticParams` (138 tags), `RecipeSearch` (filtres client), `sitemap.ts`, redirects
- Reste P1 : 10 tags ≥3 recettes non canoniques (rice, slow cooker…) — sitemap ou 301 ? · enrichir les 17 pages fines · h1 homepage ≠ title · décision contenu /techniques (articles existent en DB mais hub noindex)

---

## 1. Méthode & limites

| Paramètre | Valeur |
|---|---|
| Outil | Semrush Site Audit (export "Mega export") |
| Portée | 100 pages crawlées (plafond plan gratuit) |
| Format | Matrice pages × 101 checks (1 CSV) |
| Complément | Vérifications live (`curl`), requêtes DB (Neon), lecture du code (Next.js) |

**Limites de l'export** : pas de score global, pas de positions, pas de backlinks, pas de volumes de mots-clés. Le crawl est plafonné à 100 pages → les pages absentes ne sont pas nécessairement introuvables, elles n'ont simplement pas été atteintes.

**Composition du crawl (100 URLs)** : 54 catégories, 24 recettes, 6 clusters, 1 article `/idees`, 15 pages statiques/nav (home, about, contact, guides, privacy, terms, robots.txt, sitemap.xml, llms.txt…). ⚠️ **0 page `/guides` (20) crawlée, 0 article `/idees` (8) sauf 1** — le budget de crawl a été épuisé par l'explosion de pages catégories avant d'atteindre les hubs.

---

## 2. Synthèse exécutive

**130 problèmes détectés sur 100 pages.** Le profil est asymétrique :

- ✅ **Infrastructure technique : excellente** — 0 erreur sur titles, meta descriptions, canonicals, schema, images, HTTPS/HSTS, robots.txt, sitemap.xml, llms.txt, speed, compression, minification. Les fixes du 05/08 (sitemap 190→75, gate, schema) sont **validés par un crawler indépendant**.
- ⛔ **Architecture des catégories : c'est le talon d'Achille** — la navigation rend un **nuage de 138 tags bruts** au lieu des 11 catégories curatées. Résultat : des dizaines de liens vers des pages 308 / 404 / noindex, du budget de crawl gaspillé, et les hubs de contenu jamais crawlés.
- ⚠️ **Contenu : pages catégories/clusters trop fines** (17 pages), ratio texte/HTML faible partout (53 pages), 2 recettes "content not optimized".

**Cause racine unique de ~80% des problèmes : le tag cloud** (`getRecipeCategories()` = tous les tags distincts de la DB, utilisé tel quel dans la nav `/recipes` et la homepage).

---

## 3. Ce que Semrush CONFIRME sain (état d'avancement validé)

| Check | Résultat | Interprétation |
|---|---|---|
| Duplicate title / missing title | 0 | ✅ Titles uniques partout |
| Missing meta description | 0 | ✅ |
| Canonical / broken canonical / multi canonical | 0 | ✅ |
| Missing ALT attributes / broken images | 0 | ✅ |
| Slow page load speed | 0 | ✅ |
| Uncompressed/Uncached/Unminified JS/CSS | 0 | ✅ |
| HTTPS / HSTS / mixed content / security protocols | 0 | ✅ |
| robots.txt / sitemap.xml (format, contenu, "not found") | 0 | ✅ Sitemap 91 URLs propre |
| llms.txt (présent, format) | 0 | ✅ GEO OK |
| Schema (structured data errors) | 0 | ✅ JSON-LD valide |
| Orphaned pages | 0 | ✅ |
| Redirect chains / loops | 0 | ✅ |

**Conclusion §3 : le socle technique (08/05 : 11 commits, sitemap 190→75, gate 7 checks, schema complet, ES2022) résiste à un audit externe.**

---

## 4. Les 9 findings — preuves, causes racines, sévérité

### P0-1 — Le nuage de tags : ~120+ liens vers des pages 308/404/noindex
- **Preuve Semrush** : 39 "Permanent redirects" (30 sur `/recipes`, 9 sur homepage) + 4 broken internal links + 4 4xx.
- **Preuve live (échantillon 34 chips)** : **62% → 308** (30-minute-dinner→quick…), **21% → 404** (braising, noodles, beef-ramen, budget, whole30…), **15% → 200 noindex** (4-ingredient, baking, cherry-tomatoes…).
- **Cause racine** : `lib/queries.ts:104` `getRecipeCategories()` → `SELECT DISTINCT jsonb_array_elements_text(tags)` retourne **les 138 tags bruts** (pas les 11 canoniques). Utilisé tel quel :
  - `app/recipes/page.tsx:104` — 138 chips "Browse by category"
  - `components/homepage/homepage-categories.tsx:16` — `categories.slice(0, 15)` → les **15 premiers tags alphabétiques = 0 vraie catégorie** (30-minute, 30-minute-dinner→308, 4-ingredient→noindex, beef-ramen→404…). La section "Explore by category" de la homepage ne contient que des liens morts.
- **Impact** : fuite de link equity, gaspillage de crawl budget (100 pages de budget → 54 pages catégories), UX trompeuse.

### P0-2 — 8 pages catégories publiées qui 404 (build stale)
- **Preuve** : braising, noodles, quick-weeknight, searing, beef-ramen, chili-colorado, whole30, chicken-and-rice → **404 live mais tags PUBLIÉS en DB** (1-2 recettes chacune).
- **Cause racine** : `app/recipes/category/[slug]/page.tsx` — `generateStaticParams()` n'est exécuté **qu'au build** + `dynamicParams = false` → toute recette publiée après le dernier déploiement a son slug catégorie en **404** (l'ISR régénère les pages existantes, jamais les nouveaux paramètres). La page `/recipes` (ISR 1h) les lie **avant** que le build ne les connaisse.
- **Impact** : liens internes cassés qui s'auto-créent à chaque publication de la VAGUE 3.

### P0-3 — Pages noindex liées depuis la nav globale
- **Preuve** : `/techniques` (hub !), `/histoire`, `/equipement` = 200 + `noindex` et **liées depuis header + footer** (`components/site-header.tsx:10`, `components/site-footer.tsx:54-63`).
- **Cause racine** : pages du site pré-consolidation jamais supprimées, noindexées, mais toujours dans la navigation.
- **Impact** : equity gaspillée sur des pages mortes, incohérence (hub "Techniques" promu en nav mais interdit d'indexation).

### P1-4 — 17 pages "Low word count" (11 catégories + 6 clusters)
- **Preuve Semrush** : toutes les catégories sauf 2 + tous les clusters.
- **Cause racine** : les intros écrites le 05/08 (22 intros dans `category/[slug]/page.tsx`) font ~40-60 mots → en dessous du seuil Semrush (visible text < ~150-200 mots). Les pages rendent intro + cards, pas de contenu éditorial additionnel.
- **Nuance** : un contenu mince réel est signalé ici — les intros existantes doivent être **étendues**, pas remplacées.

### P1-5 — 10 catégories indexables (≥3 recettes) absentes du sitemap
- **Preuve** : 21 tags ≥3 recettes en DB ; seuls les **11 de `CANONICAL_CATEGORIES`** (lib/category-consolidation.ts:119) sont dans le sitemap. Manquent : rice (5), one pan (5), dinners-for-two (5), ground beef (4), slow cooker (4), dinners for two (4), etc.
- **Impact** : 10 pages indexables non signalées à Google → indexation au rabais + chevauchement "one pan"/"one-pan"/"one-pot" (cannibalisation douce).

### P1-6 — Ratio texte/HTML faible : 53/53 pages de contenu
- **Preuve** : HTML d'une recette = **185 KB** ; ratio texte/HTML sous le seuil Semrush sur 100% des pages de contenu.
- **Cause racine** : template lourd (hydration React inline, JSON-LD, CSS-in-JS, nav/footer répétés).
- **Impact** : faible sur SEO (Google n'utilise pas ce ratio), réel sur CWV mobile. Priorité de fond, pas d'urgence.

### P2-7 — Divers
- Homepage : `h1` = `title` ("Easy Weeknight Dinners for Two") → "Duplicate content in h1 and title".
- `/recipes/category/pasta` : **1 seul lien interne** (pasta n'est pas dans les 15 premiers tags de la homepage ; seul `/recipes` le lie) — conséquence directe du slice(0,15).
- 2 recettes "Content not optimized" : `creamy-parmesan-garlic-chicken-orzo-for-two` + `summer-herb-chicken-orzo-with-zucchini-for-two` (check TF-IDF Semrush — alignement mots-clés à revoir, volume mineur).

---

## 5. Comparaison : état d'avancement déclaré vs réalité

| Déclaré (mémoire/sprints) | Réalité mesurée (2026-08-06) | Verdict |
|---|---|---|
| "Sitemap 190 → 75" | 91 URLs live (46 recettes + 11 catégories + 6 clusters + 20 guides + 8 idees) | ✅ Validé Semrush |
| "Catégories 119 → 11 + 301" | 94 redirects actifs dans next.config.mjs, MAIS la nav rend toujours les 138 tags ; 8 tags publiés → 404 (build stale) ; 10 tags ≥3 recettes hors sitemap | ⚠️ **Travail incomplet** — consolidation faite côté serveur, pas côté navigation |
| "22 hubs construits / indexés" | 20 guides + 6 clusters + 8 idees ; 0 crawlé par Semrush (budget mangé) | ⚠️ Existent et sitemap OK, mais jamais atteints par le crawler |
| "22 catégories indexables" | 21 tags ≥3 recettes ; 11 canoniques ; 10 indexables hors sitemap ; "30-minute" (2 recettes) a une intro mais est noindex | ⚠️ Dérive entre les intros (22), la DB (21) et le sitemap (11) |
| Infrastructure technique | 0 erreur Semrush sur 30+ checks | ✅ **Point fort du site** |
| VAGUE 3 (débloquée 05/08) | ~46 recettes dans le sitemap, nouvelles pubs post-build → 404s catégories | ⚠️ Chaque publication crée des liens morts temporaires |

---

## 6. Plan d'action priorisé

### 🔴 P0 — Intégrité des liens (1 session, ~30 min de code)
1. **Filtrer le tag cloud** : `getRecipeCategories()` (ou son usage) → ne retourner que les 11 tags de `CANONICAL_CATEGORIES`. Impact : suppression de ~127 chips morts sur `/recipes` + homepage → 0 lien 308/404/noindex dans la nav. *Vérif : re-crawl + comptage des hrefs.*
2. **Retirer /techniques, /histoire, /equipement** de header/footer (ou les réactiver en pages indexables si le contenu le mérite).
3. **Déployer** → le build régénère `generateStaticParams` → les 8 404 catégories disparaissent d'eux-mêmes.

### 🟠 P1 — Contenu & cohérence (2 sessions)
4. **Étendre les 17 pages fines** : catégories (intro 150-250 mots + section "What to make" / FAQ) et 6 clusters (150-300 mots). Objectif : passer le seuil Semrush + réellement mieux servir l'intent.
5. **Décider le sort des 10 tags ≥3 recettes non canoniques** : soit les ajouter à `CANONICAL_CATEGORIES` + sitemap (rice, slow cooker sont des catégories légitimes), soit les 301 vers les 11 (one pan → one-pan, dinners-for-two → dinner for two).
6. **h1 homepage ≠ title** (réécrire le h1).
7. **Ajouter pasta (et les 11 canoniques) dans la homepage** — remplacer `slice(0,15)` par une liste curatée → pasta passe de 1 à 2+ liens internes.

### 🟡 P2 — Fond (dette technique)
8. Ratio HTML : alléger le template (185 KB/page) — impact CWV, priorité faible.
9. Revoir le ciblage mots-clés des 2 orzo "content not optimized".
10. **Monitoring** : après déploiement, re-crawl Semrush pour valider la réduction du nuage de tags → le crawler atteindra enfin guides + idees.

---

## 7. Leçons & garde-fous

- **Le piège du "filtre serveur"** : consolider côté redirects (94 entrées maintenues à la main, "kept in sync manually") sans toucher la navigation = l'utilisateur (et le crawler) continue de voir le monde d'avant.
- **generateStaticParams + dynamicParams=false + publications continues** = des 404 auto-générés à chaque wave. Soit redéployer après chaque wave, soit ne générer que les tags ≥3 recettes (les tags fins n'ont pas besoin de page du tout — 404 est préférable à noindex+liens).
- **Un nuage de tags n'est pas une architecture de catégories** : les 138 tags sont des métadonnées de recette ; les 11 catégories sont l'architecture. La nav doit exposer l'architecture, jamais les métadonnées brutes.
