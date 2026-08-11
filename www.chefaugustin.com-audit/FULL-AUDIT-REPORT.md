# FULL AUDIT REPORT — www.chefaugustin.com

**Date :** 2026-08-08 | **Type :** Recipe blog (dinner for two) | **Cible :** US/UK/CA/AU | **Scope :** 96 URLs sitemap (46 recettes, 21 hubs, 16 catégories, 6 clusters, 7 statiques)

## Executive Summary

**SEO Health Score : 79.0/100** — Site sain techniquement, fort sur le contenu des recettes et les performances, avec des points d'architecture de contenu à corriger (cannibalisation, gaps d'intent) et un site trop jeune pour la traction organique.

| Catégorie | Score | Poids |
|---|---|---|
| Technical SEO | 82 | 22% |
| Content Quality | 72 | 23% |
| On-Page SEO | 72 | 20% |
| Schema / Structured Data | 85 | 10% |
| Performance (CWV) | 96 | 10% |
| AI Search Readiness | 75 | 10% |
| Images | 88 | 5% |
| SXO (hors pondération) | 41 | — |
| Backlinks (site jeune, non noté) | — | — |

### Top Critical / High
1. **Script Vercel Analytics mort** — 404 sur chaque page (résidu migration Hostinger)
2. **CTA mobile masqué par la bannière cookies** (homepage)
3. **13 paires de slugs dupliquées** recette vs hub (cannibalisation)
4. **Catégories legacy quasi vides** servies en 200
5. **Cannibalisation** category/chicken vs cluster (39/39) + one-pan (28/29)
6. **Gap couverture "vegetarian meals for two"** — 0 page (intent GSC émergent)
7. **7 pages /idees/* sans canonical**
8. **Soft-404** : /recipes/creamy-garlic-chicken → 200 noindex
9. **Nutrition vide** sur 2-qt-slow-cooker-recipes
10. **Zéro traction organique** (2 clicks/28j, positions 42-91)

### Top Quick Wins
- Retirer le script Vercel Analytics mort (1 ligne, perfs + console)
- Ajouter les canonicals manquants /idees/* (generateMetadata)
- 301 les catégories legacy vides vers canoniques
- Corriger le format calories (4 recettes) + backfiller nutrition 2-qt-slow-cooker
- og:url par page (impact social + cohérence)
- 301 weeknight-dinner → weeknight (doublon strict)

---

## 1. Technical SEO (82/100)

**Ce qui marche :** HTTPS/HSTS excellent (max-age=63072000+preload, XFO DENY, nosniff), robots.txt sain (sitemap déclaré, /dashboard + /api bloqués), redirects /recettes→/recipes propres (308, 1 hop), non-www→www 301, 96/96 URLs sitemap → 200, /api/recipes/raw : exposition volontaire sans fuite de drafts.

**Findings :**
- **[High]** 7 pages /idees/* sans tag canonical (toutes dans le sitemap, indexables)
- **[High]** Soft-404 : /recipes/creamy-garlic-chicken → 200 + noindex (title "Recipe not found") ; redirect legacy y mène (cul-de-sac)
- **[Medium]** LCP lab mobile > 2.5s (home 2.6s, recette 2.9s, hub 3.9s)
- **[Medium]** og:url absent sur /recipes, clusters, recettes ; erroné (→ homepage) sur /idees/*
- **[Medium]** CSP minimale (upgrade-insecure-requests uniquement)
- **[Low]** Permissions-Policy absente

---

## 2. Content Quality (72/100)

**Ce qui marche :** Recettes fortes (1505-2869 mots, temps internes 165°F/145°F, taille de poêle, anecdotes 1re personne, sections Why This Works/tips/FAQ/storage). AI citation 78/100 — FAQ auto-suffisantes 60-90 mots. Lisibilité recettes saine (17.8-19.6 mots/phrase). Persona transparent (about : house persona, pas de fausses credentials). Meta descriptions uniques hors pattern catégories.

**Findings :**
- **[High]** 13 paires même slug /recipes/ + /guides|/idees/ (recette vs hub, hub SANS canonical) → dilution crawl + arbitrage Google
- **[High]** Catégories legacy quasi vides servies en 200 (chicken-for-two 63 mots, quick-dinner-for-two 249 mots indexables, dessert 138 mots)
- **[Medium]** Hubs sous plancher 500-800 mots (easy-dinner-ideas 705 mots dont ~40 titres de cards, prose ≈150-200)
- **[Medium]** Clusters à dominante grille (one-pan 272 mots)
- **[Medium]** Nutrition en JSON-LD seul, aucun disclaimer visible (YMYL food)
- **[Medium]** FAQ potentiellement synthétiques (log "No PAA questions — using 8 synthetic fallbacks")
- **[Medium]** Hiérarchie H2/H3 des collections (hubs : 1 H2 + 35-41 H3 non groupés, intros monolithiques ~176-195 mots)
- **[Low]** Homepage phrases longues (26.4 mots/phrase, 39% > 25)
- **[Low]** Meta descriptions catégories à squelette identique
- **[Info]** workflowLog IA sérialisé dans le HTML client (empreinte "généré par IA" lisible dans la source)

---

## 3. On-Page SEO (80/100)

**Ce qui marche :** Titles recettes 61-67 chars uniques, meta descriptions uniques (hors pattern catégories), H1 unique + hiérarchie saine sur recettes, canonicals self OK (sauf /idees/*), og:title/description présents.

**Findings :**
- **[High]** og:url absent/erroné sur pages internes (→ homepage sur /idees/*)
- **[Medium]** Titles/meta hubs hors focus cible ("French cooking tips" vs US/UK/CA/AU)
- **[Medium]** Meta descriptions catégories à squelette identique
- **[Low]** Homepage phrases longues
- **[Low]** Hiérarchie H2/H3 des collections

---

## 4. Schema / Structured Data (85/100)

**Ce qui marche :** 100% des blocs JSON-LD parsent (@context https, URLs absolues, dates ISO 8601, @types valides). Recettes : Recipe complet (HowToStep avec image+text, author Person, prep+cook=total, cuisine déterministe, yield) + BlogPosting + BreadcrumbList. ItemList hub (41) et catégorie (30) exacts. FAQPage 5-6 Q&A bien formées. Home : Organization (logo, sameAs×3) + WebSite SearchAction. aggregateRating absent = correct (pas de vraies reviews).

**Findings :**
- **[High]** NutritionInformation vide sur 2-qt-slow-cooker-recipes (servingSize seul, 0 calories/macros) — contredit le backfill "46/46"
- **[Medium]** recipeCategory multi-tags en un Text unique (Google attend une catégorie unique)
- **[Medium]** Format calories incohérent (4 recettes : "580", "650 per serving", "520 kcal", "540" vs "620 calories")
- **[Medium]** Cluster sans ItemList (/recipes/cluster/one-pan-dinners-for-two : seul BreadcrumbList)
- **[Medium]** Hub /guides sans BreadcrumbList
- **[Low]** Organization.logo = URL nue (pas ImageObject)
- **[Low]** SearchAction format legacy ("required name=..." vs "required")
- **[Low]** recipeYield incohérent ("2" vs "2 servings")

---

## 5. Performance (CWV) (96/100)

**Ce qui marche :** Score PSI mobile 96/100 (Access 100, BP 96, SEO 100), desktop 99. CLS 0.00. TBT 9ms (proxy INP excellent). 0 script tiers. Fonts self-hosted (Playfair+Geist woff2, 67 KiB). Payload 681 KiB/38 req. Images Cloudinary f_auto/q_auto.

**Findings :**
- **[Critical]** Script Vercel Analytics mort — /_vercel/insights/script.js → 404 (MIME text/html refusé) sur chaque page
- **[Medium]** LCP lab 2.56s (juste au-dessus du seuil 2.5s ; CSS render-blocking 617ms → image hero 69.4 KiB)
- **[Medium]** CSS render-blocking (2 chunks, 610ms économisables)
- **[Low]** Images sur-dimensionnées (w=768 pour rendu ~378px, 32 KiB gaspillés)
- **[Low]** 13 KiB polyfills legacy (cible ES2022 partielle)

> CrUX field data indisponible (trafic Chrome insuffisant, site jeune) — lab sain, à re-tester dans 2-4 semaines.

---

## 6. AI Search Readiness (75/100)

**Ce qui marche :** llms.txt exemplaire (46 recettes + API raw JSON ouverte aux LLM). SSR complet (aucun shell SPA). Tous crawlers IA autorisés (wildcard + OAI-SearchBot/PerplexityBot explicites). Passages FAQ 74-109 mots, réponse directe + mot-clé dans les 60 premiers mots. JSON-LD Recipe complet + FAQPage. Brand cohérent.

**Findings :**
- **[Medium]** Blocs FAQ sans conteneur sémantique HTML (H2 nues, pas de details/accordion)
- **[Medium]** Hub /guides sans JSON-LD (porte d'entrée des 21 clusters)
- **[Low]** Meta descriptions 151-161 chars (troncature)
- **[Low]** Méta hub /guides hors focus ("French cooking tips" vs cible)
- **[Low]** Pas de llms-full.txt ni de hubs dans llms.txt
- **[Low]** Aucune table de nutrition visible (JSON-LD seulement)

---

## 7. Images (88/100)

**Ce qui marche :** Images Cloudinary f_auto/q_auto, 0 image cassée (16 imgs vérifiées), alt présents, formats optimisés, aucune troncature ellipsis. Contraste excellent (8.2-15.6:1, AAA). CLS 0.

**Findings :**
- **[Medium]** Images sur-dimensionnées sur certaines recettes (next/image w=768 pour rendu ~378px)
- **[Low]** LCP image hero sur le hub /recipes (3.9s) — fetchpriority manquant

---

## 8. SXO / Search Experience (41/100)

**Méthode :** inventaire du sitemap (96 URLs) + analyse SERP-backwards. ⚠️ Limitation : WebSearch/WebFetch indisponibles chez l'agent (modèle API invalide) — pas de SERP Google live ; types de pages qui rankent basés sur les conventions SERP établies, à revalider avant implémentation.

**Findings :**
- **[Critical]** Gap intent "vegetarian meals for two" — 0 URL veg/vegan (category/vegetarian 308→easy) ; SERP = listicles (EatingWell, Taste of Home) → créer pilier cluster vegetarian + catégorie + 4-6 recettes
- **[Critical]** Gap intent "skillet recipes" — le mot "skillet" n'existe nulle part ; SERP = collections (Allrecipes, Delish) ; seul proche category/one-pan cannibalisée → créer category/skillet (ou renommer one-pan), tagger les recettes poêle
- **[High]** Cannibalisation "chicken dinners for two" (39/39) — 0 clic, aucune des deux pages ne ranke page 1 → 301 catégorie→cluster + recettes manquantes
- **[High]** 3 URLs concurrentes sur "romantic dinner for two" (2 hubs /recipes/ + 1 /idees/) → consolider sur romantic-dinner-ideas-for-two

**Pattern transverse :** 0 clic/1022 impressions = 2 intents non servis + 2 cannibalisations + autorité de domaine insuffisante.

---

## 9. Backlinks (site jeune — non noté)

**Ce qui marche :** 0 lien externe confirmé mais **attendu** (domaine créé 02/07, lancé ~27/07, aucune fenêtre de crawl Common Crawl couverte — prochain point de données ~Q4 2026). Profil = page blanche, PAS une pénalité. Pinterest (profil vérifié, 13/13 boards, Rich Pins) = seul candidat référant réel. Consolidation interne confirmée (0 variante "30-minute" restante). Historique spam juillet clôturé (Google ignore les liens nofollow, aucun nouveau signe de toxicité).

**Recommandations :**
- **Pinterest = levier n°1** (coût nul, déjà vérifié, Rich Pins actifs) — pins réguliers des 46 recettes
- Directory/roundups niche gratuits : 5-10 liens éditoriaux sur 3 mois
- Guest posts sur 2-3 blogs food DA 20-40 (ancre naturelle)
- **Ne pas acheter de liens** ; ne pas toucher aux fermes spam ignorées
- Réévaluer avec Moz/Bing gratuit (Tier 1) ou graph Common Crawl Q3 (~nov-déc 2026)

---

## Conclusion

Le site est **solide techniquement** (82-96/100 en technical/perf/schema) avec un **contenu recette de qualité** (E-E-A-T fort). Les points à corriger sont **concentrés sur l'architecture de contenu** : cannibalisation catégorie/cluster, slugs dupliqués recette/hub, gaps d'intent (vegetarian), et la **jeunesse du site** (pas encore de traction organique — normal à 2 mois, à suivre après indexation complète + backlinks).

**Voir ACTION-PLAN.md pour les priorités Critical > High > Medium > Low.**
