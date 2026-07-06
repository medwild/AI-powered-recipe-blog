# Phase 0 — Pinterest Discovery Pipeline — Design Spec

> **Status:** Draft — awaiting user review
> **Date:** 2026-07-06
> **Topic:** Automated keyword discovery, Opportunity Score v2 application, and PTRA-compatible topical cluster building
> **Parent strategy:** Pinterest SERP Hijacking ([[pinterest-serp-hijacking-strategy]])

---

## 1. Context & Motivation

### 1.1 Strategic pivot

The blog pivots from Google-first SEO to **Pinterest SERP Hijacking**: target keywords where Pinterest already ranks on Google page 1, then compete on the Pinterest platform (not Google directly).

**Traffic flow:** Google SERP → Pinterest pin/board → Our specialized account → chefaugustin.com

### 1.2 Why Phase 0

Today, keyword discovery and topical clustering are **entirely manual**:
- Keywords are hardcoded in `lib/topical-map.ts` (Cluster/TopicNode types)
- Opportunity scoring was done by hand for the top 10 keywords
- Batch scripts (`generate-sourdough-batch.ts`) use hardcoded keyword arrays

Phase 0 automates the **Discovery** step before content generation. A human still reviews and approves before launching the pipeline.

### 1.3 Relationship to PTRA

The PTRA (Pinterest Topical Resonance Authority) framework (`ptra-editorial-architect/SKILL.md`) governs editorial coherence. The Opportunity Score v2 is **complementary** to PTRA:

| | Opportunity Score v2 | PTRA Coherence Score |
|---|---|---|
| **Question** | "Can we compete for this keyword?" | "Is this content editorially coherent?" |
| **When** | Phase 0 — before pipeline | Phase Pipeline — Pin Designer agent |
| **Input** | External SERP data (followers, domains) | Internal content (hook, visual, board) |
| **Applied by** | `score-opportunities.ts` | Agent Pin Designer (existing) |

---

## 2. Opportunity Score v2

### 2.1 Formula

```
OPPORTUNITY (0-100) = DomainBeatability(35%) + EngagementGap(30%) + SpecializationGap(20%) + URLType(15%)
```

### 2.2 Factor 1 — Domain Beatability (35%)

Can we beat the domain the competitor links to?

| Level | Score | Domains | Action |
|---|---|---|---|
| Unbeatable | 0 | allrecipes.com, delish.com, foodandwine.com, foodnetwork.com, bonappetit.com | DISQUALIFIED |
| Very Hard | 20 | skinnytaste.com, gimmesomeoven.com, wellplated.com, cookieandkate.com | Avoid unless hyper-specific niche |
| Medium | 60 | Known independent blog, ~5yr domain | Beatable with specialization |
| Weak | 90 | Personal account, no blog, Google Docs link | Priority target |
| Unknown | 100 | No site linked, dead site | Ideal target |

**Classification lookup table** maintained in the script itself (not a separate config). Easy to update as new domains are classified.

### 2.3 Factor 2 — Engagement Gap (30%)

Based on follower count (proxy for engagement):

| Followers | Score |
|---|---|
| <50 | 100 |
| 50-200 | 80 |
| 200-1000 | 50 |
| 1000-5000 | 20 |
| 5000+ | 0 |

**Correction:** Known brand = -30 pts automatic.

### 2.4 Factor 3 — Specialization Gap (20%)

How specialized is the competitor account?

| Type | Score |
|---|---|
| Personal account (recipes + decor + quotes) | 100 |
| Generalist cooking | 70 |
| Semi-specialized (right category, not exact niche) | 40 |
| Very specialized (exact niche) | 10 |

### 2.5 Factor 4 — URL Type (15%)

Board URL vs Pin URL:

| Type | Score | Effort to beat |
|---|---|---|
| Pin URL (`/pin/...`) | 100 | 1-3 months |
| Board micro-niche (<20 pins) | 60 | 3-6 months |
| Board large (>50 pins) | 20 | 6-12 months |

### 2.6 Thresholds

| Score | Action |
|---|---|
| ≥ 75 | High priority — immediate pipeline |
| 65-74 | Medium priority — after ≥75 batch exhausted |
| < 65 | Revisit in 6 months or after domain authority established |
| DISQUALIFIED | Never — unbeatable domain/brand |

---

## 3. Architecture

### 3.1 Data Flow

