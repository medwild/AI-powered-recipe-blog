# AI AutoBlog — Préférences locales
> Ce fichier est optionnel. Il surcharge certaines valeurs pour le développement local.
> Il ne doit PAS contenir de secrets (les secrets sont dans .env.local).

## Environnement de développement
- AUTO_APPROVE=true (bypass la review humaine en dev — NE PAS utiliser en production)
- Inngest Dev tourne sur http://localhost:8288
- Next.js sur http://localhost:3000
- Base de données : Neon serverless (DATABASE_URL dans .env.local)

## Préférences de développement
- Toujours exécuter `npx tsc --noEmit` après une modification du pipeline
- Les skills Markdown sont dans `skills/` — les modifier avec précaution (impact LLM)
- Le workflow Inngest peut être monitoré via le dashboard Inngest Dev (port 8288)

## Notes
- Le projet n'a pas de dépôt git — faire des sauvegardes manuelles avant les changements majeurs
- Les fichiers de rapport (`RAPPORT-*.md`) documentent l'historique des sprints
- `npm run test:e2e` nécessite le serveur lancé + les clés API configurées
