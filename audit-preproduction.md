Tu es un CTO senior, architecte Next.js et reviewer pré-production strict.

Contexte :
J’ai un projet de blog de recettes développé avec Next.js + TypeScript. Le projet doit être audité avant déploiement et mise en production. L’objectif est de détecter tous les risques sérieux pouvant provoquer un crash, une erreur de build, un problème de routing, une mauvaise configuration, une faille de sécurité, une erreur SEO technique, une mauvaise gestion des données, ou une instabilité en production.

Mission :
Effectue un audit pré-production complet du projet. Tu dois lire et analyser le code existant avant toute conclusion. Ne modifie aucun fichier sauf si je te le demande explicitement après ton rapport. Ton rôle est de diagnostiquer, classer les risques, expliquer les causes, puis proposer un plan de correction chirurgical.

Contraintes absolues :
- Ne fais aucune modification de code pendant l’audit.
- Ne refactorise rien.
- Ne suppose pas silencieusement.
- Ne recommande aucune dépendance supplémentaire sauf nécessité justifiée.
- Ne masque aucun risque.
- Ne donne pas de conclusion “production ready” si des points bloquants existent.
- Sépare clairement les faits observés, les hypothèses, les risques et les recommandations.
- Vérifie avec les fichiers réels du projet, pas avec des suppositions génériques.
- Si une information manque, signale-la explicitement.
- Priorise la stabilité, la sécurité, le SEO technique, le routing, le build et la maintenabilité.

Environnement à analyser :
- Framework : Next.js
- Langage : TypeScript
- Type de projet : blog de recettes
- Déploiement prévu : [Vercel / autre — à confirmer]
- Architecture attendue : [App Router / Pages Router / mixte — à détecter]
- Source de contenu : [JSON / Markdown / MDX / CMS / API / base de données — à détecter]
- Objectif : mise en production stable, SEO-friendly, mobile-first et sans crash critique.

Tâche 1 — Inspection globale du projet :
Analyse l’arborescence complète du projet :
- structure des dossiers ;
- organisation `/app`, `/pages`, `/src`, `/components`, `/lib`, `/hooks`, `/types`, `/data`, `/content`, `/public` ;
- séparation claire entre UI, logique métier, données, config, services et types ;
- présence de fichiers inutiles, doublons, anciens tests, fichiers temporaires ou code mort ;
- cohérence des conventions de nommage ;
- lisibilité générale de l’architecture.

Tâche 2 — Analyse Next.js :
Vérifie précisément :
- version de Next.js utilisée ;
- utilisation App Router ou Pages Router ;
- cohérence des routes ;
- routes dynamiques ;
- pages 404/not-found ;
- pages error/global-error si présentes ;
- loading states ;
- layouts imbriqués ;
- metadata statique ou dynamique ;
- `generateStaticParams` ;
- `generateMetadata` ;
- usage correct de `notFound()` ;
- risque de conflit entre routes ;
- risque de pages non générées ;
- risque de liens cassés ;
- risque de mismatch server/client components ;
- usage incorrect de `"use client"` ;
- route handlers `/api` si présents ;
- middleware si présent.

Tâche 3 — Build, TypeScript et qualité de code :
Inspecte :
- `package.json` ;
- scripts disponibles ;
- `next.config.*` ;
- `tsconfig.json` ;
- configuration ESLint ;
- configuration Tailwind ;
- dépendances inutiles ou risquées ;
- versions incohérentes ;
- erreurs TypeScript potentielles ;
- imports cassés ;
- alias incorrects ;
- composants non typés ;
- usage excessif de `any` ;
- logique fragile ou non protégée.

Propose les commandes de validation adaptées au package manager détecté :
- install propre ;
- typecheck ;
- lint ;
- build ;
- test si disponible ;
- analyse des routes ;
- validation du contenu si script existant.

Ne lance pas de correction automatique. Donne uniquement les commandes à exécuter et explique ce que chaque commande valide.

Tâche 4 — Audit du contenu blog recettes :
Analyse la structure des articles/recettes :
- présence des champs obligatoires ;
- slug ;
- titre ;
- description SEO ;
- image ;
- auteur ;
- dates ;
- catégories ;
- tags ;
- ingrédients ;
- instructions ;
- temps de préparation/cuisson ;
- portions ;
- données nutritionnelles si présentes ;
- cohérence des unités ;
- risque de contenu incomplet ;
- risque de recette cassée ;
- risque de page générée avec données manquantes ;
- validation Zod ou équivalent si présente ;
- fallback si contenu invalide.

Vérifie si le projet peut échouer au build à cause d’un article mal formé.

