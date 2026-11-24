# CHEF AUGUSTIN — PHASE 3B
## Strict SEO Non-Regression Audit & `main` Deployment Readiness

**Date :** 2026-11-24  
**Périmètre :** Projet Google AI Studio ORIGINAL (`/app/applet` = Studio privé conservé intact ; `chef-augustin-public/` = frontend public standalone candidat ; `/tmp/chef-augustin-main-prep` = dépôt Git préparé localement sur `main`, commit `0dbcef0`)  
**Opérations distantes effectuées :** **Aucune** (`git push`, merge distant, modification Hostinger, écriture Neon et modification Cloudinary strictement non exécutés).  
**Verdict final :** **GO** *(prêt pour autorisation de push vers `main`)*

---

## 1. Baseline de production (`https://www.chefaugustin.com` — commit `1e97bef`)

Audit en lecture seule exécuté directement contre la production réelle (`https://www.chefaugustin.com`, hébergée sur Hostinger Node.js / LiteSpeed proxy, Next.js 16.4.6 au commit `1e97bef`).

| Élément audité | Valeur observée en production (`1e97bef`) |
|---|---|
| **Domaine & Canoniques** | `https://www.chefaugustin.com` (apex `chefaugustin.com` → `301` vers `https://www.chefaugustin.com/` ; HTTP → HTTPS `301`) |
| **GitHub `origin/main` actuel** | `8baeaed7e615d98fc88257f983fdbea287fcdace` (build TypeScript échoué) ; dernier commit fonctionnel en prod : `1e97bef` |
| **Contenu indexable live** | **52** recettes (`/recipes/[slug]`), **1** article éditorial (`/guides/15-easy-dinner-recipes-for-two`), **11** hubs (`10` `/guides/*`, `1` `/idees/*`), **6** collections (`/recipes/collections/*`), **16** catégories uniques indexables (`/recipes/category/*`) |
| **`/sitemap.xml`** | HTTP `200`, `17 035` octets, **90 URLs** uniques (0 doublon : `/` 1, `/recipes` 1, `/about` 1, `/privacy` 1, `/terms` 1, hubs index `2` [`/guides`, `/idees`], recettes `52`, catégories canoniques `13`, collections `6`, hubs `11`, article `1`) |
| **`/robots.txt`** | HTTP `200`, `598` octets (`Allow: /`, `Allow: /api/recipes/raw`, `Disallow: /dashboard`, `/login`, `/api/` pour `*`, `OAI-SearchBot`, `PerplexityBot`, `Bingbot`, `Googlebot` + `Sitemap: https://www.chefaugustin.com/sitemap.xml`) |
| **`/feed.xml` & `/llms.txt`** | `/feed.xml` HTTP `200` (`40 797` octets, 52 items) ; `/llms.txt` HTTP `200` (`20 481` octets) |
| **APIs publiques** | `/api/recipes/pins` HTTP `200` (`totalFound: 52`, CORS `*`) ; `/api/recipes/raw` HTTP `200` (`52` recettes) ; `/api/recipes/raw/stuffed-peppers-for-two` HTTP `200` |
| **Routes institutionnelles & contact** | `/`, `/recipes`, `/about`, **`/contact` (`200`)**, `/privacy`, `/terms`, `/guides`, `/idees` → `200` ; `/techniques`, `/histoire`, `/equipement` → `301/308` (`next.config.mjs` : `/techniques` & `/equipement` → `/guides`, `/histoire` → `/about`) |
| **Paramètres `/recipes?...`** | `/recipes?cat=easy` et `/recipes?q=chicken` → HTTP `200` avec en-tête `X-Robots-Tag: noindex, follow` |
| **Catégories hors sitemap mais indexables** | `/recipes/category/30-minute`, `/recipes/category/dinner`, `/recipes/category/italian` → toutes les 3 servent HTTP `200` avec `<meta name="robots" content="index, follow"/>` et `canonical` propre (absent du `sitemap.xml`) |
| **Catégories fines & consolidées** | Sur `147` slugs uniques issus des `153` tags bruts : **16** indexables (`200`, `index, follow`), **41** fines (`200`, `noindex, follow`), **90** redirigées (`308`/`301`) |
| **Vérification GSC** | `/google151002a8b34eb75f.html` → HTTP `200` (`53` octets), `BingSiteAuth.xml` & fichier IndexNow `59eee5015a89...txt` présents dans `public/` |
| **Images & En-têtes sécurité** | Images Cloudinary `res.cloudinary.com/dpgm5gata/...` (53 URLs Hero HTTP `200`) ; `HSTS`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `CSP` actifs |
| **Routes privées en prod** | `/dashboard` → `307 /login` (`200`), `/login` → `200`, `/api/articles/raw` → `401` |

