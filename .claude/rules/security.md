# Règles de sécurité

## Secrets
- **Interdit** : écrire, logger, ou exposer `DATABASE_URL`, `*_API_KEY`, `*_SECRET*`, `DASHBOARD_SECRET_TOKEN`
- **Interdit** : commit, stage, ou copier `.env.local`
- Les variables d'env sont lues depuis `process.env` — jamais hardcodées
- Le fichier `.env.example` est la référence canonique

## Validation des entrées
- Toute entrée utilisateur dans une route API DOIT être validée (body, params, query)
- Utiliser les vérifications inline (typeof, parseInt, isNaN) — ce projet n'utilise pas Zod
- Status 400 pour toute entrée invalide, 404 pour ressource absente, 500 pour erreur serveur
- Les messages d'erreur ne doivent jamais exposer d'information interne

## Code dangereux — interdit
- `eval()`, `new Function()`
- `dangerouslySetInnerHTML` sans sanitization préalable
- `sql` Drizzle avec concaténation de strings utilisateur (injection SQL)
- Les opérations DB utilisent les query builders Drizzle, jamais de raw SQL avec input utilisateur

## Auth
- `/dashboard` et ses sous-routes sont protégés par `middleware.ts` (cookie `dashboard_auth`)
- `DASHBOARD_SECRET_TOKEN` doit être ≥32 caractères hex
- Les routes API sensibles utilisent `checkRateLimit()` (in-memory, configurable via `RATE_LIMIT_MAX_PER_MINUTE`)

## Vérification
- Après toute modification touchant la sécurité : relire `middleware.ts`, `lib/rate-limit.ts`, et les routes API concernées
