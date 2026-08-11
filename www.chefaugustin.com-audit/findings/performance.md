# Performance — www.chefaugustin.com

> Audit exécuté le 2026-08-08 — PSI API v5 (Lighthouse 13.x, mobile + desktop), CrUX API.
> URLs testées : homepage `https://www.chefaugustin.com/`, recette `https://www.chefaugustin.com/recipes/chicken-pot-pie-for-2`.

## Field data (CrUX) — NON DISPONIBLE

| URL | Résultat |
|---|---|
| Homepage | **404 CrUX** — « insufficient Chrome traffic volume for eligibility » |
| Recette chicken-pot-pie-for-2 | **404 CrUX** — idem |

Trafic Chrome insuffisant pour l'éligibilité CrUX (site jeune, lancement ~juillet 2026). Ce n'est pas une erreur : aucun score field data (LCP/INP/CLS réels) mesurable pour l'instant. À re-tester après croissance du trafic. Toute évaluation CWV repose donc sur le lab.

## Lab data (PSI / Lighthouse 13.x) — Mobile

**Performance score : 96/100** (Accessibility 100, Best Practices 96, SEO 100)

| Métrique | Valeur | Score audit | Seuil "good" |
|---|---|---|---|
| LCP | **2.56 s** | 0.88 | ≤ 2.5 s — **juste au-dessus** |
| TBT (proxy INP) | **9–10 ms** | 1.0 | excellent (INP lab estimé très bon) |
| CLS | **0.00** | 1.0 | parfait |
| FCP | 1.21 s | 0.99 | bon |
| Speed Index | 3.06 s | 0.93 | bon |
| TTI | 2.60 s | 0.98 | bon |

**Desktop : 99/100** (LCP 0.50 s, TBT 10 ms, CLS 0).

## Ressources (homepage, mobile)

- Payload total : **681 KiB** (38 requêtes) — bien sous les 1 600 KiB recommandés
  - Images : 312 KiB (5 req) — via `next/image` → Cloudinary `f_auto,q_auto` ✅
  - Scripts : 221 KiB (17 req) — bundles Next.js (react-markdown retiré, −140 KB confirmé)
  - Fonts : 67 KiB (2 req) — 2 × woff2 self-hosted (Playfair Display + Geist via next/font, hashed `_next/static/media`) ✅
  - Autres : 38 KiB (11 req)
- **Third-party : AUCUN** script tiers détecté (pas d'AdSense, pas de GTM, pas d'analytics dans le lab — grep négatif sur adsense/googletagmanager/doubleclick/analytics) ✅
- DOM : 446 éléments (excellent, < 1 500) ; 1 long task de 68 ms (à la limite des 50 ms)
- Console : 1 erreur JS (voir Critical)

## Findings

### [Critical] Script Vercel Analytics mort — erreur console sur chaque chargement
- **Preuve** : `errors-in-console` — `https://www.chefaugustin.com/_vercel/insights/script.js` répond **404** (le serveur répond text/html) → « Refused to execute script ... because its MIME type ('text/html') is not executable ». Audit échoué (score 0).
- **Cause** : le site a migré Vercel → Hostinger (août 2026), mais le composant `<Analytics/>` de `@vercel/analytics` (ou le script injecté) référence encore `/vercel/insights/` qui n'existe plus sur Hostinger.
- **Impact** : 1 requête 404 par page + erreur console ; pas de tracking fonctionnel ; échec d'un audit Lighthouse.
- **Recommandation** : retirer le composant `<Analytics/>` de `@vercel/analytics` du layout (racine), ou le remplacer par un analytics hébergé (ex. Plausible/Umami auto-hébergé) si le suivi est requis. Vérifier `app/layout.tsx` et le package.json. `npx tsc --noEmit` après modification.