---

## 2. Inventaire des URL comparées (`https://www.chefaugustin.com` vs Candidat Standalone)

| Catégorie d'URL | Nombre audité | Détail |
|---|---:|---|
| **Pages cœur, hubs, collections, recettes, article & catégories clés** | **97** | Accueil, `/recipes`, `/about`, `/contact`, `/privacy`, `/terms`, `/guides`, `/idees`, `/techniques`, `/histoire`, `/equipement`, 52 recettes, 1 article, 11 hubs, 6 collections, 13 catégories canoniques + 3 catégories indexables hors sitemap (`30-minute`, `dinner`, `italian`) |
| **Ensemble complet des catégories du snapshot** | **153** | `147` slugs uniques (`16` indexables `200`, `41` `noindex, follow`, `90` redirigées) |
| **Redirections historiques (`next.config.mjs`)** | **153** | `152` redirections exactes + `/recipes/cluster/one-pan-dinners-for-two` (wildcard `:path*`) |
| **Alias `/recettes/{slug}`** | **94** | `52` slugs publiés + `42` alias historiques (`lib/recipe-slug-redirects.ts`) |
| **Endpoints techniques, flux, vérification & privés** | **11** | `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/llms.txt`, `/api/recipes/pins`, `/api/recipes/raw`, `/api/recipes/raw/stuffed-peppers-for-two`, `/api/articles/raw`, `/google151002a8b34eb75f.html`, `/dashboard`, `/login` |
| **Redirections de domaine (Prod)** | **3** | `https://chefaugustin.com/`, `http://chefaugustin.com/`, `http://www.chefaugustin.com/` (+ test `Host: chefaugustin.com` sur candidat) |
| **Assets statiques & médias Cloudinary** | **53 + assets** | `53` URLs Hero Cloudinary (`HEAD 200`) + CSS (`/_next/static/*.css`) et JS (`/_next/static/*.js`) sur `/`, `/contact`, `/recipes/mushroom-risotto-for-two` |

---

## 3. Tableau des différences SEO détaillées (Avant & Après correctifs Phase 3B)

