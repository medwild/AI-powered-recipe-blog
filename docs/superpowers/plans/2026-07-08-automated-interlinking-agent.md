# Automated Internal Linking Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate internal linking by adding a deterministic Link Suggester (step 1.5) that feeds link targets to the Writer, and a Link Backfill job (step 14) that updates existing content with links to newly published content.

**Architecture:** Link Suggester is a pure TypeScript function doing tag-overlap scoring + diversity rules — no LLM. Link Backfill is an LLM-powered step triggered after publication that inserts a single contextual link into the top 5 most-related existing content pieces, validated to prevent content drift.

**Tech Stack:** TypeScript 5.7, Drizzle ORM 0.45, Inngest 4.7, PostgreSQL (Neon)

## Global Constraints

- Never rename existing Inngest steps
- New steps use `step.run("new-step-name", async () => {...})` pattern
- All type checks must pass: `npx tsc --noEmit`
- `lib/inngest/functions/steps/` is for step modules, `lib/inngest/functions/agents/` is for LLM agents
- Schema changes: new columns nullable or with `.default()`, new table for link logs
- Follow existing patterns: `appendLog()`, `logEntry()`, `db.insert()` for logging
- Writer receives `linkTargets` via `buildUserPrompt()` parameters
- Auditor link checks use the same pattern as existing criteria checks

---

### Task 1: Database — `internal_link_logs` table

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `internalLinkLogs` table (used by Task 2 and Task 3 for auditing)

- [ ] **Step 1: Add the table definition**

In `lib/db/schema.ts`, after the `image_variant_stats` table definition, add:

```typescript
export const internalLinkLogs = pgTable(
  "internal_link_logs",
  {
    id: serial("id").primaryKey(),
    sourceContentId: integer("source_content_id").notNull(),
    targetSlug: text("target_slug").notNull(),
    targetContentId: integer("target_content_id"),
    anchorText: text("anchor_text").notNull(),
    action: text("action").notNull(), // "insert" | "backfill" | "remove"
    source: text("source").notNull(), // "writer" | "editor" | "backfill"
    score: integer("score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ill_source_content_id").on(table.sourceContentId),
    index("idx_ill_target_slug").on(table.targetSlug),
    index("idx_ill_action").on(table.action),
  ],
)
```

Also add the type export after the existing type exports:
```typescript
export type InternalLinkLog = typeof internalLinkLogs.$inferSelect
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS. New table defined but not yet used anywhere.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add internal_link_logs table for automated interlinking audit"
```

---

### Task 2: Link Suggester — Deterministic step (1.5)

**Files:**
- Create: `lib/inngest/functions/steps/link-suggester.ts`

**Interfaces:**
- Consumes: `step` (Inngest), `recipeId: number`, `keyword: string`, `tags: string[]`, `contentType: "recipe" | "article"`
- Produces: `LinkTarget[]` where `LinkTarget = { slug: string, title: string, contentType: "recipe" | "article", score: number, reason: string }`
- Used by: Task 5 (generate-recipe.ts calls this step)

- [ ] **Step 1: Create the Link Suggester step**

Create `lib/inngest/functions/steps/link-suggester.ts`:

