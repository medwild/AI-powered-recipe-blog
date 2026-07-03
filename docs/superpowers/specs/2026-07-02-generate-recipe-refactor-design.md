# generate-recipe.ts Refactor — Design Spec

> Version 1.0 | 2026-07-02 | Levier A — Découpage modulaire

## Objectif

Découper `lib/inngest/functions/generate-recipe.ts` (1455 lignes) en un orchestrateur (~300 lignes) + 6 modules step (~150-250 lignes chacun) + 1 fichier helpers.

## Architecture cible

```
lib/inngest/functions/
├── generate-recipe.ts       ← Orchestrateur (~300 lignes)
├── helpers.ts               ← appendLog, synthetic builds, constants
├── steps/
│   ├── serp-phase.ts        ← Steps 1 + 1.5
│   ├── agent-phase.ts       ← Steps 2 + 3 + 4
│   ├── editor-qa-loop.ts    ← Steps 7 + 7.5
│   ├── image-phase.ts       ← Steps 8 + 9
│   ├── persist-phase.ts     ← Steps 5 + 10 + 11 + 12
│   └── aor-phase.ts         ← Step 13
└── agents/                  ← (inchangé)
```

## Contrats

### helpers.ts
```ts
export const MAX_EDITOR_PASSES = 3
export function appendLog(recipeId, entry): Promise<void>
export function buildSyntheticAuditReport(draft, serp): AuditReport
export function buildSyntheticQAReport(): QAReport
export function buildFallbackImagePrompt(title, tags, keyword): string
export async function logPipelineError(recipeId, step, error, severity): Promise<void>
```

### serp-phase.ts
```ts
export async function runSerpPhase(
  step: InngestStep, keyword: string
): Promise<{ serp: SerpResult; structuredSerp: StructuredSerp }>
```
- Step 1: fetchSerp → SerpResult
- Step 1.5: structureSerpData → StructuredSerp
- Fallback: synthetic StructuredSerp if structurer fails

### agent-phase.ts
```ts
export async function runAgentPhase(
  step: InngestStep,
  structuredSerp: StructuredSerp,
  keyword: string,
  cuisine: string
): Promise<{ seoPlan: SeoPlan; draft: RecipeDraft; audit: AuditReport }>
```
- Step 2: agentStrategistV2 → SeoPlan
- Step 3: agentWriter → RecipeDraft
- Step 4: agentAuditor → AuditReport
- Falls back to synthetic audit if Auditor fails

### editor-qa-loop.ts
```ts
export async function runEditorQaLoop(
  step: InngestStep,
  draft: RecipeDraft,
  initialAudit: AuditReport,
  seoPlan: SeoPlan,
  recipeId: number
): Promise<{ finalRecipe: RecipeDraft; qaReport: QAReport; humanizationPass: number }>
```
- Step 7: Editor loop (max 3 passes) with re-audit
- Step 7.5: QA + QA fix loop
- Returns final recipe + QA verdict

### image-phase.ts
```ts
export async function runImagePhase(
  step: InngestStep,
  finalRecipe: RecipeDraft,
  keyword: string,
  recipeId: number
): Promise<{ heroImageUrl: string | null; imageVariants: ImageVariant[] }>
```
- Step 8: optimize image prompt
- Step 9: generate + upload A/B variants

### persist-phase.ts
```ts
export async function persistPhase(
  step: InngestStep,
  recipeId: number,
  finalRecipe: RecipeDraft,
  seoPlan: SeoPlan,
  imageData: { heroImageUrl: string | null; imageVariants: ImageVariant[] },
  qaReport: QAReport,
  audit: AuditReport,
  structuredSerp: StructuredSerp,
  options: { autoApprove: boolean }
): Promise<{ published: boolean }>
```
- Step 5: persist-draft-for-review
- Step 6: wait-for-approval (7-day window)
- Step 10: self-improvement logging
- Step 11: persist-draft-final (JSON-LD construction + DB write)
- Step 12: init-variant-stats

### aor-phase.ts
```ts
export async function generateAorArticle(
  step: InngestStep,
  recipeId: number,
  finalRecipe: RecipeDraft,
  seoPlan: SeoPlan,
  structuredSerp: StructuredSerp,
  keyword: string
): Promise<void>
```
- Step 13: AOR article generation + image + persistence

### generate-recipe.ts (orchestrateur)
```ts
// ~300 lignes, uniquement de l'orchestration
const { serp, structuredSerp } = await runSerpPhase(step, keyword)
await step.sleep("cooldown-1", "25s")

const { seoPlan, draft, audit } = await runAgentPhase(step, structuredSerp, keyword, cuisine)
await step.sleep("cooldown-2", "2s")

await persistDraftForReview(step, recipeId, draft, seoPlan, audit)

const { finalRecipe, qaReport } = await runEditorQaLoop(step, draft, audit, seoPlan, recipeId)

const imageData = await runImagePhase(step, finalRecipe, keyword, recipeId)

await persistFinal(step, recipeId, finalRecipe, seoPlan, imageData, qaReport, audit, structuredSerp)

if (seoPlan.generateAorArticle) {
  await generateAorArticle(step, recipeId, finalRecipe, seoPlan, structuredSerp, keyword)
}
```

## Non-goals

- Ne pas toucher aux agents existants (strategist, writer, auditor, editor, qa, image-optimizer, aor-writer)
- Ne pas modifier la logique métier — uniquement réorganiser
- Ne pas changer les noms des steps Inngest (le versioning en dépend)
- Ne pas changer l'ordre des steps

## Validation

- `npx tsc --noEmit` doit rester clean
- Chaque module doit être importable et compréhensible isolément
- L'orchestrateur doit pouvoir être lu de haut en bas sans sauter entre 1000 lignes
