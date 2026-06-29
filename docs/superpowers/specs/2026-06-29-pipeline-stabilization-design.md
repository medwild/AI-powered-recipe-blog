# Pipeline Stabilization — Design Spec

> Date: 2026-06-29
> Status: Approved
> Context: Post-Sprint 5 — pipeline 100% functional, needs hardening for production

## Overview

The AI AutoBlog pipeline (6 agents, 12 Inngest steps, 3 external APIs) is production-capable but fragile: any LLM failure cascades into a `failed` recipe. This spec adds targeted degradation, operational error tracking, and non-regression unit tests — without touching agent internals, skill Markdown, or Inngest step names.

## 1. Pipeline Error Tracking

### 1.1 New table: `pipeline_errors`

```sql
CREATE TABLE pipeline_errors (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  error_type TEXT NOT NULL,   -- timeout | parse | rate_limit | llm_unavailable | unknown
  message TEXT NOT NULL,
  severity TEXT NOT NULL,     -- warning | degraded | critical
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Drizzle schema in `lib/db/schema.ts`, exported from `lib/db/index.ts`.

### 1.2 Query helper

`logPipelineError()` in `lib/queries.ts` — single-row insert. No SELECT wrapper, no atomic JSONB concat like `appendLog`. Plain Drizzle insert.

```typescript
export async function logPipelineError(params: {
  recipeId: number
  stepName: string
  errorType: "timeout" | "parse" | "rate_limit" | "llm_unavailable" | "unknown"
  message: string
  severity: "warning" | "degraded" | "critical"
}) {
  return db.insert(pipelineErrors).values(params)
}
```

No dedicated API route for now — errors are visible via the existing `workflowLog` and direct DB query.

## 2. Circuit Breakers — Step-Level Degradation Matrix

Each step gets a `try/catch` wrapper. Non-recoverable errors trigger the fallback; recoverable errors bubble up to Inngest for retry.

| Step | Severity if failed | Fallback |
|---|---|---|
| `analyze-serp` | **Critical** — stop workflow | None. No SERP = no plan. |
| `structure-serp-data` | **Warning** — continue | Empty `StructuredSerp` with synthetic PAA only |
| `agent-1-strategist` | **Critical** — stop workflow | None. No plan = no article. |
| `agent-2-writer` | **Critical** — stop workflow | None. Core product. |
| `agent-3-auditor` | **Degraded** — continue | Synthetic audit: `overallScore=60`, `verdict="OK"`, all criteria `score=12` with recommendation `"Auditor unavailable — auto-pass"` |
| `agent-4-editor` | **Degraded** — continue | Keep current draft as-is, skip editorial pass |
| `agent-5-qa` | **Degraded** — continue | Synthetic QA: `verdict="PASS"`, `qaScore=70`, empty checks |
| `optimize-image-prompt` | **Degraded** — continue | Deterministic prompt from `title + tags` (template-based, no LLM) |
| `generate-and-upload-images` | **Warning** — continue | Already handled per-variant (existing pattern, untouched) |
| `self-improvement` | **Warning** — continue | Skip — zero lessons saved |
| `persist-draft-final` | **Critical** — stop workflow | None. No persistence = nothing to publish. |

### 2.1 Degradation state tracking

A local boolean `degraded = false` is set to `true` when any fallback is used. At `persist-draft-final`, if `degraded === true`, the recipe status is set to `"degraded"` instead of `"draft"`. The workflow log already captures which steps ran with fallbacks.

### 2.2 Recoverable vs non-recoverable

The existing `isRecoverable()` in `nararouter.ts` already classifies errors. The step wrapper re-uses it:
- Recoverable → throw (let Inngest retry)
- Non-recoverable → log to `pipeline_errors`, use fallback, continue

### 2.3 Synthetic audit shape

```typescript
const SYNTHETIC_AUDIT: AuditReport = {
  overallScore: 60,
  verdict: "OK",
  score_ia_estimation: 50,
  criteria: AUDIT_CRITERION_NAMES.map(name => ({
    name,
    score: 12,
    recommendation: "Auditor unavailable — auto-pass",
    issues: [],
  })),
}
```

### 2.4 Synthetic QA shape

```typescript
const SYNTHETIC_QA: QAReport = {
  verdict: "PASS",
  qaScore: 70,
  summary: "QA skipped — Editor output accepted without cross-agent verification",
  checks: [],
}
```

### 2.5 Deterministic image prompt fallback

```typescript
function buildFallbackImagePrompt(title: string, tags: string[]): string {
  const dish = title || "dish"
  const cuisine = tags[1] || tags[0] || ""
  return `Professional food photography of ${dish}${cuisine ? `, ${cuisine} cuisine` : ""}. Overhead shot on rustic wooden table, natural window light, styled with fresh herbs and ingredients. 4K, shallow depth of field, warm color grading.`
}
```

## 3. Non-Regression Test Suite

### 3.1 File: `scripts/test-pipeline.ts`

No external test framework. Vanilla assertions with `assert(condition, message)`. Exit code 0 on all pass, 1 on any failure.

### 3.2 Test cases (8)

| # | Test | What it verifies |
|---|---|---|
| 1 | `extractJson` — clean JSON | Successful parse, type preserved |
| 2 | `extractJson` — markdown fences | Extraction from ` ```json ... ``` ` |
| 3 | `extractJson` — prose before JSON | Finds first `{` to last `}` |
| 4 | `extractJson` — no JSON present | Throws `"No JSON object found"` |
| 5 | `slugify` — accents & special chars | `"Tarte aux Pommes"` → `"tarte-aux-pommes"` |
| 6 | `generateSyntheticPAA` | Returns 8 questions, contains keyword |
| 7 | `checkRateLimit` — allow then block | 3 calls OK, 4th blocked |
| 8 | `checkRateLimit` — window reset | Manual simulation of expiry |

### 3.3 Explicitly NOT covered

- Real LLM calls (covered by existing E2E `test-workflow.ts`)
- External APIs (Serper, Cloudinary, Cloudflare)
- Inngest step orchestration (tested via Inngest Dev dashboard)
- Agent output schema validation (agents evolve, tests would break on skill changes)

### 3.4 NPM script

```json
"test:pipeline": "npx tsx scripts/test-pipeline.ts"
```

Integrable into `npm run test:e2e` or CI.

## 4. Files Changed

| File | Change | Risk |
|---|---|---|
| `lib/db/schema.ts` | + `pipelineErrors` table definition | Low — new table, no migration needed |
| `lib/db/index.ts` | + `pipelineErrors` export | Low |
| `lib/queries.ts` | + `logPipelineError()` | Low — new function |
| `lib/inngest/functions/generate-recipe.ts` | + try/catch per step + fallback helpers + degraded tracking | **Medium** — core workflow, needs `npx tsc --noEmit` after |
| `scripts/test-pipeline.ts` | **NEW** — 8 test cases | None |
| `package.json` | + `"test:pipeline"` script | None |
| `RAPPORT-STABILISATION.md` | **NEW** — stabilization report | None |

## 5. What Is NOT Changed

- Inngest step names (rule: never rename — breaks versioning)
- Step ordering (rule: don't change without understanding dependencies)
- Agent runtimes (`strategist.ts`, `writer.ts`, etc.)
- Skill Markdown files
- `checkRateLimit()` implementation (already correct)
- `appendLog()` atomic pattern (already correct)
- Image generation per-variant error handling (already correct)

## 6. Post-Implementation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test:pipeline` — 8/8 pass
- [ ] `npm run lint` passes
- [ ] `npx drizzle-kit push` applies new table
- [ ] Manual smoke test: generate one recipe, verify workflow log shows no errors
- [ ] Check `pipeline_errors` table is empty after smoke test
- [ ] Check `degraded` status path by testing with `AUTO_APPROVE=true`
