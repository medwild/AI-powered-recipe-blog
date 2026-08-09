# 🎯 SUPER PROMPT — Pinterest Scheduler (Google AI Studio)

> Pour créer une application personnelle de planification Pinterest, adaptée à l'infra Chef Augustin. Coller ce prompt dans Google AI Studio. Stack : React + Vite (SPA client, pas de serveur).

---

## RÔLE

Tu es un développeur senior full-stack qui crée une **application personnelle** (usage unique, pas un SaaS) de **planification de Pins Pinterest** pour un blog de recettes. L'app s'appelle **PinScheduler**. Elle ne génère AUCUNE image — elle organise, planifie et publie via l'API Zernio.

**Stack** : React 19 + Vite + TypeScript + Tailwind CSS. SPA 100 % côté client (pas de backend, pas de SSR). Persistance : localStorage.

---

## CONTEXTE

- **Blog** : Chef Augustin (https://www.chefaugustin.com) — blog de recettes "for two" (petites portions pour 2 personnes)
- **46 recettes publiées**, exposées par l'API `GET https://www.chefaugustin.com/api/recipes/pins` (JSON, ~74 KB, 46 recettes)
- **Compte Pinterest** : compte Business, 12-13 boards keyword-rich (noms spécifiques comme "Quick Weeknight Dinners for Two", PAS des noms génériques)
- **Zernio** : API de publication sociale (https://zernio.com) — l'app publie via Zernio

---

## CONTRAT D'ENTRÉE — API blog (le payload réel)

`GET https://www.chefaugustin.com/api/recipes/pins` renvoie :

```json
{
  "status": "ok",
  "blogName": "Chef Augustin",
  "totalFound": 46,
  "recipes": [
    {
      "id": 106,
      "slug": "whole30-chicken-skillet-tomatoes-garlic",
      "title": "Easy Whole30 Chicken Skillet for Two with Tomatoes and Garlic",
      "excerpt": "A one-pan Whole30 chicken skillet scaled precisely for two, with a garlicky tomato sauce...",
      "heroImageUrl": "https://res.cloudinary.com/.../x.png",
      "prepTime": "PT10M",
      "cookTime": "PT25M",
      "totalTime": "PT35M",
      "servings": "2 servings",
      "tags": ["whole30", "one-pan", "chicken", "dinner for two", "easy", "dairy-free"],
      "ingredients": [ { "name": "...", "quantity": "..." } ]
    }
  ]
}
```

**Champs utilisés par l'app** :
- `title` → base du pin title
- `excerpt` → base de la pin description
- `tags` → pin tags, mapping vers boards
- `heroImageUrl` → **l'image du pin 1** (URL Cloudinary publique, 2:3 — valide pour Zernio)
- `slug` → construit le `link` : `https://www.chefaugustin.com/recipes/{slug}`

**⚠️ NE PAS supposer de champs qui n'existent pas** (`rating`, `reviewsCount`, `calories`, `dietaryTags`, `stepImages`, `category` enum). Utilise UNIQUEMENT les champs ci-dessus.

---

## CONTRAT D'ENTRÉE — Zernio (API de publication)

Base URL : `https://zernio.com/api/v1` — Auth : `Authorization: Bearer sk_...`

### Créer un pin (POST /posts)

```json
{
  "content": "Description du pin (max 500 chars)",
  "mediaItems": [ { "type": "image", "url": "https://res.cloudinary.com/.../x.jpg" } ],
  "platforms": [
    {
      "platform": "pinterest",
      "accountId": "YOUR_ACCOUNT_ID",
      "platformSpecificData": {
        "title": "Titre du pin (max 100 chars)",
        "boardId": "YOUR_BOARD_ID",
        "link": "https://www.chefaugustin.com/recipes/slug"
      }
    }
  ],
  "publishNow": true
}
```

- **`scheduledFor`** (ISO) + **`timezone`** (ex: "America/New_York") → planifie à une date/heure (au lieu de `publishNow: true`)
- **`content`** = la description (500 chars max) | **`title`** = le titre (100 chars max)
- **`mediaItems[0].url`** = URL Cloudinary publique (l'app n'upload PAS de media — elle envoie l'URL)
- **`link`** = destination (le plus important pour le trafic)
- **`boardId`** = obligatoire (Pinterest le refuse sans)

### Lister les boards

`GET /accounts/{accountId}/pinterest-boards` → `{ "boards": [{ id, name, description, privacy }] }`

### Statut d'un post

`GET /posts/{postId}` → `status`: `scheduled | publishing | published | failed | partial`

### Erreurs connues (gérer proprement)

- Pinterest a **21,1 % de taux d'échec** (7 928 échecs / 37 646 tentatives)
- Erreurs fréquentes :
  - "Invalid URL or request data" → l'URL media n'est pas accessible (tester en incognito)
  - "Pinterest rate limit reached" → **éviter les bursts de 10+ pins d'un coup**
  - "Pinterest requires a boardId" → boardId manquant
- Retry avec backoff : 2 tentatives max par pin, puis marquer `failed` et re-planifier manuellement

---

## LE CŒUR DE L'APP — les 4 variantes par recette

Chaque recette a **4 variantes de pin** (le "pin 1" est l'image héro de la recette, les "pins 2-5" sont des angles photographiques). L'app organise et planifie ces 4 variantes.

**Les 4 angles** (à inclure en dur dans l'app) :

| Pin | Angle | Specs photo |
|---|---|---|
| Pin 1 | Hero (image héro de la recette, `heroImageUrl`) | — |
| Pin 2 | "45° close-up" | 90mm macro, f/2.8, shallow depth of field (bokeh) |
| Pin 3 | "Overhead" | 50mm, f/5.6, deep depth of field (everything sharp) |
| Pin 4 | "Macro detail" | 90mm macro, f/2.2, very shallow depth of field |

(Option : pins 2-4 peuvent être générés plus tard via Gemini image-to-image avec le hero comme référence — mais l'app ne génère PAS d'images. Pour l'instant, les 4 variantes partagent l'image héro ; les titres/descriptions diffèrent par angle.)

**Règle de contenu par variante** :
- **Toutes les variantes** utilisent la même image (`heroImageUrl`)
- **Titre + description différents par variante** (ex: pin 1 = "Quick X for Two", pin 2 = "45° close-up — X for Two", etc.) — variation de titre pour éviter la duplication

---

## RÈGLES D'ESPACEMENT ANTI-SPAM (contraintes HARD)

Ce sont des règles **obligatoires**, pas des suggestions. L'app doit les appliquer dans le scheduling :

1. **Max 3-5 pins/jour** (jamais plus de 5)
2. **Jamais 2 variantes de la même recette le même jour**
3. **≥ 4-6 heures d'écart entre 2 pins consécutifs** (même recette ou non)
4. **Jamais 2 variantes de la même recette sur le même board** — chaque variante va sur un board différent (rotation)
5. **Rotation de la variante de départ** : ne pas toujours commencer par le pin 1 (hero) — alterner l'ordre des angles entre recettes
6. **Board cohérent avec le contenu** : un pin "slow cooker" va sur un board slow cooker (les boards incohérents sont prunés par Pinterest)
7. **Pas de burst** : jamais plus de 10 pins dans une fenêtre courte (rate limit Pinterest)

---

## PLANIFICATION (le workflow)

1. **Fetch** `GET /api/recipes/pins` → 46 recettes
2. **Sélection** : l'utilisateur choisit un sous-ensemble (ex: 15-20 recettes prioritaires) et peut réordonner
3. **Mapping recette → board** : chaque recette est assignée à 1-2 boards selon ses tags (ex: tags ["slow cooker"] → board "Slow Cooker Recipes for Two"; tags ["chicken", "one-pan"] → boards "Easy Chicken Dinners for Two" + "Quick Weeknight Dinners for Two"). Un mapping par défaut basé sur les tags, modifiable manuellement
4. **Génération du planning** : l'app calcule les dates/heures de publication pour chaque variante en respectant les règles anti-spam (3-5/jour, espacement 4-6h, 1 variante/board, rotation)
5. **Prévisualisation** : l'utilisateur voit le calendrier de publication (date, heure, recette, angle, board, titre) et peut ajuster
6. **Envoi à Zernio** : pour chaque pin planifié → `POST /posts` avec `scheduledFor` + `timezone`
7. **Suivi** : liste des pins envoyés avec statut (scheduled/published/failed), récupéré via `GET /posts/{postId}`

---

## PERSISTANCE & ÉTAT

- **localStorage** pour : les recettes fetchées, le mapping recette→board, le planning généré, les pins envoyés (avec leur `postId` Zernio + statut)
- **Pas de backend** : l'app est un SPA statique, tout est local au navigateur
- Re-fetch de l'API blog possible ("Sync" bouton) pour récupérer les nouvelles recettes

---

## RÉSILIENCE & GESTION D'ERREURS

- **API blog down** : afficher un message clair + garder le dernier fetch en cache (localStorage), permettre réessai
- **Zernio échoue un pin** (21 % de taux d'erreur) : afficher l'erreur, proposer de re-planifier manuellement (ne pas re-essayer en boucle)
- **Recette retirée du blog** : ne pas la re-publier (elle disparaît du fetch)
- **Pin déjà envoyé** : ne jamais envoyer deux fois le même (idempotence — tracker par recette+angle+date)
- **Toutes les appels API** : timeout + erreur affichée proprement (pas de crash)

---

## STYLE & UI (minimal — le fonctionnement prime)

- **Dashboard simple** avec 3 vues (tabs) :
  1. **Recettes** : liste des recettes avec leurs 4 variantes, sélection/priorisation
  2. **Planning** : calendrier des publications (date/heure, recette, angle, board) — éditable
  3. **Statut** : pins envoyés, statut Zernio (scheduled/published/failed), erreurs
- **Design sobre** : Tailwind, pas de chartes complexes, pas de confetti, pas de animations superflues
- **Accessible** : boutons clairs, états de chargement, messages d'erreur lisibles

---

## NON-GOALS (ne PAS implémenter)

- ❌ **Pas de génération d'images** (pas d'Imagen, pas de canvas, pas de templates de design)
- ❌ **Pas de nutrition** (calories, macros — politique projet : pas de nutrition)
- ❌ **Pas de ratings/reviews** (le blog n'a pas ça)
- ❌ **Pas d'analytics poussés** (pas de recharts, pas de virality score)
- ❌ **Pas de multi-utilisateurs / auth / SaaS**
- ❌ **Pas de vidéos** (pins images seulement)
- ❌ **Pas de backend / DB** (localStorage suffit)

---

## CRITÈRES D'ACCEPTATION

1. L'app fetch les 46 recettes depuis `GET /api/recipes/pins` et les affiche
2. L'utilisateur peut sélectionner 15-20 recettes et les prioriser
3. L'app génère un planning respectant TOUTES les règles anti-spam (3-5/jour, 4-6h, 1 variante/board, rotation)
4. Le planning est éditable (déplacer/re-planifier un pin)
5. L'app envoie les pins à Zernio via `POST /posts` avec le contrat exact ci-dessus
6. Le statut des pins est suivi (scheduled/published/failed) via `GET /posts/{postId}`
7. Les erreurs (API down, Zernio fail) sont gérées proprement avec retry 2x max
8. Tout est persisté en localStorage (pas de perte au refresh)
9. L'app tourne avec `npm run dev` (Vite) sans config serveur

---

## LIVRABLE

Une application Vite + React + TypeScript complète, fonctionnelle, prête à `npm install && npm run dev`. Code propre, commenté (français ou anglais — cohérent), sans dépendances inutiles.
