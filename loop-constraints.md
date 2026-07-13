# Loop Constraints — AI AutoBlog Content Generation

> The Content Loop reads this file at the start of every generation.
> Constraints here are **binding** — the agent MUST follow them.

## Generation
- Max 3 Writer→Evaluator passes per recipe
- Stop if score reaches `GEO_BLOCK_THRESHOLD` (env-configurable, default 60)
- Stop if score does not improve between consecutive passes (diminishing returns)
- Use the best-scoring content across all passes for final output

## Content Quality
- Never publish content with GEO score below `GEO_BLOCK_THRESHOLD`
- Never skip attribution check — minimum 6 source attributions per article
- Never skip nugget check — minimum 3 answer nuggets per article
- Block: banned words Tier 1 (22 terms), health claims without source, internal vibe tokens
- All internal meat temperatures must meet USDA minimums

## Safety
- Never auto-publish without human review unless `AUTO_APPROVE=true` (autopilot mode)
- In AUTOPILOT mode: the Content Loop (Evaluator-Optimizer) is the sole quality gate
- In AUTOPILOT mode: persist validators are warn-only (log, don't block)
- In AUTOPILOT mode: only structural errors (empty ingredients/instructions/title), USDA food safety violations, and content similarity >60% still block
- Never disable ContentValidator or GEO Validator checks
- Never remove items from the banned words list without explicit approval

## Budget
- Max 3 LLM calls per recipe generation (8192 tokens × 3 = ~24k output tokens max)
- If a generation fails all 3 passes, mark as "draft" and escalate to human
- Token spend tracked via Inngest logs + loop-run-log.md

## Communication
- Log every loop pass to `loop-run-log.md` (keyword, score, passes used, outcome)
- Update `STATE.md` after each generation completes
- Escalate blocked content to "Waiting for Human" section in STATE.md

---
<!-- Project-specific rules above. Machine-enforceable constraints. -->
