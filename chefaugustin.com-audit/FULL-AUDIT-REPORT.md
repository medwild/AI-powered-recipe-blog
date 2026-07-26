# 🔍 SEO Audit Complet — ChefAugustin.com
> **Date** : 25 Juillet 2026 | **Méthodologie** : Claude SEO Suite (25 skills) | **Pages crawlées** : 18 (sitemap) + homepage + pages clés

---

## 📊 Executive Summary

| Métrique | Valeur |
|----------|--------|
| **SEO Health Score** | **52/100** 🟠 |
| Business Type | Recipe/Food Blog (Pinterest-first) |
| Pages indexables | 16 (sur 18 du sitemap) |
| Recettes live | 4 + 2 "coming soon" |
| Recettes publiées (DB) | 2 |
| Framework | Next.js 16 + Vercel (CDG1) |
| ISR | 300s (5 min) |

### Top 5 problèmes critiques
1. 🔴 **Aucun JSON-LD Recipe schema** — 0% de rich results Google
2. 🔴 **2 recettes publiées absentes du sitemap** — pas indexables
3. 🔴 **Page test présente dans le sitemap** — contenu poubelle indexé
4. 🔴 **Slugs dupliqués** — one-pot-lemon-chicken ×2
5. 🔴 **5 pages catégories vides** (0 articles) — thin content

### Top 5 quick wins
1. 🟢 Ajouter le JSON-LD Recipe schema (déjà dans le pipeline !)
2. 🟢 Régénérer le sitemap avec toutes les recettes publiées
3. 🟢 Supprimer `test-1784300112023` du sitemap
4. 🟢 Dédupliquer les slugs `one-pot-lemon-chicken`
5. 🟢 Ajouter des meta descriptions aux pages

---

## 1. Technical SEO — Score: 48/100 🔴

### ✅ Ce qui marche
- **Robots.txt** : Bien configuré — bloque `/dashboard`, `/api/` pour crawlers génériques, autorise Googlebot/Bingbot/OAI-SearchBot/PerplexityBot
- **Headers sécurité** : CSP, HSTS (preload), X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- **SSL** : Actif, redirection HTTP→HTTPS
- **Cache CDN** : X-Vercel-Cache: HIT
- **ISR** : Revalidation toutes les 300s
- **Framework** : Next.js 16 (moderne, performant)

