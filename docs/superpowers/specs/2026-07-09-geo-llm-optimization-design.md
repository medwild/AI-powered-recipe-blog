# GEO/LLM Optimization — Design Spec

**Date**: 2026-07-09
**Status**: Approved
**Phase**: A1 — Citation-Worthy Claims + Source Attribution

## 1. Objective

Make ChefAugustin.com the cited source in LLM-powered answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini). This is **Phase A1** — the foundation layer: making content inherently citable by LLMs through specific, verifiable claims + named source attribution patterns.

### Success Metrics

| Metric | Current | Target |
|---|---|---|
| Citation claims per article | ~2 (incidental) | ≥5 (planned) |
| Source attributions per article | ~2 (brand mentions only) | ≥6 (1 per 250-300 words) |
| Citability score | Not measured | ≥70/100 |
| Content freshness signal | JSON-LD only | Visible in content + JSON-LD |

### Foundations (from Google's official AI Optimization Guide, July 2026)

- AI features use the same ranking systems as traditional search (RAG-based)
- "Unique, compelling, useful" content with direct experience signals is the #1 factor
- No special AI schemas, chunking, or mechanical tricks are needed
- `llm.txt` is NOT used by Google — we keep it for ChatGPT/Perplexity/Claude
- AI-generated content is acceptable if it provides real value (people-first)

---

## 2. Architecture

```
Strategist v5.3          Writer v5.4           Auditor v6.1          Editor v5.3
[planifie claims]   →   [implémente]      →   [score citation]  →   [corrige si < seuil]
[planifie attributions]  [insère patterns]
[planifie listes]        [pyramide inversée]
                               ↓
                         Persist Phase
                         ContentValidator
                         └─ geoValidator.checkCitability()
                            ├─ Score ≥ 70 → publish
                            ├─ Score 60-69 → warning + publish
                            └─ Score < 60 → draft + log erreur
```

### Data Flow

1. **Strategist v5.3** plans 5-6 citation claims + section structure (lists, tables)
2. **Writer v5.4** implements claims with source attribution, inverted pyramid intro
3. **Auditor v6.1** scores citation quality as a new dimension
4. **Editor v5.3** receives citability feedback in its correction loop
5. **GEO Validator** (deterministic code) checks final output before publication
6. Content below threshold (score < 60) → saved as `draft` + logged

### Files

| # | File | Action | Lines |
|---|---|---|---|
| 1 | `lib/geo-validator.ts` | **New** — `checkCitability()`, claim/attribution counters, scoring | ~120 |
| 2 | `lib/content-validator.ts` | Integrate `checkCitability()` call | +20 |
| 3 | `lib/inngest/functions/steps/persist-phase.ts` | Log + block if score < 60 | +25 |
| 4 | `lib/inngest/functions/steps/aor-phase.ts` | Same logic for AOR articles | +20 |
| 5 | `skills/agent-strategist.md` | v5.2.0-ULTRA → v5.3.0-ULTRA — Citation claims planning, list/table directives | +40 |
| 6 | `skills/agent-writer.md` | v6.5.0-ULTRA → v6.6.0-ULTRA — Source attribution patterns, inverted pyramid, freshness | +50 |
| 7 | `skills/agent-auditor.md` | v6.2.0-PREPUB → v6.3.0-PREPUB — `citation_quality` score dimension | +15 |
| 8 | `app/robots.ts` | Add explicit AI crawler allow rules | +8 |
| 9 | `next.config.ts` | Rewrite `/llms.txt` → `/llm.txt` (Option B: keep both URLs, no breaking change) | +5 |

---

## 3. Module: `lib/geo-validator.ts`

### API

```typescript
type CitabilityReport = {
  score: number           // 0-100
  claims: {
    count: number
    minRequired: number   // 5 per article
    matches: string[]
  }
  attributions: {
    count: number
    minRequired: number   // 6 per article (≈1/250-300 words)
    matches: string[]
  }
  passed: boolean         // score ≥ 60
  feedback: string
}

function checkCitability(markdown: string, wordCount: number): CitabilityReport
```

### Claim Detection (3 patterns)

| Pattern | Description | Example Matched |
|---|---|---|
| `numberedFact` | Number + unit in a declarative sentence | `375°F`, `22 minutes`, `3:1 ratio`, `30% less moisture` |
| `quantifiedComparison` | Explicit comparison with numbers | "unlike most recipes that use 350°F, this one uses 375°F" |
| `causalClaim` | Cause-effect with explicit connector | "because the cold butter creates steam pockets..." |

### Attribution Detection (5 patterns)

| Pattern | Description | Example Matched |
|---|---|---|
| `namedAuthority` | Chef Augustin + action verb | "Chef Augustin Lefèvre recommends/suggests/explains..." |
| `firstPersonTesting` | First-person testing claim | "I've tested this 12 times..." |
| `testingClaim` | Testing verb + count | "tested with 4 different butter temperatures" |
| `personalRecommendation` | Personal preference | "my go-to method", "I swear by" |
| `causalAttribution` | Source-based reasoning | "based on testing", "according to culinary tradition" |

### Scoring Formula

```
score = claimsScore (50%) + attributionsScore (30%) + densityScore (20%)

claimsScore       = min(count / 5, 1.0) × 100
attributionsScore = min(count / 6, 1.0) × 100
densityScore      = min((claims + attributions) / wordCount × 1000, 1.0) × 100
```

**Rule**: An attribution only counts if a claim is present in the same paragraph. No empty name-dropping.

### Thresholds

| Score | Action |
|---|---|
| ≥ 70 | ✅ Publish |
| 60-69 | ⚠️ Warning log + publish |
| < 60 | ❌ Block → `status: "draft"` + workflow error log |