```
data/pinterest-input.json          ← Human: export Semrush → format JSON
        │
        ▼
scripts/score-opportunities.ts     ← Opportunity Scorer (deterministic, no LLM)
        │
        ▼
data/pinterest-scored.json         ← All keywords with scores + metadata
        │
        ▼
scripts/build-clusters.ts          ← Topical Cluster Builder (token overlap, no LLM)
        │
        ▼
data/pinterest-clusters.json       ← Clusters ready for generation
        │
        ▼
scripts/generate-pinterest-batch.ts ← Batch caller (calls POST /api/recipes/generate)
        │
        ▼
Inngest Pipeline                   ← Existing pipeline (12 steps)
```

### 3.2 Design Principles

1. **No LLM** — Both scripts are deterministic. Scoring is a pure function. Clustering is token overlap. No API calls, no costs, no latency.
2. **JSON contracts** — Every step reads and writes JSON. The human can inspect or edit any intermediate file.
3. **PTRA-aligned** — Micro-niche lock required at input. Keywords outside the niche are flagged. Missing fields are marked `HYPOTHESIS`.
4. **Idempotent** — Running the same input twice produces the same output.
5. **Git-friendly** — Input template is committed. Generated output files are gitignored.

---

## 4. Component 1 — Opportunity Scorer

### 4.1 File

`scripts/score-opportunities.ts`

### 4.2 Usage

```bash
npx tsx scripts/score-opportunities.ts data/pinterest-input.json --niche "sourdough discard recipes"
```

### 4.3 Input Format (`data/pinterest-input.json`)

```json
[
  {
    "keyword": "dirty soda recipes",
    "google_position": 3,
    "pinterest_url_type": "pin",
    "competitor_domain": null,
    "competitor_followers": 101,
    "competitor_account_type": "personal",
    "search_volume": 18100,
    "trending": true,
    "user_problem": "HYPOTHESIS",
    "solution_promise": "HYPOTHESIS"
  }
]
```

**Field definitions:**

| Field | Required | Description |
|---|---|---|
| `keyword` | Yes | Target keyword |
| `google_position` | Yes | Position on Google page 1 (1-10) |
| `pinterest_url_type` | Yes | `"pin"` or `"board"` |
| `competitor_domain` | Yes | Domain the competitor links to, or `null` |
| `competitor_followers` | Yes | Pinterest follower count (number) |
| `competitor_account_type` | Yes | `"personal"`, `"generalist"`, `"semi-specialized"`, `"very-specialized"` |
| `search_volume` | No | Monthly search volume from Semrush |
| `trending` | No | Whether the keyword is trending upward |
| `user_problem` | No | PTRA Phase 2 — the problem this content solves. If absent, scored as `"HYPOTHESIS"` |
| `solution_promise` | No | PTRA Phase 2 — the solution. If absent, scored as `"HYPOTHESIS"` |

### 4.4 Scoring Logic

Each factor is a **pure function** — no side effects, no randomness.

```typescript
function scoreDomainBeatability(domain: string | null): { score: number; level: string } {
  if (!domain) return { score: 100, level: "Unknown" }
  // Lookup in classification table
  // Returns { score, level }
}

function scoreEngagementGap(followers: number, isBrand: boolean): number {
  // Threshold-based lookup
  // Apply -30 correction if isBrand
}

function scoreSpecializationGap(accountType: string): number {
  // Direct mapping: personal→100, generalist→70, etc.
}

function scoreURLType(urlType: string): number {
  // Direct mapping: pin→100, board-small→60, board-large→20
}

function calculateOpportunity(keyword: RawKeyword): ScoredKeyword {
  const domainBeatability = scoreDomainBeatability(keyword.competitor_domain)
  if (domainBeatability.level === "Unbeatable") {
    return { ...keyword, score: 0, status: "DISQUALIFIED", reason: "Unbeatable domain" }
  }

  const score =
    domainBeatability.score * 0.35 +
    scoreEngagementGap(keyword.competitor_followers, isKnownBrand(keyword.competitor_domain)) * 0.30 +
    scoreSpecializationGap(keyword.competitor_account_type) * 0.20 +
    scoreURLType(keyword.pinterest_url_type) * 0.15

  const status = score >= 75 ? "high" : score >= 65 ? "medium" : score >= 1 ? "low" : "disqualified"

  return { ...keyword, score: Math.round(score), status }
}
```

### 4.5 Output (`data/pinterest-scored.json`)

```json
[
  {
    "keyword": "dirty soda recipes",
    "score": 91,
    "status": "high",
    "breakdown": {
      "domainBeatability": { "score": 100, "level": "Unknown", "weighted": 35.0 },
      "engagementGap": { "score": 80, "weighted": 24.0 },
      "specializationGap": { "score": 100, "weighted": 20.0 },
      "urlType": { "score": 100, "weighted": 15.0 }
    },
    "niche_match": true,
    "hypotheses": ["user_problem", "solution_promise"],
    "...": "all original fields preserved"
  }
]
```