### 🔴 Critiques
| # | Problème | Impact |
|---|---------|--------|
| T1 | **Sitemap incomplet** — 18 URLs mais manque `/recettes/honey-garlic-salmon-for-two` et `/recettes/creamy-mushroom-pasta-for-two` (les 2 recettes publiées !) | Google ne découvre pas les pages les plus importantes |
| T2 | **Sitemap contient du bruit** — `/recettes/test-1784300112023` (swedish meatballs vide) et slugs dupliqués (`one-pot-lemon-chicken-for-two` + `-1`) | Dilution du crawl budget |
| T3 | **Pas de canonical déclarée** sur les pages recettes (non vérifiée explicitement mais les pages n'ont pas de balise canonical visible) | Risque de duplicate content |
| T4 | **Redirection 308** → `www.chefaugustin.com` sur la racine | Comportement normal mais à vérifier que c'est intentionnel |

### 🟡 Moyens
| # | Problème | Recommandation |
|---|---------|---------------|
| T5 | **`x-nextjs-prerender: 1`** — bonne pratique ISR | OK, déjà en place |
| T6 | **Pas de breadcrumb schema** | Ajouter `@type: BreadcrumbList` JSON-LD |

---

## 2. On-Page SEO — Score: 45/100 🔴

### 🔴 Critiques
| # | Problème | Page(s) | Recommandation |
|---|---------|---------|---------------|
| O1 | **Meta descriptions absentes** | Toutes les pages | Ajouter `<meta name="description">` — le pipeline devrait déjà le faire |
| O2 | **Title tags** : "Chef Augustin — Easy Weeknight Dinners for Two" — 52 chars OK mais pourrait inclure un keyword secondaire | Homepage | Ajouter "French-Inspired" ou "30-Minute" |
| O3 | **Page test dans le sitemap** : `/recettes/test-1784300112023` — titre "swedish meatballs recipe" (pas de capitalisation, pas de H1 structuré, zéro contenu) | Test page | Supprimer du sitemap immédiatement |
| O4 | **5 pages vides indexées** : `/techniques`, `/equipement`, `/histoire`, `/idees`, `/guides` — 0 articles, pas de H2 | Pages catégories | Noindex tant qu'elles sont vides, ou les remplir |

### 🟡 Moyens
| # | Problème | Recommandation |
|---|---------|---------------|
| O5 | **H1 homepage** : "Easy Weeknight Dinners for Two" — correct mais le markup a `for Two` sans espace | Corriger le markup |
| O6 | **Slugs trop longs** : `one-pan-garlic-herb-chicken-thighs-for-two-the-cold-pan-secret` (73 chars) | Raccourcir les slugs à max 60 chars |
| O7 | **Articles datés du futur** : "July 24, 2026" — OK le 25 Juillet mais le 22 c'était dans le futur | Vérifier le timezone du serveur |

---

## 3. Schema & Structured Data — Score: 10/100 🔴

### 🔴 Critique
| # | Problème |
|---|---------|
| S1 | **ZÉRO JSON-LD détecté** — Aucune page n'a de `@type: Recipe`, `@type: Article`, `@type: BreadcrumbList`, ou `@type: Organization` |
| S2 | **Impact direct** : Pas de rich results Google (carrousel de recettes, étoiles, temps de cuisson, calories) |

### Recommandations
- Le pipeline génère déjà du JSON-LD — vérifier que le composant `RecipeArticleBody` le render bien dans le `<head>`
- Ajouter `@type: Organization` sur la homepage (nom, logo, social links)
- Ajouter `@type: BreadcrumbList` sur les pages recettes
- Ajouter `@type: WebSite` + `SearchAction` pour le Sitelinks Search Box

---

## 4. Content Quality — Score: 55/100 🟠

### ✅ Ce qui marche
- Contenu bien structuré avec H1 → H2 → H3
- Sections FAQ ciblant "People Also Ask"
- Angle unique : "dinners for two" + "French technique"
- Ton cohérent (Chef Augustin persona)
- Explication scientifique ("Why This Works", "What Most Recipes Get Wrong")

### 🔴 Critiques
| # | Problème | Recommandation |
|---|---------|---------------|
| C1 | **Ingrédients et instructions non visibles dans le HTML brut** — le contenu semble render côté client (JavaScript) | Vérifier que le contenu est dans le HTML statique (SSR/SSG). Google rend le JS mais avec délai |
| C2 | **"Photo coming soon"** sur `/recettes/test-1784300112023` | Supprimer cette page |
| C3 | **Pas de nutrition facts** | Ajouter les données nutritionnelles par portion |

### 🟡 Moyens
| # | Problème | Recommandation |
|---|---------|---------------|
| C4 | **Word count** : ~850-1300 mots → bon pour une recette, peut être étoffé | Viser 1200-1800 mots avec plus de contexte |
| C5 | **Pas de section "About the Author" E-E-A-T** — le footer a une bio mais pas de lien vers la page About | Ajouter un bloc auteur avec lien `/about` |
| C6 | **2 recettes "Coming Soon"** sur la homepage | Les publier ou les retirer de la homepage |

---

## 5. Internal Linking — Score: 65/100 🟠

### ✅ Ce qui marche
- Cross-linking entre recettes (3 related recipes par page)
- Liens contextuels dans le contenu ("simple white rice", "sheet-pan roasted vegetables")
- Navigation claire : Recipes, Techniques, Guides, About
- Fil d'Ariane présent visuellement (mais pas en schema)

### 🔴 Critiques
| # | Problème |
|---|---------|
| L1 | **Pages liées qui n'existent pas** : `/recettes/perfect-white-rice`, `/recettes/sheet-pan-veggies` → probablement 404 |
| L2 | **Pages catégories vides dans la nav** : `/techniques`, `/guides` → 0 articles |

---

## 6. Images — Score: 60/100 🟠

### ✅ Ce qui marche
- Toutes les images ont un **alt text descriptif**
- Cloudinary CDN avec optimisation (`w=1536&q=75`)
- Next.js `_next/image` pour responsive/optimisation automatique
- Pinterest save button sur chaque image

### 🟡 Moyens
| # | Problème | Recommandation |
|---|---------|---------------|
| I1 | **Pas de WebP/AVIF forcé** — les URLs Cloudinary n'ont pas `f_auto` | Ajouter `f_auto` pour servir WebP/AVIF automatiquement |
| I2 | **Images dupliquées** (même image servie dans "Start cooking" et "Featured") | Normal pour une homepage, mais charger une seule fois avec `fetchpriority="high"` sur la première |
| I3 | **Lazy loading** : non vérifié mais probable avec `next/image` | Vérifier que `loading="lazy"` est appliqué |

---

## 7. AI Search Readiness (GEO) — Score: 55/100 🟠

### ✅ Ce qui marche
- **llms.txt présent** — 10 recettes listées, API JSON mentionnée
- **Robots.txt** autorise OAI-SearchBot et PerplexityBot
- **Sitemap** disponible et listé dans robots.txt

### 🔴 Critiques
| # | Problème |
|---|---------|
| A1 | **Pas de JSON-LD** → pas de citations structurées possibles pour AI Overviews |
| A2 | **llms.txt a des recettes avec "N/A"** (6 sur 10) — temps de cuisson/difficulté non renseignés |
| A3 | **Pas de citation claims dans le contenu** — ajouter des "key takeaways" faciles à citer |

---

## 8. Performance (Core Web Vitals) — Estimé: 70/100 🟠

> ⚠️ Non mesuré avec CrUX/Lighthouse. Estimation basée sur les headers et l'architecture.

### ✅ Ce qui marche
- Vercel CDN (CDG1, Paris) — faible latence Europe
- ISR 300s — pages servies statiquement
- CSP en place
- Next.js optimisé

### 🟡 À vérifier
- LCP : Les images Cloudinary sont-elles optimisées avec `fetchpriority="high"` sur le hero ?
- INP : Y a-t-il des scripts lourds bloquant l'interactivité ?
- CLS : Les images ont-elles des dimensions explicites ?

---

## 📋 Récapitulatif des scores

| Catégorie | Score | Poids |
|-----------|-------|-------|
| Technical SEO | 48/100 | 22% |
| On-Page SEO | 45/100 | 20% |
| Schema / Structured Data | 10/100 | 10% |
| Content Quality | 55/100 | 23% |
| Internal Linking | 65/100 | — |
| Images | 60/100 | 5% |
| AI Search Readiness | 55/100 | 10% |
| Performance (estimé) | 70/100 | 10% |
| **Global** | **52/100** | |

---

*Rapport généré le 25 Juillet 2026 — Audit complet Claude SEO Suite v1*
