# Freshness & SERP Intelligence — Competitor Content Enrichment

> **Date** : 2026-07-16  
> **Type** : Pipeline enrichment (MVP)  
> **Status** : Design approved — awaiting implementation plan

---

## 1. Summary

Enrich the existing `StrategyPlan` by fetching and analyzing the actual content of the **top 3 SERP competitor URLs** (already returned by Serper). Zero new APIs, zero new pipeline steps, zero changes to the Writer or Content Loop. One new file, one new sub-step, richer Strategist input.

**Goal** : Make the Strategist's plan more precise by letting it see what competitors actually cover — not just their titles and snippets.

**Non-goal (V2)** : Full `brief.json` with 15 fields, Reddit/YouTube/Trends integration, deterministic scoring engine, nutrition lookup, seasonality tables. These are deferred until the enrichment pattern is validated.

---

## 2. Architecture

```
BEFORE:
  SERP (Serper API) ──────→ Strategist (LLM) ──→ StrategyPlan ──→ Writer (Chef Augustin)

AFTER:
  SERP (Serper API) ─┬───→ Strategist (LLM) ──→ StrategyPlan ──→ Writer (Chef Augustin)
                      │         ↑
                      │         │ enriched input (competitor content)
                      │         │
                      └──→ competitor-content.ts ──┘
                           (fetch top 3 URLs, extract text)
```

**Principle** : Code fetches and cleans competitor content. The Strategist LLM reasons over it and produces a better plan. The StrategyPlan **output schema is unchanged** — enrichment happens through richer input, not new output fields.

---

## 3. Files Changed

| File | Change | Risk |
|---|---|---|
| `lib/competitor-content.ts` | **New** — fetch top 3 URLs, extract structured data | None (new file) |
| `lib/inngest/functions/steps/serp-phase.ts` | +1 sub-step `enrich-from-competitors` | Low (addition, not modification) |
| `lib/inngest/functions/agents/strategist.ts` | Enriched user prompt with competitor content | Low (prompt extension) |
| `skills/agent-strategist.md` | Updated §2 INPUT section | Low (documentation update) |
| `lib/inngest/functions/steps/content-loop-phase.ts` | +1 line: pass `competitorContent` to Strategist call | Low (optional param, backward-compatible) |
| `lib/inngest/functions/agents/chef-augustin.ts` | **No change** | — |
| `skills/agent-chef-augustin.md` | **No change** | — |

---

## 4. New File: `lib/competitor-content.ts`

### 4.1 Interface

```typescript
export interface CompetitorPageContent {
  url: string
  title: string
  extractedAt: string
  status: "ok" | "timeout" | "blocked" | "empty"
  // Extracted content
  h2Headings: string[]
  mainText: string            // first 3000 chars of body text
  publishDate?: string         // extracted from meta/article:published_time
  wordCountApprox: number
}

export async function fetchCompetitorContent(
  urls: string[],
  options?: { timeoutMs?: number; maxConcurrent?: number }
): Promise<CompetitorPageContent[]>
```

### 4.2 Implementation Rules

1. **Timeout** : 5 seconds per URL. Uses `AbortController`.
2. **Concurrency** : Max 3 parallel fetches (`Promise.allSettled`).
3. **User-Agent** : `ChefAugustin/1.0 (SEO research bot; respectful crawling)` — honest bot identity.
4. **HTML parsing** : Simple regex-based extraction. No heavy parser (cheerio adds 200KB to the bundle). Extract:
   - `<h2>` content → `h2Headings`
   - `<article>` or `<main>` or `<body>` text content (first 3000 chars max) → `mainText`
   - `<meta property="article:published_time">` or `<meta name="date">` → `publishDate`
   - `<title>` → `title`
5. **Failure modes** :
   - Fetch fails → `{ status: "blocked", h2Headings: [], mainText: "", wordCountApprox: 0 }`
   - Timeout → `{ status: "timeout", ... }`
   - No content extracted → `{ status: "empty", ... }`
6. **Rate limiting** : At most 3 concurrent fetches. No retry (failure is silent).

