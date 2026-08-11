# Technical SEO Audit — www.chefaugustin.com

Date : 2026-08-08 · Méthode : curl + claude-seo (fetch, sitemap_discovery, pagespeed_check) · Échantillon : 96 URLs sitemap, 3 PSI (homepage, recette, hub)

Score technique estimé : 82/100

---

## 1. Crawlability

**[Sévérité: Info] robots.txt sain et sitemap déclaré validé**
Preuve : `GET /robots.txt` → 200. Déclaration `Sitemap: https://www.chefaugustin.com/sitemap.xml` validée par le helper `sitemap_discovery.py` (source: robots.txt, status 200, kind urlset, valid: true).
Détail : `Disallow: /dashboard`, `Disallow: /api/` avec `Allow: /api/recipes/raw` (règle plus longue gagne — correct). Règles bot-spécifiques (OAI-SearchBot, PerplexityBot, Bingbot, Googlebot) redondantes avec `Allow: /` mais inoffensives.
Recommandation : aucune.

**[Sévérité: Info] sitemap.xml : 96 URLs, toutes 200 au spot-check, lastmod frais**
Preuve : 96 `<loc>` ; URL homepage/hub/recettes/cluster vérifiées → 200. `lastmod` 2026-08-08 (régénéré).
Recommandation : aucune.

## 2. Indexability