### [Medium] LCP lab à 2.56 s — juste au-dessus du seuil « good » (2.5 s)
- **Preuve** : LCP mobile = 2.56 s (score 0.88). LCP = image hero « One-Pan Chicken and Rice for Two » (69.4 KiB transférés, via `next/image` w=768 q=75).
- **Cause** : chaîne de requêtes critiques (network-dependency-tree échoué) : HTML → CSS (`03g70739w6gu8.css`, 617 ms de coût de blocage) → image LCP. Sur une connexion 4G lente, le CSS render-blocking retarde l'image.
- **Recommandation** :
  1. **Preload du LCP** : `<link rel="preload" as="image" href="...">` sur l'image hero (ou `images.priority` dans next/image) → attendu −100 à −300 ms sur LCP.
  2. Réduire le CSS render-blocking (voir finding suivant) : 610 ms d'économies estimées.
  3. L'image Cloudinary est déjà `f_auto,q_auto` — vérifier que la taille demandée (w=768) correspond à l'affichage réel (le rapport indique 17.8 KiB gaspillés sur l'image LCP — demander une taille plus petite ou AVIF si le navigateur le supporte).
- **Note** : les données field (CrUX) manquent ; sur desktop le LCP est à 0.50 s. Le 75e percentile réel mobile est inconnu.

### [Medium] CSS render-blocking — 610 ms d'économies estimées
- **Preuve** : `render-blocking-insight` (score 0) — 2 feuilles `_next/static/chunks/*.css` : 617 ms + 167 ms de coût de blocage.
- **Cause** : CSS critique non inliné ; Next.js charge les chunks CSS de façon bloquante.
- **Recommandation** : utiliser `next/font` (déjà le cas ✅) et activer l'inlining du CSS critique ou au minimum vérifier que les styles critiques (hero, layout) sont dans le premier chargement. Le plus simple : précharger la feuille CSS principale avec `preload` et/ou réduire le CSS inutilisé (unused-css-rules échoué aussi, sans chiffre).

### [Low] Images non parfaitement dimensionnées — 32 KiB gaspillés
- **Preuve** : `image-delivery-insight` (score 0.5) — 2 images via `next/image` : hero 91.7 KiB (17.8 KiB gaspillés), Whole30 skillet 70.3 KiB (15.1 KiB gaspillés).
- **Cause** : taille de rendu < taille demandée (w=768) ou format non optimal pour ces images.
- **Recommandation** : ajuster la prop `sizes`/`width` de ces images (rendu ~378px en mobile, pas 768) ; s'assurer qu'elles sont servies en AVIF (`f_auto` Cloudinary le gère). Impact faible : ~32 KiB.

### [Low] Legacy JavaScript — 13 KiB de polyfills/transpilation
- **Preuve** : `legacy-javascript-insight` (score 0) — 13 KiB économisables.
- **Recommandation** : vérifier la cible `browserslist`/`esbuild target` du build Next.js — si le trafic est majoritairement Chrome/Safari modernes (Tier 1), cibler ES2022+ (le commit précédent « perf ES2022 » semble déjà partiellement appliqué — le flag persiste, 13 KiB seulement).

### [Low] 1 long task de 68 ms sur le main thread
- **Preuve** : `long-tasks` — chunk `0mk1g55o6kl1e.js`, 68 ms à t=2565 ms.
- **Recommandation** : sous les 50 ms conseillés pour INP, mais à surveiller. Si le site s'enrichit, fractionner. Actuellement négligeable (TBT total 9 ms).

### [Info] Points forts confirmés
- CLS 0.00 (dimensions d'images présentes, pas de shift) ✅
- Payload 681 KiB total, 0 script tiers ✅
- Fonts self-hosted (pas de Google Fonts render-blocking) ✅
- DOM 446 éléments (max recommandé 1 500) ✅
- Desktop 99/100 ✅

## Priorisation

| Priorité | Action | Impact attendu |
|---|---|---|
| P0 | Retirer le script `_vercel/insights` mort (404 + erreur console) | Clean console, 1 audit repassé, −1 requête |
| P1 | Preload image LCP + réduire CSS render-blocking | LCP 2.56 s → ~2.0–2.3 s (sous le seuil good) |
| P2 | Dimensionner les images au rendu réel (sizes) | −32 KiB |
| P3 | Re-tester CrUX dans 2–4 semaines (trafic insuffisant aujourd'hui) | CWV field data |

Méthode : PSI API v5 (Lighthouse 13.x), 1 run lab — valeurs indicatives, à confirmer par des tests répétés. Aucune donnée field CrUX disponible (404 trafic insuffisant).
