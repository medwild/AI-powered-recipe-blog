# CHEF AUGUSTIN — ORIGINAL ACCOUNT RECOVERY CHECKPOINT

**Date du diagnostic :** 2026-11-24  
**Environnement inspecté :** Compte Google AI Studio original (`/app/applet`)  
**Mode :** Audit strict en lecture seule (aucune écriture Neon, aucune modification Cloudinary, aucun push GitHub, aucun déploiement Hostinger).

---

## 1. État réel du projet original

### 1.1 État Git et dépôts
- **Workspace local (`/app/applet`) :** **Aucun dossier `.git`** (`fatal: not a git repository`). Le conteneur a été réhydraté sans historique Git local ; `git status` et `git diff` natifs ne sont donc pas disponibles localement.
- **Dépôt distant GitHub (`https://github.com/medwild/AI-powered-recipe-blog.git`) :** Accessible en lecture seule HTTPS. Refs vérifiées :
  - `main` (`HEAD`) : `8baeaed7e615d98fc88257f983fdbea287fcdace` (`8baeaed`)
  - `master` : `c674c0e1b108eb4b1505f9c7160eb2a33dfb83bd`
  - `fix/patch-vulnerabilities-4b53250e-1785` : `8825ea0`
  - `fix/patch-vulnerabilities-b55bfb48-1789` : `31fb445`
- **Branche candidate `phase2/static-standalone-integration` (`c024969`) :** **Absente du dépôt GitHub distant** (uniquement présente sur le deuxième compte AI Studio).

### 1.2 État du code racine vs `8baeaed`
- Le code applicatif racine correspond à l'état **`8baeaed`** : `npx --no-install tsc --noEmit` reproduit exactement les **17 erreurs TypeScript** connues (`app/page.tsx`, `app/recipes/page.tsx`, `app/recipes/[slug]/page.tsx`, `app/guides|idees|techniques|histoire|equipement/[slug]/page.tsx`, `components/article-detail.tsx`), car `lib/public-data.ts` retourne `PublicRecipeRecord` / `PublicArticleRecord` (dates en `string` ISO, sans `status`).
- **Ajouts locaux présents en plus de `8baeaed` :**
  - Sous-dossier `chef-augustin-public/` (ébauche Phase 1).
  - Exclusion `"chef-augustin-public"` ajoutée dans `tsconfig.json`.
  - `middleware.ts.bak` (identique à `middleware.ts`).
  - `PHASE_0B_PRODUCTION_VERIFICATION.md`.
  - `.env.local` (contenant uniquement la clé `DATABASE_URL`).

### 1.3 Présence du workspace `chef-augustin-public`
- **Présent :** `chef-augustin-public/` contient **139 fichiers** (`app/`, `components/`, `data/public-content.json`, `lib/`, `public/`, `scripts/`, `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`).
- **État incomplet post-réhydratation :**
  - `chef-augustin-public/node_modules` absent (lien symbolique non conservé).
  - `chef-augustin-public/out/` absent (build statique non présent).
  - `tsc --noEmit -p chef-augustin-public/tsconfig.json` remonte **5 erreurs résiduelles** (`publishedAt` manquant dans `app/recipes/page.tsx`, module `@/lib/topical-map` non copié pour `lib/cluster-resolver.ts`).

### 1.4 Fonctions d'administration du Studio privé
Toutes les briques du Studio privé sont **intactes** à la racine :
- Pages : `app/dashboard/page.tsx`, `app/login/page.tsx`
- Server Actions : `app/actions/recipes.ts`, `app/actions/articles.ts`
- API privées/internes : `app/api/auth/{login,logout}`, `app/api/recipes/generate`, `app/api/internal/{backfill-links,regenerate-recipe}`, `app/api/self-improvement/calibration`, `app/api/articles/raw`
- Base & Agents IA : `lib/db/{index,schema}.ts`, `lib/agents/{cloudinary,ideogram,json-utils,provider,serp}.ts`
- Garde de sécurité : `middleware.ts` (`dashboard_auth`, `noindex, nofollow`, redirection canonique).

### 1.5 Snapshot public (`data/public-content.json`)
Présent et **strictement identique** à la racine et dans `chef-augustin-public/data/public-content.json` :
- `schemaVersion` : `"1.0.0"`
- `sourceUpdatedAt` : `2026-09-04T10:54:39.421Z` (aligné exactement sur le dernier `updated_at` en base Neon)
- `contentHash` : `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b`
- `counts` : **52 recettes**, **1 article**, **7 recettes notées**, **153 catégories**.

---

## 2. Connexions disponibles (sans exposition de secrets)