### 4.3 Integration Points

- Called from `serp-phase.ts` in a new Inngest sub-step
- Result is passed to the Strategist via enriched user prompt (see §6)
- If ALL 3 URLs fail → Strategist proceeds normally (no degradation)

---

## 5. Modified: `serp-phase.ts`

### 5.1 New Sub-Step

Inserted between `analyze-serp` (step 1) and `structure-serp-data` (step 1.5):

```typescript
// Step 1.25: enrich-from-competitors
let competitorContent: CompetitorPageContent[] = []
try {
  competitorContent = await step.run("enrich-from-competitors", async () => {
    const urls = serpResult.organic.slice(0, 3).map(o => o.link).filter(Boolean) as string[]
    if (urls.length === 0) {
      await appendLog(recipeId, logEntry("Competitor", "done", "No URLs to fetch"))
      return []
    }
    await appendLog(recipeId, logEntry("Competitor", "running",
      `Fetching content from top ${urls.length} competitors...`))
    const results = await fetchCompetitorContent(urls)
    const okCount = results.filter(r => r.status === "ok").length
    await appendLog(recipeId, logEntry("Competitor", "done",
      `${okCount}/${results.length} competitor pages extracted`))
    return results
  }) as CompetitorPageContent[]
} catch (err) {
  // Competitor fetch failure is non-fatal
  await appendLog(recipeId, logEntry("Competitor", "error",
    `Competitor content fetch failed: ${(err as Error).message}. Proceeding without.`))
  competitorContent = []
}
```

### 5.2 Return Value Extension

`SerpPhaseResult` gains optional `competitorContent`:

```typescript
export interface SerpPhaseResult {
  serp: SerpResult
  structuredSerp: StructuredSerp
  competitorContent: CompetitorPageContent[]  // NEW — may be empty
  degraded: boolean
}
```

---

## 6. Modified: Strategist Agent

### 6.1 Input Extension

The `agentStrategist` function already receives `serpOrganic`. Add `competitorContent`:

```typescript
export async function agentStrategist(params: {
  keyword: string
  format: "google" | "pin-first"
  serpOrganic: { title: string; snippet: string }[]
  serpRelatedQuestions: string[]
  serpRelatedSearches: string[]
  cuisineReplacements: Record<string, string>
  competitorContent?: CompetitorPageContent[]  // NEW — optional, backward-compatible
}): Promise<StrategyPlan>
```

### 6.2 Prompt Enrichment

When `competitorContent` has at least one `status: "ok"` entry, append to the user prompt:

```
## Competitor Content Analysis (Top-Ranking Pages)

For each top competitor, we've extracted their actual page structure.
Use this to identify what they cover well and what gaps exist:

[For each competitor with status "ok":]
### Competitor #{n}: {title}
**URL**: {url}
**H2 Structure**: 
- {h2_1}
- {h2_2}
...
**Content Preview** (first 3000 chars):
{mainText}

**Gap Analysis Instructions**:
- What topics do competitors cover that aren't obvious from their snippets?
- What do they ALL cover? (likely a must_cover signal)
- What do NONE of them cover? (likely a differentiator opportunity)
- What specific claims, temperatures, or techniques do they use that we should match or exceed?
```

### 6.3 Output Schema — Unchanged

The `StrategyPlan` type and JSON output schema **remain unchanged**. The enrichment happens in the Strategist's reasoning:
- `angle` → better differentiated because gaps are visible
- `h2Sections` → better aligned because real competitor structure is visible
- `faqQuestions` → more precise because PAA questions can be cross-referenced with competitor answers
- `competitorGaps` → more specific because we can see what's actually missing

### 6.4 Fallback

When `competitorContent` is empty or all statuses are non-`"ok"`:
- The Strategist prompt is identical to current behavior
- No degradation — the Strategist's existing fallback logic handles it

---

## 7. Matching Competitor Data to Existing StrategyPlan Fields

This mapping is for the Strategist's skill prompt — it tells the LLM how to use each piece of competitor data.

