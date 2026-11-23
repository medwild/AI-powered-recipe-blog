# CHEF AUGUSTIN — PHASE 1 · EXECUTION BRIEF
**Date :** 23 novembre 2026  
**Source examinée :** `medwild/AI-powered-recipe-blog`, commit `1e97bef` (branche `main`)  
**Statut :** audit du code réalisé ; modifications à effectuer et tester dans l'environnement de développement privé Google AI Studio.  
**Limite d'accès :** le dépôt GitHub a été consulté en lecture ; aucune écriture GitHub, aucune connexion Neon/Cloudinary, aucun déploiement Hostinger n'ont été réalisés.

## Objectif

Construire, séparément de l'application Node.js actuelle, une variante **100 % statique** de Chef Augustin qui :
- utilise **Neon PostgreSQL uniquement dans le Studio privé** comme source de vérité ;
- référence **Cloudinary** pour servir les images sans API secrète dans le public ;
- conserve toutes les URL canoniques, redirections, contenus publiés, métadonnées, JSON-LD et endpoints publics utiles ;
- exporte le site Next.js avec `output: "export"` et `next build --webpack` ;
- n'a **aucune requête Neon**, aucun endpoint d'écriture et aucune authentification admin sur le site public ;
- laisse `www.chefaugustin.com` inchangé pendant toute la phase.

## État vérifié du dépôt

| Élément existant | Emplacement | Diagnostic |
|---|---|---|
| Exporteur Neon en lecture seule | `scripts/export-public-snapshot.ts` | Présent, requêtes SELECT avec projection et hash ; à conserver côté Studio |
| Schéma et validation du snapshot | `scripts/public-snapshot-schema.ts`, `scripts/validate-public-snapshot.ts` | Présents ; à tester au build public |
| Snapshot publié | `data/public-content.json` | Présent au commit examiné (~1,22 Mo) ; valider de nouveau les effectifs et exclusions |
| Générateur Hostinger | `scripts/generate-htaccess.ts` | Présent ; doit être testé sur LiteSpeed staging |
| Accès aux recettes et articles | `lib/queries.ts` | Encore dépendant de `lib/db` et de Drizzle ; **principal obstacle** |
| Accueil | `app/page.tsx` | Importe `lib/queries.ts` |
| Recette | `app/recipes/[slug]/page.tsx` | Importe `lib/queries.ts`, génère les slugs ; conserver SEO et enrichissement JSON-LD |
| Guides | `app/guides/[slug]/page.tsx` | `dynamicParams = true` et accès DB ; inclure aussi les 11 `HUBS` |
| Recherche et catalogue | `app/recipes/page.tsx` | Contient `revalidate = 3600` ; retirer ISR et garder recherche client |
| Évaluations | `components/recipe-rating.tsx` | Envoie encore des écritures via `rateRecipe()` ; convertir en lecture seule |
| Pinterest | `app/api/recipes/pins/route.ts` | DB runtime + `pinVariants` ; reproduire contrat statique et CORS |
| Raw JSON | `app/api/recipes/raw/**` | DB runtime ; produire JSON statique |
| Autres flux | `app/feed.xml/route.ts`, `app/llms.txt/route.ts`, `app/sitemap.ts` | Dépendent de Neon ; générer depuis snapshot et catalogues code |
| Images | `lib/cloudinary-url.ts` + `next/image` | Éviter `/_next/image` dans l'export ; réutiliser Cloudinary CDN |

**Remarque :** Le rapport Phase 0B fourni précédemment annonce 52 recettes publiées, 1 article, 6 brouillons exclus et 9 votes réels préservés. Ces chiffres doivent être revérifiés dans l'export utilisé en Phase 1. Ne jamais les corriger artificiellement.

## Ordre d'exécution dans AI Studio

### 1A — Workspace séparé, sans risque pour la production

1. Créer une copie de travail distincte `chef-augustin-public` depuis le commit de référence, **sans modifier la branche de production**.
2. Conserver l'application administrative et les pipelines dans l'espace Studio privé seulement.
3. Préparer un dépôt public minimal : `app/` public, `components/` publics, `lib/` sans accès serveur, `public/`, `data/public-content.json`, `scripts/` de build public, configuration Next et tests.
4. Exclure du nouveau projet : `app/dashboard`, `app/login`, `app/actions`, `app/api/auth`, `app/api/internal`, `app/api/self-improvement`, `app/api/recipes/generate`, `lib/db`, `lib/agents`, SDK IA, `pg`, `drizzle-orm`, Cloudinary Admin SDK, variables privées.
5. **Ne pas pousser le nouveau dépôt GitHub, ni modifier Hostinger à cette étape.**

### 1B — Adaptateur de données public

Créer `lib/public-data.ts` et des sélecteurs purs qui lisent exclusivement le snapshot JSON :
- `getPublishedRecipes*`, `getRecipeBySlug`, `getPublishedArticles*`, `getArticleBySlug`, `getRecipeCategories` ;
- recettes associées, article lié, liens internes, collections, catégories ;
- notes historiques `ratingsByRecipeId`.