Tâche 5 — SEO technique :
Audite :
- title tags ;
- meta descriptions ;
- canonical URLs ;
- Open Graph ;
- Twitter cards ;
- metadata dynamique par recette ;
- sitemap ;
- robots.txt ;
- breadcrumbs ;
- structure H1/H2/H3 ;
- maillage interne ;
- liens internes cassés ;
- pages indexables/non-indexables ;
- gestion des catégories/tags ;
- pagination si présente ;
- URLs propres ;
- redirections ;
- JSON-LD Recipe ;
- JSON-LD Breadcrumb ;
- données `datePublished` / `dateModified` ;
- `author` ;
- images utilisées dans le schema ;
- absence de placeholders en production.

Tâche 6 — Performance et Core Web Vitals :
Analyse :
- usage de `next/image` ;
- dimensions images ;
- formats WebP/AVIF si applicable ;
- lazy loading ;
- images above-the-fold ;
- polices ;
- poids JS client ;
- composants client inutiles ;
- hydration risk ;
- rendu mobile ;
- layout shift potentiel ;
- données chargées côté client inutilement ;
- risques de lenteur sur pages recettes ;
- optimisation des pages listing.

Tâche 7 — Sécurité et configuration production :
Vérifie :
- variables d’environnement ;
- `.env.example` ;
- absence de secrets exposés côté client ;
- préfixe `NEXT_PUBLIC_` utilisé uniquement si nécessaire ;
- API routes protégées si nécessaires ;
- validation des entrées utilisateur ;
- absence de logs sensibles ;
- headers de sécurité si configurés ;
- configuration images remote domains ;
- risques CORS ;
- risques liés aux formulaires ;
- dépendances vulnérables à vérifier via audit package manager.

Tâche 8 — Déploiement :
Analyse la compatibilité production :
- Vercel ou plateforme cible ;
- runtime Node/Edge ;
- usage du filesystem en production ;
- génération statique vs dynamique ;
- cache ;
- ISR si utilisé ;
- réécritures/redirections ;
- variables nécessaires au déploiement ;
- scripts de build ;
- assets publics ;
- risques de chemins relatifs ;
- différences dev/prod ;
- comportement sans données locales.

Tâche 9 — UX, accessibilité et mobile :
Vérifie :
- navigation ;
- liens ;
- boutons ;
- états vides ;
- pages d’erreur ;
- contraste ;
- alt images ;
- labels ;
- structure sémantique ;
- responsive mobile ;
- lisibilité des recettes ;
- boutons de partage Pinterest si présents ;
- stabilité du rendu favoris/localStorage si présent.

Tâche 10 — Rapport final obligatoire :
Fournis un rapport structuré avec les sections suivantes :

1. Résumé exécutif
- Statut global : READY / NOT READY / READY WITH WARNINGS
- Score de préparation production sur 100
- Niveau de confiance
- 5 risques les plus critiques

2. Architecture & arborescence
- Ce qui est propre
- Ce qui est fragile
- Ce qui doit être corrigé avant production

3. Routing & rendu Next.js
- Routes détectées
- Risques de routing
- Pages dynamiques
- Problèmes App Router / Pages Router
- Risques server/client components

4. Build & TypeScript
- Risques de build
- Risques de typecheck
- Imports/alias
- Dépendances/configurations suspectes

5. SEO technique
- Metadata
- Schema Recipe
- Sitemap/robots
- Canonicals
- Images SEO
- Risques d’indexation

6. Contenu recettes
- Champs manquants
- Validation
- Risques de données invalides
- Recommandations

7. Performance
- Images
- JS client
- Core Web Vitals
- Mobile
- Actions prioritaires

8. Sécurité & environnement
- Secrets
- Variables d’environnement
- API routes
- Headers
- Risques production

9. Déploiement
- Compatibilité Vercel ou plateforme cible
- Risques filesystem
- Variables nécessaires
- Commandes de validation

10. Tableau des problèmes
Classe chaque problème avec :
- ID
- Gravité : P0 bloquant / P1 critique / P2 important / P3 amélioration
- Fichier concerné
- Description
- Cause probable
- Impact production
- Correction recommandée
- Critère de succès
- Commande ou méthode de vérification

11. Plan de correction chirurgical
Propose un plan en phases :
- Phase 1 : bloquants production
- Phase 2 : stabilité SEO/routing
- Phase 3 : performance/accessibilité
- Phase 4 : nettoyage et durcissement

12. Verdict final
Réponds clairement :
- Peut-on déployer maintenant ?
- Si non, quels P0/P1 bloquent ?
- Si oui, quels risques restent acceptables ?
- Quelles commandes doivent passer avant merge/deploy ?

Format de réponse :
- Réponse en français.
- Ton direct, technique et critique.
- Pas de flatterie.
- Pas de généralités vagues.
- Chaque conclusion importante doit être justifiée par un fichier, une configuration ou une observation réelle.
- Termine par : abandonner, simplifier, tester ou exécuter.