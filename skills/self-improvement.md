---
id: "self-improvement"
version: "2.0.0"
description: "Continuous self-improvement with contextual filtering — storing lessons with recipe context and applying only relevant ones to future generations"
---

# Self-Improvement — Continuous Improvement Loop with Contextual Filtering

## Purpose

Store lessons learned from each recipe (auditor recommendations) with full recipe context, and inject only **contextually relevant** lessons into future generations to continuously improve article quality without cross-contaminating incompatible recipe types.

## Architecture

```
┌──────────┐   criteria < 16/20        ┌─────────────────────────────────┐
│ Auditor  │ ──────────────────────────▶│ self_improvement_logs           │
│ (Agent 3)│  keyword + criterion       │ (PostgreSQL table)              │
└──────────┘  + score + tags            │ columns: keyword, criterion,    │
                                         │ score, recommendation, tags    │
                                         └─────────────────────────────────┘
                                                      │
                                                      ▼  Top 10 recent lessons
                                         ┌─────────────────────────────────┐
                                         │ Contextual Filtering            │
                                         │ (LLM-side — Strategist prompt)  │
                                         │                                 │
                                         │ "Only apply lessons relevant    │
                                         │  to the current recipe type.    │
                                         │  Skip incompatible lessons."    │
                                         └─────────────────────────────────┘
                                                      │
                                                      ▼  ~0-5 relevant lessons
┌──────────┐   filtered lessons          ┌─────────────────────────────────┐
│ Strategist│◀────────────────────────────│ SEO Strategist prompt           │
│ (Agent 1)│                             │ (each lesson annotated with     │
└──────────┘                              │  keyword + criterion + score)  │
```

## Rules

### When to Store a Lesson
- **Always** when an auditor criterion scores < 16/20
- Store alongside:
  - `keyword` — the recipe keyword that generated this lesson
  - `criterion` — which of the 7 criteria triggered it (e.g., "Sensory Richness")
  - `score` — the actual score that triggered it (e.g., "14")
  - `recommendation` — the actionable improvement
  - `tags` — the recipe's tags (e.g., ["dessert", "baking", "french"])

### When to Reuse Lessons
- **On every new generation** (Agent 1 — SEO Strategist)
- The **10 most recent** lessons are loaded, each annotated with its context
- The **Strategist's prompt** instructs it to filter:
  - **UNIVERSAL** lessons (sensory descriptors, readability, anti-AI patterns, persona) → ALWAYS apply
  - **TYPE-SPECIFIC** lessons (baking temps, meat doneness, sauce techniques) → only apply if the current recipe matches the original recipe type
  - **INCOMPATIBLE** lessons (dessert lesson for soup, raw technique for baked dish) → SKIP

### Contextual Relevance Heuristics (for the LLM)
- Tag overlap: if current recipe tags share ≥2 tags with the lesson's tags → likely relevant
- Criterion type: "Sensory Richness", "Readability", "Humanization & Persona", "Anti-AI Detection" → universally applicable
- Criterion type: "Anti-Hallucination", "On-Page SEO", "AEO/GEO" → apply with caution, verify compatibility
- Dish incompatibility examples:
  - Baking → No-cook recipe = SKIP
  - Meat → Dessert = SKIP
  - Deep frying → Salad = SKIP
  - Long braise → Quick stir-fry = SKIP

### Lesson Format (stored in DB)
```json
{
  "id": 42,
  "keyword": "Tarte aux pommes facile",
  "criterion": "Sensory Richness",
  "score": "14",
  "recommendation": "Add at least 2 texture descriptors (crispy crust, velvety filling) and 1 aroma mention (buttery, caramelized) in the Chef's Tips section",
  "tags": ["dessert", "baking", "french", "apple"],
  "createdAt": "2026-06-26T10:00:00.000Z"
}
```

## Usage

```typescript
// Write (Agent 3 → Step 9) — enriched with context
const enriched = currentAudit.criteria
  .filter(c => c.score < 16)
  .map(c => ({
    keyword,
    criterion: c.name,
    score: String(c.score),
    recommendation: c.recommendation,
    tags: finalRecipe!.tags ?? [],
  }))

await db.insert(selfImprovementLogs).values(enriched)

// Read (Agent 1 → Step 2) — with full context
const pastLogs = await db
  .select({
    keyword: selfImprovementLogs.keyword,
    criterion: selfImprovementLogs.criterion,
    score: selfImprovementLogs.score,
    recommendation: selfImprovementLogs.recommendation,
    tags: selfImprovementLogs.tags,
  })
  .from(selfImprovementLogs)
  .orderBy(desc(selfImprovementLogs.createdAt))
  .limit(10)

// Format with context for the Strategist prompt
const improvements = pastLogs.map(l =>
  `[From "${l.keyword}" | ${l.criterion} scored ${l.score}/20]: ${l.recommendation}`
)
```

## Benefits of Contextual Filtering

| Before (v1) | After (v2) |
|---|---|
| 3 most recent lessons loaded, any context | 10 most recent loaded, each annotated with keyword + criterion + score |
| No filtering — all lessons applied to all recipes | LLM-side filtering: universal lessons always, type-specific only when relevant |
| Risk: baking advice injected into soup recipes | Safe: incompatible lessons explicitly skipped with reasoning |
| Storage: keyword + recommendation only | Storage: keyword + criterion + score + tags + recommendation |
| Strategist prompt: raw list of strings | Strategist prompt: annotated list + contextual filtering instructions |
