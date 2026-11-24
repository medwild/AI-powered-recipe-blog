# CHEF AUGUSTIN — ARCHITECTURE FINALE VALIDÉE
## Private Content Studio (`/app/applet`) + Public Next.js Standalone Frontend (`chef-augustin-public/`)

**Date :** 2026-11-24  
**Périmètre :** Implémentation locale vérifiée dans le compte Google AI Studio original (`/app/applet`)  
**Opérations distantes effectuées :** Aucune (aucun `git push`, aucune fusion sur `main`, aucun changement de branche Hostinger, aucun déploiement Hostinger, aucune écriture Neon, aucune modification Cloudinary).

---

## 1. Structure des deux applications

L'architecture sépare strictement l'atelier éditorial privé (racine) du serveur public autonome (`chef-augustin-public/`) :

### A. Private Content Studio (`/app/applet` — racine)
Rôle exclusif : création, génération IA, validation SEO, publication en base Neon, upload Cloudinary, et export du snapshot JSON public.

- **Interface & Auth Studio :**
  - `app/dashboard/page.tsx` (`Editorial Studio`, `force-dynamic`, `noindex, nofollow`)
  - `app/login/page.tsx` + `app/api/auth/{login,logout}/route.ts`
  - `middleware.ts` + `lib/auth.ts` (`dashboard_auth` HttpOnly cookie, SHA-256 constant-time token check, protection CSRF same-origin, canonical host `www.chefaugustin.com`)
- **Mutations & Server Actions privées :**
  - `app/actions/recipes.ts` (`publishRecipe`, `unpublishRecipe`, `deleteRecipe`, `updateRecipe`, `regenerateImage` + `rateRecipe`)
  - `app/actions/articles.ts` (`publishArticle`, `unpublishArticle`)
- **Pipelines IA, SEO & Routes internes :**
  - `app/api/recipes/generate/route.ts`, `app/api/recipes/[id]/{approve,cancel,status}/route.ts`
  - `app/api/internal/{regenerate-recipe,backfill-links}/route.ts`
  - `app/api/self-improvement/calibration/route.ts`, `app/api/articles/raw{,/[slug]}/route.ts`
  - `lib/agents/{provider,ideogram,serp,cloudinary,json-utils}.ts`, `lib/pipeline/*`, `lib/seo/gate.ts`, `lib/pre-generation-gate.ts`
- **Base de données & Exporteur public :**
  - `lib/db/{index,schema}.ts`, `lib/queries.ts` (pool Neon PostgreSQL)
  - `scripts/export-public-snapshot.ts` + `scripts/public-snapshot-schema.ts` -> produit `data/public-content.json` (`max: 1` connexion Neon courte, strictement en `SELECT` sur `status = 'published'`, sans `workflow_log`, `serp_data`, `image_variants`, `ip_hash`).
- **Correction TypeScript appliquée à la racine :**
  - `lib/public-data.ts` adaptait les chaînes ISO du snapshot sans `status` ni `Date`, causant les 17 erreurs TypeScript du commit `8baeaed`. L'adaptateur convertit désormais `publishedAt`/`createdAt`/`updatedAt` en `Date` et renseigne `status: "published"` tout en conservant `imageVariants: null`, `serpData: null`, `workflowLog: null` pour compatibilité avec les composants Studio. `npx tsc --noEmit` passe avec **0 erreur**.

### B. Évaluation de l'isolation & de la sécurité du Studio privé (Correction 1)