**[Sévérité: High] 7 pages /idees/* dans le sitemap sans tag canonical**
Preuve : `grep -c canonical` = 0 sur `/idees/romantic-dinner-ideas-for-two` (idem `/idees/dinner-recipe-ideas-for-two`, `/idees/easy-meal-ideas-for-two`). Toutes les autres routes ont un canonical self. Ces pages sont indexables par défaut (pas de meta robots non plus) et dans le sitemap ; le slug voisin `/recipes/romantic-dinner-ideas-for-two` (recette réelle) existe → risque de sélection d'URL non déterministe par Google sur une intent proche.
Recommandation : ajouter `<link rel="canonical">` self-referencing dans `generateMetadata()` du layout utilisé par `/idees/[slug]`.

**[Sévérité: Medium] og:url absent ou erroné sur les pages internes**
Preuve : aucun `<meta property="og:url">` sur `/recipes/romantic-dinner-ideas-for-two`, `/recipes`, `/recipes/cluster/quick-healthy-dinners` ; sur `/idees/romantic-dinner-ideas-for-two`, og:url = `https://www.chefaugustin.com` (homepage). Seule la homepage a un og:url correct.
Recommandation : og:url = URL canonique de chaque page dans generateMetadata (utiliser le slug/URL courante, pas une constante).

**[Sévérité: High] Soft-404 : slugs recette inexistants renvoient 200 + noindex, et des redirects legacy y mènent (cul-de-sac)**
Preuve : `/recipes/creamy-garlic-chicken` et `/recipes/easy-weeknight-dinners-for-two` → 200, `<title>Recipe not found | Chef Augustin</title>`, `<meta name="robots" content="noindex">`. Or `/recettes/creamy-garlic-chicken` → 308 → ce soft-404 : le redirect legacy est un cul-de-sac qui perd le link equity et gaspille le crawl budget (Google traite 200+noindex comme soft-404). Aucune recette "creamy-garlic-chicken" dans l'API (46 slugs vérifiés).
Recommandation : supprimer le redirect `/recettes/creamy-garlic-chicken` et le remplacer par un 410 ou un 301 vers la recette la plus proche (`/recipes/creamy-parmesan-garlic-chicken-orzo-for-two`) ; sinon, renvoyer un vrai 404 pour ces slugs.

**[Sévérité: Info] Canonicals self-referencing OK partout ailleurs**
Preuve : homepage, `/recipes`, `/idees`, `/guides`, `/recipes/cluster/*`, pages recettes → canonical = URL courante.
Recommandation : aucune.

**[Sévérité: Info] Consolidation www/https complète, chaînes propres**
Preuve : `http://chefaugustin.com` → 301 → `https://chefaugustin.com` → 301 → `https://www.chefaugustin.com` (2 hops) ; `http://www` et `https://` non-www → 301 direct vers https www.
Recommandation : optionnel — règle de redirect directe http://non-www → https://www pour éviter le double hop.

**[Sévérité: Info] hreflang : 0 tags — cohérent (site monolingue anglais)**
Preuve : `grep -c hreflang` = 0 sur homepage.
Recommandation : aucune.

**[Sévérité: Info] Query URL auto-canonicalisée, pas de doublon**
Preuve : `/recipes?cluster=dinner` → 200 mais `<link rel="canonical" href="https://www.chefaugustin.com/recipes">`. Legacy `/recettes?cluster=dinner` → 308 → `/recipes?cluster=dinner` → canonical `/recipes`.
Recommandation : aucune.

## 3. Security

**[Sévérité: Info] HTTPS + HSTS + headers de base excellents, zéro mixed content**
Preuve : HTTP/2 + alt-svc h3 ; `strict-transport-security: max-age=63072000; includeSubDomains; preload` ; `x-frame-options: DENY` ; `x-content-type-options: nosniff` ; `referrer-policy: strict-origin-when-cross-origin` ; 0 lien `http://` dans le HTML homepage. Certificat valide (aucune erreur TLS).
Recommandation : aucune.

**[Sévérité: Medium] CSP minimale (upgrade-insecure-requests uniquement)**
Preuve : header `content-security-policy: upgrade-insecure-requests` — pas de default-src/script-src/object-src.
Recommandation : ajouter une CSP complète ; au minimum `default-src 'self'; object-src 'none'; base-uri 'self'` (adapter pour Next.js/_next/static et styles inline).

**[Sévérité: Low] Permissions-Policy absente**
Preuve : header absent sur homepage.
Recommandation : ajouter `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**[Sévérité: Info] /dashboard : 200 shell sans protection serveur, mais sans fuite de contenu**
Preuve : `/dashboard` → 200 (`Editorial Studio | Chef Augustin`), même avec token invalide → shell vide côté HTML (auth client-side), contenu editorial absent du HTML serveur. Robots disallow en place.
Recommandation : surveillance — si des données editoriales sont un jour rendues côté serveur dans ce shell, ajouter une vérification serveur du token (et renvoyer 401).

**[Sévérité: Info] /api/recipes/raw : exposition publique volontaire, aucun draft fuité**
Preuve : 200, `application/json`, 1 184 229 octets, 46 items ; 0 slug hors sitemap, 0 recette sitemap absente de l'API. `Allow: /api/recipes/raw` dans robots.txt (voulu pour l'app Pins).
Recommandation : vérifier que le cache CDN (LiteSpeed) est purgé lors des mises à jour recettes ; envisager un cache long + ETag.

## 4. Core Web Vitals (PSI API, lab mobile, 2026-08-08)

**[Sévérité: Medium] LCP lab au-dessus de 2.5s sur les 3 pages testées ; le hub est le pire**
Preuve (lab mobile) :
- Homepage : LCP 2.6s, CLS 0, TBT 10ms, perf 96/100
- Recette `/recipes/romantic-dinner-ideas-for-two` : LCP 2.9s, CLS 0, TBT 20ms, perf 93/100
- Hub `/recipes` : LCP 3.9s, CLS 0, TBT 0ms, SI 4.0s, perf 87/100
Opportunités Lighthouse : unused JS (~150ms de gain) sur les 3 ; server response time (~84-93ms).
Recommandation : sur le hub, précharger/prioriser l'image hero (fetchpriority=high) et réduire son poids ; pour toutes les pages, purger le JS inutilisé (gain faible) ; vérifier ensuite les données field CrUX dans GSC pour confirmer l'impact réel.

**[Sévérité: Info] INP non mesurable en lab ; TBT très bas → risque faible**
Preuve : TBT 0-20ms sur les 3 pages (proxy fiable de main-thread léger). `field_metrics` vide dans l'API PSI (pas de données CrUX retournées).
Recommandation : confirmer INP field via CrUX dans GSC une fois l'échantillon suffisant ; si l'origin a du trafic, l'absence de données field mérite vérification (l'API ne retourne rien).

## 5. URLs legacy / doublons

**[Sévérité: Info] Redirects /recettes → /recipes en place et propres**
Preuve : `/recettes` → 308 → `/recipes` ; `/recettes/{slug}` → 308 → `/recipes/{slug}` (1 hop, testé sur creamy-garlic-chicken) ; `/recettes?cluster=` → 308 → `/recipes?cluster=`. Sauf `/recettes/` → 308 → `/recettes` (2 hops) — voir finding soft-404 pour le cas cul-de-sac.
Recommandation : règle directe `/recettes/` → `/recipes`.

**[Sévérité: Info] /idees et /idees/* : pages vivantes, contenu distinct, pas de doublon**
Preuve : `/idees/romantic-dinner-ideas-for-two` → 200, titre "Romantic Dinner Ideas for Two | Chef Augustin", ~5 000 mots de texte visible, contenu différent de la recette `/recipes/romantic-dinner-ideas-for-two` ("Romantic Lemon Butter Chicken Pasta for Two", ~10 500 mots). Les 7 pages /idees/* sont dans le sitemap et indexables — par design.
Recommandation : aucune sur le contenu ; mais corriger les canonicals manquants (High ci-dessus). Note cosmétique : slugs français (/idees/) pour contenu anglais — non bloquant.

---

## Priorisation

1. **High** — Canonical manquant sur 7 pages /idees/* (sitemap + indexables)
2. **High** — Soft-404 `/recipes/creamy-garlic-chicken` + redirect legacy cul-de-sac (200+noindex)
3. **Medium** — LCP lab > 2.5s sur 3/3 pages (hub 3.9s) — prioriser le hero image du hub
4. **Medium** — og:url absent/erroné sur les pages internes
5. **Medium** — CSP minimale
6. **Low** — Permissions-Policy absente
7. **Info** — divers (double hop non-www, chaîne /recettes/, API raw, CrUX field absent)
