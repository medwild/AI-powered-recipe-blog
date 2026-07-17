---
paths:
  - "lib/inngest/**"
  - "skills/**"
---

# Règles pipeline IA — v13 (Single-Pass Strategist → Writer → Quality Gate)

## Workflow Inngest

- **Ne jamais renommer** les steps Inngest existants (le versioning Inngest dépend des noms)
- **Ne pas changer l'ordre** des steps sans comprendre les dépendances inter-step
- Les `step.sleep()` sont intentionnels (cooldown API rate limits LLM)
- `appendLog()` utilise une opération atomique PostgreSQL — ne pas remplacer par SELECT→UPDATE
- Le workflow est dans `lib/inngest/functions/generate-recipe.ts` ; voir `CLAUDE.md` pour l'architecture complète

## Agents IA (v13)

- **Strategist** (1 LLM call) : planifie la structure avant l'écriture (H2, FAQ, gaps, angle)
- **Writer / Chef Augustin** (1 LLM call) : génère le contenu complet (markdown, meta, ingrédients, instructions, JSON-LD, image prompt)
- **Science Enricher** (DeepSeek v4 Pro) : injecte la food science (toujours actif, intégré au skill)
- **Judge** : évaluation qualité LLM (non bloquante)
- **Pin Designer** : 5 pins Pinterest par recette
- Chaque agent = 1 runtime (`lib/inngest/functions/agents/*.ts`) + 1 skill (`skills/*.md`)
- Les skills sont chargés par `loadSkillContent()` → system prompt du LLM
- **Modifier un skill = modifier le comportement du LLM**, pas du code
- Ne jamais supprimer un champ du type de sortie d'un agent sans vérifier TOUS les consommateurs

## Content Generation (Single-Pass v13)

- **Strategist** (LLM) : planifie la structure — 1 appel
- **Writer / Chef Augustin** (LLM) : génère tout le contenu en 1 appel, règles qualité intégrées dans le skill
- **Quality Gate** (code pur) : valide food safety, word count minimum, structure — REJECT si échec
- **Retry** : uniquement sur sortie tronquée (ingrédients/instructions manquants, < min words). Max 2 tentatives.
- **Deterministic fixes** (persist-phase) : banned-word scrubbing, meta truncation (autopilot fallback only), internal linking, SEO gate
- Validateurs utilisés : `lib/geo-validator.ts`, `lib/content-validator.ts`, `lib/loop-scorer.ts`

## Vérification

- Après toute modification du pipeline : `npx tsc --noEmit`
- Après modification d'un skill : relire les sections Input Contract et Output Schema du skill
- Tests unitaires : `npm run test:pipeline`
