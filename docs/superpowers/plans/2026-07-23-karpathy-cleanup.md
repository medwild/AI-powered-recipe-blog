# Karpathy Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code, fix broken imports, align file structure, add missing web standards (manifest.json, AVIF).

**Architecture:** 3 passes — Fix broken (tests + dead deps), clean Inngest vestiges, add standards. Each pass ends with `tsc --noEmit` verification.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, Tailwind CSS 4

## Global Constraints

- `tsc --noEmit` must pass after each pass
- No `as any`, `@ts-ignore`, or `eslint-disable`
- Follow existing file naming: kebab-case for files, PascalCase for components
- All changes are surgical — touch only what's needed

---

### Task 1: Fix broken test fixtures

**Files:**
- Modify: `__tests__/fixtures/recipe-outputs.ts`

**Fix:** Remove dead imports from `@/lib/inngest/functions/agents/strategist` and replace with types from `@/lib/inngest/functions/agents/chef-augustin`.

- [ ] **Step 1: Remove dead imports**
  - Lines 8-9 import `StrategyPlan` and `SerpPhaseResult` from non-existent modules
  - `StrategyPlan` is used in `MOCK_STRATEGY_PLAN` (line 16) — move type definition inline or import from chef-augustin
  - `SerpPhaseResult` is used in `MOCK_SERP_RESULT` (line 47) — move type inline or import from existing step

- [ ] **Step 2: Run tsc to verify fix**
  ```
  npx tsc --noEmit
  ```

---

### Task 2: Remove unused gray-matter dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove from package.json**
  ```
  npm uninstall gray-matter
  ```

- [ ] **Step 2: Run tsc**
  ```
  npx tsc --noEmit
  ```

---

### Task 3: Fix lib/utils.ts inconsistency

**Files:**
- Create: `lib/utils/cn.ts`
- Modify: All files importing from `@/lib/utils` (for `cn`)
- Delete: `lib/utils.ts`

**Current state:** `lib/utils.ts` (contains `cn()` and `FOOD_BLUR_PLACEHOLDER`) lives at root while `lib/utils/duration.ts` and `lib/utils/sanitize.ts` are in subdirectory.

**Fix:** Move `cn()` and `FOOD_BLUR_PLACEHOLDER` to `lib/utils/cn.ts`, update all imports.

- [ ] **Step 1: Create `lib/utils/cn.ts`** — extract `cn()` + `FOOD_BLUR_PLACEHOLDER` from `lib/utils.ts`
- [ ] **Step 2: Find all imports from `@/lib/utils`**
  ```
  grep -rn "from '@/lib/utils'" --include="*.ts" --include="*.tsx" app/ lib/ components/
  ```
- [ ] **Step 3: Update all imports to `@/lib/utils/cn`**
- [ ] **Step 4: Delete `lib/utils.ts`**
- [ ] **Step 5: Run tsc**
  ```
  npx tsc --noEmit
  ```

---

### Task 4: Delete empty app/api/inngest/ directory

- [ ] **Step 1: Delete**
  ```
  rm -rf app/api/inngest
  ```

---

### Task 5: Refactor lib/inngest/ → lib/pipeline/

**Files:**
- Move: `lib/inngest/functions/agents/chef-augustin.ts` → `lib/pipeline/agents/chef-augustin.ts`
- Move: `lib/inngest/functions/steps/serp-phase.ts` → `lib/pipeline/steps/serp-phase.ts`
- Move: `lib/inngest/functions/steps/persist-phase.ts` → `lib/pipeline/steps/persist-phase.ts`
- Move: `lib/inngest/functions/steps/image-phase.ts` → `lib/pipeline/steps/image-phase.ts`
- Move: `lib/inngest/functions/helpers.ts` → `lib/pipeline/helpers.ts`
- Modify: All ~21 files importing from `@/lib/inngest/`

- [ ] **Step 1: Create target directories**
  ```
  mkdir -p lib/pipeline/agents lib/pipeline/steps
  ```
- [ ] **Step 2: Move files**
- [ ] **Step 3: Update ALL imports** — grep for `@/lib/inngest` and replace with `@/lib/pipeline`
- [ ] **Step 4: Delete empty `lib/inngest/` directory**
- [ ] **Step 5: Run tsc**
  ```
  npx tsc --noEmit
  ```

---

### Task 6: Add manifest.json (PWA meta)

**Files:**
- Create: `app/manifest.ts`

- [ ] **Step 1: Create Next.js manifest route**
  Route handler that returns standard web app manifest with name, icons, theme_color, background_color.

- [ ] **Step 2: Run tsc**
  ```
  npx tsc --noEmit
  ```

---

### Task 7: Add AVIF image format

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Add `formats` to images config**
  ```
  images: {
    formats: ['image/avif', 'image/webp'],
    ...
  }
  ```
- [ ] **Step 2: Run build to verify**
  ```
  npm run build
  ```

---

### Task 8: Add barrel exports

**Files:**
- Create: `components/ui/index.ts`
- Create: `lib/index.ts`

- [ ] **Step 1: Create `components/ui/index.ts`** — re-export button, card, badge, input, label, skeleton, etc.
- [ ] **Step 2: Create `lib/index.ts`** — re-export key utilities: `cn`, `slug`, `FOOD_BLUR_PLACEHOLDER`, db types
- [ ] **Step 3: Run tsc**
  ```
  npx tsc --noEmit
  ```