---

## 4. Skill Changes

### 4.1 Strategist v5.2.0-ULTRA → v5.3.0-ULTRA

**New section (§9.5): "Citation-Worthy Claims Planning"**

The Strategist plans 5-6 specific claims per article. A claim is "citation-worthy" if:
- It contains a precise number (temperature, time, ratio, grams)
- It names a specific entity (ingredient, technique, tool)
- It expresses a cause-effect relationship (not just opinion)

**New section (§9.6): "List & Table Strategy"**

Plan ≥2 structured bullet lists or 1 comparison table per article. LLMs extract structured data 3× more readily than prose.

**New output fields:**
```json
{
  "citationStrategy": {
    "citationClaims": [
      "Bake at 375°F for 22-25 min — the 3:1 butter-to-flour ratio creates a tender crumb",
      "A 10-min rest redistributes juices, preventing 30% moisture loss"
    ],
    "listElements": 2,
    "tableElement": 0
  }
}
```

### 4.2 Writer v6.5.0-ULTRA → v6.6.0-ULTRA

**New section (§7.5): "Source Attribution Patterns"**

4 patterns, rotated throughout the article:

| Pattern | Template | Rule |
|---|---|---|
| Named authority + claim | "Chef Augustin Lefèvre [action verb] [specific claim]" | Claim must be in same sentence |
| First-person testing | "I've tested [variable] [count] times — [specific finding]" | Must include a number |
| Cause-effect expertise | "[Claim] because [mechanism]" | Mechanism must be specific |
| Comparison anchoring | "Unlike [common practice], [our approach] because [reason]" | Must name what's different |

**Rule**: ≥1 attribution every 250-300 words. Each attribution MUST be backed by a specific claim (no empty name-dropping).

**New section (§5.1): "Inverted Pyramid Intro"**

The first sentence of the introduction MUST directly answer: "What is this recipe and why does it work?" This is the TL;DR that LLMs extract as the primary answer.

**New section (§9.8): "Content Freshness Signal"**

Include a visible freshness marker in the article body:
- Intro or footer: "Tested and updated [month year]"
- Schema: `dateModified` set to the most recent test/revision date

### 4.3 Auditor v6.2.0-PREPUB → v6.3.0-PREPUB

**New score dimension**: `citation_quality` (0-100)

Checks:
- Are claims specific (numbers, entities) or generic?
- Are attributions present and natural (not forced)?
- Is density sufficient (≥1 attribution per 250-300 words)?
- Does the intro use inverted pyramid (direct answer in first sentence)?

---

## 5. Technical Infrastructure

### 5.1 robots.txt — AI Crawler Bots

```typescript
// app/robots.ts
rules: [
  { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] },
  { userAgent: "OAI-SearchBot", allow: "/" },
  { userAgent: "PerplexityBot", allow: "/" },
  { userAgent: "Bingbot", allow: "/" },
  { userAgent: "Googlebot", allow: "/" },
]
```

### 5.2 `/llms.txt` — Standard Path (Option B)

The `llm.txt` standard uses the plural form `/llms.txt`. Current route is at `/llm.txt` (singular) at `app/llm.txt/route.ts`. To support both without breaking the existing URL, add a Next.js rewrite in `next.config.ts`:

```typescript
// next.config.ts
async rewrites() {
  return [
    { source: "/llms.txt", destination: "/llm.txt" },
  ]
}
```

This maps `/llms.txt` → `/llm.txt` transparently. Both URLs serve the same content. No redirect, no broken links.

---

## 6. Integration Points

### In `persist-phase.ts` (recipes)

Called after `scrubBannedWords()` and before `checkContentSimilarity()`:

```typescript
const citability = checkCitability(finalRecipe.contentMarkdown ?? "", wordCount)
if (!citability.passed) {
  await appendLog(recipeId, logEntry("GEO Validator", "error",
    `Citability score ${citability.score}/100 < 60. Claims: ${citability.claims.count}/5, Attributions: ${citability.attributions.count}/6. ${citability.feedback}`))
  if (citability.score < 60) {
    await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
    return
  }
}
```

### In `aor-phase.ts` (articles)

Same logic, applied after AOR article generation. Articles without recipe content have a lower attribution threshold (4 instead of 6).

---

## 7. Impact Assessment

| Concern | Assessment |
|---|---|
| **Latency** | +0ms — pure deterministic code, no API calls |
| **Cost** | $0 — no additional LLM calls |
| **False positives** | Low risk — regex patterns are conservative. Worst case: log warning, still publish |
| **False negatives** | Medium risk — some valid claims may not match regex. Mitigated by Auditor citation_quality score |
| **Retrocompatibility** | ✅ — skill changes are additive, new fields are optional in output schema |
| **Pipeline risk** | Low — failure in geo-validator is caught, logged, never crashes the workflow |

---

## 8. Out of Scope (Deferred)

- **External source citations** (linking to studies, .gov, .edu) — needs a data source, Phase A4
- **Multi-LLM citation testing** (automated verification that content is cited) — Phase B
- **Co-occurrence strategy** (Reddit, Quora, LinkedIn presence) — marketing, not code
- **Agentic experience optimization** (browser agents, UCP) — emerging tech, monitor

---

## 9. Test Plan

```bash
# 1. Unit tests — GEO validator
npx tsx scripts/test-helpers.ts --geo-validator

# 2. TypeScript check
npx tsc --noEmit

# 3. End-to-end pipeline test
npm run test:e2e

# 4. Manual verification
# - Generate a recipe, check workflowLog for GEO validator results
# - Check /robots.txt includes AI crawler rules
# - Check /llms.txt is accessible
# - Verify content contains claims + attributions
```