**Contrat de compatibilité :** les composants existants attendent parfois `status: "published"` et des objets `Date` (`publishedAt`, `createdAt`, `updatedAt`), alors que le snapshot fournit des chaînes ISO et n'a pas forcément les mêmes champs. Adapter explicitement les données, ou les composants, pour conserver un typage strict et les JSON-LD sans erreur de date. Aucun composant client ne doit embarquer inutilement l'intégralité du JSON (~1,22 Mo).

Conserver le tri, la recherche et les conventions des slugs actuels. Les contenus ne doivent jamais être reconstruits à partir d'IA ni inventés.

### 1C — Rendu 100 % statique

1. Nouveau `next.config.mjs` : `output: "export"`, `trailingSlash: false`, `images: { unoptimized: true }`. Build `next build --webpack`.
2. Supprimer les fonctionnalités incompatibles avec l'export : ISR, `revalidatePath`, Server Actions, middleware/proxy exécuté au runtime, cookies, routes dynamiques sans `generateStaticParams`, `dynamicParams = true`.
3. Pour les routes `[slug]`, retourner tous les slugs explicitement publiés, plus les hubs du catalogue code quand nécessaire ; `dynamicParams = false`.
4. Remplacer l'évaluation interactive par l'affichage des vrais agrégats historiques. **Aucun faux vote**, aucun `localStorage` de comptage simulé.
5. Servir directement les variantes Cloudinary optimisées, avec tailles et priorités LCP mesurées. Éviter la double optimisation `next/image` et tout nouveau téléchargement d'images vers Cloudinary.

### 1D — Contrats externes et SEO

- `GET /api/recipes/pins` : même structure (`status`, `blogName`, `totalFound`, `syncedAt`, `recipes`, et `pinVariants`), MIME JSON, CORS `Access-Control-Allow-Origin: *`.
- `GET /api/recipes/raw` et `/api/recipes/raw/[slug]` : JSON statique correct et 404 pour slug inconnu.
- `/feed.xml`, `/llms.txt`, `/sitemap.xml`, `/robots.txt` : fichiers pré-générés, contenu exact vérifié. Éviter les dates de génération aléatoires qui changent à chaque build.
- `next.config` redirects / `RECIPE_SLUG_REDIRECTS` : compiler en `.htaccess`, conserver les redirects historiques et le comportement `/recettes/<slug>`.
- `staging.chefaugustin.com` : Basic Auth et `X-Robots-Tag: noindex, nofollow`, **sans redirection automatique vers production**.
- URL canoniques des contenus staging : celles de `https://www.chefaugustin.com`, sans indexation du staging.

**Important :** Le système Hostinger/LiteSpeed doit être testé réellement. Ne pas déclarer la compatibilité `.htaccess` comme prouvée sur la seule base d'un build Next.js local.

### 1E — Tests bloquants et livrables

1. `npx tsc --noEmit` puis `npm run build` avec **aucun** `DATABASE_URL`, API IA, Neon/Cloudinary Admin secret ni token GitHub.
2. Vérifier qu'un dossier `out/` existe, contient chaque HTML attendu et aucun endpoint privé ou secret.
3. Confirmer le compte des 52 recettes, 1 article, les hubs/collections et la présence des agrégats réels de notation. Valider l'absence de brouillons.
4. Vérifier toutes les URL du sitemap et les redirections historiques à partir d'un manifeste de routes ; tester les canoniques, OG, JSON-LD et le comportement 404.
5. Contrôler les réponses JSON, la présence des `pinVariants`, les MIME, les en-têtes CORS attendus et les ressources images.
6. Évaluer les Core Web Vitals du staging avant toute bascule ; ne pas prétendre que `loading="lazy"` est approprié pour chaque image sans audit LCP.
7. Documenter les différences de comportement inévitables : absence de vote nouveau, publication uniquement après rebuild.

## Critères d'acceptation Phase 1 (avant GO pour staging)

- Build statique réussi, **sans connexion Neon** et sans variable secrète.
- Aucune dépendance serveur (SQL, IA, Cloudinary Admin) dans le projet public.
- Contenus et SEO au moins à parité avec les données publiées actuelles.
- Recettes/collections/hubs correctement générés ; 404 natif pour les slugs inconnus.
- APIs publiques statiques contractuellement compatibles (en particulier PinScheduler).
- Snapshot sans donnée privée ; contrôle anti-fuite exécuté sur **tout `out/`**.
- Scripts de build et générateur `.htaccess` reproductibles.
- Aucune écriture en base, aucun upload/suppression Cloudinary, aucun changement d'abonnement.
- **Aucun push et aucun déploiement Hostinger sans approbation explicite.**

## Résultats attendus d'AI Studio

1. Arborescence du nouveau projet isolé `chef-augustin-public`.
2. Liste des fichiers supprimés/adaptés/créés.
3. Nouveau `lib/public-data.ts` et adaptateurs nécessaires.
4. Snapshot et rapport de validation des contenus publiés.
5. Build statique `out/` et logs de tests.
6. Audit des routes, JSON-LD, Cloudinary, SEO et sécurité.
7. Liste des risques et divergences restantes.
8. **Point d'arrêt avant toute création de dépôt distant, push GitHub, configuration hPanel et déploiement staging.**

## Documentation technique de référence

- Next.js Static Exports : https://nextjs.org/docs/app/guides/static-exports
- `generateStaticParams` : https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Next.js ISR (non pris en charge par static export) : https://nextjs.org/docs/app/guides/incremental-static-regeneration
