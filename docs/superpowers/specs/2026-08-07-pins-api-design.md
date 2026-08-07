# Design — Endpoint pins `GET /api/recipes/pins`

> Date : 2026-08-07 — Statut : validé (brainstorming)
> Contexte : l'utilisateur a créé une app Google AI Studio (Gemini) qui génère des épingles Pinterest à partir des recettes du blog et de leurs images générées (2:3, la même image que le hero du blog). L'app appelle le blog côté serveur, en lecture seule.

## 1. Objectif

Exposer un endpoint public JSON qui donne à l'app Gemini tout ce dont elle a besoin pour créer un pin : titre, excerpt, image 2:3 existante, temps, catégories, tags, ingrédients, URL de l'article.

**Ce que l'endpoint n'est PAS** : un générateur de pins, un endpoint d'écriture, une source de contenu brut (markdown) — `/api/recipes/raw` existe déjà pour ça.

## 2. Décisions clés (issues du brainstorming)

| Question | Décision | Pourquoi |
|---|---|---|
| App vs machinerie pins existante (`pin-variants.ts`, `pinDrafts`, Pin Designer) | Non tranché — l'endpoint ne dépend pas de ce choix | Le contrat API est utile dans les deux cas |
| Consommation | **Côté serveur** | Pas de CORS, pas de OPTIONS |
| Sync | **Lecture seule** (GET pur) | Pas d'écriture dans la DB du blog |
| Image | **Hero seule** — l'URL Cloudinary brute 2:3 | L'app génère ses variantes d'angles elle-même ; `imageVariants` ne contient qu'un seul variant aujourd'hui |
| Temps (`prepTime` etc.) | **Strings bruts en ISO 8601** (`PT10M`, `PT6H`) | Vérifié en prod : les 46 recettes sont en ISO 8601 standard — pas de parsing, c'est le LLM qui interprète le standard |
| `category` | **Exclu du contrat** | NULL sur 46/46 recettes en prod — la catégorisation réelle est portée par `tags` ("dinner for two", "one-pan", "weeknight") |
| `calories`, `rating`, `chefTip` | **Exclus** | N'existent pas dans le schema — on n'invente pas |
| `instructions` | **Exclus** | Inutiles pour un pin |

## 3. Architecture

Un seul fichier : `app/api/recipes/pins/route.ts`, calqué sur `app/api/recipes/raw/route.ts` (pattern existant, ~40 lignes).

- `export const dynamic = "force-dynamic"`
- Select Drizzle ciblé (pas de `getPublishedRecipesLight()` — il manque `excerpt`, `category`, `prepTime`, `cookTime`, `ingredients`) :
  - `status = "published"`
  - `content_type = "recipe"` (règle globale n°2 — jamais d'article servi comme recette)
  - `heroImageUrl IS NOT NULL` (un pin sans image ne sert à rien)
  - Tri : `publishedAt` desc
- Mapping direct DB → shape "pin-ready"
- URL absolue : `process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"` — pattern uniforme dans tout le repo (`app/sitemap.ts:11`, `app/robots.ts:3`, `app/layout.tsx:24`, `lib/pipeline/helpers.ts:124`)

## 4. Contrat de données

`GET /api/recipes/pins` → 200 :

```json
{
  "status": "ok",
  "blogName": "Chef Augustin",
  "totalFound": 46,
  "syncedAt": "2026-08-07T13:40:00.000Z",
  "recipes": [
    {
      "id": 123,
      "slug": "easy-lasagna",
      "title": "Easy Lasagna",
      "excerpt": "…",
      "heroImageUrl": "https://res.cloudinary.com/…/recipes/easy-lasagna.jpg",
      "prepTime": "PT10M",
      "cookTime": "PT20M",
      "totalTime": "PT30M",
      "servings": "2 servings",
      "tags": ["dinner for two", "one-pan", "easy"],
      "ingredients": [{ "name": "…", "quantity": "…" }],
      "publishedAt": "2026-08-05T19:08:02.280Z",
      "url": "https://www.chefaugustin.com/recipes/easy-lasagna"
    }
  ]
}
```

Points de contrat :
- `ingredients` : `{name, quantity?}` — forme native du schema (le prompt Google proposait `{amount, name}`, inversé — on garde le natif, le LLM s'adapte)
- **Temps** : ISO 8601 standard (`PT10M` = 10 min, `PT6H` = 6 h) — vérifié sur les 46 recettes en prod ; c'est le LLM qui interprète le standard, pas notre code
- **Pas de `category`** : NULL sur 46/46 recettes en prod — la catégorisation est portée par `tags` ("dinner for two", "one-pan", "weeknight dinner"…)
- `servings` : string libre ("2 servings" ou "2") — valeur telle quelle
- `heroImageUrl` : URL Cloudinary brute, **2:3 natif** (Ideogram `2x3` → upload sans crop ni resize, `f_auto,q_auto` seulement) — aucune transformation
- Pas d'`instructions`, pas de `contentMarkdown`, pas de `jsonLd`, pas de `workflowLog` — payload minimal

## 5. En-têtes

- `Cache-Control: public, max-age=3600, s-maxage=3600` — identique à `app/api/recipes/raw/route.ts:39`
- Pas de CORS, pas de handler `OPTIONS` (consommation serveur uniquement)

## 6. Gestion d'erreurs

- 500 générique : `{ error: "Erreur lors de la récupération des recettes" }` — **sans `error.message`** (règle sécurité : ne pas exposer d'info interne ; le prompt Google exposait `error.message`, on ne reprend pas ce pattern)
- Pas d'entrée utilisateur → pas de validation 400 à écrire

## 7. Vérification

1. `npx tsc --noEmit` passe
2. `npm run dev` puis `curl localhost:3000/api/recipes/pins` :
   - uniquement des `content_type = "recipe"` (jamais un article)
   - zéro recette sans `heroImageUrl`
   - `url` absolue correcte (`https://www.chefaugustin.com/recipes/{slug}`)
3. (Facultatif) `/api/recipes/pins` ne casse pas `/api/recipes/raw` ni les routes `[id]` existantes — segment statique, pas de shadowing (vérifié : aucun `pins` existant)

**Fait observé au moment de la rédaction** (via `GET https://www.chefaugustin.com/api/recipes/raw` le 2026-08-07) : 46 recettes publiées, toutes avec `heroImageUrl`, temps tous en ISO 8601, `category` NULL sur 100 % — cohérent avec les choix ci-dessus.

## 8. Non-goals (assumés explicitement)

- Pas de sync incrémentale (`?updated_after=`) — 46 recettes aujourd'hui, un full fetch passe ; YAGNI
- Pas de parsing `prepTimeMinutes` en number — fragile (4 formats), inutile pour un LLM
- Pas d'écriture en DB (pas de POST, pas de token d'auth)
- Pas de refactor de la machinerie pins existante (décision app vs machinerie reste ouverte, indépendante de ce contrat)
- Pas de nouvelle dépendance

## 9. Questions ouvertes

Aucune — toutes les décisions du brainstorming sont actées ci-dessus. L'implémentation peut démarrer.
