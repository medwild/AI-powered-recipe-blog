# Recipe Page UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the recipe page into 7 visually distinct sections with modern UI (2:3 images, glass-morphism cards, animated checkboxes, process shot integration) while preserving all SEO metadata, JSON-LD, and query contracts.

**Architecture:** Split the monolithic `RecipeArticle` (336 lines) into 7 focused sub-components, each receiving typed props from the parent page. The page component continues to fetch data server-side; sub-components are presentational. Only `RecipeIngredients` is a client component (checkbox interactivity). A new `RecipeCard` with 2:3 ratio replaces the old 4:3 version.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS 4, shadcn/ui, `next/image`, `react-markdown` + `remark-gfm`

## Global Constraints

- No SEO regression: JSON-LD, meta tags, canonical URLs, content_type filters remain untouched
- No query changes in `lib/queries.ts`
- No Inngest step renames or pipeline changes
- `npx tsc --noEmit` must pass after ALL tasks
- Do NOT modify `lib/db/schema.ts`
- All new components go in `components/` (flat, no subdirectories)
- Follow existing patterns: `"use client"` only when needed, Server Components by default
- Use existing design tokens from `globals.css` (colors, fonts, radius variables)
- Import types from `@/lib/db/schema` — `Recipe`, `Ingredient`, `Instruction`
- Use `FOOD_BLUR_PLACEHOLDER` from `@/lib/utils` for image blur placeholders
- `"Tested 200+ times"` badge MUST be removed per accuracy rules (Rule 15 in global.md)
- Keep the `sanitizeMarkdown()` helper function in `recipe-article-body.tsx`

---

### Task 1: RecipeCard — 2:3 ratio + new design

**Files:**
- Modify: `components/recipe-card.tsx`

**Interfaces:**
- Consumes: `Recipe` type from `@/lib/db/schema` (fields: `slug`, `title`, `excerpt`, `heroImageUrl`, `difficulty`, `totalTime`, `servings`)
- Produces: `<RecipeCard recipe={recipe} />` — same public API, new internal design

- [ ] **Step 1: Replace RecipeCard with 2:3 ratio design**

Replace the entire content of `components/recipe-card.tsx`:

```tsx
import Image from "next/image"
import Link from "next/link"
import { Clock, Users } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recettes/${recipe.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {recipe.heroImageUrl ? (
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-serif text-sm text-muted-foreground">
            No image
          </div>
        )}
        {recipe.difficulty ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-medium text-foreground">
            {recipe.difficulty}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-serif text-lg leading-snug text-balance group-hover:text-primary transition-colors">
          {recipe.title}
        </h3>
        {recipe.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {recipe.excerpt}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {recipe.totalTime ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.totalTime}
            </span>
          ) : null}
          {recipe.servings ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.servings}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no errors (RecipeCard.tsx only — other files may have pre-existing errors, confirm no NEW errors in recipe-card.tsx).

- [ ] **Step 3: Commit**

```bash
git add components/recipe-card.tsx
git commit -m "feat: RecipeCard 2:3 ratio + rounded-2xl redesign"
```

---

### Task 2: RecipeHero — Section 1 (Hero image + title)

**Files:**
- Create: `components/recipe-hero.tsx`

**Interfaces:**
- Consumes: `Recipe` (fields: `title`, `excerpt`, `heroImageUrl`, `tags`, `publishedAt`, `totalTime`)
- Produces: `<RecipeHero recipe={recipe} />`

- [ ] **Step 1: Create the component**

Create `components/recipe-hero.tsx`:

```tsx
import Image from "next/image"
import Link from "next/link"
import type { Recipe } from "@/lib/db/schema"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"