### 4.6 Terminal Output (Summary Report)

```
=== Opportunity Scorer v2 ===
Micro-niche: sourdough discard recipes
Input: 25 keywords from data/pinterest-input.json

Results:
  HIGH (≥75):      8 keywords
  MEDIUM (65-74):  5 keywords
  LOW (<65):       10 keywords
  DISQUALIFIED:    2 keywords

Top 5:
  1. dirty soda recipes — 91 (HIGH)
  2. easy finnish recipes — 88 (HIGH)
  3. easy venezuelan recipes — 85 (HIGH)
  4. wonton wrapper recipes — 84 (HIGH)
  5. chuck steak recipes — 82 (HIGH)

Niche mismatches flagged: 3
Hypotheses to resolve: 12 fields across 8 keywords

Scored data → data/pinterest-scored.json
Next step → npx tsx scripts/build-clusters.ts data/pinterest-scored.json
```

---

## 5. Component 2 — Topical Cluster Builder

### 5.1 File

`scripts/build-clusters.ts`

### 5.2 Usage

```bash
npx tsx scripts/build-clusters.ts data/pinterest-scored.json
```

### 5.3 Algorithm

**Token overlap** with stop word removal:

1. Filter scored keywords to `status === "high"` (≥75)
2. For each keyword, extract significant tokens: remove stop words (`recipe`, `recipes`, `easy`, `best`, `quick`, `simple`, `homemade`, `how`, `to`, `make`), lowercase, stem (basic: remove trailing 's')
3. Two keywords share a cluster if they have ≥2 significant tokens in common
4. Keywords with no cluster match are listed in `orphans`

**Example:**
- `easy finnish recipes` → tokens: `finnish`
- `easy venezuelan recipes` → tokens: `venezuelan`
- Result: 0 shared tokens → NOT clustered (different cuisine)

- `carnivore diet recipes` → tokens: `carnivore`, `diet`
- `daniel fast recipes` → tokens: `daniel`, `fast`
- Result: 0 shared tokens → NOT clustered (different diet)

When token overlap fails, keywords are grouped by **semantic category** using a manual mapping table:
- `diet` pattern: `carnivore diet`, `daniel fast` → cluster `diet-specific`
- `cuisine pattern`: `finnish`, `venezuelan` → cluster `ethnic-cuisine`
- Ingredient patterns grouped by the ingredient noun

### 5.4 Cluster Structure (PTRA Phase 4 compatible)

```json
{
  "cluster_name": "griddle-recipes",
  "micro_niche": "sourdough discard recipes",
  "user_problem": "HYPOTHESIS — à définir",
  "pinterest_intent": "step-by-step",
  "primary_board": "Blackstone & Griddle Recipes",
  "keywords": [
    {
      "keyword": "blackstone recipes",
      "score": 77,
      "breakdown": { "...": "..." }
    }
  ],
  "total_opportunity_score_avg": 77.0,
  "priority": "high",
  "ptra_reference": "Phase 4 — Cluster Map Construction"
}
```

### 5.5 Orphans Handling

Keywords with score ≥75 that don't fit any cluster:

```json
{
  "orphans": [
    {
      "keyword": "dirty soda recipes",
      "score": 91,
      "reason": "No token overlap with any other keyword",
      "recommendation": "Create standalone cluster or review manually"
    }
  ]
}
```

### 5.6 Output (`data/pinterest-clusters.json`)

```json
{
  "micro_niche": "sourdough discard recipes",
  "generated_at": "2026-07-06",
  "clusters": [ "...cluster objects..." ],
  "orphans": [ "...orphan objects..." ],
  "summary": {
    "total_keywords_scored": 25,
    "high_priority": 8,
    "clusters_created": 3,
    "orphans": 1
  }
}
```

---

## 6. Component 3 — Batch Caller

### 6.1 File

`scripts/generate-pinterest-batch.ts`

### 6.2 Usage

```bash
npx tsx scripts/generate-pinterest-batch.ts data/pinterest-clusters.json
```

### 6.3 Behavior

Iterates over all clusters, then over each keyword within each cluster. Calls `POST /api/recipes/generate` with:

```typescript
const body = {
  keyword: item.keyword,
  cuisine: cluster.micro_niche,
  // mode: "pin-first"  ← FUTURE: Section 3 (Phase 1 Pipeline) will add this
}
```

**Rate limiting:** Respects Inngest throttle (2/min). Waits 35s between calls (same pattern as `generate-sourdough-batch.ts`).

### 6.4 Current Limitation