```typescript
/**
 * Step 1.5 — Link Suggester
 *
 * Deterministic scoring engine that finds the most relevant internal linking
 * targets for a new piece of content. No LLM — pure tag-overlap + diversity.
 *
 * Scoring (0-100):
 *   Tag overlap .................. 50 pts max
 *   Content-type diversity ...... 30 pts max
 *   Recency (< 30 days) ......... 15 pts max
 *   Hub priority ................  5 pts max
 *
 * Diversity rules:
 *   - Recipe → min 2 articles in top 7
 *   - Article → min 2 recipes in top 7
 *   - Max 1 link per category
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq, ne, sql } from "drizzle-orm"

export type LinkTarget = {
  slug: string
  title: string
  contentType: "recipe" | "article"
  score: number
  reason: string
}

function computeTagOverlap(sourceTags: string[], targetTags: string[]): number {
  if (!sourceTags.length || !targetTags.length) return 0
  const targetLower = targetTags.map((t) => t.toLowerCase())
  let matches = 0
  for (const tag of sourceTags) {
    if (targetLower.includes(tag.toLowerCase())) matches++
  }
  return Math.min(1, matches / Math.max(sourceTags.length, 1))
}

function daysSince(date: Date | null): number {
  if (!date) return 999
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
}

const HUB_TAGS = ["essential", "basics", "guide", "beginner", "starter"]

export async function runLinkSuggester(
  step: { run: (name: string, fn: () => Promise<LinkTarget[]>) => Promise<LinkTarget[]> },
  recipeId: number,
  keyword: string,
  tags: string[],
  contentType: "recipe" | "article",
): Promise<LinkTarget[]> {
  return step.run("link-suggester", async () => {
    // Step 1 — Candidate pool
    const candidates = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        contentType: recipes.content_type,
        tags: recipes.tags,
        category: recipes.category,
        publishedAt: recipes.publishedAt,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.status, "published"),
          ne(recipes.id, recipeId),
          sql`${recipes.heroImageUrl} IS NOT NULL`,
        ),
      )

    if (!candidates.length) return []

    // Step 2 — Score each candidate
    const scored = candidates.map((c) => {
      const cTags = (c.tags as string[]) ?? []
      const tagScore = computeTagOverlap(tags, cTags) * 50
      const typeScore = c.contentType !== contentType ? 30 : 0
      const recencyScore = daysSince(c.publishedAt) < 30 ? 15 : Math.max(0, 15 - daysSince(c.publishedAt) * 0.5)
      const hubScore = cTags.some((t) => HUB_TAGS.includes(t.toLowerCase())) ? 5 : 0
      const score = Math.round(tagScore + typeScore + recencyScore + hubScore)

      return {
        slug: c.slug,
        title: c.title,
        contentType: (c.contentType as "recipe" | "article") ?? "recipe",
        score,
        reason: tagScore > 0
          ? `${Math.round(tagScore / 50 * 100)}% tag match`
          : typeScore > 0
            ? "Content-type diversity"
            : recencyScore > 10
              ? "Recently published"
              : "General relevance",
      }
    })

    // Step 3 — Sort and apply diversity rules
    scored.sort((a, b) => b.score - a.score)

    const selected: typeof scored = []
    const usedCategories = new Set<string>()

    // First pass: pick by score, enforcing diversity
    for (const item of scored) {
      if (selected.length >= 7) break
      // Max 1 per category (for articles)
      if (item.contentType === "article" && usedCategories.has(item.slug)) continue
      selected.push(item)
      if (item.contentType === "article") usedCategories.add(item.slug)
    }

    // Second pass: enforce content-type diversity (min 2 of opposite type)
    const oppositeType = contentType === "recipe" ? "article" : "recipe"
    const oppositeCount = selected.filter((s) => s.contentType === oppositeType).length
    if (oppositeCount < 2) {
      // Find top-scoring opposite-type items not yet selected
      const extras = scored
        .filter((s) => s.contentType === oppositeType && !selected.includes(s))
        .slice(0, 2 - oppositeCount)
      // Replace lowest-scoring same-type items
      for (const extra of extras) {
        const lastSameTypeIdx = selected.findLastIndex((s) => s.contentType === contentType)
        if (lastSameTypeIdx >= 0 && selected.length >= 7) {
          selected[lastSameTypeIdx] = extra
        } else {
          selected.push(extra)
        }
      }
    }

    return selected.slice(0, 7)
  })
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS. New file, no consumers yet.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/steps/link-suggester.ts
git commit -m "feat: add Link Suggester — deterministic tag-overlap scoring + diversity rules"
```

---

### Task 3: Link Backfill — Async step (step 14)

**Files:**
- Create: `lib/inngest/functions/steps/link-backfill.ts`

**Interfaces:**
- Consumes: `step`, `recipeId: number`, `slug: string`, `title: string`, `tags: string[]`, `contentType: "recipe" | "article"`
- Produces: `void` — updates DB directly
- Uses: `agentEditor` calls from `./agents/editor` for markdown insertion

- [ ] **Step 1: Create the Link Backfill step**

Create `lib/inngest/functions/steps/link-backfill.ts`:

