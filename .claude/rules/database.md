---
paths:
  - "lib/db/**"
  - "drizzle.config.ts"
---

# Règles base de données

## ORM
- Drizzle ORM 0.45 (pas Prisma, pas Knex, pas raw SQL)
- Fichier canonique : `lib/db/schema.ts`
- Connexion : pool singleton dans `lib/db/index.ts`

## Types de colonnes
- `serial()` : UNIQUEMENT pour les clés primaires auto-générées
- `integer()` : pour les valeurs numériques fournies par l'application
- `text()` : pour les strings
- `jsonb().$type<T>()` : pour les colonnes JSON avec typage explicite
- Colonnes `timestamp` : toujours `withTimezone: true`
- Ne jamais utiliser `serial` pour des colonnes comme `recipeId`, `variantIndex`

## Migrations
- **Avant toute modification du schema** : `npx tsc --noEmit` obligatoire
- `npx drizzle-kit push` applique les changements directement — pas de fichiers de migration
- **Jamais** de `DROP TABLE` ou `DROP COLUMN` sans backup explicite
- Les colonnes ajoutées doivent être `nullable` ou avoir une `.default()`
- `drizzle-kit push` nécessite `DATABASE_URL` configuré

## Requêtes
- Fonctions de requête dans `lib/queries.ts`
- `getRelatedRecipes()` charge toutes les recettes publiées en mémoire — attention au volume
- `getCalibrationStats()` fait 5 requêtes séquentielles — ne pas aggraver
- `appendLog()` dans le workflow utilise `sql` pour l'append atomique JSONB (pas de SELECT→spread→UPDATE)

## Schéma
- Tables actuelles : `recipes` (24 colonnes), `self_improvement_logs` (9 colonnes), `image_variant_stats` (6 colonnes)
- Pas de clés étrangères — assumé volontaire
- `self_improvement_logs.score` est en `text` (pas `numeric`) — nécessite `parseFloat()` en lecture