| Surface / URL | Production (`1e97bef`) | Candidat (audit initial) | Différence observée | Gravité | Action prise / Statut |
|---|---|---|---|---|---|
| **`/contact`** *(lien footer)* | `HTTP 200`, canonical `/contact`, `BreadcrumbList`, H1 `Get in Touch with Chef Augustin` | `HTTP 404`, `noindex`, H1 `Page not found` | Page `/contact` omise lors de l'extraction `chef-augustin-public/` | **CRITICAL** | **Corrigé** : `app/contact/page.tsx` restauré à l'identique (`1e97bef`). Re-test : `HTTP 200`, parité 100 %. |
| **`/sitemap.xml`** | **90 URLs** uniques (`STATIC_PAGES = ["privacy", "terms"]` + `/about` 1×) | **91 URLs** (`/about` présent **2 fois** via `8baeaed`) | Doublon `/about` dans le sitemap | **HIGH** | **Corrigé** : `"about"` retiré de `STATIC_PAGES` dans `chef-augustin-public/app/sitemap.ts`. Re-test : **90/90 URLs** identiques à la prod. |
| **`/sitemap.xml` `<lastmod>` statique (37 URLs)** | `new Date()` dynamique à chaque requête (`2026-11-24T...`) | `snap.sourceUpdatedAt` déterministe (`2026-09-04T10:54:39.421Z`) | Les 52 recettes + 1 article conservent exactement le même `<lastmod>` ; seules les 37 pages statiques/catégories/hubs/collections utilisent une date stable au lieu de `now()` | **LOW** | **Conservé** : amélioration SEO (évite de signaler un faux changement quotidien sans contenu neuf). |
| **Ordre des recettes sans `publishedAt` (2/52 : `stuffed-peppers-for-two`, `one-pan-breakfast-sandwich-for-two`)** | `ORDER BY published_at DESC` PostgreSQL (`NULLS FIRST` par défaut) → ces 2 recettes apparaissent en tête sur `/`, `ItemList`, `/feed.xml`, `/llms.txt`, `/api/recipes/pins`, `/api/recipes/raw` | `ORDER BY published_at DESC NULLS LAST, id DESC` dans `export-public-snapshot.ts` → `mushroom-risotto-for-two` (plus récente datée) est en tête | Mêmes **52 recettes**, mêmes sets `ItemList` (ex. 46/46, 39/39), mêmes fiches, mais l'ordre des listes et l'image Hero de `/` changent (`Mushroom-Risotto` au lieu de `Breakfast-Sandwich`) | **LOW** | **Conservé & documenté** : tri chronologique plus cohérent sur la dernière recette datée ; aucun impact sur les URLs, canonicals ni richesse des ensembles `ItemList`. |
| **`<Image>` URLs (`/_next/image` vs CDN Cloudinary)** | `/_next/image?url=https%3A%2F%2Fres.cloudinary.com...` | `https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/w_...` (`unoptimized: true`) | Suppression du proxy serveur `/_next/image`, service direct edge Cloudinary (`53/53` HEAD `200`) | **LOW** | **Conservé** : choix d'architecture validé (réduit latence et bande passante Node.js Hostinger). |
| **Notation communauté (`RecipeRating`)** | Bouton interactif `rateRecipe` (Client Component + Server Action Neon) | Composant lecture seule affichant les notes historiques (`7` recettes, `9` votes) | Plus d'écriture Neon depuis le frontend public ; `aggregateRating` JSON-LD strictement préservé (`7/7`) | **LOW** | **Conservé** : exigence zéro connexion Neon côté visiteur. |
| **Routes privées (`/dashboard`, `/login`, `/api/articles/raw`, etc.)** | `/dashboard` → `307 /login`, `/login` → `200`, `/api/articles/raw` → `401` | `HTTP 404` natif | Surface d'administration totalement retirée du frontend public | **LOW** *(souhaité)* | **Conservé** : isolation stricte Studio privé / frontend public. |
| **Autres 96 pages HTML (titres, descriptions, H1, canonical, robots)** | Baseline `1e97bef` | Identique | **0 différence** sur les 52 recettes, 1 article, 11 hubs, 6 collections, `/`, `/recipes`, `/about`, `/privacy`, `/terms`, et les 16 catégories indexables | — | **Parité 100 % confirmée**. |

---

## 4. Résultats de parité des redirections

| Jeu de tests | Résultat Production (`1e97bef`) | Résultat Candidat (`0dbcef0`) | Écarts / Anomalies |
|---|---|---|---|
| **153 redirections historiques (`next.config.mjs`)** | `153/153` redirigent (`308`/`301`) → `200` final | `153/153` redirigent (`308`) → `200` final | **0/153** écart ; **0** boucle ; **0** chaîne multi-sauts (> 1 hop) ; **0** cible `404` |
| **94 alias `/recettes/{slug}`** | `94/94` redirigent → `/recipes/{slug}` (`200` final) | `94/94` redirigent (`308`, 1 saut) → `/recipes/{slug}` (`200` final) | **0/94** écart ; **0** cible `404` |
| **Routes legacy (`/techniques`, `/histoire`, `/equipement`)** | `/techniques` & `/equipement` → `/guides` (`308`), `/histoire` → `/about` (`308`) | Identique (`308` mono-saut → `200`) | **0** écart |
| **Apex → `www` & HTTP → HTTPS** | `http://chefaugustin.com` → `301` `https://chefaugustin.com` → `301` `https://www.chefaugustin.com/` ; `http://www.chefaugustin.com` → `301` `https://www.chefaugustin.com/` | `curl -H "Host: chefaugustin.com" http://127.0.0.1:3195/recipes` → `301 https://www.chefaugustin.com/recipes` (HTTPS assuré par proxy Hostinger/LiteSpeed) | **Parité conforme** |
| **153 catégories (`147` slugs uniques)** | `16` indexables `200`, `41` `noindex, follow`, `90` redirigées `308` | `16` indexables `200`, `41` `noindex, follow`, `90` redirigées `308` | **0/153** écart (y compris parité exacte sur `/recipes/category/30-minute`, `/recipes/category/dinner`, `/recipes/category/italian` en `200 index, follow`) |