| Competitor Data | Used For |
|---|---|
| H2 headings of top 3 | Cross-reference with `h2Sections` — if 2+ competitors have the same H2, it's a must-cover topic |
| Main text content | Identify the angle each competitor uses, spot what's missing |
| Publish date | Recency signal — if a competitor is 2+ years old, its content may be stale |
| Word count | Benchmark for `targetWordCount` — beat the average by 10-20% |
| Topics ALL competitors cover | Include in `h2Sections` — these are table stakes for ranking |
| Topics NO competitor covers | Include in `competitorGaps` — these are our differentiators |

---

## 8. Skills Update: `skills/agent-strategist.md`

### 8.1 Section 2 INPUT — Add

```markdown
- `competitorContent` — actual content extracted from top-ranking pages:
  - H2 headings, body text preview, publish date, word count
  - Use to identify must-cover topics and competitor gaps
  - If absent or empty, proceed with SERP data only (normal operation)
```

### 8.2 Section 3 ANALYSIS — Add step 6

```markdown
6. **Competitor content analysis**: What H2s do all top competitors share? What's missing from every one? Where can this article add depth that they skip?
```

---

## 9. Error Handling & Degradation

| Failure | Behavior |
|---|---|
| Serper returns 0 URLs | Competitor fetch skipped — Strategist proceeds normally |
| 1 of 3 URLs times out | That URL gets `status: "timeout"`, other 2 proceed |
| All 3 URLs fail | `competitorContent` stays empty — Strategist uses SERP data only (current behavior) |
| Competitor HTML has no extractable H2s | `h2Headings: []`, `mainText` still available |
| Competitor page is JS-rendered (SPA) | `fetch()` gets empty body → `status: "empty"` |
| `enrich-from-competitors` sub-step throws | Caught by try/catch — pipeline continues, `competitorContent = []` |

**Principle** : The competitor content is an **optimization**, not a requirement. Every failure path converges to the current behavior.

---

## 10. Inngest Considerations

- The new sub-step `enrich-from-competitors` is wrapped in `step.run()` — Inngest automatically memoizes the result. On function replay, the sub-step returns the cached result without re-fetching competitor URLs.
- `step.sleep("sleep-after-enrich", "1s")` after the sub-step to avoid rapid sequential outbound requests.
- The sub-step is placed BEFORE `structure-serp-data` so the structured SERP analysis can also reference competitor content.

---

## 11. Token Budget

| Component | Estimated Tokens |
|---|---|
| 3 competitor pages × 3000 chars each (~750 tokens/page) | ~2,250 input tokens |
| Additional prompt instructions | ~300 tokens |
| **Total added to Strategist prompt** | **~2,500 tokens** |
| At Claude Sonnet 4.6 pricing ($3/$15 per MTok) | **~$0.008 per generation** |

No change to Writer token budget (competitor raw content never reaches Chef Augustin).

---

## 12. Acceptance Criteria

1. `lib/competitor-content.ts` exports `CompetitorPageContent` type and `fetchCompetitorContent()` function
2. `serp-phase.ts` has a new `enrich-from-competitors` sub-step that runs after `analyze-serp`
3. The Strategist receives `competitorContent` and produces richer plans (measurable via Content Loop scores)
4. When all 3 competitor URLs fail to fetch, the pipeline completes normally (no degradation)
5. `npx tsc --noEmit` passes
6. Content Loop scores do NOT regress (compare 3 generations with/without enrichment)
7. `content-loop-phase.ts` change is limited to 1 line (passing `competitorContent`); `chef-augustin.ts` and `agent-chef-augustin.md` are unchanged

---

## 13. What's NOT in Scope (V2)

- Reddit API / YouTube API / Google Trends integration
- Deterministic signal scoring engine (weights, thresholds)
- `brief.json` with 15 output fields
- USDA/CIQUAL nutrition lookup
- Seasonality lookup tables
- Webhook endpoint `POST /api/ai-writer/prepare`
- Prompt caching for competitor content
- The `fusion.v1.md` and `extract-painpoints.v1.md` skills
