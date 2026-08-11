# Search Experience (SERP backwards) — Findings (audit 2026-08-08)

Méthode : analyse SERP-backwards sur 4 requêtes GSC émergentes (1022 impressions, 0 clic, positions 25-85). Inventaire interne vérifié sur `sitemap.xml` (96 URLs, 46 recettes) + fetch HTTP des pages candidates. **Limitation outillage : WebSearch/WebFetch indisponibles (API model name invalide côté runtime), Bing/DDG/Mojeek/SearxNG bloqués en scraping → pas de SERP Google live.** Le "type de page qui ranke" est dérivé des conventions SERP établies et documentées pour ces classes d'intent, croisées avec les données GSC fournies et l'inventaire vérifié. À revalider sur SERP live avant implémentation.

---

## Requête 1 — "vegetarian meals for two" (GSC émergente, pos 25-85)

**Type de page qui ranke** : listicles/roundups multi-recettes (EatingWell, Taste of Home, The Kitchn, Love & Lemons) — 15-30 recettes, photos + temps + note par carte, format "idées à scanner". Intent : inspiration + décision rapide, pas une recette unique.

**Match du site : AUCUN.**
- `grep -icE 'veget|vegan'` sur les 96 URLs du sitemap = **0 résultat** (confirmé par cluster.md).
- `/recipes/category/vegetarian` → **HTTP 308** vers `/recipes/category/easy` : le redirect casse la sémantique, un chercheur "vegetarian" atterrit sur "Easy Recipes for Two" générique.
- Aucune recette végétarienne dédiée (l'inventaire recettes est dominé chicken/orzo/beef).

**[Sévérité: Critical] Intent entièrement non servi — 0 page, 0 recette, redirect sémantique perdu**
- Recommandation : créer le pilier `/recipes/cluster/vegetarian-dinners-for-two` (format listicle : 15+ recettes, cartes avec temps total + mots-clés) + une vraie catégorie `/recipes/category/vegetarian` (pas de redirect) + générer 4-6 recettes végétariennes pour deux pour l'alimenter. Requête déjà émergente dans GSC → priorité haute.

---

## Requête 2 — "chicken dinners for two"

**Type de page qui ranke** : mix roundups (EatingWell "Chicken Dinners for Two", Delish, Taste of Home) + recettes individuelles en Recipe rich results. Les deux formats coexistent ; le roundup domine les positions 1-3.

**Match du site : type ALIGNÉ, exécution en échec.**
- Pages existantes : `/recipes/cluster/chicken-dinners-for-two` (42 liens /recipes/, 23 recettes), `/recipes/category/chicken` (46), `/recipes/chicken-dinner-for-two`, `/recipes/easy-chicken-dinners-for-two` + 7+ recettes chicken orzo individuelles.
- **Cannibalisation confirmée par cluster.md** : category/chicken vs cluster/chicken-dinners-for-two — overlap 39/39 recettes (100%), titres quasi identiques. Deux URLs indexées pour le même intent → dilution du link equity (42 vs 46 liens), CTR partagé, aucune des deux n'atteint la page 1.

**[Sévérité: High] Cannibalisation 1:1 (39/39) + hubs noyés (19 hubs liés entre eux diluent le jus)**
- Recommandation : 301 la catégorie vers le cluster (URL alignée sur l'intent), ajouter les 7 recettes manquantes au cluster pour le rendre strictement supérieur, réduire les liens hubs↔hubs dans le cluster, ajouter FAQ (PAA) et ItemList JSON-LD sur le pilier. La requête est déjà servie en contenu — c'est la consolidation qui manque.

---

## Requête 3 — "skillet recipes" (GSC : aussi "stove top dinners for two")

**Type de page qui ranke** : pages catégorie/collection de type "Skillet Recipes" (Allrecipes, Delish, Taste of Home) — intent browse : large collection (20-50 recettes) photos + filtres, vocabulaire "skillet" dans le titre. Chevauchement fort avec "one-pan" et "stove top".

**Match du site : AUCUN pour le terme exact.**
- `grep -i skillet` sur le sitemap = **0 URL**. Le terme "skillet" n'apparaît nulle part (ni catégorie, ni cluster, ni titre de recette).
- Plus proche : `/recipes/category/one-pan` (47 recettes) — mais qui cannibalise elle-même avec `/recipes/cluster/one-pan-dinners-for-two` (28/29 identiques, cluster.md).
- Les recettes "skillet-compatibles" existent sans doute (orzo, chicken à la poêle) mais ne sont pas taggées sous ce vocabulaire SERP.

**[Sévérité: Critical] Terme GSC actif avec 0 page dédiée — vocabulaire "skillet" absent de tout le site**
- Recommandation : créer `/recipes/category/skillet` (ou renommer one-pan en "skillet & one-pan" si l'intention SERP penche skillet), tagger les recettes poêle existantes sous skillet (vérifier l'inventaire DB d'abord — si <8 recettes taggées, en générer), viser une collection 12+ recettes avec ItemList. Traite aussi partiellement "stove top dinners for two" (même intent).

---

## Requête 4 — "romantic dinner for two" (GSC : "romantic steak dinner for two")

**Type de page qui ranke** : listicles "romantic dinner ideas for two" (PAA et featured snippet fréquents sur ce pattern) + recettes individuelles steak en Recipe rich results + collections "date night". Intent : planifier une occasion → liste d'idées + recettes clés prêtes à cuisiner.

**Match du site : type BON, exécution en échec.**
- Pages existantes : `/recipes/romantic-dinner-for-two-at-home`, `/recipes/romantic-dinner-ideas-for-two`, `/recipes/steak-dinner-ideas-for-2`, `/recipes/category/date-night` + `/idees/romantic-dinner-ideas-for-two` (3e URL dans un autre namespace).
- **Trois URLs concurrentes** pour le même intent (2 hubs /recipes/ quasi dupliqués + 1 /idees/). Positions 25-85, 0 clic.

**[Sévérité: High] Cannibalisation 3 URLs (2 hubs /recipes/ + 1 /idees/) pour un seul intent**
- Recommandation : consolider sur `/recipes/romantic-dinner-ideas-for-two` (URL alignée sur la requête), 301 les deux autres, y intégrer les recettes steak + la catégorie date-night, ouvrir la page par une liste courte d'idées (ciblage featured snippet/PAA), FAQ en bas. Vérifier l'overlap exact des 2 hubs avant 301 (cf. méthode cluster.md).

---

## Synthèse

| Requête | Type qui ranke | Match site | Sévérité |
|---|---|---|---|
| vegetarian meals for two | Listicle multi-recettes | Aucun (0 page, redirect cassé) | **Critical** |
| chicken dinners for two | Roundup + recettes Recipe | Aligné mais cannibalisation 39/39 | **High** |
| skillet recipes | Collection/catégorie | Aucun (0 page, vocabulaire absent) | **Critical** |
| romantic dinner for two | Listicle + recettes steak | Bon mais 3 URLs concurrentes | **High** |

- **SXO Gap Score : 41/100** — Page Type 4/15 (2 intents sur 4 sans page), Content Depth 6/15 (hubs riches mais cannibalisés), UX Signals 7/15 (recettes solides, hubs denses en liens internes), Schema 6/15 (Recipe sur recettes, mais pas d'ItemList sur hubs/catégories), Media 6/15, Authority 7/15 (domaine jeune, 0 backlinks massifs), Freshness 5/10.
- Cause racine transverse : 0 clic / 1022 impressions à positions 25-85 = intents non servis (veg, skillet) + cannibalisation (chicken, romantic) + autorité de domaine insuffisante pour la page 1.
- Non évalué (outillage SERP KO) : présence exacte de rich results Recipe, PAA, featured snippets et AI Overviews sur les 4 SERPs.

## Limitations
- Pas de SERP Google live : WebSearch/WebFetch cassés (runtime `deepSeek-V4-Flash` rejeté par l'API), Bing (HTML/RSS géolocalisé parasite), DDG, Mojeek (403) et SearxNG (anti-bot JS) bloqués depuis cet environnement.
- Les "types de page qui rankent" reposent sur les conventions SERP documentées de ces classes d'intent (listicle vs collection vs recette) — fiables en tendance, non vérifiés à l'instant T.
- L'inventaire recettes skillet/végétariennes côté DB n'a pas été vérifié (nécessite query DB — fait par d'autres agents d'audit).
- Recommandations de consolidation (301, choix d'URL gagnante) à valider sur SERP live avant exécution.