| Surface Studio | Mécanisme en place | État réel vérifié |
|---|---|---|
| **Interface `/dashboard`** | `middleware.ts` (`dashboard_auth` -> 307 `/login`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`) + re-vérification SSR dans `app/dashboard/page.tsx` | **Protégée et conservée active** |
| **7 Server Actions admin** | `checkAuth()` dans `app/actions/recipes.ts` (5 actions) et `app/actions/articles.ts` (2 actions) : `isSameOriginHeaders()` + `verifyDashboardToken()` | **Protégées et conservées actives** |
| **9 API privées / internes** | `requireDashboardAuth(req)` sur `/api/articles/raw*`, `/api/recipes/generate`, `/api/recipes/[id]/{approve,cancel,status}`, `/api/internal/*`, `/api/self-improvement/calibration` (Bearer ou cookie + CSRF same-origin sur mutations) | **Protégées et conservées actives** |
| **Secrets serveur** | Aucun secret dans `NEXT_PUBLIC_*`. `.env.local` ne contient actuellement que `DATABASE_URL`. `DASHBOARD_SECRET_TOKEN` absent -> `verifyDashboardToken()` échoue fermé (`return false`) par défaut | **Protégés (fail-closed)** |

**Faisabilité d'un fonctionnement sans login applicatif :**
- **Verdict actuel : NON SÛR de supprimer l'authentification applicative.**
- **Raisons :**
  1. AI Studio provisionne une URL partagée Cloud Run (`https://ais-pre-6rsfynhs32nnbwa2ya6xob-427750206559.europe-west1.run.app`) en plus de l'URL de développement (`ais-dev-...`).
  2. Aucune isolation réseau / IAP garantissant que seuls vos comptes Google autorisés peuvent atteindre `/dashboard`, les Server Actions et `/api/recipes/generate` n'a pu être démontrée au niveau de la plateforme.
  3. En mode non-production (`NODE_ENV !== "production"`), `lib/auth.ts` autorise les hôtes `.run.app` et `.cloudworkstations.dev` pour le développement. Supprimer `verifyDashboardToken` exposerait donc directement l'écriture Neon, Cloudinary et les quotas IA à toute personne accédant à l'URL Cloud Run.
- **Décision appliquée :** toutes les protections (`middleware.ts`, `lib/auth.ts`, `requireDashboardAuth`, `checkAuth`) sont **intégralement maintenues**. Un accès sans second login ne serait envisageable que si le Studio est exécuté uniquement en local (`127.0.0.1` / tunnel SSH privé) ou derrière un proxy Cloud Run IAP vérifiant un JWT Google Workspace/Identity côté serveur avant toute route.

---

### C. Public Next.js Standalone Frontend (`chef-augustin-public/`)
Application Next.js 16.4.6 complètement isolée, dotée de son propre `package.json`, `package-lock.json` et `node_modules` (173 paquets strictement publics ; **aucune** dépendance `pg`, `drizzle-orm`, `cloudinary`, `@google/genai`, `@anthropic-ai/sdk`).

- **Configuration (`chef-augustin-public/next.config.mjs` & `package.json`) :**
  - `output: "standalone"` + `outputFileTracingRoot: __dirname` (génère `.next/standalone/server.js` directement à la racine du dossier standalone, sans embarquer le `package.json` Studio parent).
  - `build`: `NODE_ENV=production next build --webpack` + `postbuild` copiant `.next/static` et `public` dans `.next/standalone/` pour un serveur prêt à lancer via `node .next/standalone/server.js`.
  - `images: { unoptimized: true }` (URLs Cloudinary CDN directes `f_auto,q_auto/w_{width}`, zéro proxy `/_next/image`).
  - Headers de sécurité HTTP (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`) et **153 redirections historiques 301/308** conservées.
- **Middleware public allégé (`chef-augustin-public/middleware.ts`) :**
  - Uniquement redirection canonique apex `chefaugustin.com` -> `https://www.chefaugustin.com` (`301`) et `X-Robots-Tag: noindex, follow` sur `/recipes?...`. Aucun import de `lib/auth` ni gestion `/dashboard` ou `/login`.
- **Couche données & types (`chef-augustin-public/lib/public-data.ts`, `lib/types.ts`, `data/public-content.json`) :**
  - Lecture exclusive de `data/public-content.json` (`52` recettes publiées, `1` article publié, `153` catégories, `7` recettes notées / `9` votes).
  - Suppression totale des champs internes (`workflowLog`, `serpData`, `imageVariants`) des types et adaptateurs publics afin qu'aucune clé privée n'apparaisse même à `null` dans les payloads RSC `.rsc`.
- **Pages & Route Handlers publics :**
  - Pages SSG pré-générées (`239` chemins statiques/SSG : accueil, `/recipes`, `52` recettes, `1` article guide, `11` hubs, `6` collections, `147` catégories canoniques/secondaires, pages légales & éditoriales).
  - API & flux publics lecture seule :
    - `GET/OPTIONS /api/recipes/pins` (CORS `*`, `52` recettes, `4` variantes Pin par recette)
    - `GET /api/recipes/raw` et `GET /api/recipes/raw/[slug]` (`200` ou `404`)
    - `GET /recettes/[slug]` (redirection `308` mono-saut pour slugs live/legacy, `404` pour slugs morts, origine canonique sûre sans `x-forwarded-host`)
    - `GET /feed.xml`, `GET /llms.txt`, `GET /sitemap.xml`, `GET /robots.txt`
- **Exclusions strictes vérifiées :**
  - Absents de `chef-augustin-public/` et du build standalone (`HTTP 404` confirmé) : `/dashboard`, `/login`, `/api/auth/*`, `/api/internal/*`, `/api/recipes/generate`, `/api/self-improvement/*`, `/api/articles/raw*`, `/api/recipes/[id]/*`, `app/actions/*`, `lib/db/*`, `lib/agents/*`.

---

## 2. Workflow complet de publication d'un article ou d'une recette

1. **Rédaction / Génération (Studio privé — `/app/applet`) :**
   - Authentification sur `/login` avec `DASHBOARD_SECRET_TOKEN` (cookie `dashboard_auth` HttpOnly).
   - Création ou édition depuis `/dashboard` (pipelines IA + SERP + Ideogram + upload Cloudinary si les clés correspondantes sont configurées côté Studio).
   - Stockage en brouillon (`status = 'draft'`) dans Neon PostgreSQL.
2. **Validation & Publication en base (Studio privé) :**
   - Action `publishRecipe(id)` ou `publishArticle(id)` -> exécution de `runSeoGate()` -> passage à `status = 'published'` et mise à jour de `published_at` / `updated_at` dans Neon.
3. **Export & Vérification du snapshot public (Lecture seule Neon) :**
   ```bash
   npx tsx --env-file=.env.local scripts/export-public-snapshot.ts --out data/public-content.json
   cp data/public-content.json chef-augustin-public/data/public-content.json
   ```
   - `export-public-snapshot.ts` ouvre un pool `max: 1` fermé immédiatement après `SELECT` (permettant le scale-to-zero Neon), trie déterministiquement les enregistrements, calcule le `contentHash` SHA-256 et vérifie l'absence de brouillons ou champs privés (`workflowLog`, `serpData`, `imageVariants`, `ipHash`).
4. **Build & Validation locale sans secrets (`chef-augustin-public/`) :**
   ```bash
   env -C chef-augustin-public -u DATABASE_URL -u GEMINI_API_KEY -u CLOUDINARY_API_SECRET -u DASHBOARD_SECRET_TOKEN npm run build
   env -C chef-augustin-public -u DATABASE_URL npm test
   ```
   - Compile Next.js standalone, exécute `postbuild` (copie `.next/static` + `public` dans `.next/standalone`), puis valide le snapshot et les artefacts standalone (`validate-standalone.ts`).
5. **Publication vers la branche de déploiement public (après approbation explicite) :**
   - Pousser uniquement le contenu de `chef-augustin-public/` (ou son artefact buildé selon l'option choisie ci-dessous) sur la branche dédiée au déploiement public sans modifier `main` tant que la validation staging/production n'est pas approuvée.

---

## 3. Stratégie de déploiement via le dépôt GitHub existant (`medwild/AI-powered-recipe-blog`) (Correction 2)

**État actuel vérifié :**
- Production active `www.chefaugustin.com` : commit **`1e97bef`** sur Hostinger Node.js.
- Branche `origin/main` : commit **`8baeaed`** (build TypeScript échoué — à ne **pas** déployer en l'état).
- Conteneur AI Studio original : **aucun `.git` local** (nécessite reconnexion à `origin` avant toute opération Git distante).

### Comparaison des deux options de déploiement

| Critère | Option A — Branche dédiée de déploiement public (ex. `deploy/public-standalone`) *(Recommandée)* | Option B — Intégration directe sur `main` |
|---|---|---|
| **Impact immédiat sur `main` (`8baeaed`) et prod (`1e97bef`)** | **Nul** : `main` reste intact ; rollback immédiat sur `1e97bef` conservé. | Modifie l'historique de `main` ; oblige à décider si `main` porte les deux apps (monorepo) ou seulement le frontend public. |
| **Configuration Hostinger Node.js** | Hostinger pointe vers `deploy/public-standalone` où `package.json`, `app/`, `next.config.mjs` et `data/public-content.json` sont à la racine de la branche (via `git subtree push` ou synchronisation de `chef-augustin-public/`). | Si `main` garde Studio à la racine et `chef-augustin-public/` en sous-dossier, Hostinger doit changer son répertoire racine/commandes (`npm --prefix chef-augustin-public ...`), sinon Hostinger builde le Studio au lieu du site public. |
| **Surface de secrets sur Hostinger** | **Zéro** secret requis sur Hostinger (`DATABASE_URL`, Gemini, Cloudinary Admin absents). Le build Hostinger fonctionne 100 % hors Neon. | Risque si le Studio et le public cohabitent à la racine ou si `.env` Hostinger conserve `DATABASE_URL` inutilement. |
| **Conséquence opérationnelle** | Workflow explicite à 2 vitesses : Studio reste privé dans AI Studio (ou branche séparée) ; chaque publication pousse un diff JSON/frontend propre sur `deploy/public-standalone`. Nécessite un basculement manuel unique de branche dans le panneau Hostinger (ou CI GitHub Actions -> SFTP/Hostinger). | Un seul `git push main`, mais toute erreur sur un fichier Studio bloque le build du site public (exactement comme `8baeaed`). |

**Recommandation :** **Option A (`deploy/public-standalone`)**. Ne modifier ni `main` ni la configuration Hostinger avant validation explicite et fenêtre de bascule contrôlée (avec possibilité de rollback instantané vers `1e97bef`).

---

## 4. Plan de conservation Free Tier Neon & Cloudinary

Basé sur le relevé réel (`FREE_TIER_BASELINE.md`) :

### Neon PostgreSQL (Free Tier : `1 Go` stockage, `100 CU-h/mois`, `5 Go/mois` egress)
- **Situation actuelle :** Stockage total `10 Mo` (~`1,02 %` de `1 Go`), `59` lignes dans `recipes` (`52` recettes publiées, `1` article, `6` brouillons). Le goulot potentiel n'est pas le stockage mais le **compute (CU-heures)** et l'**egress** liés aux requêtes SSR/ISR publiques.
- **Gain architectural apporté :**
  - Le serveur public standalone effectue **0 requête SQL** au runtime des visiteurs (même sous pic de trafic / crawl SEO / bots).
  - Neon reste en veille (**scale-to-zero après 5 min d'inactivité**) 100 % du temps hors sessions actives dans le Studio privé.
  - L'exporteur `export-public-snapshot.ts` utilise un pool borné (`max: 1`, `idleTimeoutMillis: 2000`) fermé immédiatement après lecture.
  - Les notes clients affichées sur les fiches recettes proviennent du snapshot statique (`7` recettes, `9` votes) sans réveiller Neon pour chaque visiteur (les nouveaux votes interactifs sont désactivés sur la version publique statique pour préserver ce zéro-SQL).

### Cloudinary (Free Plan : `25 crédits / 30 jours` partagés entre stockage `1 Go`, transformations `1 000`, bande passante `1 Go`)
- **Situation actuelle :** `53` images Hero publiées + `15–17` URLs markdown + `12` assets codés en dur (`cloud name: dpgm5gata`).
- **Mesures de conservation appliquées dans `chef-augustin-public/` :**
  - `images: { unoptimized: true }` dans `next.config.mjs` : supprime totalement le proxy `/_next/image` (évite les double-transformations et la consommation CPU/bande passante Node.js Hostinger).
  - Largeurs normalisées via `lib/cloudinary-url.ts` avec `f_auto,q_auto` directement sur `res.cloudinary.com`, maximisant le cache CDN edge.
  - **Règle opérationnelle :** aucune ré-upload ni suppression d'assets existants ; upload uniquement lors de nouvelles recettes depuis le Studio privé. *(Note : le relevé exact des crédits consommés sur 30 jours nécessite les clés Admin Cloudinary non présentes localement.)*

---

## 5. Tests réels exécutés (Studio & Public séparés)

### A. Tests du Frontend Public Standalone (`chef-augustin-public/`) — Environnement sans secrets (`env -u DATABASE_URL -u GEMINI_API_KEY -u CLOUDINARY_API_SECRET -u DASHBOARD_SECRET_TOKEN`)

1. **Scan statique d'imports interdits (`grep`) :**
   - **0** import de `@/lib/db`, `@/lib/queries`, `@/lib/auth`, `@/app/actions`, `drizzle-orm`, `@google/genai`, ni référence à `DATABASE_URL`, `GEMINI_API_KEY`, `CLOUDINARY_API_SECRET`, `DASHBOARD_SECRET_TOKEN`.
2. **TypeScript (`npx tsc --noEmit`) :**
   - **Passé — 0 erreur**.
3. **Build Standalone Webpack (`NODE_ENV=production next build --webpack` + `postbuild`) :**
   - **Passé (`EXIT=0`)** : `239` pages statiques/SSG générées + Route Handlers (`/api/recipes/pins`, `/api/recipes/raw`, `/api/recipes/raw/[slug]`, `/recettes/[slug]`) + Middleware.
   - `outputFileTracingRoot` génère `.next/standalone/server.js`, `.next/standalone/package.json` (`chef-augustin-public` uniquement), `.next/standalone/data/public-content.json`, `.next/standalone/.next/static`, `.next/standalone/public` et `.next/standalone/node_modules/` (sans `pg`, `drizzle-orm`, `cloudinary`, `@google/genai`).
4. **Validation Snapshot + Standalone (`npm test` -> `validate-public-snapshot.ts` + `validate-standalone.ts`) :**
   - `SNAPSHOT_VALIDATION_PASSED` : `52` recettes, `1` article, `153` catégories (`13` canoniques), `7` recettes notées (`9` votes), `6` clusters, `11` hubs, `53` URLs Hero + `17` URLs markdown vérifiées, `0` lien cassé, hash `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b`, `0` fuite.
   - `STANDALONE_VALIDATION_PASSED` : **`3 617` fichiers texte scannés** dans `.next/standalone`, `.next/static` et `.next/server` (HTML SSG, payloads `.rsc`, chunks JS, Route Handlers, `data/public-content.json`), **`0` fichier `.env*`**, **`0` package interdit**, **`0` route admin présente**, **`0` fuite** (aucune `DATABASE_URL`, aucune clé API, aucun brouillon, ni aucun champ `workflowLog`/`serpData`/`imageVariants`/`ipHash`).
5. **Tests HTTP réels sur serveur Node.js standalone (`node .next/standalone/server.js` sur `127.0.0.1:3199` & `3198`, sans `DATABASE_URL`) — 26/26 vérifications passées :**
   - `GET /` -> `200` (headers CSP, HSTS, `nosniff`, `Referrer-Policy`)
   - `GET /recipes` -> `200` (sans `X-Robots-Tag`) ; `GET /recipes?cat=easy` -> `200` avec `X-Robots-Tag: noindex, follow`
   - `GET /recipes/garlic-butter-chicken-pasta-for-two` -> `200` (JSON-LD `application/ld+json` + URLs `res.cloudinary.com`)
   - `GET /recipes/nonexistent-slug-999` -> `404`
   - `GET /guides/15-easy-dinner-recipes-for-two` (`200`), `GET /guides/easy-dinner-ideas-for-two` (`200`), `GET /recipes/collections/chicken-dinners-for-two` (`200`), `GET /recipes/category/easy` (`200`)
   - Routes privées exclues : `GET /dashboard` (`404`), `GET /login` (`404`), `POST /api/recipes/generate` (`404`), `POST /api/auth/login` (`404`)
   - `GET /api/recipes/pins` -> `200`, `Access-Control-Allow-Origin: *`, `totalFound: 52`, `pinVariants.length === 4`
   - `GET /api/recipes/raw` -> `200` (`52` éléments) ; `GET /api/recipes/raw/garlic-butter-chicken-pasta-for-two` -> `200` ; `GET /api/recipes/raw/unknown-slug` -> `404`
   - `GET /recettes/garlic-butter-chicken-pasta-for-two` -> `308` vers `/recipes/garlic-butter-chicken-pasta-for-two` ; `GET /recettes/dead-slug-999` -> `404`
   - `GET /recipes/cluster/chicken-dinners-for-two` -> `308` vers `/recipes/collections/chicken-dinners-for-two`
   - `GET /feed.xml`, `/llms.txt`, `/sitemap.xml`, `/robots.txt`, `/hero-kitchen.png` -> `200`
   - `GET /recipes` avec `Host: chefaugustin.com` -> `301` vers `https://www.chefaugustin.com/recipes`

### B. Tests du Studio Privé (`/app/applet` — racine)

1. **TypeScript (`npx tsc --noEmit`) :** **Passé — 0 erreur** (les 17 erreurs de `8baeaed` sont résolues).
2. **Tests unitaires Studio (`npm test`) :**
   - `scripts/test-helpers.ts` : **22/22 passés**.
   - `scripts/test-seo-gate.ts` : **37/37 passés**.
3. **Cohérence Neon <-> Snapshot (`npx tsx --env-file=.env.local scripts/export-public-snapshot.ts --check-diff`) :**
   - **Passé** (`changed: false`, lecture seule, `52` recettes, `1` article, `7` recettes notées, `153` catégories, hash identique `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b`).
4. **Suite Vitest (`npx vitest run`) :**
   - **46/47 tests passés** (`skills.test.ts` 17/17, `phase0b-security-and-static-foundation.test.ts` 9/9, `cluster-resolver.test.ts` 14/14, `phase0b-gate-regression.test.ts` 6/7).
   - *Échec préexistant noté :* 1 assertion dans `__tests__/phase0b-gate-regression.test.ts:405` attend `308` sur `/recettes/sample-chicken` via un mock de `@/lib/queries`, alors que `app/recettes/[slug]/route.ts` dans `8baeaed` lit désormais `@/lib/public-data` (non modifié pour préserver le comportement existant).

---

## 6. Risques restants & blocages honnêtement constatés

1. **Clés Studio absentes de `.env.local` (non testables en exécution réelle ici) :**
   - Seule `DATABASE_URL` est présente dans `.env.local`.
   - Sont **absents localement** : `DASHBOARD_SECRET_TOKEN`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `IDEOGRAM_API_KEY`, `SERPER_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEON_API_KEY`.
   - **Conséquence :** La génération IA de recettes, l'analyse SERP, l'upload d'images Cloudinary, la connexion réelle `/login` sur le Studio et la lecture des quotas Neon/Cloudinary via API **n'ont pas pu être testées en runtime réel** et ne doivent pas être considérées comme validées en production tant que ces variables ne sont pas injectées dans les paramètres sécurisés d'AI Studio.
2. **Authentification Studio maintenue :**
   - Sans démonstration d'isolation Cloud Run/IAP de la plateforme Google AI Studio, le mode sans login applicatif n'est pas activable sans risque de sécurité. L'accès au Studio requiert donc `DASHBOARD_SECRET_TOKEN` via `/login`.
3. **Absence de dépôt `.git` local dans `/app/applet` :**
   - Le conteneur actuel ne contient pas `.git` ni de clé SSH / jeton `gh` pour pousser vers `medwild/AI-powered-recipe-blog`. La reconnexion Git et le push vers une branche dédiée devront être exécutés depuis un environnement disposant des droits d'écriture GitHub.
4. **Note `npm run lint` racine :**
   - Le script préexistant `"lint": "next lint"` dans `/package.json` échoue sous Next.js 16.4.6 (`next lint` supprimé dans Next 16) ; vérifié via `tsc --noEmit` à la place.
5. **Notes utilisateurs sur la version publique statique :**
   - La notation des recettes est en affichage lecture seule des votes historiques (`7` recettes, `9` votes) afin de garantir **0 écriture et 0 connexion SQL Neon** depuis le site public.

---

## 7. Prochaine étape d'implémentation

1. **Côté Studio privé (si vous souhaitez générer/publier depuis AI Studio) :**
   - Configurer dans les secrets d'environnement du projet AI Studio : `DASHBOARD_SECRET_TOKEN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY` (ou `ANTHROPIC_API_KEY`), `IDEOGRAM_API_KEY`, `SERPER_API_KEY`, puis valider un cycle complet `/login` -> génération brouillon -> upload Cloudinary -> publication Neon -> `export-public-snapshot.ts`.
2. **Côté Déploiement Public (après votre approbation explicite) :**
   - Préparer la branche GitHub isolée `deploy/public-standalone` contenant exclusivement `chef-augustin-public/` (sans `main` ni secrets).
   - Tester cette branche sur un environnement de staging Hostinger (`staging.chefaugustin.com` protégé et en `noindex`), puis seulement après validation finale basculer la branche de déploiement Hostinger depuis `1e97bef` vers `deploy/public-standalone`.
