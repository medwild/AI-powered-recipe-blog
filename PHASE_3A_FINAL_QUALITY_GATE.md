# CHEF AUGUSTIN — PHASE 3A FINAL QUALITY GATE

**Date :** 2026-11-24  
**Périmètre :** Compte Google AI Studio original (`/app/applet` + `chef-augustin-public/`)  
**Opérations distantes effectuées :** Aucune (aucun `git push`, aucun merge sur `main`, aucun changement Hostinger, aucun déploiement, aucune écriture Neon, aucun upload Cloudinary).

---

## Verdict final : **GO** (pour la préparation du staging Hostinger sur branche dédiée)

Le frontend public standalone est reproductible de zéro sans `DATABASE_URL` ni secret, compile proprement avec Next.js 16.4.6 (`next build --webpack`), passe 100 % des contrôles sécurité/SEO/HTTP en environnement isolé propre, et le Studio privé passe 47/47 tests Vitest + 59/59 tests unitaires.  
*(Condition de passage en production ultérieure : valider la branche `deploy/public-standalone` sur `staging.chefaugustin.com` protégé et en `noindex` avant tout basculement de `www.chefaugustin.com` depuis `1e97bef`.)*

---

## Mission 1 — Finalisation des tests Studio (`__tests__/phase0b-gate-regression.test.ts`)

- **Diagnostic réel :** Le test `ignores spoofed x-forwarded-host/proto on redirects and trusts only proxy-appended client IP headers` appelait `GET /recettes/sample-chicken` (`app/recettes/[slug]/route.ts`). Or cette route importe `getRecipeBySlug` depuis `@/lib/public-data` (architecture statique), alors que le fichier de test ne mockait que `@/lib/queries`, provoquant un `404` au lieu du `308` attendu.
- **Correction appliquée :** Ajout d'un mock `vi.mock("@/lib/public-data", ...)` strictement équivalent au mock `@/lib/queries` existant dans `__tests__/phase0b-gate-regression.test.ts`, sans modifier le code de production ni affaiblir aucune assertion.
- **Résultat mesuré (`npx vitest run`) :** **4/4 fichiers, 47/47 tests réussis (`100 %`)** (`skills.test.ts` 17/17, `phase0b-security-and-static-foundation.test.ts` 9/9, `cluster-resolver.test.ts` 14/14, `phase0b-gate-regression.test.ts` 7/7).
- **Autres contrôles Studio :**
  - `npx tsc --noEmit` : **0 erreur**.
  - `npm test` : `test-helpers.ts` **22/22**, `test-seo-gate.ts` **37/37**.
  - `compile_applet` : **Build succeeded**.

---

## Mission 2 — Audit SEO exhaustif (`chef-augustin-public/` vs contrats de production)

Toutes les vérifications ci-dessous ont été mesurées par diff direct et exécution HTTP sur le serveur standalone :

### 1. Inventaire des routes — Explication exacte du total `239`
`next build --webpack` pré-génère **239** chemins statiques/SSG (`Generating static pages (239/239)`), décomposés comme suit dans `.next/prerender-manifest.json` (238 entrées) + 1 route statique API :
- **10** pages cœur & index : `/`, `/recipes`, `/about`, `/guides`, `/idees`, `/techniques`, `/histoire`, `/equipement`, `/privacy`, `/terms`
- **52** fiches recettes SSG : `/recipes/[slug]`
- **147** pages catégories SSG : `/recipes/category/[slug]` (issues des **153** tags bruts du snapshot moins **6** paires qui collisionnent à la slugification : `dinner for two`/`dinner-for-two`, `one pan`/`one-pan`, `one pan meal`/`one-pan-meal`, `one pot`/`one-pot`, `small batch`/`small-batch`, `stir fry`/`stir-fry`)
- **6** collections SSG : `/recipes/collections/[slug]`
- **11** guides SSG : `/guides/[slug]` (**10** hubs + **1** article publié `15-easy-dinner-recipes-for-two`)
- **1** hub idées SSG : `/idees/romantic-dinner-ideas-for-two`
- **9** flux, icônes & endpoints statiques : `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms.txt`, `/manifest.webmanifest`, `/icon.png`, `/apple-icon.png`, `/favicon.ico`, `/api/recipes/raw`
- **2** pages système Next.js : `/_not-found`, `/_global-error`
- **+ 1** Route Handler statique compté dans les 239 de build : `/api/recipes/pins`
- *(Routes dynamiques on-demand en complément : `/api/recipes/raw/[slug]`, `/recettes/[slug]`, et `ƒ Proxy (Middleware)`).*