export function RecipeHero({ recipe }: { recipe: Recipe }) {
  const tags = recipe.tags ?? []

  return (
    <header className="mx-auto max-w-3xl px-4 pt-6">
      {/* Badges row */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tags.length > 0 ? (
          tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))
        ) : null}
        {recipe.totalTime ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {recipe.totalTime}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h1 className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-tight text-balance text-foreground">
        {recipe.title}
      </h1>

      {/* Excerpt */}
      {recipe.excerpt ? (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {recipe.excerpt}
        </p>
      ) : null}

      {/* Author + Date */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          By{" "}
          <Link
            href="/about"
            className="font-medium text-foreground underline decoration-primary/40 hover:decoration-primary transition-colors"
          >
            Chef Augustin Lefèvre
          </Link>
        </span>
        {recipe.publishedAt ? (
          <span>
            <time dateTime={recipe.publishedAt.toISOString().split("T")[0]}>
              {recipe.publishedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </span>
        ) : null}
      </div>

      {/* Hero Image */}
      {recipe.heroImageUrl ? (
        <figure className="mt-8 overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10 relative aspect-[2/3]">
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            placeholder="blur"
            blurDataURL={FOOD_BLUR_PLACEHOLDER}
          />
          <figcaption className="sr-only">Photo: {recipe.title}</figcaption>
        </figure>
      ) : null}
    </header>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-hero.tsx
git commit -m "feat: add RecipeHero with 2:3 image, badges, clamp typography"
```

---

### Task 3: RecipeMetaBar — Section 2 (Prep/Cook/Servings/Difficulty)

**Files:**
- Create: `components/recipe-meta-bar.tsx`

**Interfaces:**
- Consumes: `Recipe` (fields: `prepTime`, `cookTime`, `servings`, `difficulty`)
- Produces: `<RecipeMetaBar recipe={recipe} />`

- [ ] **Step 1: Create the component**

Create `components/recipe-meta-bar.tsx`:

```tsx
import { Clock, Flame, Users, Soup } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"

function toIsoDuration(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const hours = text.match(/(\d+)\s*h/)?.[1]
  const minutes = text.match(/(\d+)\s*min/)?.[1]
  if (!hours && !minutes) return undefined
  const h = hours ? parseInt(hours) : 0
  const m = minutes ? parseInt(minutes) : 0
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}`
}

function MetaPill({
  icon: Icon,
  label,
  value,
  datetime,
}: {
  icon: typeof Clock
  label: string
  value: string
  datetime?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur px-4 py-3.5">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold text-foreground truncate">
          {datetime ? <time dateTime={datetime}>{value}</time> : value}
        </p>
      </div>
    </div>
  )
}

export function RecipeMetaBar({ recipe }: { recipe: Recipe }) {
  const items: { icon: typeof Clock; label: string; value: string; datetime?: string }[] = []

  if (recipe.prepTime) {
    items.push({
      icon: Clock,
      label: "Prep",
      value: recipe.prepTime,
      datetime: toIsoDuration(recipe.prepTime),
    })
  }
  if (recipe.cookTime) {
    items.push({
      icon: Flame,
      label: "Cook",
      value: recipe.cookTime,
      datetime: toIsoDuration(recipe.cookTime),
    })
  }
  if (recipe.servings) {
    items.push({ icon: Users, label: "Servings", value: recipe.servings })
  }
  if (recipe.difficulty) {
    items.push({ icon: Soup, label: "Difficulty", value: recipe.difficulty })
  }

  if (items.length === 0) return null

  return (
    <section
      aria-label="Recipe information"
      className="mx-auto max-w-3xl px-4 pt-8"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <MetaPill key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-meta-bar.tsx
git commit -m "feat: add RecipeMetaBar with glass-morphism pills"
```

---

### Task 4: RecipeActionBar — Section 3 (Jump/Print/Share/Pin)

**Files:**
- Create: `components/recipe-action-bar.tsx`

**Interfaces:**
- Consumes: `title: string` (for share/Pinterest)
- Produces: `<RecipeActionBar title={recipe.title} />`

- [ ] **Step 1: Create the component**

Create `components/recipe-action-bar.tsx`:

```tsx
"use client"

import { ArrowDown, Printer, Share2 } from "lucide-react"

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  )
}

export function RecipeActionBar({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="flex flex-wrap gap-3">
        {/* Jump to Recipe */}
        <a
          href="#ingredients-section"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          Jump to Recipe
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>

        {/* Print */}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>

        {/* Save to Pinterest */}
        <a
          href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
            typeof window !== "undefined" ? window.location.href : ""
          )}&description=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          <PinterestIcon className="h-4 w-4" />
          Save
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-action-bar.tsx
git commit -m "feat: add RecipeActionBar with Jump/Print/Share/Pinterest"
```

---

### Task 5: RecipeIngredients — Section 4 (Interactive checkboxes)

**Files:**
- Create: `components/recipe-ingredients.tsx`

**Interfaces:**
- Consumes: `ingredients: Ingredient[]` (from `@/lib/db/schema`)
- Produces: `<RecipeIngredients ingredients={recipe.ingredients} />`
- This is a `"use client"` component (checkbox state)

- [ ] **Step 1: Create the component**

Create `components/recipe-ingredients.tsx`:

```tsx
"use client"

import { useState, useCallback } from "react"
import { CheckCircle } from "lucide-react"
import type { Ingredient } from "@/lib/db/schema"

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const [checked, setChecked] = useState(false)

  const toggle = useCallback(() => setChecked((prev) => !prev), [])

  return (
    <li
      className="flex items-center gap-3 cursor-pointer select-none group"
      onClick={toggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border group-hover:border-primary/40"
        }`}
      >
        {checked ? (
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-transparent" />
        )}
      </span>
      <span
        className={`leading-relaxed transition-all duration-200 ${
          checked
            ? "line-through text-muted-foreground/50"
            : "text-foreground"
        }`}
      >
        {ingredient.name}
      </span>
      {ingredient.quantity ? (
        <span
          className={`ml-auto shrink-0 text-sm font-medium transition-all duration-200 ${
            checked
              ? "line-through text-muted-foreground/40"
              : "text-muted-foreground"
          }`}
        >
          {ingredient.quantity}
        </span>
      ) : null}
    </li>
  )
}