---

## 5. Résultats d'audit JSON-LD

| Type de page | Schémas observés (Prod & Candidat) | Conformité & Parité |
|---|---|---|
| **Accueil (`/`)** | `Organization` + `WebSite` | **Identique** |
| **Pages institutionnelles (`/about`, `/contact`, `/privacy`, `/terms`)** | `BreadcrumbList` (`/about` + `Organization` sur `/`, `/about`, `/recipes`) | **Identique après restauration de `/contact`** |
| **52 fiches recettes (`/recipes/[slug]`)** | `BreadcrumbList` + `@graph` (`Recipe`, `BlogPosting`, `FAQPage`) : `51` pages en `[Recipe,BlogPosting,FAQPage]`, `1` en `[BlogPosting,Recipe,FAQPage]` | **52/52 identiques** ; **7/7** `aggregateRating` présents (`5.0×6`, `4.7×1` sur `creamy-parmesan-garlic-chicken-orzo-for-two`) ; `dateModified` ISO présent `52/52` ; `datePublished` ISO présent `50/52` (les mêmes 2 recettes que la prod ont `publishedAt: null` → champ absent des deux côtés) ; images Cloudinary sur `Recipe`, `BlogPosting` et chaque `HowToStep` |
| **Article éditorial (`/guides/15-easy-dinner-recipes-for-two`)** | `BreadcrumbList` + `@graph` (`Article`, `ItemList`, `FAQPage`, `BreadcrumbList`) | **Identique** (`datePublished`: `2026-08-20T13:34:10.173Z`, `dateModified`: `2026-08-20T15:35:38.892Z`) |
| **11 hubs & 16+ catégories / 6 collections** | `BreadcrumbList` + `ItemList` | **Mêmes ensembles exacts et mêmes cardinalités (`numberOfItems`)** ; seul l'ordre des `itemListElement` reflète le tri `NULLS LAST` sur 18 pages (`ItemList sameSet=true`) |

---

## 6. Liste des anomalies critiques détectées

