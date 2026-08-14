# Design — Migration `/recipes/cluster/` → `/recipes/collections/` + épaississement des piliers

> Date : 2026-08-14 — Validé par l'utilisateur (design approuvé 14/08)
> Objectif : URLs publiques propres (terme "collections", natif blog de recettes) + 6 pages piliers épaissies (600-800 mots) pour l'indexation

## 1. Contexte

6 pages piliers (topical authority, `lib/topical-map.ts` + `lib/cluster-resolver.ts`) regroupent les recettes par thème via leurs tags. Le segment `/recipes/cluster/` expose du jargon interne SEO dans l'URL. État au 14/08 : **5/6 clusters indexés** par Google ; `small-batch-slow-cooker` refusé ("Discovered - currently not indexed") — page mince (~349 mots visibles, 69 liens recettes). Décision utilisateur : renommer en `/recipes/collections/` (terme natif blog de recettes : NYT Cooking, BBC Good Food, Allrecipes) + épaissir les 6 piliers.

## 2. Preuves vérifiées (14/08, avant implémentation)

- Route = uniquement `app/recipes/cluster/[slug]/page.tsx` (228 lignes)
- `middleware.ts` : 0 référence cluster
- **0 lien `/recipes/cluster/` dans le contenu DB** (content_markdown, excerpt, instructions, ingredients, title) — migration purement code
- Références code : `sitemap.ts:82`, page cluster (canonical:64, breadcrumb:70/128, siblings:195), `recipes/page.tsx:137`, `recipe-hero.tsx:129`, `homepage-clusters.tsx:23`
- 301 wildcard : précédent `/recettes/:path*` (next.config.mjs:59)
- Slug inconnu → 404 : `dynamicParams = false` en place
- Rendu multi-paragraphes : `cluster.description.split("\n\n")` (page.tsx:135, précédent P1.3 du 06-08)
- Audit script : `TYPE_PATTERNS` l.28-31 + 2 itérations de types (rapport l.119, résumé l.156)

## 3. Partie 1 — Migration URL

1. `git mv app/recipes/cluster app/recipes/collections`
2. `next.config.mjs` (dans `redirects()` existant, après le bloc `/recettes`):
   `{ source: "/recipes/cluster/:path*", destination: "/recipes/collections/:path*", permanent: true }`
3. Références mises à jour (7 fichiers) : sitemap.ts:82 (+ commentaire "6 pillar pages"), page.tsx (canonical, breadcrumb, label, siblings), recipes/page.tsx:137, recipe-hero.tsx:129, homepage-clusters.tsx:23
4. Audit script : nouveau type `collection` — pattern `^/recipes/(?:cluster|collections)/` **placé AVANT** `recipe` ; itérations de types mises à jour (rapport + résumé) ; rapport inchangé sinon
5. Documents historiques (archives d'audit `www.chefaugustin.com-audit/`, rapports passés) : **non modifiés** (ce sont des enregistrements)

## 4. Partie 2 — Épaississement des piliers

- `lib/topical-map.ts` : descriptions des 6 clusters étendues → **~500-650 mots de description** (le total visible page passe à 600-800+ quelle que soit la méthode de comptage des cards). **Règle d'exactitude prime** : les petites collections (2-4 recettes réelles) peuvent descendre à 300-400 mots si le contenu factuel honnête ne suffit pas — pas de remplissage artificiel.
- Contenu **dérivé des données réelles** (requêtes DB par collection : titres, temps moyens, nombre de membres) — **aucun claim inventé** (règles d'exactitude) ; les données utilisées sont embarquées dans le plan d'implémentation
- Structure de description : ce qu'est la collection → ce qu'elle contient (vraies recettes) → spécificités (vraies durées, ustensiles cités dans les recettes) → comment choisir → conseils ancrés dans les vraies recettes
- Rendu : multi-paragraphes existant (split `\n\n`)

## 5. Vérifications

| Vérif | Attendu |
|---|---|
| `npx tsc --noEmit` (règle repo) | exit 0 |
| `curl -I /recipes/cluster/small-batch-slow-cooker` | **301** → `/recipes/collections/small-batch-slow-cooker` |
| `curl -I /recipes/collections/small-batch-slow-cooker` | **200** |
| `curl -I /recipes/collections/nope` | **404** (dynamicParams=false) |
| Audit `--limit 3` | type `collection` correct dans le rapport + JSON |
| Après push | hook : ping Google + IndexNow (nouvelles URLs poussées) |

## 6. Hors périmètre

- Cluster végétarien (recommandation audit 06-08 — backlog séparé)
- Autres renommages d'URLs
- Pages `/recipes/category/` (inchangées)
- Réécriture des archives d'audit historiques

## 7. Étapes (ordre)

1. Partie 1 : migration code (route, 301, références, audit) — 1 commit
2. Partie 2 : enrichissement des 6 descriptions (données réelles embarquées) — 1 commit
3. Vérifications complètes + push + log hook
