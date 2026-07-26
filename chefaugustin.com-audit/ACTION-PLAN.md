# 📋 Action Plan — ChefAugustin.com
> Priorités : 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Low

---

## Phase 1 : Correctifs Critiques (Cette semaine)

| # | Action | Effort | Impact | Owner |
|---|--------|--------|--------|-------|
| 1 | **Activer le JSON-LD Recipe schema** — Le pipeline génère déjà le JSON-LD. Vérifier que `RecipeArticleBody` l'injecte dans `<head>` et que `generateMetadata()` l'inclut. Tester sur une page. | 2h | 🔴 Schema 10→80 | Dev |
| 2 | **Régénérer le sitemap** — Inclure `honey-garlic-salmon-for-two` et `creamy-mushroom-pasta-for-two`. Exclure `test-1784300112023`. Dédupliquer `one-pot-lemon-chicken`. | 1h | 🔴 Indexation | Dev |
| 3 | **Supprimer la page test** — `/recettes/test-1784300112023` n'a aucun contenu et pollue le sitemap. La retirer de la DB et du sitemap. | 30min | 🔴 Qualité | Dev |
| 4 | **Corriger les slugs dupliqués** — `one-pot-lemon-chicken-for-two` et `one-pot-lemon-chicken-for-two-1` → garder un seul slug canonique. | 30min | 🔴 Duplicate | Dev |
| 5 | **Ajouter les meta descriptions** — Vérifier que le pipeline les génère et que `generateMetadata()` les expose. | 1h | 🔴 CTR SERP | Dev |

## Phase 2 : Contenu & Structure (Semaine 2-3)

| # | Action | Effort | Impact | Owner |
|---|--------|--------|--------|-------|
| 6 | **Noindex les pages vides** — `/techniques`, `/equipement`, `/histoire`, `/idees`, `/guides` sont vides → `noindex` temporaire ou les remplir. | 1h | 🟠 Thin content | Dev |
| 7 | **Ajouter `@type: Organization` + `BreadcrumbList`** JSON-LD sur toutes les pages. | 2h | 🟠 Rich results | Dev |
| 8 | **Vérifier le rendu SSR des ingrédients/instructions** — Le contenu principal doit être dans le HTML statique, pas en JS-only. Tester avec `curl` + `View Source`. | 2h | 🟠 Indexation | Dev |
| 9 | **Ajouter les nutrition facts** aux recettes — Inclure dans le mega-skill et dans le JSON-LD. | 1h | 🟠 Rich results | Dev+Content |
| 10 | **Corriger les liens cassés** — `/recettes/perfect-white-rice`, `/recettes/sheet-pan-veggies` → créer ces pages ou remplacer les liens. | 1h | 🟠 404 | Content |

## Phase 3 : Optimisations (Mois 2)

| # | Action | Effort | Impact | Owner |
|---|--------|--------|--------|-------|
| 11 | **Activer `f_auto` sur Cloudinary** — Servir WebP/AVIF automatiquement pour réduire le poids des images. | 30min | 🟡 Performance | Dev |
| 12 | **Améliorer les titles tags** — Inclure un keyword secondaire ("30-Minute", "One-Pan", "French-Inspired"). | 2h | 🟡 CTR | Content |
| 13 | **Ajouter `@type: WebSite` + `SearchAction`** — Pour le Sitelinks Search Box dans Google. | 30min | 🟡 SERP | Dev |
| 14 | **Enrichir le llms.txt** — Renseigner temps/difficulté pour les 6 recettes "N/A". | 1h | 🟡 GEO | Content |
| 15 | **Ajouter des blocs "Key Takeaways"** citables — Améliore la citabilité AI Overviews. | 2h | 🟡 GEO | Content |

## Phase 4 : Monitoring (En continu)

| # | Action | Effort | Impact | Owner |
|---|--------|--------|--------|-------|
| 16 | **Google Search Console** — Vérifier l'indexation post-corrections. | Récurrent | 🟢 Suivi | SEO |
| 17 | **Lighthouse CI** — Automatiser les audits Core Web Vitals. | 3h | 🟢 Qualité | Dev |
| 18 | **SEO drift monitoring** — Baselines avant/après chaque déploiement. | 2h | 🟢 Régression | Dev |

---

## Quick Wins (moins de 4h total)

| # | Quick Win | Effort |
|---|-----------|--------|
| QW1 | Activer JSON-LD Recipe (déjà généré côté pipeline) | 30min |
| QW2 | Régénérer le sitemap | 15min |
| QW3 | Supprimer test-1784300112023 | 15min |
| QW4 | Noindex les 5 pages vides | 15min |
| QW5 | Ajouter `f_auto` aux URLs Cloudinary | 15min |

---

*Plan d'action généré le 25 Juillet 2026*