The pipeline currently produces **Google-first content** (1800-2200 words, 5 FAQ, Nutrition Highlights). The Pin-First format (1200-1500 words, 3 FAQ, no Nutrition Highlights, recipe card above fold) will be implemented in **Section 3 — Phase 1 Pipeline**.

For now, the batch caller uses the pipeline as-is. Content generated during this interim period can be edited later or regenerated once Pin-First mode is implemented.

---

## 7. PTRA Alignment

### 7.1 PTRA Principles Applied

| PTRA Rule | How Phase 0 Implements It |
|---|---|
| **Micro-Niche Lock** (§2) | `--niche` parameter required. Keywords outside niche flagged as `niche_mismatch` |
| **Problem-Solution Fit** (§2) | `user_problem` and `solution_promise` fields in input. Missing → `HYPOTHESIS` (never silently assumed) |
| **No cluster without purpose** (§4) | Clusters only form from scored keywords. Orphans reported separately for human review |
| **Pinterest Intent Taxonomy** (§3) | Each cluster assigned a `pinterest_intent` from the universal taxonomy |
| **Board Architecture** (§5) | Each cluster has a `primary_board` name |
| **Rejection criteria** (§6) | Keywords outside micro-niche rejected. Unbeatable domains disqualified |

### 7.2 What Phase 0 Does NOT Do

Phase 0 does NOT replace the PTRA Editorial Architect. It handles **Discovery only**. Full PTRA application happens downstream:
- Pin variants, hooks, visual direction → Agent Pin Designer (existing)
- Board architecture details → PTRA Editorial Architect (existing skill)
- Publishing calendar → PTRA Editorial Architect

---

## 8. File Manifest

| File | Type | Git | Purpose |
|---|---|---|---|
| `scripts/score-opportunities.ts` | New | Commit | Opportunity Scorer |
| `scripts/build-clusters.ts` | New | Commit | Topical Cluster Builder |
| `scripts/generate-pinterest-batch.ts` | New | Commit | Batch caller |
| `data/pinterest-input.json` | New | Commit (template) | Input template with example |
| `data/pinterest-scored.json` | New | Gitignore | Generated — scored keywords |
| `data/pinterest-clusters.json` | New | Gitignore | Generated — clusters |
| `data/.gitkeep` | New | Commit | Keep data/ directory |

### 8.1 Gitignore additions

```gitignore
# Pinterest Discovery — generated files
data/pinterest-scored.json
data/pinterest-clusters.json
```

### 8.2 Existing files — NO CHANGES

| File | Reason |
|---|---|
| `lib/topical-map.ts` | Coexists. Will be deprecated after Pin-First pipeline is validated |
| `lib/inngest/functions/generate-recipe.ts` | Unchanged. `mode` parameter added in Section 3 |
| `skills/agent-strategist.md` | Unchanged. Pin-First adaptation in Section 3 |
| `skills/agent-writer.md` | Unchanged. Pin-First adaptation in Section 3 |
| `lib/content-validator.ts` | Unchanged. New thresholds in Section 3 |

---

## 9. Dependencies on Future Sections

| Dependency | Required By | Section |
|---|---|---|
| `mode: "pin-first"` in pipeline | Batch caller produces Pin-First content | Section 3 |
| Writer Pin-First adaptation (1200-1500 words) | Content matches Pinterest format | Section 3 |
| ContentValidator thresholds update | Validation passes for shorter content | Section 3 |
| Strategist Pin-First adaptation | Editorial plans match Pin intent | Section 3 |

---

## 10. Success Criteria

- [ ] `score-opportunities.ts` produces identical scores to manual scoring of the top 10 keywords
- [ ] `build-clusters.ts` groups related keywords together (human-validated grouping)
- [ ] `generate-pinterest-batch.ts` successfully triggers the pipeline for all HIGH keywords
- [ ] All 3 scripts run without errors on the full top 25 keyword set
- [ ] PTRA compliance: no keyword outside micro-niche passes through, all missing fields marked HYPOTHESIS
- [ ] Terminal output is clear and actionable (human can decide next steps from the summary)

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Token overlap clustering produces meaningless groups | Human reviews `pinterest-clusters.json` before batch. Orphans are surfaced explicitly |
| Domain classification table incomplete | Unknown domains default to score 100 (Unknown). Table is updated as new domains are encountered |
| Batch caller produces Google-format content before Pin-First is ready | Acceptable interim state. Content can be regenerated once Section 3 is implemented |
| Scoring model doesn't predict actual Pinterest competition | Model is a hypothesis. Validate after 4-6 weeks of publishing against Pinterest Analytics |