export function RecipeIngredients({
  ingredients,
}: {
  ingredients: Ingredient[]
}) {
  if (!ingredients || ingredients.length === 0) return null

  return (
    <section
      id="ingredients-section"
      aria-labelledby="ingredients-heading"
      className="mx-auto max-w-3xl px-4 pt-12"
    >
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2
          id="ingredients-heading"
          className="font-serif text-2xl text-foreground"
        >
          Ingredients
        </h2>
        <ul className="mt-6 flex flex-col gap-3" role="list">
          {ingredients.map((ing, i) => (
            <IngredientRow key={i} ingredient={ing} />
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-ingredients.tsx
git commit -m "feat: add RecipeIngredients with animated checkboxes"
```

---

### Task 6: RecipeInstructions — Section 5 (Steps + process shots)

**Files:**
- Create: `components/recipe-instructions.tsx`

**Interfaces:**
- Consumes: `instructions: Instruction[]` (from `@/lib/db/schema`)
- Produces: `<RecipeInstructions instructions={recipe.instructions} />`

- [ ] **Step 1: Create the component**

Create `components/recipe-instructions.tsx`:

```tsx
import type { Instruction } from "@/lib/db/schema"

export function RecipeInstructions({
  instructions,
}: {
  instructions: Instruction[]
}) {
  if (!instructions || instructions.length === 0) return null

  return (
    <section
      aria-labelledby="instructions-heading"
      className="mx-auto max-w-3xl px-4 pt-12"
    >
      <h2
        id="instructions-heading"
        className="font-serif text-2xl text-foreground"
      >
        Instructions
      </h2>
      <ol className="mt-8 flex flex-col gap-8" role="list">
        {instructions.map((step) => (
          <li key={step.step} className="flex gap-5">
            {/* Step number */}
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {step.step}
            </span>
            {/* Step text */}
            <p className="pt-1.5 text-base leading-relaxed text-foreground">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-instructions.tsx
git commit -m "feat: add RecipeInstructions with numbered steps"
```

---

### Task 7: RecipeArticleBody — Section 6 (Markdown content)

**Files:**
- Create: `components/recipe-article-body.tsx`

**Interfaces:**
- Consumes: `contentMarkdown: string | null`
- Produces: `<RecipeArticleBody contentMarkdown={recipe.contentMarkdown} />`
- Extracts the markdown rendering from current `recipe-article.tsx` (lines 252-333)

- [ ] **Step 1: Create the component**

Create `components/recipe-article-body.tsx`:

```tsx
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Supprime les balises HTML dangereuses ou non desirables (<script>, <style>)
 * que le LLM peut inserer dans contentMarkdown (ex : JSON-LD genere par erreur).
 */
function sanitizeMarkdown(md: string): string {
  return md
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?meta\s[^>]*\/?>/gi, "")
    .replace(/<\/?link\s[^>]*\/?>/gi, "")
    .replace(/<img\s[^>]*\/?>/gi, "")
    .replace(/<(?:br|hr|input|source|col|area|base|embed|wbr)\s*\/?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function RecipeArticleBody({
  contentMarkdown,
}: {
  contentMarkdown: string | null
}) {
  if (!contentMarkdown) return null

  return (
    <section
      aria-labelledby="article-body-heading"
      className="mx-auto max-w-3xl px-4 pt-12"
    >
      <h2 id="article-body-heading" className="sr-only">
        Article and tips
      </h2>
      <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-base prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-strong:font-semibold prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          disallowedElements={[
            "script",
            "style",
            "meta",
            "link",
            "img",
            "head",
            "html",
            "body",
          ]}
          components={{
            h2: ({ node: _node, ...props }) => (
              <h2 className="font-serif text-2xl font-bold mt-10 mb-5 text-foreground" {...props} />
            ),
            h3: ({ node: _node, ...props }) => (
              <h3 className="font-serif text-xl font-bold mt-8 mb-4 text-foreground" {...props} />
            ),
            p: ({ node: _node, ...props }) => (
              <p className="text-base leading-relaxed my-4 text-foreground" {...props} />
            ),
            ul: ({ node: _node, ...props }) => (
              <ul className="my-4 list-disc pl-6 space-y-2" role="list" {...props} />
            ),
            ol: ({ node: _node, ...props }) => (
              <ol className="my-4 list-decimal pl-6 space-y-2" role="list" {...props} />
            ),
            li: ({ node: _node, ...props }) => (
              <li className="text-foreground leading-relaxed" {...props} />
            ),
            strong: ({ node: _node, ...props }) => (
              <strong className="font-semibold text-foreground" {...props} />
            ),
            em: ({ node: _node, ...props }) => (
              <em className="italic text-foreground" {...props} />
            ),
            a: ({ node: _node, ...props }) => (
              <a className="text-primary underline hover:text-primary/80" {...props} />
            ),
            blockquote: ({ node: _node, ...props }) => (
              <blockquote
                className="border-l-4 border-primary/40 pl-5 italic my-4 text-muted-foreground"
                {...props}
              />
            ),
          }}
        >
          {sanitizeMarkdown(contentMarkdown)}
        </ReactMarkdown>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-article-body.tsx
git commit -m "feat: add RecipeArticleBody with styled markdown rendering"
```

---

### Task 8: RecipeRelated — Section 7 (Related recipes grid)

**Files:**
- Create: `components/recipe-related.tsx`

**Interfaces:**
- Consumes: `recipes: Recipe[]` (array of related recipes)
- Produces: `<RecipeRelated recipes={relatedRecipes} />`

- [ ] **Step 1: Create the component**

Create `components/recipe-related.tsx`:

```tsx
import type { Recipe } from "@/lib/db/schema"
import { RecipeCard } from "@/components/recipe-card"

export function RecipeRelated({ recipes }: { recipes: Recipe[] }) {
  if (!recipes || recipes.length === 0) return null

  return (
    <section
      aria-labelledby="related-heading"
      className="mx-auto max-w-5xl px-4 py-16"
    >
      <h2
        id="related-heading"
        className="font-serif text-2xl sm:text-3xl mb-8 text-balance text-foreground"
      >
        More Recipes You&apos;ll Love
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-related.tsx
git commit -m "feat: add RecipeRelated grid section"
```

---

### Task 9: RecipeArticle — Refactor to compose sub-components

**Files:**
- Modify: `components/recipe-article.tsx`

**Interfaces:**
- Consumes: `Recipe` (full object)
- Produces: `<RecipeArticle recipe={recipe} />` — same public API
- Now composes: RecipeHero + RecipeMetaBar + RecipeActionBar + RecipeIngredients + RecipeInstructions + RecipeArticleBody
- Note: `RecipeRelated` is rendered in `page.tsx`, not here

- [ ] **Step 1: Replace RecipeArticle with composition**

Replace the entire content of `components/recipe-article.tsx`:

```tsx
import type { Recipe } from "@/lib/db/schema"
import { RecipeHero } from "@/components/recipe-hero"
import { RecipeMetaBar } from "@/components/recipe-meta-bar"
import { RecipeActionBar } from "@/components/recipe-action-bar"
import { RecipeIngredients } from "@/components/recipe-ingredients"
import { RecipeInstructions } from "@/components/recipe-instructions"
import { RecipeArticleBody } from "@/components/recipe-article-body"

export function RecipeArticle({ recipe }: { recipe: Recipe }) {
  return (
    <article>
      {/* Section 1: Hero — image, title, excerpt, badges, author */}
      <RecipeHero recipe={recipe} />

      {/* Section 2: Meta Bar — prep, cook, servings, difficulty */}
      <RecipeMetaBar recipe={recipe} />

      {/* Section 3: Action Bar — jump, print, share, pinterest */}
      <RecipeActionBar title={recipe.title} />

      {/* Section 4: Ingredients — interactive checkboxes */}
      <RecipeIngredients ingredients={recipe.ingredients ?? []} />

      {/* Section 5: Instructions — numbered steps */}
      <RecipeInstructions instructions={recipe.instructions ?? []} />

      {/* Section 6: Article Body — markdown FAQ, tips, nutrition */}
      <RecipeArticleBody contentMarkdown={recipe.contentMarkdown} />
    </article>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no new errors. Confirm no unused imports from old `recipe-article.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-article.tsx
git commit -m "refactor: RecipeArticle composed of 6 sub-components"
```

---

### Task 10: Page integration — Update `page.tsx` + add scroll animations

**Files:**
- Modify: `app/recettes/[slug]/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `page.tsx` now uses `RecipeRelated` directly (instead of inline grid)
- No changes to data fetching or metadata generation
- `globals.css` adds fade-in-up scroll animation and print stylesheet

- [ ] **Step 1: Update page.tsx to use RecipeRelated**

In `app/recettes/[slug]/page.tsx`, replace the related recipes section (lines 215-226) to use the `RecipeRelated` component.

First, add the import at the top (after existing imports):
```tsx
import { RecipeRelated } from "@/components/recipe-related"
```

Then replace lines 215-226:
```tsx
        {relatedRecipes.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="mb-8 font-serif text-2xl text-balance">
              More Recipes You'll Love
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        ) : null}
```

With:
```tsx
        <RecipeRelated recipes={relatedRecipes} />
```

Also remove the now-unused `RecipeCard` import on line 8 (since `RecipeRelated` uses it internally):
```tsx
// Remove this line:
import { RecipeCard } from "@/components/recipe-card"
```

Replace with nothing (it's no longer needed in this file).

- [ ] **Step 2: Add scroll animations CSS**

Add to `app/globals.css`, at the end of the file (before the last line):

```css
/* Scroll-triggered fade-in-up animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-on-scroll {
  opacity: 0;
  animation: fadeInUp 0.6s ease forwards;
  animation-play-state: paused;
  animation-delay: var(--scroll-delay, 0ms);
}

@media (prefers-reduced-motion: no-preference) {
  .animate-on-scroll.in-view {
    animation-play-state: running;
  }
}

/* Print stylesheet */
@media print {
  .card-hover:hover {
    transform: none !important;
    box-shadow: none !important;
  }

  nav,
  .sticky,
  [class*="backdrop-blur"] {
    position: static !important;
  }

  button,
  .recipe-action-bar,
  .site-footer-newsletter {
    display: none !important;
  }

  img {
    max-width: 100% !important;
    page-break-inside: avoid;
  }

  h1, h2, h3 {
    page-break-after: avoid;
  }

  li {
    page-break-inside: avoid;
  }
}
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: PASS with no errors (confirm no new errors in page.tsx or any component).

- [ ] **Step 4: Commit**

```bash
git add app/recettes/\[slug\]/page.tsx app/globals.css
git commit -m "feat: integrate RecipeRelated + add scroll animations + print styles"
```

---

### Task 11: Final verification — Full type check + file audit

**Files:**
- Audit all created/modified files

**Verification steps:**

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: PASS with zero errors.

- [ ] **Step 2: Verify all files exist**

```bash
ls -la components/recipe-hero.tsx components/recipe-meta-bar.tsx components/recipe-action-bar.tsx components/recipe-ingredients.tsx components/recipe-instructions.tsx components/recipe-article-body.tsx components/recipe-related.tsx
```

Expected: All 7 files exist.

- [ ] **Step 3: Verify old code is fully removed from recipe-article.tsx**

```bash
grep -c "toIsoDuration\|sanitizeMarkdown\|MetaItem\|FOOD_BLUR_PLACEHOLDER" components/recipe-article.tsx
```

Expected: 0 (all helpers moved to sub-components).

- [ ] **Step 4: Verify SEO-critical parts are untouched**

```bash
grep -c "RecipeJsonLd\|generateMetadata\|generateStaticParams\|getRecipeBySlug\|getRelatedRecipes\|getLinkedArticle\|jsonLd\|content_type" app/recettes/\[slug\]/page.tsx
```

Expected: Non-zero for each grep (SEO logic preserved).

- [ ] **Step 5: Remove "Tested 200+ times" badge**

The current `recipe-article.tsx` had this badge at old line 120:
```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
  Tested 200+ times
</span>
```

Confirm it is NOT present in any new component:

```bash
grep -r "Tested 200" components/
```

Expected: No matches (badge removed per accuracy rules).

- [ ] **Step 6: Verify RecipeCard import removed from page.tsx**

```bash
grep "import.*RecipeCard.*from" app/recettes/\[slug\]/page.tsx
```

Expected: No output (import removed in Task 10).

- [ ] **Step 7: Confirm `"use client"` only in interactive components**

```bash
grep -l '"use client"' components/recipe-*.tsx
```

Expected: Only `components/recipe-ingredients.tsx` and `components/recipe-action-bar.tsx`.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: final verification — typecheck pass, SEO intact, no regressions"
```