### 2. Sitemap, Canonicals & Indexation
- **Diff `app/sitemap.ts` :** Logique identique à la racine, avec `baseDate` déterministe tiré de `sourceUpdatedAt` du snapshot (`2026-09-04T10:54:39.421Z`) au lieu de `new Date()`.
- **Volume vérifié (`/sitemap.xml`) :** **91 URLs** (`/` 1, `/recipes` 1, `/recipes/*` 52, catégories canoniques 13, collections 6, guides 11, idees 1, pages statiques/index 6 dont `/about` présent 2 fois à l'identique du `sitemap.ts` racine).
- **Canonicals HTML vérifiées :** présentes et pointant sur `https://www.chefaugustin.com...` sur `/`, `/recipes`, fiches recettes, catégories, guides et collections.
- **Robots & `noindex` vérifiés :**
  - `robots.txt` identique au fichier racine (`User-Agent: *`, `OAI-SearchBot`, `PerplexityBot`, `Bingbot`, `Googlebot` ; `Allow: /`, `Allow: /api/recipes/raw`, `Disallow: /dashboard`, `Disallow: /login`, `Disallow: /api/`, `Sitemap: https://www.chefaugustin.com/sitemap.xml`).
  - `/recipes?cat=easy` : header HTTP `X-Robots-Tag: noindex, follow`.
  - Catégorie fine `< 3` recettes (`/recipes/category/4-ingredient`) : `<meta name="robots" content="noindex, follow"/>`.
  - Catégorie canonique (`>= 3` recettes, ex. `/recipes/category/easy`) et collections : `index, follow`.
  - En-têtes sécurité HTTP (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`) et redirection apex `chefaugustin.com` -> `https://www.chefaugustin.com/...` (`301`) vérifiés.

### 3. Redirections historiques & Alias `/recettes`
- **153 redirections historiques (`next.config.mjs`) :** `153/153` présentes (`152` exactes + wildcard `/recipes/cluster/:path*` -> `/recipes/collections/:path*`) et **153/153 vérifiées par requête HTTP réelle** (`301`/`308` vers la destination attendue).
- **94 alias `/recettes/{slug}` :** `42` alias legacy (`lib/recipe-slug-redirects.ts`, identique à la racine, `0` chevauchement, `0` cible cassée) + `52` slugs live = **94/94 vérifiés par requête HTTP réelle** (`308` mono-saut vers `/recipes/{slug}`), et `404` confirmé sur slug inexistant (`/recettes/dead-slug-999`).

### 4. JSON-LD, Cloudinary, APIs publiques & Flux
- **JSON-LD vérifié sur HTML généré :**
  - Recette (`/recipes/garlic-butter-chicken-pasta-for-two`) : `BreadcrumbList` + `@graph` (`Recipe`, `BlogPosting`, `FAQPage`).
  - Article guide (`/guides/15-easy-dinner-recipes-for-two`) : `BreadcrumbList` + `@graph` (`Article`, `ItemList`, `FAQPage`, `BreadcrumbList`).
- **Cloudinary :** `53` URLs Hero + `17` URLs inline markdown vérifiées dans le snapshot (`res.cloudinary.com/dpgm5gata/...`) ; `images: { unoptimized: true }` actif ; `lib/cloudinary-url.ts` et `lib/hub-content.ts` strictement identiques à la racine.
- **`/api/recipes/pins` :** `GET` -> `200`, `Access-Control-Allow-Origin: *`, `totalFound: 52`, 4 `pinVariants` par recette, `syncedAt` déterministe ; `OPTIONS` -> `204` avec headers CORS.
- **`/api/recipes/raw` & `/api/recipes/raw/[slug]` :** `GET /api/recipes/raw` -> `200` (52 recettes + `markdown`), `GET /api/recipes/raw/[slug]` -> `200` (champs publics uniquement) ou `404`.
- **`/feed.xml` & `/llms.txt` :** `GET /feed.xml` -> `200` (52 items RSS), `GET /llms.txt` -> `200` (20 481 octets, 92 lignes, conforme au fichier racine).

---

## Mission 3 — Package public reproductible

- **Archive produite :** `/app/applet/chef-augustin-public-standalone.tar.gz`
  - **SHA-256 :** `cda9b984a8cf06475541983d830390b3db23fd17929b828ca2601b78b60cdd00`
  - **Contenu :** `147` fichiers exacts (`73 114 423` octets décompressés / `~69 Mo` compressés en raison des 20 images `.jpeg` héritées de `public/`).
- **Correctif découvert et intégré pendant la phase 3A :**
  - Ajout de `shadcn` (`^4.8.0`) dans `chef-augustin-public/package.json` (`devDependencies`) et `package-lock.json` : indispensable hors workspace parent car `app/globals.css` importe `@import 'shadcn/tailwind.css';`.
  - Ajout de `.gitignore` et `DEPLOY_STANDALONE.md` (précisant `npm ci --include=dev` pour garantir l'installation des outils de build même lorsque `NODE_ENV=production` est défini dans l'environnement).
- **Manifest détaillé :** voir `PUBLIC_DEPLOYMENT_MANIFEST.md` (contient les 147 empreintes SHA-256, les exclusions et les instructions Hostinger).

---

## Mission 4 — Validation de reproduction en environnement propre (`/tmp/chef-augustin-repro`)

Exécutée **sans `DATABASE_URL`, ni clé Gemini, Anthropic, Ideogram, Serper, Cloudinary Admin ou GitHub**, en décompressant l'archive dans un répertoire vierge isolé :

1. `npm ci --include=dev` depuis `package-lock.json` : **réussi** (0 dépendance `pg`/`drizzle-orm`/`cloudinary`/`@google/genai`).
2. `npx tsc --noEmit` : **réussi (0 erreur)**.
3. `npm run build` (`next build --webpack` + `postbuild`) : **réussi (`EXIT=0`)**, `.next/standalone/server.js`, `.next/standalone/.next/static`, `.next/standalone/public` et `.next/standalone/data/public-content.json` assemblés.
4. `npm test` (`validate-public-snapshot.ts` + `validate-standalone.ts`) : **`SNAPSHOT_VALIDATION_PASSED`** + **`STANDALONE_VALIDATION_PASSED`** (**3 617 fichiers scannés**, `0` `.env*`, `0` package interdit, `0` route admin, `0` fuite).
5. Démarrage de `node .next/standalone/server.js` sur `127.0.0.1:3197` et suite HTTP/SEO complète (`REPRO_FULL_SUITE_PASSED`) :
   - **15** contrôles pages/APIs/feeds/assets statiques CSS (`200` / `204` / `404`),
   - **94/94** alias `/recettes/*` (`308`),
   - **153/153** redirections historiques (`301`/`308`),
   - `Host: chefaugustin.com` -> `301` `https://www.chefaugustin.com/recipes`,
   - **7/7** routes privées (`/dashboard`, `/login`, `/api/recipes/generate`, `/api/auth/login`, `/api/internal/regenerate-recipe`, `/api/self-improvement/calibration`, `/api/articles/raw`) confirmées **`404`**.

---

## Mission 5 — État réel du Studio privé (`/app/applet`) — Lecture seule

- **Routes & protections Studio :** `app/dashboard/page.tsx`, `app/login/page.tsx`, 7 Server Actions admin (`app/actions/{recipes,articles}.ts`) et 9 routes API privées (`app/api/auth/*`, `app/api/recipes/generate`, `app/api/recipes/[id]/*`, `app/api/internal/*`, `app/api/self-improvement/calibration`, `app/api/articles/raw*`) **intacts et protégés** (`requireDashboardAuth` / `verifyDashboardToken` / CSRF same-origin).
- **Dépendances Studio (`package.json`) :** `drizzle-orm`, `pg`, `cloudinary`, `jsonrepair`, `next`, `react`, `lucide-react`, etc. présentes et opérationnelles.
- **Variables d'environnement vérifiées :**
  - **Présente dans `.env.local` :** `DATABASE_URL` uniquement.
  - **Absentes de `.env.local` et de `process.env` :** `DASHBOARD_SECRET_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `LLM_PROVIDER`, `IDEOGRAM_API_KEY`, `SERPER_API_KEY`, `SERP_GL`, `SERP_HL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `AUTOPILOT`, `AUTO_APPROVE`, `PRE_GEN_GATE_ENABLED`, `RATE_LIMIT_MAX_PER_MINUTE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
- **Token d'authentification :** `DASHBOARD_SECRET_TOKEN` absent localement -> `verifyDashboardToken()` échoue fermé (`return false`, comportement sûr) ; la connexion interactive au `/dashboard` et les appels IA / upload Cloudinary nécessitent l'injection de ces secrets dans les paramètres sécurisés AI Studio et **n'ont pas été testés en exécution réelle**.
- **Exporteur Neon en lecture seule :** `npx tsx --env-file=.env.local scripts/export-public-snapshot.ts --check-diff` confirmé fonctionnel (`changed: false`, 52 recettes, 1 article, 7 recettes notées, 153 catégories, hash `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b`).

---

## Conclusion & Prochaine action autorisée après validation humaine

- **GO pour préparer la branche `deploy/public-standalone` et le staging Hostinger (`staging.chefaugustin.com`)** à partir de `chef-augustin-public-standalone.tar.gz` (SHA-256 `cda9b984a8cf06475541983d830390b3db23fd17929b828ca2601b78b60cdd00`).
- **Ne pas toucher** à `main` (`8baeaed`) ni au déploiement actif `1e97bef` sur `www.chefaugustin.com` avant validation complète du staging.
