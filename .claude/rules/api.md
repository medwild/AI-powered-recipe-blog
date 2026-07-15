---
paths:
  - "app/api/**"
  - "app/actions/**"
---

# Règles API

## Conventions App Router
- Chaque route = `app/api/[path]/route.ts`
- Exports nommés : `GET`, `POST`, `PUT`, `DELETE`
- Signature params Next.js 16 : `{ params }: { params: Promise<{ id: string }> }`
- Toujours : `const { id } = await params`

## Validation
- Route recevant un body : valider les champs obligatoires avant tout traitement
- `parseInt(id, 10)` + `isNaN()` pour les IDs numériques
- Retourner 400 avec `{ error: "message" }` pour entrée invalide
- Retourner 404 avec `{ error: "message" }` pour ressource non trouvée
- Retourner 500 avec `{ error: "message" }` pour erreur serveur (logger l'erreur réelle)

## Rate Limiting
- `checkRateLimit()` dans `lib/rate-limit.ts` — in-memory, par IP
- Utilisé sur `POST /api/recipes/generate`
- Configurable via `RATE_LIMIT_MAX_PER_MINUTE` (défaut 3)

## Routes existantes (12)
- `POST /api/recipes/generate` — lancement génération (rate limited)
- `GET /api/recipes/[id]/status` — polling statut
- `POST /api/recipes/[id]/cancel` — annulation workflow
- `POST /api/recipes/[id]/approve` — approbation humaine
- `GET /api/recipes/raw` — toutes les recettes (raw)
- `GET /api/recipes/raw/[slug]` — recette par slug (raw)
- `POST /api/auth/login` — login dashboard
- `POST /api/auth/logout` — logout dashboard
- `GET|POST|PUT /api/inngest` — endpoint Inngest
- `GET /api/self-improvement/calibration` — stats calibration
- `POST /api/recipes/[id]/image-variant/track` — tracking A/B
- `GET /api/recipes/[id]/image-variant/stats` — stats A/B

## Server Actions
- `app/actions/recipes.ts` : publish, unpublish, delete, cancel, approve
- Appelées depuis les composants dashboard
- Vérifient l'auth cookie côté serveur

## Middleware
- `middleware.ts` : protège `/dashboard` et sous-routes
- Cookie : `dashboard_auth` comparé à `DASHBOARD_SECRET_TOKEN`
- Redirection : `/login` si non authentifié
