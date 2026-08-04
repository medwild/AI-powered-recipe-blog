# Template Content Deduplication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Seobility "Content that appears on several pages" flags (64 blocks, all on indexable pages) by removing byte-identical template paragraphs and cluster-description reuse across category, cluster, and /recipes pages.

**Architecture:** The duplication comes from three sources in template code: (1) a static "Got leftovers?" paragraph identical across all ~119 category pages, (2) each cluster `description` string reused 4-6× (own page header + own page "Why" section + sibling cards + /recipes grid), and (3) static boilerplate paragraphs in the cluster page template. Fix = delete the redundant copies + replace cluster-description cards with name-only cards; only category intro paragraphs stay, made unique per indexable tag via a per-tag intro map with a template fallback for noindex pages.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind. No new dependencies, no DB changes, no skill changes. Verification: `npx tsc --noEmit` + curl on dev server (localhost:3000) + grep for removed strings.

## Global Constraints

- **NEVER rule 6 (global.md)** — do not replace stack elements (Next.js, Drizzle, Tailwind).
- **NEVER rule 9** — no `// @ts-ignore`, `as any`, `eslint-disable`. Code must pass `npx tsc --noEmit`.
- **NEVER rule 10** — no DB schema changes.
- **Karpathy §3** — surgical changes only: touch only the lines each task targets, match existing style/comment density.
- **Do NOT modify skills** (`skills/chef-augustin-mega.md`) — out of scope.
- **Do NOT change routing/URLs, content_type filters, or redirects** — these pages must keep serving on their current routes.
- **Do NOT modify `lib/topical-map.ts` descriptions** (Task 3 reuses them as-is — they're the single source of truth).
- Category intro map: **only indexable categories get handwritten intros** (≥ 3 recipes). Noindex categories keep the template fallback (Google ignores them; they'll be indexed later when they pass the threshold — the fallback avoids a broken empty section).

---

### Task 1: Remove "Got leftovers?" paragraph from category template

**Files:**
- Modify: `app/recipes/category/[slug]/page.tsx:145-149` (the third `<p>` inside the "Why this category works for two" section)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (pure deletion). Later tasks reference the same file but touch different lines.

- [ ] **Step 1: Remove the paragraph**

Delete lines 145-149 — the third `<p>` in the "Why this category works for two" section:

```tsx
                <p>
                  Got leftovers? Most recipes here make exactly two servings. Some make enough for lunch the next day —
                  intentional leftovers that actually reheat well, not the sad container that gets pushed to the back
                  of the fridge. Because cooking for two should mean less waste, not less ambition.
                </p>
```

The section now ends after the second `<p>` (the `With N tested...` paragraph). Keep the surrounding JSX intact.

- [ ] **Step 2: Verify deletion**

Run: `grep -rn "Got leftovers" app/ components/ lib/ | grep -v node_modules`
Expected: no matches.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 4: Visual check on dev server**

Run: `curl -s -m 60 http://localhost:3000/recipes/category/30-minute | grep -c "Got leftovers"`
Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add app/recipes/category/[slug]/page.tsx
git commit -m "fix: remove static 'Got leftovers?' paragraph from category pages (64 duplicate text blocks)"
```

---

### Task 2: Remove "Why this category works for two" section from category template

**Files:**
- Modify: `app/recipes/category/[slug]/page.tsx:126-153` (the entire section, `<section>` … `</section>`)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (pure deletion). Task 3 replaces the intro with unique content in the same file's header.

- [ ] **Step 1: Remove the section**

Delete the entire "Why this category works for two" section (lines 126-153). Keep the `{/* BreadcrumbList JSON-LD */}` comment that follows.

- [ ] **Step 2: Verify no dangling JSX**

Run: `npx tsc --noEmit`
Expected: exit 0. If the file fails, the JSX is unbalanced — restore the closing `</section>`/`</div>`.

- [ ] **Step 3: Visual check**

Run: `curl -s -m 60 http://localhost:3000/recipes/category/30-minute | grep -c "Why 30-minute recipes work for two"`
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add app/recipes/category/[slug]/page.tsx
git commit -m "fix: remove template 'Why this category works' section (duplicate paragraphs across 119 pages)"
```

---

### Task 3: Unique intro paragraphs for indexable category pages

**Files:**
- Modify: `app/recipes/category/[slug]/page.tsx` (add `CATEGORY_INTROS` map; update `generateMetadata` + page component)

**Interfaces:**
- Consumes: `recipes.length` (from `getPublishedRecipesByTag`), `tag` (from `slugToTag`), `MIN_RECIPES_FOR_INDEX` (existing const = 3).
- Produces: `CATEGORY_INTROS: Record<string, string[]>` — later tasks don't depend on it, but the page uses it for both H1-area intro and fallback.

- [ ] **Step 1: Add the intro map**

After the `MIN_RECIPES_FOR_INDEX` const (line 20), add:

```ts
/**
 * Handwritten intro paragraphs for the 11 indexable categories (≥ 3 recipes).
 * Replaces the template skeleton that produced duplicate paragraphs across pages.
 * Noindex categories (< 3 recipes) keep the template fallback (Google ignores them).
 */
const CATEGORY_INTROS: Record<string, string[]> = {
  "30-minute": [
    "Dinner in 30 minutes or less, sized for two. These weeknight recipes lean on quick sears, one-pan cooking, and sauces that come together while the pasta boils — tested so the timing actually fits a Tuesday.",
  ],
  "30-minute meal": [
    "Complete meals for two that fit in a half-hour window. Each recipe pairs a protein with a side or sauce in a single pan, so the whole dinner lands on the table at the same time — no separate prep tracks.",
  ],
  chicken: [
    "The most versatile weeknight protein, portioned for two. From skillet sears to one-pan bakes, these chicken recipes are tested at two-serving scale so the breast stays juicy and the sauce actually clings.",
  ],
  "chicken breast": [
    "Boneless chicken breast recipes built for two people. The challenge is keeping a small breast tender instead of dry — these recipes control heat, pan size, and resting time so it works first try.",
  ],
  "comfort food": [
    "Small-batch comfort food for two — creamy pastas, hearty stews, and slow-simmered dishes that taste like a long cook even on a short night. Portions sized so you don't drown in leftovers.",
  ],
  "dinner for two": [
    "The core collection: complete dinners designed and tested for exactly two servings. Every recipe lists precise pan sizes and timings, because dividing a family recipe in half rarely works as-is.",
  ],
  "for two": [
    "Every recipe in this collection is built around two servings — no scaling guesswork, no half-empty fridge containers. Skillet, sheet pan, or slow cooker, the portions and timings are tuned for a small household.",
  ],
  "one-pan": [
    "One pan, two plates, minimal cleanup. These skillet and sheet-pan dinners for two are tested so the sauce reduces correctly in a smaller surface — no overcooked protein, no burned fond.",
  ],
  quick: [
    "Quick dinners for two — ready in about 30 minutes with real technique, not shortcuts that cost flavor. Short ingredient lists, hot pans, and methods that fit a weeknight schedule.",
  ],
  weeknight: [
    "Weeknight-friendly recipes for two: fast prep, common ingredients, and forgiving techniques. Designed to be cooked after a workday without a trip to a specialty store.",
  ],
  "weeknight dinner": [
    "The weeknight dinner collection for two people — reliable meals that come together quickly and scale naturally to two servings, with clear steps and exact timings.",
  ],
}
```

**Important:** `weeknight-dinner` is intentionally NOT in the map (it's a noindex category with < 3 recipes) — it must use the template fallback. Verify the map keys cover exactly the 11 indexable categories from the Seobility report: `30-minute`, `30-minute meal`, `chicken`, `chicken breast`, `comfort food`, `dinner for two`, `for two`, `one-pan`, `quick`, `weeknight`, `weeknight dinner`.

- [ ] **Step 2: Use the map in the page component**

In the page component's header (currently the `<p>` with `Looking for the best...`), replace the two template paragraphs with the map (fallback = existing template):

```tsx
        <header className="mt-4 mb-8">
          <h1 className="font-serif text-4xl text-balance">{titleTag} Recipes for Two</h1>
          <div className="mt-3 max-w-2xl text-muted-foreground leading-relaxed space-y-3">
            {CATEGORY_INTROS[tag] ? (
              CATEGORY_INTROS[tag].map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>
                  Looking for the best <strong>{tag}</strong> recipes for two people?
                  You&rsquo;re in the right place. Our collection of {recipes.length}{" "}
                  {tag.toLowerCase()} recipe{recipes.length !== 1 ? "s" : ""} brings
                  professional French technique to your weeknight table — scaled down,
                  tested, and ready when you are.
                </p>
                <p>
                  {recipes.length === 1
                    ? `This ${tag.toLowerCase()} recipe is the only one you need — developed, tested, and scaled for two people with no leftovers and no wasted ingredients.`
                    : `All ${recipes.length} ${tag.toLowerCase()} recipes are developed for two people: no leftovers that die in the back of the fridge, no ingredient waste, and no compromise on flavor. Whether you're after a quick weeknight fix or a slow-cooked weekend project, each recipe is tested at two-serving scale so it works the first time.`
                  }
                </p>
              </>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Visual check — indexable category**

Run: `curl -s -m 60 http://localhost:3000/recipes/category/30-minute | grep -o "Dinner in 30 minutes or less[^<]*" | head -1`
Expected: the handwritten intro appears, and `grep -c "Looking for the best"` returns `0` for this page.

- [ ] **Step 5: Visual check — noindex category keeps template**

Run: `curl -s -m 60 http://localhost:3000/recipes/category/weeknight-dinner | grep -c "Looking for the best"`
Expected: `1` (template fallback still works).

- [ ] **Step 6: Commit**

```bash
git add app/recipes/category/[slug]/page.tsx
git commit -m "fix: unique handwritten intros for 11 indexable category pages (kills duplicate paragraph flags)"
```

---

### Task 4: Remove "Why this cluster matters" section from cluster page

**Files:**
- Modify: `app/recipes/cluster/[slug]/page.tsx:143-169` (the entire section)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (pure deletion). Task 5 reuses the same file's sibling cards.

- [ ] **Step 1: Remove the section**

Delete the entire "Why this cluster matters" section (lines 143-169). This removes the intra-page duplicate of `cluster.description` (it was rendered in the header AND in the "Why" section) and the two byte-identical boilerplate paragraphs.

- [ ] **Step 2: Verify no dangling JSX**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Visual check**

Run: `curl -s -m 60 http://localhost:3000/recipes/cluster/one-pan-dinners-for-two | grep -c "you have a full toolkit"`
Expected: `0`. Also confirm the description still appears once (header):
Run: `curl -s -m 60 http://localhost:3000/recipes/cluster/one-pan-dinners-for-two | grep -o "Minimal cleanup[^<]*" | wc -l`
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add app/recipes/cluster/[slug]/page.tsx
git commit -m "fix: remove 'Why this cluster matters' section (duplicate description + boilerplate on 6 pillar pages)"
```

---

### Task 5: Name-only sibling cluster cards

**Files:**
- Modify: `app/recipes/cluster/[slug]/page.tsx:220-222` (remove the `<p>` inside the sibling `<Link>`)

**Interfaces:**
- Consumes: `siblingClusters` (existing — array of `{id, name, description}` from `getClusterById`).
- Produces: nothing (pure deletion).

- [ ] **Step 1: Remove the description paragraph**

Inside the sibling `<Link>` (lines 218-223), remove the `<p>`:

```tsx
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {sibling.description}
                  </p>
```

Keep the `<h3>{sibling.name}</h3>` intact.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0 (sibling descriptions were only used here + the "Why" section already removed in Task 4).

- [ ] **Step 3: Visual check**

Run: `curl -s -m 60 http://localhost:3000/recipes/cluster/one-pan-dinners-for-two | grep -o "Better-than-takeout" | wc -l`
Expected: `0` (Asian cluster description no longer appears on the One-Pan page's sibling cards).

- [ ] **Step 4: Commit**

```bash
git add app/recipes/cluster/[slug]/page.tsx
git commit -m "fix: name-only sibling cluster cards (description was duplicated on 3 other pillar pages)"
```

---

### Task 6: Name-only "Browse by collection" cards on /recipes

**Files:**
- Modify: `app/recipes/page.tsx:127-129` (remove the `<p>` inside the collection `<Link>`)

**Interfaces:**
- Consumes: `clusters` (existing — from `getAllClusters()`).
- Produces: nothing (pure deletion).

- [ ] **Step 1: Remove the description paragraph**

Inside the collection `<Link>` (lines 124-130), remove the `<p>`:

```tsx
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {c.description}
                  </p>
```

Keep the `<h3>{c.name}</h3>` intact.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Visual check**

Run: `curl -s -m 60 http://localhost:3000/recipes | grep -o "Practical chicken" | wc -l`
Expected: `0` (cluster description no longer appears on /recipes grid).

- [ ] **Step 4: Commit**

```bash
git add app/recipes/page.tsx
git commit -m "fix: name-only collection cards on /recipes (description was duplicated from cluster pages)"
```

---

## Final Verification (after all tasks)

Run these before declaring completion:

```bash
npx tsc --noEmit && echo "tsc OK"
# No duplicate-content strings remain anywhere
grep -rn "Got leftovers\|you have a full toolkit\|Browse the recipes below" app/ components/ lib/ | grep -v node_modules || echo "no duplicate strings"
# Each cluster description appears exactly once on its own page, zero on others
for c in small-batch-slow-cooker one-pan-dinners-for-two budget-meals-for-two chicken-dinners-for-two asian-inspired-dinners quick-healthy-dinners; do
  echo "== $c"; curl -s -m 60 "http://localhost:3000/recipes/cluster/$c" | grep -o "Minimal cleanup\|Better-than-takeout\|Delicious dinners\|Practical chicken\|Fast, nutritious\|Set-and-forget" | sort | uniq -c
done
```

Expected: each cluster page shows exactly `1` occurrence of its own description (e.g. `1 × Minimal cleanup` on one-pan), and `0` of the others.

---

## Self-Review

- **Spec coverage:** Every duplicate block from the Seobility report is addressed — "Got leftovers?" (Task 1), "Why X matter" + boilerplate (Task 2 + 4), cluster-description reuse (Tasks 4, 5, 6), variabilized category paragraphs (Task 3 unique intros). Left unaddressed deliberately: nav text ("Browse by ingredient", "Explore recipes by ingredient") and empty states — Seobility low-importance noise, not in the report's flagged block list.
- **Placeholder scan:** No TBD/TODO. Every step has real code or a real grep/curl command with expected output.
- **Type consistency:** `CATEGORY_INTROS` is `Record<string, string[]>` used in both step 1 (definition) and step 2 (render + fallback). `recipes.length`, `tag`, `MIN_RECIPES_FOR_INDEX` all already exist in the file. `siblingClusters` / `clusters` / `cluster.description` all already exist in their files. No invented APIs.
- **Line numbers** were verified against the actual files before writing the plan.