| Service | État local | Détails vérifiés |
|---|---|---|
| **Neon PostgreSQL** | **Opérationnel (lecture vérifiée)** | `DATABASE_URL` définie dans `.env.local` (pooler `eu-central-1`, base `neondb`, `sslmode=verify-full`). Requête `SELECT` confirmée : 52 recettes publiées, 1 article publié, 6 brouillons, `max(updated_at) = 2026-09-04T10:54:39.421Z`. |
| **Cloudinary (CDN public)** | **Opérationnel** | Requête `HEAD` sur `https://res.cloudinary.com/dpgm5gata/...` → `HTTP/2 200`. |
| **Cloudinary (Admin / Upload)** | **Non configuré localement** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` absentes de `.env.local` et `process.env` (l'upload depuis le Studio privé requiert leur injection). |
| **Secrets Studio / IA** | **Non configurés localement** | `DASHBOARD_SECRET_TOKEN`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `IDEOGRAM_API_KEY`, `SERPER_API_KEY` absents de `.env.local` et `process.env`. |
| **GitHub** | **Lecture seule publique** | `git ls-remote` HTTPS fonctionne sans auth. Aucune clé SSH, `.git-credentials` ni session `gh` présente pour pousser. |

---

## 3. Écarts avec la nouvelle version (`c024969`)

1. **Build & TypeScript :** Le projet original (`8baeaed`) échoue avec **17 erreurs TypeScript** à la racine et son ébauche `chef-augustin-public/` comporte **5 erreurs TypeScript** + `node_modules` / `out/` absents ; `c024969` compile proprement (`next build --webpack`, 240 pages, 0 erreur TS).
2. **Contrats statiques & SEO :** `c024969` embarque déjà les 153 redirections historiques validées, l'API PinScheduler statique et l'isolation SQL complète, alors que l'ébauche locale `chef-augustin-public/` n'a pas encore produit ni validé son `out/`.
3. **Risque d'écrasement :** Si `c024969` est un export **100 % public standalone**, son importation directe à la racine supprimerait ou écraserait le Studio privé (`app/dashboard`, `lib/db`, `lib/agents`, `middleware.ts`).

---

## 4. Méthode sûre de récupération de `c024969`

1. **Depuis le deuxième compte AI Studio (source) :**
   - Pousser la branche `phase2/static-standalone-integration` (`c024969`) sur un **nouveau dépôt privé** ou sur une **branche dédiée non-`main`** (sans jamais toucher `main` ni `1e97bef`), **OU** exporter un `git bundle` / archive `.tar.gz` du commit `c024969`.
2. **Dans le compte AI Studio original (cible) :**
   - **Ne pas écraser la racine `/app/applet`** : conserver intactes les briques Studio privé, `lib/db`, `lib/agents`, `scripts/export-public-snapshot.ts` et `.env.local`.
   - **Option recommandée (architecture bicéphale propre) :** remplacer le contenu de `chef-augustin-public/` (après archivage de sécurité si besoin) par les sources de `c024969` (ou un dossier dédié `chef-augustin-public/` proprement isolé), puis recréer le lien vers `../node_modules` (ou installer ses dépendances dédiées).
   - **Alternative Git propre :** réinitialiser `.git` localement en le rattachant à `origin`, créer une branche dédiée pour le chantier, et n'importer `c024969` que dans le périmètre public statique.

---

## 5. Recommandation pour reprendre au niveau exact de la Phase 2B

1. **Préserver la production :** Ne faire aucun déploiement ni push sur `main` ; `www.chefaugustin.com` reste sur `1e97bef`.
2. **Importer `c024969` en répertoire isolé (`chef-augustin-public/`)** plutôt que de refaire manuellement les correctifs déjà terminés sur le deuxième compte.
3. **Vérifier le socle `c024969` localement avant Phase 2B :**
   - Confirmer que `data/public-content.json` dans `c024969` porte bien le hash `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b` (52 recettes, 1 article).
   - Exécuter `tsc --noEmit`, `next build --webpack` (`out/` à 240 pages), le contrôle des 153 redirections, la validation `/api/recipes/pins` et le scan anti-fuite sur `out/`.
4. **Si le Studio privé doit être réutilisé localement sur ce compte :** restaurer `lib/queries.ts` dans les pages Studio/racine (ou séparer définitivement le dépôt Studio de `chef-augustin-public`) et réinjecter les clés d'environnement Cloudinary/IA/Dashboard côté AI Studio sans les commiter.
5. **Enchaîner directement sur la Phase 2B** (préparation du déploiement staging isolé `staging.chefaugustin.com` avec Basic Auth, `X-Robots-Tag: noindex, nofollow` et test réel du `.htaccess` sur LiteSpeed) une fois `c024969` importé et vérifié localement.
