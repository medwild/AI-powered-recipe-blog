# Rapport de Stabilisation — Pipeline AI AutoBlog

> Date : 2026-06-29
> Contexte : Post-Sprint 5 — pipeline 100% fonctionnel, besoin de durcissement production

## Résumé

Le pipeline AI AutoBlog (6 agents IA, 12 étapes Inngest, 3 APIs externes) est désormais protégé contre les défaillances LLM avec une matrice de dégradation ciblée, une table de tracking d'erreurs opérationnelles, et une suite de tests de non-régression.

## 1. Table `pipeline_errors`

Nouvelle table PostgreSQL pour le tracking des incidents opérationnels :

| Colonne | Type | Description |
|---|---|---|
| `id` | SERIAL | Clé primaire |
| `recipe_id` | INTEGER | Recette concernée |
| `step_name` | TEXT | Étape Inngest où l'erreur s'est produite |
| `error_type` | TEXT | `timeout` / `parse` / `rate_limit` / `llm_unavailable` / `unknown` |
| `message` | TEXT | Message d'erreur complet |
| `severity` | TEXT | `warning` / `degraded` / `critical` |
| `created_at` | TIMESTAMPTZ | Horodatage |

Fonction `logPipelineError()` dans `lib/queries.ts` — insert simple, sans wrapper atomique.

## 2. Matrice de dégradation par étape

| Step | Sévérité si échec | Fallback |
|---|---|---|
| `analyze-serp` | **Critical** — stop | Aucun |
| `structure-serp-data` | **Warning** — continue | StructuredSerp avec PAA synthétiques seules |
| `agent-1-strategist` | **Critical** — stop | Aucun |
| `agent-2-writer` | **Critical** — stop | Aucun |
| `agent-3-auditor` | **Degraded** — continue | Audit synthétique (60/100, verdict OK) |
| `agent-4-editor` | **Degraded** — continue | Garde le brouillon actuel tel quel |
| `agent-5-qa` | **Degraded** — continue | QA synthétique (PASS, 70/100) |
| `optimize-image-prompt` | **Degraded** — continue | Prompt déterministe (titre + tags) |
| `generate-and-upload-images` | **Warning** — continue | Déjà géré par variant (existant) |
| `self-improvement` | **Warning** — continue | Skip — zéro leçon sauvegardée |
| `persist-draft-final` | **Critical** — stop | Aucun |

**Statut `degraded`** : Si au moins un fallback est utilisé, la recette passe en statut `"degraded"` au lieu de `"draft"`. Le workflow log contient le détail des étapes dégradées.

## 3. Suite de tests de non-régression

Fichier : `scripts/test-pipeline.ts` — 8 cas, assertions vanilla, exit code 0/1.

| # | Test | Utilitaire testé |
|---|---|---|
| 1 | JSON propre | `extractJson` |
| 2 | Markdown fences | `extractJson` |
| 3 | Prose avant JSON | `extractJson` |
| 4 | Pas de JSON | `extractJson` (erreur) |
| 5 | Accents & spéciaux | `slugify` |
| 6 | 8 questions + keyword | `generateSyntheticPAA` |
| 7 | Allow puis block | `checkRateLimit` |
| 8 | Reset window | `checkRateLimit` |

Lancement : `npm run test:pipeline`

## 4. Points de fragilité résiduels

Ces risques ne sont PAS couverts par la stabilisation actuelle :

- **Panne totale de Neon (DB)** : Aucun fallback — le workflow est inopérant sans base de données
- **Panne de `appendLog()`** : Si l'update atomique PostgreSQL échoue, le workflow continue mais sans logs. Pas de circuit breaker sur cette opération (elle est hors step.run)
- **Double panne LLM** : Si Cloudflare GPT-OSS-120B est aussi down (après échec NaraRouter), le fallback de `nararouter.ts` est déjà épuisé — l'erreur remonte au step wrapper qui active le fallback dégradé
- **Image gen hors Cloudinary** : Si Cloudinary est down, toutes les images échouent. Le fallback "continue sans images" existe déjà
- **Timeout Inngest** : Le workflow a une limite implicite. Pas de mécanisme de checkpoint/reprise

## 5. Checklist post-déploiement

- [x] `npx tsc --noEmit` passe
- [x] `npm run test:pipeline` — 8/8 passent
- [x] `npm run lint` passe
- [x] `npx drizzle-kit push` applique la nouvelle table
- [ ] Smoke test : générer une recette, vérifier le workflow log
- [ ] Vérifier `pipeline_errors` est vide après smoke test
- [ ] Tester le chemin `degraded` avec `AUTO_APPROVE=true`

## 6. Fichiers modifiés

| Fichier | Changement |
|---|---|
| `lib/db/schema.ts` | + table `pipeline_errors` |
| `lib/queries.ts` | + fonction `logPipelineError()` |
| `lib/inngest/functions/generate-recipe.ts` | + circuit breakers par step + fallbacks + degraded tracking |
| `scripts/test-pipeline.ts` | **NOUVEAU** — 8 cas de test |
| `package.json` | + script `"test:pipeline"` |
| `RAPPORT-STABILISATION.md` | Ce fichier |