1. **Anomalie Critique #1 (résolue) :** Absence de `app/contact/page.tsx` dans `chef-augustin-public/`, provoquant un **HTTP 404** sur `https://www.chefaugustin.com/contact` alors que la page est en production (`HTTP 200`) et directement liée dans `SiteFooter`.
2. **Anomalie Haute (résolue) :** Duplication de `https://www.chefaugustin.com/about` dans `chef-augustin-public/app/sitemap.ts` (héritée du commit `8baeaed` : `"about"` ajouté à `STATIC_PAGES` tout en conservant l'entrée explicite `/about`), portant le sitemap à **91 URLs** au lieu des **90 URLs** de production (`1e97bef`).

*(Aucune autre régression critique ou haute n'a été détectée sur les ~450 URLs vérifiées.)*

---

## 7. Correctifs locaux appliqués et re-vérification

1. **Restauration de `/contact` :** création de `chef-augustin-public/app/contact/page.tsx` à l'identique du commit `1e97bef` (vérifié bit-à-bit).
2. **Correction du sitemap :** suppression de `"about"` dans `STATIC_PAGES` (`chef-augustin-public/app/sitemap.ts`, ligne 11 : `const STATIC_PAGES = ["privacy", "terms"]`).
3. **Rebuild & Re-tests sur `chef-augustin-public/` et sur le dépôt préparé `/tmp/chef-augustin-main-prep` (commit `0dbcef0`) :**
   - `npx tsc --noEmit` : **0 erreur**.
   - `npm run build` (`NODE_ENV=production next build --webpack` + `postbuild`) : **réussi (`240/240` routes pré-générées, `/contact` inclus)**.
   - `npm test` : **`SNAPSHOT_VALIDATION_PASSED`** + **`STANDALONE_VALIDATION_PASSED`** (`3 639` fichiers scannés, `0` fuite, `0` `.env*`, `0` package `pg`/`drizzle-orm`/`cloudinary`/IA, `0` route admin).
   - Re-vérification HTTP sur serveur standalone (`127.0.0.1:3195` puis `127.0.0.1:3194` depuis `/tmp/chef-augustin-main-prep`) :
     - `/contact` : `HTTP 200`, titre, canonical, H1 et `BreadcrumbList` strictement identiques à `https://www.chefaugustin.com/contact`.
     - `/sitemap.xml` : **90/90 URLs** (`exactSetMatch: true`, `0` doublon).
     - Assets CSS & JS `/_next/static/*` : `100 % HTTP 200` (`1` feuille CSS + `12–15` chunks JS selon page).
     - `53/53` URLs Hero Cloudinary : `HEAD HTTP 200`.
     - Routes privées (`/dashboard`, `/login`, `/api/auth/login`, `/api/recipes/generate`, `/api/articles/raw`) : `HTTP 404`.
   - Archive locale mise à jour : `/app/applet/chef-augustin-public-standalone.tar.gz` (SHA-256 : `dc3a29f99759607e414b511fe76acafb0d4e23c983c0a45ea6e730b5a145cebf`).
   - Studio privé (`/app/applet`) : inchangé, `npx tsc --noEmit` passe avec `0` erreur.

---

## 8. Procédure exacte de push vers `main` (préparée localement, NON exécutée)

- **État vérifié du dépôt distant :**
  - Dépôt : `https://github.com/medwild/AI-powered-recipe-blog.git`
  - `origin/main` (`HEAD`) : `8baeaed7e615d98fc88257f983fdbea287fcdace` (build TypeScript cassé)
  - Commit prod actif Hostinger : `1e97bef` (parent direct de `8baeaed`)
- **Commit préparé localement (non poussé) :**
  - Emplacement de staging Git : `/tmp/chef-augustin-main-prep`
  - Branche : `main`
  - Commit prêt : **`0dbcef0`** (`chore(public): deploy standalone static-snapshot frontend to main`)
  - Tags locaux de sauvegarde : `backup/prod-1e97bef` (sur `1e97bef`) et `backup/failed-main-8baeaed` (sur `8baeaed`)
  - Arborescence exacte de `0dbcef0` (**148 fichiers** suivis) :
    - Diff vs `8baeaed` (`origin/main`) : **+2 ajoutés** (`DEPLOY_STANDALONE.md`, `scripts/validate-standalone.ts`), **34 modifiés**, **800 supprimés** (suppression totale du dashboard, login, actions, routes API privées, `lib/db`, `lib/agents`, `drizzle/`, dossiers CSV/audits et dossier imbriqué `chef-augustin-public/`).
    - Diff vs `1e97bef` (prod actuelle) : **+4 ajoutés** (`DEPLOY_STANDALONE.md`, `lib/public-data.ts`, `lib/public-types.ts`, `scripts/validate-standalone.ts`), **40 modifiés**, **659 supprimés**.
    - Vérification `git ls-files` : **0 fichier `.env*`**, **0 secret**, **0 route privée**.
  - Build propre testé directement dans `/tmp/chef-augustin-main-prep` : `npm ci --include=dev` (`387` paquets) → `npx tsc --noEmit` → `npm run build` → `npm test` → démarrage `node .next/standalone/server.js` vérifié (`18/18` routes `200`, CSS/JS `200`, privées `404`).

### Commandes exactes à exécuter une fois votre autorisation donnée

```bash
# 1. Vérifier que origin/main n'a pas bougé depuis 8baeaed
git -C /tmp/chef-augustin-main-prep fetch origin
git -C /tmp/chef-augustin-main-prep rev-parse origin/main
# Doit afficher : 8baeaed7e615d98fc88257f983fdbea287fcdace

# 2. Vérifier le log local avant push
git -C /tmp/chef-augustin-main-prep log -n 3 --oneline
# 0dbcef0 chore(public): deploy standalone static-snapshot frontend to main
# 8baeaed refactor: unify public data fetching
# 1e97bef refactor: centralize authentication and security checks

# 3. Pousser les tags de sauvegarde (optionnel, recommandé) et pousser main (fast-forward propre)
git -C /tmp/chef-augustin-main-prep push origin backup/prod-1e97bef backup/failed-main-8baeaed
git -C /tmp/chef-augustin-main-prep push origin main
```

### Configuration attendue côté Hostinger Node.js (inchangée)
- **Branche déployée :** `main`
- **Build command :** `npm run build` *(si l'environnement de build exporte `NODE_ENV=production` pendant `npm install`, configurer l'install sur `npm ci --include=dev`)*
- **Start command :** `npm start` (`node .next/standalone/server.js`)
- **Variables secrètes :** aucune requise (`DATABASE_URL` non nécessaire ; optionnel : `NEXT_PUBLIC_SITE_URL=https://www.chefaugustin.com`).

---

## 9. Plan de rollback Hostinger (`1e97bef`) — Non destructif

Si une anomalie post-déploiement apparaissait après le push de `0dbcef0` sur `main`, ne pas réécrire l'historique avec `push --force`. Utiliser la restauration non destructive par commit de retour vers `1e97bef` :

```bash
# Depuis un clone propre ou /tmp/chef-augustin-main-prep
git checkout main
git pull --ff-only origin main

# Restaurer exactement l'arbre de production éprouvé 1e97bef en créant un nouveau commit propre
git revert --no-commit 1e97bef..HEAD
git commit -m "revert(prod): restore 1e97bef production tree"

# Pousser le commit de rollback sur main → déclenche le rebuild Hostinger vers l'état exact 1e97bef
git push origin main
```

**Vérifications immédiates post-rollback :**
1. `curl -sI https://www.chefaugustin.com/` → `HTTP/2 200`
2. `curl -sI https://www.chefaugustin.com/contact` → `HTTP/2 200`
3. `curl -s https://www.chefaugustin.com/sitemap.xml | grep -c '<loc>'` → `90`
4. `curl -s https://www.chefaugustin.com/api/recipes/pins | jq .totalFound` → `52`

*(Alternative encore plus rapide si Hostinger conserve les artefacts de build : redéployer directement le déploiement `1e97bef` depuis l'historique hPanel en attendant le push du `revert`.)*

---

## 10. Verdict final motivé : **GO**

Le candidat public standalone (`chef-augustin-public/` / commit `0dbcef0` prêt sur `main`) obtient le verdict **GO** pour le déploiement sur `main` dès réception de votre autorisation explicite :

1. **Zéro régression SEO critique subsistante :** les deux écarts bloquants détectés par l'audit réel (`HTTP 404` sur `/contact` et doublon `/about` portant le sitemap à 91 au lieu de 90 URLs) ont été corrigés, reconstruits et re-vérifiés à `100 %` de parité face à `https://www.chefaugustin.com`.
2. **Parité complète des signaux d'indexation :** `90/90` URLs du sitemap, `153/153` redirections historiques, `94/94` alias `/recettes/*`, `153/153` catégories (dont `30-minute`, `dinner`, `italian`), `52/52` recettes + `1/1` article, JSON-LD (`Recipe`, `Article`, `BlogPosting`, `FAQPage`, `BreadcrumbList`, `ItemList`, `7/7` `aggregateRating`), `53/53` images Cloudinary, `/robots.txt`, `/feed.xml`, `/llms.txt`, `/api/recipes/pins` et `/api/recipes/raw`.
3. **Intégration `main` reproductible et sûre :** le commit local `0dbcef0` conserve intact l'historique (`1e97bef`, `8baeaed`), exclut `100 %` du Studio privé et des secrets, compile en clean-room (`npm ci --include=dev && npx tsc --noEmit && npm run build && npm test`) avec `240/240` routes pré-générées et `0` dépendance SQL/IA, tout en laissant intact le Studio privé `/app/applet`.

**En attente de votre autorisation explicite avant tout `git push` vers `origin/main`.**
