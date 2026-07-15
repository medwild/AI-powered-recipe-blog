---
paths:
  - "lib/inngest/**"
  - "skills/**"
---

# Règles pipeline IA

## Workflow Inngest
- Fichier : `lib/inngest/functions/generate-recipe.ts` (878 lignes)
- Configuration : `concurrency: { limit: 3 }`, `throttle: { limit: 2, period: "1m" }`, `retries: 3`
- **Ne jamais renommer** les steps Inngest existants (le versioning Inngest dépend des noms)
- **Ne pas changer l'ordre** des steps sans comprendre les dépendances inter-step
- Les `step.sleep()` sont intentionnels (cooldown API rate limits LLM)
- `appendLog()` utilise une opération atomique PostgreSQL — ne pas remplacer par SELECT→UPDATE

## Agents IA
- Chaque agent = 1 runtime (`lib/inngest/functions/agents/*.ts`) + 1 skill (`skills/*.md`)
- Les skills sont chargés par `loadSkillContent()` → system prompt du LLM
- **Modifier un skill = modifier le comportement du LLM**, pas du code
- La chaîne d'agents est : Strategist → Writer → Auditor → Editor → QA → ImageOptimizer
- Ne jamais supprimer un champ du type de sortie d'un agent sans vérifier TOUS les consommateurs

## Contrats inter-agents (versions actuelles)
- **Writer v5.2** : ne génère PAS `imagePrompt`. L'Image Optimizer le crée.
- **Editor v5.2** : aligné avec Writer v5.2 — n'attend plus `imagePrompt` dans son schéma (corrigé Sprint 5)
- **QA v1.1 LIGHT** : reçoit des résumés structurés (pas les documents complets). Check 4 n'exige plus `imagePrompt` (corrigé Sprint 5).
- **Auditor v5.1** : reçoit l'article complet (plus de troncature à 3000 chars). Article complet dans le prompt.
- **Strategist v5.1** : max 10 leçons dans le prompt (Section 15). Cache-friendly (pas de timestamps).

## Self-Improvement (boucle fermée)
- 3 sources : Auditor (criteria <16), AI Score, QA (verdict ≠ PASS)
- Stockées dans `self_improvement_logs` avec `source`, `aiScore`, `tags`
- Le Strategist charge les 15 plus récentes + calibration stats
- Plafonnement : max 10 leçons dans le prompt (Strategist v5.1 Section 15)

## Vérification
- Après toute modification du pipeline : `npx tsc --noEmit`
- Après modification d'un skill : relire les sections Input Contract (§2) et Output Schema (§14) du skill
- Tester avec `npm run test:e2e` si le serveur tourne