```typescript
/**
 * Step 14 — Link Backfill
 *
 * After a new content is published, finds the top 5 most-related existing
 * published content and inserts 1 contextual link to the new content in each,
 * using an Editor-like LLM call to minimize content drift.
 *
 * Validation:
 *   - Link count increased by exactly 1
 *   - Anchor text is not generic ("click here", "read more")
 *   - < 20% of original content changed (diff check)
 */

import { db } from "@/lib/db"
import { recipes, internalLinkLogs } from "@/lib/db/schema"
import { eq, and, ne, sql } from "drizzle-orm"
import { appendLog, logEntry } from "../helpers"
import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"

const BANNED_ANCHORS = ["click here", "read more", "here", "learn more", "this article", "this recipe"]

function computeTagOverlap(sourceTags: string[], targetTags: string[]): number {
  if (!sourceTags.length || !targetTags.length) return 0
  const targetLower = targetTags.map((t) => t.toLowerCase())
  let matches = 0
  for (const tag of sourceTags) {
    if (targetLower.includes(tag.toLowerCase())) matches++
  }
  return matches
}

export async function runLinkBackfill(
  step: { run: (name: string, fn: () => Promise<void>) => Promise<void> },
  recipeId: number,
  slug: string,
  title: string,
  tags: string[],
  contentType: "recipe" | "article",
): Promise<void> {
  return step.run("link-backfill", async () => {
    try {
      await appendLog(recipeId, logEntry("Link Backfill", "running", "Finding related content for backfill linking"))

      // Step 1 — Find top 5 related existing content
      const candidates = await db
        .select({
          id: recipes.id,
          slug: recipes.slug,
          title: recipes.title,
          contentMarkdown: recipes.content_markdown,
          tags: recipes.tags,
        })
        .from(recipes)
        .where(
          and(
            eq(recipes.status, "published"),
            eq(recipes.content_type, contentType === "recipe" ? "article" : "recipe"), // opposite type preferred
            ne(recipes.id, recipeId),
            sql`${recipes.contentMarkdown} IS NOT NULL`,
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(5)

      if (!candidates.length) {
        await appendLog(recipeId, logEntry("Link Backfill", "done", "No eligible candidates for backfill"))
        return
      }

      const systemPrompt = await loadSkillContent("agent-editor", {})

      for (const candidate of candidates) {
        // Skip if already links to this content
        if (candidate.contentMarkdown?.includes(`/${slug}`) || candidate.contentMarkdown?.includes(`(${slug}`)) {
          continue
        }

        const userPrompt = `BACKFILL TASK: Insert exactly 1 natural contextual link to this recipe in the most relevant section.
Do NOT change anything else. Return the FULL updated markdown.

NEW CONTENT TO LINK TO:
- URL: /${slug}
- Title: ${title}

EXISTING MARKDOWN TO UPDATE:
${candidate.contentMarkdown}

RULES:
- Insert exactly 1 link
- Anchor text must be descriptive and natural (NOT: "click here", "read more", "here")
- Place the link where it adds real value for the reader
- Keep ALL original content, structure, and formatting
- Return the COMPLETE markdown, identical except for the new link

Return JSON: { "updatedMarkdown": "...", "anchorText": "...", "section": "..." }`

        try {
          const result = await runTextAndParseJson<{
            updatedMarkdown: string
            anchorText: string
            section: string
          }>(systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 4096,
          })

          // Validation
          if (!result?.updatedMarkdown || !result?.anchorText) continue

          const anchorLower = result.anchorText.toLowerCase()
          if (BANNED_ANCHORS.some((b) => anchorLower.includes(b))) continue

          // Count links before and after
          const beforeLinks = (candidate.contentMarkdown?.match(/\]\(\/[\w-]+\/?[\w-]*\)/g) || []).length
          const afterLinks = (result.updatedMarkdown.match(/\]\(\/[\w-]+\/?[\w-]*\)/g) || []).length
          if (afterLinks !== beforeLinks + 1) continue

          // Content drift check: < 20% change
          const beforeLen = (candidate.contentMarkdown ?? "").length
          const afterLen = result.updatedMarkdown.length
          if (Math.abs(afterLen - beforeLen) / beforeLen > 0.2) continue

          // Apply the update
          await db
            .update(recipes)
            .set({ contentMarkdown: result.updatedMarkdown, updatedAt: new Date() })
            .where(eq(recipes.id, candidate.id))

          // Log the link
          await db.insert(internalLinkLogs).values({
            sourceContentId: candidate.id,
            targetSlug: slug,
            targetContentId: recipeId,
            anchorText: result.anchorText,
            action: "backfill",
            source: "backfill",
          })

          await appendLog(recipeId, logEntry("Link Backfill", "done",
            `Backfilled link in "${candidate.title}" → anchor: "${result.anchorText}"`))
        } catch {
          // Single failure shouldn't kill the loop
          continue
        }
      }

      await appendLog(recipeId, logEntry("Link Backfill", "done", "Backfill complete"))
    } catch (err) {
      await appendLog(recipeId, logEntry("Link Backfill", "error", (err as Error).message))
    }
  })
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS. May have issues with `internalLinkLogs` insert — verify table is exported from schema.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/steps/link-backfill.ts
git commit -m "feat: add Link Backfill — async post-publish link insertion with content drift validation"
```

---

### Task 4: Writer — Add link targets to prompt

**Files:**
- Modify: `lib/inngest/functions/agents/writer.ts`

**Interfaces:**
- Consumes: `linkTargets: LinkTarget[]` (new parameter to `agentWriter()`)
- Changes: `buildUserPrompt()` receives link targets and appends them to the prompt

- [ ] **Step 1: Add `linkTargets` parameter and inject into prompt**

In `lib/inngest/functions/agents/writer.ts`:

Add the import at the top:
```typescript
import type { LinkTarget } from "../steps/link-suggester"
```

Modify `buildUserPrompt()` signature from:
```typescript
function buildUserPrompt(keyword: string, plan: SeoPlan, format: "google" | "pin-first" = "google"): string {
```
To:
```typescript
function buildUserPrompt(keyword: string, plan: SeoPlan, format: "google" | "pin-first" = "google", linkTargets: LinkTarget[] = []): string {
```

Add to the end of `buildUserPrompt` (before the `return` with closing backtick), after the hard gate section:

```typescript
  ${linkTargets.length > 0 ? `## Internal Linking Targets
Insert 2-3 contextual links (3-4 for articles) within the body text using natural, descriptive anchor text.
Rules:
- Anchor text MUST be descriptive and specific — NEVER use "click here", "read more", "here", "this recipe", "this article"
- Max 1 link per H2 section
- Each link must add real value for the reader at that specific point in the text
- Use standard markdown syntax: [descriptive text](/path)

Recommended targets (choose 2-3 that fit most naturally):
${linkTargets.slice(0, 7).map(t => `- /${t.slug} | "${t.title}" | ${t.contentType} | score: ${t.score} | ${t.reason}`).join("\n")}

Pick targets where the connection feels natural and useful. Skip any that don't fit.` : ""}`
```

Modify `agentWriter()` signature from:
```typescript
export async function agentWriter(
  keyword: string,
  plan: SeoPlan,
  replacements?: Record<string, string>,
  format: "google" | "pin-first" = "google",
): Promise<RecipeDraft> {
```
To:
```typescript
export async function agentWriter(
  keyword: string,
  plan: SeoPlan,
  replacements?: Record<string, string>,
  format: "google" | "pin-first" = "google",
  linkTargets: LinkTarget[] = [],
): Promise<RecipeDraft> {
```

Modify the `userPrompt` assignment from:
```typescript
const userPrompt = buildUserPrompt(keyword, plan, format)
```
To:
```typescript
const userPrompt = buildUserPrompt(keyword, plan, format, linkTargets)
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS. The `agent-phase.ts` calls `agentWriter()` — verify it still compiles (optional parameter with default).

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/agents/writer.ts
git commit -m "feat: Writer accepts linkTargets — contextual link insertion in body text"
```

---

### Task 5: Auditor — Add 3 link quality checks

**Files:**
- Modify: `lib/inngest/functions/agents/auditor.ts`

**Interfaces:**
- Consumes: `existingTargets: LinkTarget[]` (valid slugs for broken link check)
- Changes: Add `link_count`, `anchor_quality`, `broken_links` to the audit criteria

- [ ] **Step 1: Add link checks to Auditor**

In `lib/inngest/functions/agents/auditor.ts`, add after existing criteria definitions:

Add import:
```typescript
import type { LinkTarget } from "../steps/link-suggester"
```

Modify `agentAuditor()` signature to accept an optional `linkTargets` parameter:
```typescript
export async function agentAuditor(
  article: string,
  recipeId: number,
  linkTargets?: LinkTarget[],
): Promise<AuditReport> {
```

In the system prompt addition (where criteria are defined), add these 3 criteria instructions inside the prompt building section of the function:

```
## Link Quality Criteria (NEW)

9. link_count — Score 0-100
   Does the article contain 2-4 internal links (3-5 for articles)?
   - 2-4 links: 100
   - 1 link: 50
   - 0 links: 0
   - 5+: 80 (over-linking penalty)
   Severity: WARNING if < 2, WARNING if > 5

10. anchor_quality — Score 0-100
    Are all anchor texts descriptive and varied?
    - No generic anchors ("click here", "read more", "here"): 100
    - 1 generic anchor found: 40 (HARD FAIL)
    - 2+ generic anchors: 0 (HARD FAIL)
    Check each link individually.

11. broken_links — Score 0-100
    Do all linked slugs point to existing published content?
    Valid slugs: %VALID_SLUGS%
    - All links match valid slugs: 100
    - 1 broken link found: 0 (HARD FAIL)
```

Where `%VALID_SLUGS%` is replaced by the slugs from `linkTargets` passed to the function (or from DB query).

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS. Verify the `agent-phase.ts` call to `agentAuditor` still compiles.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/agents/auditor.ts
git commit -m "feat: Auditor link checks — count, anchor quality, broken slugs"
```

---

### Task 6: Generate-recipe workflow — Integrate new steps

**Files:**
- Modify: `lib/inngest/functions/generate-recipe.ts`

**Interfaces:**
- Consumes: `runLinkSuggester` from `./steps/link-suggester`, `runLinkBackfill` from `./steps/link-backfill`
- Changes: Add step 1.5 (Link Suggester), pass `linkTargets` to Writer and Auditor, add step 14 (Link Backfill)

- [ ] **Step 1: Integrate Link Suggester and Link Backfill into the workflow**

In `lib/inngest/functions/generate-recipe.ts`:

Add imports:
```typescript
import { runLinkSuggester, type LinkTarget } from "./steps/link-suggester"
import { runLinkBackfill } from "./steps/link-backfill"
```

After the SERP phase (line 66-67), add the Link Suggester step:
```typescript
      // ── Phase 1.5: Link Suggester ────────────────────────────────────────
      const linkTargets = await runLinkSuggester(
        step, recipeId, keyword,
        serpResult.structuredSerp?.tags ?? [keyword],
        "recipe",
      )
```

Modify the `runAgentPhase` call to pass `linkTargets`. First check how it's called:

The `runAgentPhase` function creates and calls agents. It needs to pass `linkTargets` to both `agentWriter` and `agentAuditor`. Check `agent-phase.ts` to add the parameter:

In `lib/inngest/functions/steps/agent-phase.ts`, modify the function to accept and relay `linkTargets`:
```typescript
export async function runAgentPhase(
  step: { run: (name: string, fn: () => Promise<AgentPhaseResult>) => Promise<AgentPhaseResult> },
  recipeId: number,
  keyword: string,
  structuredSerp: StructuredSerp,
  cuisineReplacements: Record<string, string>,
  format: "google" | "pin-first",
  linkTargets?: LinkTarget[],
): Promise<AgentPhaseResult> {
```

Import `LinkTarget` at the top of agent-phase.ts:
```typescript
import type { LinkTarget } from "./link-suggester"
```

Pass `linkTargets` to `agentWriter()` call:
```typescript
const draft = await agentWriter(keyword, seoPlan, cuisineReplacements, format, linkTargets ?? [])
```

Pass `linkTargets` to `agentAuditor()` call:
```typescript
const audit = await agentAuditor(draft.contentMarkdown ?? "", recipeId, linkTargets ?? [])
```

Back in `generate-recipe.ts`, update the `runAgentPhase` call:
```typescript
      const agentResult = await runAgentPhase(step, recipeId, keyword, serpResult.structuredSerp, cuisineReplacements, format, linkTargets)
```

After the AOR phase (after `generateAorArticle` call), add the Link Backfill:
```typescript
      // ── Phase 14: Link Backfill ───────────────────────────────────────────
      if (agentResult.draft?.title && agentResult.draft?.tags) {
        await runLinkBackfill(
          step, recipeId,
          agentResult.draft.slug || keyword.replace(/\s+/g, "-").toLowerCase(),
          agentResult.draft.title,
          agentResult.draft.tags,
          "recipe",
        )
      }
```

Wait — the `agentResult.draft` doesn't have a `slug` field since slugs are generated during persist. Let me fix this: the recipe slug is available after persist. Let me move the backfill to after persist instead.

After the `persistFinalDraft` call, add:
```typescript
      // ── Phase 14: Link Backfill ───────────────────────────────────────────
      // Fetch the slug that was generated during persist
      const publishedRecipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        columns: { slug: true, title: true, tags: true },
      })
      if (publishedRecipe?.slug) {
        await runLinkBackfill(
          step, recipeId, publishedRecipe.slug,
          publishedRecipe.title, publishedRecipe.tags ?? [],
          "recipe",
        )
      }
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS. Verify all new integrations compile correctly.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/generate-recipe.ts lib/inngest/functions/steps/agent-phase.ts
git commit -m "feat: integrate Link Suggester (step 1.5) + Link Backfill (step 14) into pipeline"
```

---

### Task 7: Skills — Update Writer and Auditor markdown

**Files:**
- Modify: `skills/agent-writer.md`
- Modify: `skills/agent-auditor.md`

- [ ] **Step 1: Update Writer skill with linking rules**

In `skills/agent-writer.md`, add to the Output Schema section:

```markdown
## Internal Linking Rules (v6.5)

You will receive a list of recommended linking targets in your prompt.
These are content pages that are topically relevant to the recipe you're writing.

### Rules
- Insert 2-3 contextual links (3-4 for articles) within the body text
- Anchor text MUST be descriptive and varied — NEVER use "click here", "read more", "here"
- Max 1 link per H2 section
- Each link must feel natural and useful at that specific point in the text
- Use standard markdown: `[descriptive anchor text](/path)`
- Choose targets that add real value — skip any that don't fit naturally
- Prefer linking to content of the OPPOSITE type (recipe→article, article→recipe)
```

- [ ] **Step 2: Update Auditor skill with link checks**

In `skills/agent-auditor.md`, add to the criteria section:

```markdown
### Criterion 9 — link_count (0-100)
Does the article contain 2-4 internal links?
- 2-4 links: 100
- 1 link: 50
- 0 links: 0
- 5+ links: 80 (over-linking)
Severity: WARNING if < 2

### Criterion 10 — anchor_quality (0-100)
Are anchor texts descriptive and varied?
- All anchors are descriptive: 100
- ANY generic anchor found ("click here", "read more", "here", "this recipe", "learn more"): 0 → HARD FAIL
Check each link individually.

### Criterion 11 — broken_links (0-100)
Do all linked slugs exist in the provided valid slugs list?
- All links match valid slugs: 100
- Any broken link: 0 → HARD FAIL
```

- [ ] **Step 3: Commit**

```bash
git add skills/agent-writer.md skills/agent-auditor.md
git commit -m "feat: update Writer + Auditor skills with interlinking rules"
```

---

### Task 8: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: PASS with zero errors.

- [ ] **Step 2: Verify no step renamed**

```bash
grep -n "step\.run\|step\.sleep" lib/inngest/functions/generate-recipe.ts | grep -v "link-suggester\|link-backfill"
```

Expected: All existing step names are unchanged. New steps are "link-suggester" and "link-backfill".

- [ ] **Step 3: Verify schema new table**

```bash
grep -A10 "internalLinkLogs\|internal_link_logs" lib/db/schema.ts
```

Expected: Table definition present with correct columns.

- [ ] **Step 4: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds, all routes intact.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final verification — typecheck + build pass, no step renames"
```
