# Synthèse des rapports — Seobility + Search Console vs Audit 2026-08-05

> Date: 2026-08-05 | Sources: export Seobility (88%, crawl 08/05), CSV Search Console (état 24/07), audit complet Claude SEO (75/100)

---

## 1. Ce que les rapports apportent de NOUVEAU (non vu par mon audit)

### 🔴 DÉCOUVERTE MAJEURE — 22 pages hub topiques orphelines (guides/idees)
- `lib/hub-content.ts` contient **22 hubs de code** (15 sous `/guides/`, 7 sous `/idees/`) construits pour la session Topical Authority : `recipes-for-two`, `easy-dinner-ideas-for-two`, `baking-for-2`, `slow-cooker-recipes-for-two`, `romantic-dinner-ideas-for-two`, `healthy-dinner-ideas-for-two`, `easy-whole30-recipes`, etc.
- **État vérifié live** : 200 OK, `index, follow`, titres propres → elles SONT indexables.
- **Mais :**
  - ❌ **Absentes du sitemap** (`app/sitemap.ts` ne liste que les 6 clusters recipes + 5 catégories racines + 169 URLs — aucune des 22)
  - ❌ **Non listées par leurs hubs racines** (`/guides` et `/idees` n'affichent que les articles DB → "0 articles" alors que 22 pages existent)
  - ✅ Liées UNIQUEMENT depuis les recettes (section "Looking for more ideas? Browse our …" — silo leaf→hub, `getHubForRecipe`)
- **C'est ainsi que Seobility les a trouvées** (via les liens recette) alors que mon crawl (basé sitemap) ne les a pas vues.
- **Vérifié en DB** : 31 lignes table `recipes`, 100% `content_type=recipe`, **0 article** → ces 22 pages sont 100% du code, pas de la DB.

### 🔴 5 liens internes périmés vers d'anciens slugs (redirections 308)
Résidus de la fusion des doublons de juillet — des recettes lient encore vers les anciens slugs :
| Ancien slug (308) | Destination | Lié depuis (Seobility) |
|---|---|---|
| `/recipes/dinner-for-two-recipes-healthy` | mediterranean-chicken-orzo | summer-herb, white-wine-lemon |
| `/recipes/easy-dinner-for-two-recipes` | white-wine-lemon-chicken-orzo | summer-herb, mediterranean, creamy-parmesan |
| `/recipes/easy-healthy-dinner-recipes-for-two` | summer-herb-chicken-orzo | salmon-orzo, white-wine-lemon, easy-chicken-rice-bowls |
| `/recipes/healthy-dinner-recipes-for-2` | salmon-orzo | romantic-dinner-for-two-at-home, easy-and-healthy |
| `/recipes/simple-dinner-recipes-for-2` | creamy-parmesan | chicken-pot-pie-for-2 |
- **Vérifié live** : `/recipes/summer-herb-chicken-orzo-with-zucchini-for-two` contient bien les liens vers `dinner-for-two-recipes-healthy` et `easy-dinner-for-two-recipes` (→ 308).
- Impact : crawl budget gaspillé, signaux dilués — corriger les liens à la source (contentMarkdown / related links en DB).

### 🟡 4 titres problématiques signalés par Seobility (dont 2 nouveaux pour moi)
1. `/contact` — "Contact **Chef Augustin** | **Chef Augustin**" → répétition de mots (word repetition)
2. `/recipes/category/for-two` — "**For Two** Recipes **for Two** | Chef Augustin" → répétition (et titre maladroit)
3. `/idees/romantic-dinner-ideas-for-two` — "Romantic Dinner Ideas for Two (Date Night at Home) | Chef Augustin" → **615px / 580px, trop long**
4. (1 page supplémentaire non détaillée dans l'export — 4 titres signalés au total)

### 🟡 Conflits de pages signalés par Seobility
- **Anchors identiques** : "romantic dinner ideas for two" → 2 URLs (`/recipes/romantic-dinner-ideas-for-two` recette ET `/idees/romantic-dinner-ideas-for-two` hub) → cannibalisation hub vs recette
- **Pages concurrentes** : `/guides/slow-cooker-recipes-for-two` (hub) vs `/recipes/2-qt-slow-cooker-recipes` (recette) pour "slow cooker" ; `/about` vs `/contact` pour "Chef Augustin" (mineur)

### 🟡 8 pages : mots du titre absents du corps ("Complete", "2-Qt", "Tonight", "Chef Augustin" ×5)
- Mineur ; Seobility ignore les synonymes/grammaire. Les 5 cas "Chef Augustin" = le nom de marque n'apparaît pas dans le corps (normal pour des pages collection).

### 🟡 GSC (état 24/07 — très jeune index)
- **9 pages dans l'index, 8 non indexées, 43 impressions**
- Critiques : 404 ×1 · bloquée robots ×1 (`/dashboard`) · redirection ×1 · canonique ailleurs ×1 · **explorée non indexée ×4**
- Non critique : **indexée malgré blocage robots ×1** (`/dashboard` indexé — cohérent avec mon finding : 200 sans noindex)
- Interprétation : les 4 "explorées non indexées" = probablement 4 catégories minces ou hubs vides ; le 404 et la redirection = anciens slugs.

---

## 2. Convergence avec mon audit (ce que les 3 sources confirment)

| Problème | Mon audit | Seobility | GSC |
|---|---|---|---|
| Catégories minces (123 pages, 1-6 cartes) | 🔴 Critical | 🟡 "little text" 39 pages + "few paragraphs" 34 | 🟡 4 explorées non indexées (probable) |
| Cannibalisation mots-clés | 🔴 Critical | 🟡 anchors identiques + 2 paires concurrentes | — |
| Hubs racines vides ("0 articles") | 🔴 Critical (5 hubs) | 🟡 1 page sans texte (cluster/chicken-dinners) | — |
| /dashboard sans noindex | 🟡 Medium | — | 🟡 indexée malgré robots ×1 |
| Paragraphes dupliqués (recettes, intro ×2) | 🟡 Medium (GEO) | 🟡 9 pages duplicate paragraphs | — |
| 5 hubs racines = promesse vide | 🔴 Critical | — | — |
| Sitemap = mismatch noindex (97 URLs) | 🔴 Critical | — (Seobility ne vérifie pas robots-vs-sitemap) | — |
| GPTBot 429 / challenge Hostinger | 🔴 Critical | — (Seobility passe le challenge) | — |
| Schema : author manquant sur 9 recettes | 🔴 High | — (pas de check schema) | — |

---

## 3. Priorités unifiées (MAJ de l'ACTION-PLAN)

### Semaine 1 — Critiques (nouvel ordre)
1. **Sitemap : ajouter les 22 hubs** `lib/hub-content.ts` (guides/idees) + filtrer les noindex + dédupliquer + ajouter /contact (30 min)
2. **Hubs racines : lister les 22 hubs existants** au lieu de "0 articles" (`CategoryListing` : si 0 articles DB, afficher les hubs du catalogue) → transforme 5 pages vides en 22+5 pages riches, lie les orphelines (1h)
3. **Fixer les 5 liens internes périmés** (308) à la source en DB (1h)
4. **Hostinger : whitelist GPTBot + exclure static/sitemap du challenge** (30 min)
5. **Fixer les 4 titres Seobility** (contact, for-two, romantic-dinner-ideas-for-two…) (15 min)
6. **Author JSON-LD sur 9 recettes** + gate qualité (1h)

### Semaine 2-3 — High
7. Résoudre la collision hub vs recette "romantic dinner ideas for two" (+ slow-cooker hub vs recette)
8. Fusion catégories (123 → ~35) + suppression template "collection of N recipes"
9. Intro recettes dupliquées (9 pages) → supprimer le doublon
10. Catégories : intros 150-250 mots, H2 distincts, "6 recipe s"
11. Clean llms.txt + gate token-répétition
12. Schema : nutrition + recipeCuisine + BreadcrumbList unique

### Mois 2 — Content & Authority
13. Remplir /techniques, /histoire, /equipement (0 hubs existants sous ces catégories — les 22 sont guides/idees)
14. VAGUE 3 (bœuf, fruits de mer, végétarien, porc)
15. Moz/Bing free tier pour baseline backlinks
16. Re-crawl Seobility + GSC (demander l'indexation des 22 hubs via GSC URL Inspection / sitemap)

---

## 4. Points de vigilance

- **Seobility 88% ≠ 75/100 audit** : Seobility ne teste ni noindex-vs-sitemap, ni schema, ni bots IA, ni challenge Hostinger (son crawler passe). Les deux sont complémentaires : Seobility = on-page fin (titres, anchors, redirections), mon audit = indexation/schema/AI.
- **GSC date du 24/07** — avant le fix des 22 intros catégories et le reste. Une re-soumission sitemap + URL Inspection des 22 hubs est le test de vérité.
- Les 22 hubs ont déjà des inbound links (recettes) → leur ajout au sitemap est sûr et prioritaire.
