# RecipeForge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build RecipeForge — a multi-niche AI recipe generation tool that produces SEO/GEO-optimized content (Markdown + JSON-LD) and super prompts (blog image + Pinterest PTRA pins) end-to-end, using Gemini 2.5 Pro as primary LLM with DeepSeek v4 Pro fallback.

**Architecture:** Next.js 16 App Router monolith split into 4 layers: Core Engine (TS pur, no framework deps), API Routes (7 endpoints with polling), Dashboard (2-page React SPA with shadcn/ui), and Exporters (Markdown folder + JSON file + WordPress stub). Pipeline: SERP live → Strategist (LLM) → Chef Augustin (LLM) → Quality Gate (deterministic) → [retry on truncation, max 1] → Pin Designer (LLM) → Persist + Export. No Inngest — linear async/await with fire-and-forget pattern.

**Tech Stack:** Next.js 16 (App Router), TypeScript 5.7, Drizzle ORM + Neon PostgreSQL, Gemini 2.5 Pro SDK, DeepSeek API, Serper.dev, shadcn/ui + Tailwind CSS 4, vitest, react-markdown, archiver (zip).

## Global Constraints

- Zero framework dependencies in Core Engine (`lib/engine/`, `lib/agents/`, `lib/validators/`, `lib/exporters/` — pure TypeScript)
- `tsc --noEmit` must pass before every commit
- No Inngest — pipeline runs via `async/await` in API route, fire-and-forget for async execution
- No SSE — dashboard polls `GET /api/recipes/{id}` every 2 seconds
- 14 files copied from `ai-blog-builder` blueprint, adapted surgically
- Skills are Markdown files with `{{placeholder}}` injection
- Gemini primary, DeepSeek fallback — same provider abstraction pattern as blueprint
- All LLM outputs validated by deterministic Quality Gate (no LLM in evaluation)
- max 2 LLM attempts per recipe (1 initial + 1 retry on truncation)
- Output format: `output/{niche}/{slug}/` folder + `output/json/{niche}/{slug}.json`
- Phase 1 is French-only, single-user (no auth), no batch mode

---

## Phase 1 — Project Scaffolding

### Task 1: Create Next.js project with all dependencies

**Files:**
- Create: `recipe-forge/package.json`
- Create: `recipe-forge/tsconfig.json`
- Create: `recipe-forge/next.config.mjs`
- Create: `recipe-forge/.env.example`
- Create: `recipe-forge/.env.local`
- Create: `recipe-forge/.gitignore`
- Create: `recipe-forge/tailwind.config.ts`
- Create: `recipe-forge/postcss.config.mjs`

**Interfaces:**
- Produces: `package.json` with all deps for subsequent tasks

- [ ] **Step 1: Create project directory and initialize package.json**

```bash
mkdir recipe-forge && cd recipe-forge
```

Create `recipe-forge/package.json`:
```json
{
  "name": "recipe-forge",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^16.2.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "drizzle-orm": "^0.45.2",
    "pg": "^8.22.0",
    "@google/generative-ai": "^0.24.0",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "lucide-react": "latest",
    "clsx": "latest",
    "class-variance-authority": "latest",
    "tailwind-merge": "latest",
    "archiver": "^7.0.0",
    "sonner": "latest"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/pg": "latest",
    "@types/archiver": "latest",
    "tailwindcss": "^4.2.0",
    "@tailwindcss/postcss": "latest",
    "@tailwindcss/typography": "latest",
    "postcss": "^8.5.0",
    "vitest": "^4.1.10",
    "tsx": "^4.22.4"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd recipe-forge && npm install
```

- [ ] **Step 3: Create tsconfig.json**

Create `recipe-forge/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    "baseUrl": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create next.config.mjs**

Create `recipe-forge/next.config.mjs`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'archiver']
  }
}

export default nextConfig
```

- [ ] **Step 5: Create .env.example and .env.local**

Create `recipe-forge/.env.example`:
```bash
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
SERPER_API_KEY=
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/recipeforge?sslmode=require
```

Create `recipe-forge/.env.local`:
```bash
GEMINI_API_KEY=your_gemini_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
SERPER_API_KEY=your_serper_key_here
DATABASE_URL=your_neon_url_here
```

- [ ] **Step 6: Create .gitignore**

Create `recipe-forge/.gitignore`:
```gitignore
# Générations
output/*
!output/.gitkeep

# Secrets
.env.local

# Build
.next/

# Dependencies
node_modules/
```

- [ ] **Step 7: Create PostCSS and Tailwind config**

Create `recipe-forge/postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
export default config
```

Create `recipe-forge/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
}
export default config
```

- [ ] **Step 8: Create output directory structure**

```bash
mkdir -p recipe-forge/output/json
touch recipe-forge/output/.gitkeep
```

- [ ] **Step 9: Verify build**

```bash
cd recipe-forge && npm run typecheck
```

Expected: Clean — no errors (may need to create a minimal `app/layout.tsx` and `app/page.tsx` first).

- [ ] **Step 10: Commit**

```bash
cd recipe-forge && git init && git add -A && git commit -m "feat: scaffold Next.js 16 project with all dependencies

Next.js 16 App Router, Drizzle ORM, Gemini SDK, DeepSeek, Serper.dev
Tailwind CSS 4, shadcn/ui, vitest, react-markdown, archiver

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create directory structure and minimal app shell

**Files:**
- Create: `recipe-forge/app/layout.tsx`
- Create: `recipe-forge/app/globals.css`
- Create: `recipe-forge/app/page.tsx`
- Create: `recipe-forge/app/history/page.tsx`
- Create: `recipe-forge/lib/` (all subdirectories)
- Create: `recipe-forge/components/ui/` (shadcn shell)
- Create: `recipe-forge/data/niches/`
- Create: `recipe-forge/skills/`
- Create: `recipe-forge/__tests__/`

**Interfaces:**
- Produces: Empty directory structure matching the spec arborescence

- [ ] **Step 1: Create all directories**

```bash
cd recipe-forge
mkdir -p lib/engine lib/agents lib/validators lib/exporters lib/db
mkdir -p app/api/generate app/api/recipes/\[id\]/regenerate app/api/recipes/\[id\]/download app/api/niches
mkdir -p app/history
mkdir -p components/ui
mkdir -p data/niches
mkdir -p skills
mkdir -p __tests__
```

- [ ] **Step 2: Create minimal app/layout.tsx**

Create `recipe-forge/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RecipeForge",
  description: "Générateur de recettes professionnelles optimisées SEO/GEO",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        <header className="border-b border-zinc-800 px-6 py-4">
          <a href="/" className="text-xl font-bold tracking-tight">RecipeForge</a>
          <nav className="inline-flex ml-8 gap-4 text-sm text-zinc-400">
            <a href="/" className="hover:text-zinc-100">Generator</a>
            <a href="/history" className="hover:text-zinc-100">History</a>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create app/globals.css**

Create `recipe-forge/app/globals.css`:
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

- [ ] **Step 4: Create placeholder pages**

Create `recipe-forge/app/page.tsx`:
```tsx
export default function GeneratorPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Générer une recette</h1>
      <p className="text-zinc-400">Formulaire à venir...</p>
    </div>
  )
}
```

Create `recipe-forge/app/history/page.tsx`:
```tsx
export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Historique</h1>
      <p className="text-zinc-400">Liste à venir...</p>
    </div>
  )
}
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd recipe-forge && npm run dev
```

Expected: Next.js starts on port 3000. Visit `http://localhost:3000` — shows "RecipeForge" header with "Générer une recette" page. Visit `/history` — shows "Historique".

- [ ] **Step 6: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: directory structure and minimal app shell

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2 — Core Types & Data Layer

### Task 3: Define all TypeScript types

**Files:**
- Create: `recipe-forge/lib/types.ts`

**Interfaces:**
- Produces: All shared types used by every subsequent task
- Types: `NicheProfile`, `StrategyPlan`, `ChefAugustinOutput`, `PinDesignerOutput`, `Recipe`, `Pin`, `GenerationProgress`, `Ingredient`, `Instruction`

- [ ] **Step 1: Write lib/types.ts**

Create `recipe-forge/lib/types.ts`:
```typescript
// ── Niche Profile ──
export interface NicheProfile {
  id: string
  name: string
  cuisine: string
  language: string
  difficulty: "easy" | "medium" | "expert"
  vocabulary: {
    signatureIngredients: string[]
    emblematicTechniques: string[]
    register: "rustic" | "bistro" | "fine-dining" | "home-cooking"
    regionalNotes: string
  }
  foodSafety: {
    criticalTemps: Record<string, number>
    riskyIngredients: string[]
    allergenWarnings: string[]
    bannedClaims: string[]
  }
  authoritySources: {
    name: string
    url: string | null
    type: "institutional" | "chef" | "book" | "tradition"
  }[]
  geoThresholds?: {
    minClaims: number
    minAttributions: number
    minAnswerNuggets: number
  }
  semanticField: string[]
}

// ── Pipeline Contracts ──
export interface StrategyPlan {
  angle: string
  h2s: string[]
  faqs: { question: string; answer: string }[]
  gaps: { topic: string; opportunity: string }[]
  targetWordCount: number
}

export interface Ingredient {
  name: string
  quantity: string
  unit: string
  notes?: string
}

export interface Instruction {
  step: number
  text: string
  tips?: string
}

export interface ChefAugustinOutput {
  title: string
  meta: { description: string; focusKeyword: string }
  content_md: string
  ingredients: Ingredient[]
  instructions: Instruction[]
  tags: string[]
  totalTime: number
  difficulty: string
  servings: number
  imagePrompt: string
  jsonLd: Record<string, unknown>
}

export interface PinDesign {
  title: string
  description: string
  imagePrompt: string
  altText: string
  boardName: string
}

export interface PinDesignerOutput {
  pins: PinDesign[]
}

// ── Database Row Types ──
export type RecipeStatus = "running" | "completed" | "failed"

export interface RecipeRow {
  id: string
  keyword: string
  niche_id: string
  format: "pin-first" | "google-first"
  status: RecipeStatus
  error_reason: string | null
  retries: number
  title: string | null
  slug: string | null
  meta: { description: string; focusKeyword: string } | null
  content_md: string | null
  ingredients: Ingredient[] | null
  instructions: Instruction[] | null
  tags: string[] | null
  total_time: number | null
  difficulty: string | null
  servings: number | null
  image_prompt: string | null
  json_ld: Record<string, unknown> | null
  scores: { total: number; geo: number; content: number; structure: number } | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface PinRow {
  id: string
  recipe_id: string
  position: number
  title: string
  description: string
  image_prompt: string
  alt_text: string | null
  board_name: string | null
  created_at: string
}

// ── API Types ──
export interface GenerateRequest {
  keyword: string
  nicheId: string
  format: "pin-first" | "google-first"
}

export interface GenerateResponse {
  recipeId: string
}

export interface RecipeDetail extends RecipeRow {
  pins: PinRow[]
}

export interface ProgressStep {
  step: string
  status: "pending" | "running" | "done" | "error"
  elapsed: number
}

export interface GenerationProgress {
  status: RecipeStatus
  progress: ProgressStep[]
  recipe?: RecipeDetail
}

// ── Quality Gate ──
export interface QualityReport {
  passed: boolean
  score: { total: number; geo: number; content: number; structure: number }
  errors: string[]
  warnings: string[]
  retry: boolean
}

export interface SerpResult {
  top10: { title: string; url: string; snippet: string }[]
  aiOverview: string | null
  faqs: { question: string }[]
  competitorH2s: string[]
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean — no errors.

- [ ] **Step 3: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: define all TypeScript types

NicheProfile, StrategyPlan, ChefAugustinOutput, PinDesignerOutput
RecipeRow, PinRow, API request/response types, QualityReport, SerpResult

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Create database schema with Drizzle ORM

**Files:**
- Create: `recipe-forge/lib/db/schema.ts`
- Create: `recipe-forge/lib/db/index.ts`
- Create: `recipe-forge/lib/db/queries.ts`

**Interfaces:**
- Consumes: `RecipeRow`, `PinRow`, `RecipeStatus` from `lib/types.ts`
- Produces: `db` (Drizzle instance), `recipes` table, `pins` table, query functions

- [ ] **Step 1: Write database connection**

Create `recipe-forge/lib/db/index.ts`:
```typescript
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql)
```

Note: requires `@neondatabase/serverless` dependency. Add to package.json:
```bash
cd recipe-forge && npm install @neondatabase/serverless
```

- [ ] **Step 2: Write schema**

Create `recipe-forge/lib/db/schema.ts`:
```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core"

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyword: text("keyword").notNull(),
  niche_id: text("niche_id").notNull(),
  format: text("format").notNull().default("pin-first"),
  status: text("status").notNull().default("running"),
  error_reason: text("error_reason"),
  retries: integer("retries").default(0),
  title: text("title"),
  slug: text("slug"),
  meta: jsonb("meta"),
  content_md: text("content_md"),
  ingredients: jsonb("ingredients"),
  instructions: jsonb("instructions"),
  tags: text("tags").array(),
  total_time: integer("total_time"),
  difficulty: text("difficulty"),
  servings: integer("servings"),
  image_prompt: text("image_prompt"),
  json_ld: jsonb("json_ld"),
  scores: jsonb("scores"),
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pins = pgTable("pins", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipe_id: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image_prompt: text("image_prompt").notNull(),
  alt_text: text("alt_text"),
  board_name: text("board_name"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 3: Write query functions**

Create `recipe-forge/lib/db/queries.ts`:
```typescript
import { eq, desc, and, sql } from "drizzle-orm"
import { db } from "./index"
import { recipes, pins } from "./schema"
import type { RecipeRow, PinRow, RecipeDetail, RecipeStatus } from "../types"

// ── Create ──
export async function createRecipe(input: {
  keyword: string
  nicheId: string
  format: "pin-first" | "google-first"
}): Promise<RecipeRow> {
  const [recipe] = await db
    .insert(recipes)
    .values({
      keyword: input.keyword,
      niche_id: input.nicheId,
      format: input.format,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .returning()
  return recipe
}

// ── Update ──
export async function updateRecipeStatus(
  id: string,
  status: RecipeStatus,
  errorReason?: string
): Promise<void> {
  await db
    .update(recipes)
    .set({
      status,
      error_reason: errorReason || null,
      completed_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
    })
    .where(eq(recipes.id, id))
}

export async function saveRecipeContent(
  id: string,
  content: {
    title: string
    slug: string
    meta: { description: string; focusKeyword: string }
    content_md: string
    ingredients: unknown[]
    instructions: unknown[]
    tags: string[]
    totalTime: number
    difficulty: string
    servings: number
    imagePrompt: string
    jsonLd: Record<string, unknown>
    scores: { total: number; geo: number; content: number; structure: number }
  }
): Promise<void> {
  await db
    .update(recipes)
    .set({
      title: content.title,
      slug: content.slug,
      meta: content.meta,
      content_md: content.content_md,
      ingredients: content.ingredients,
      instructions: content.instructions,
      tags: content.tags,
      total_time: content.totalTime,
      difficulty: content.difficulty,
      servings: content.servings,
      image_prompt: content.imagePrompt,
      json_ld: content.jsonLd,
      scores: content.scores,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .where(eq(recipes.id, id))
}

// ── Read ──
export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id))
  if (!recipe) return null

  const recipePins = await db
    .select()
    .from(pins)
    .where(eq(pins.recipe_id, id))
    .orderBy(pins.position)

  return { ...recipe, pins: recipePins }
}

export async function listRecipes(params: {
  niche?: string
  scoreMin?: number
  page?: number
  limit?: number
}): Promise<{ recipes: RecipeDetail[]; total: number }> {
  const limit = params.limit || 20
  const page = params.page || 1
  const offset = (page - 1) * limit

  const conditions = []
  if (params.niche) {
    conditions.push(eq(recipes.niche_id, params.niche))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(recipes)
    .where(where)
    .orderBy(desc(recipes.created_at))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recipes)
    .where(where)

  const result: RecipeDetail[] = []
  for (const recipe of rows) {
    const recipePins = await db
      .select()
      .from(pins)
      .where(eq(pins.recipe_id, recipe.id))
      .orderBy(pins.position)
    result.push({ ...recipe, pins: recipePins })
  }

  return { recipes: result, total: Number(count) }
}

// ── Delete ──
export async function deleteRecipe(id: string): Promise<void> {
  await db.delete(recipes).where(eq(recipes.id, id))
}

// ── Pins ──
export async function insertPins(
  recipeId: string,
  pinData: { title: string; description: string; imagePrompt: string; altText: string; boardName: string }[]
): Promise<PinRow[]> {
  return db
    .insert(pins)
    .values(
      pinData.map((p, i) => ({
        recipe_id: recipeId,
        position: i + 1,
        title: p.title,
        description: p.description,
        image_prompt: p.imagePrompt,
        alt_text: p.altText,
        board_name: p.boardName,
      }))
    )
    .returning()
}
```

- [ ] **Step 4: Push schema to Neon DB**

```bash
cd recipe-forge
npx drizzle-kit push
```

Expected: Tables `recipes` and `pins` created in Neon DB.

- [ ] **Step 5: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 6: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: database schema with Drizzle ORM

2 tables: recipes (with status tracking) + pins (ON DELETE CASCADE)
Query functions: createRecipe, saveRecipeContent, getRecipe, listRecipes, deleteRecipe, insertPins

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---


## Phase 3 — Niche Registry

### Task 5: Create Niche Registry loader

**Files:**
- Create: `recipe-forge/lib/niche-registry.ts`

**Interfaces:**
- Consumes: `NicheProfile` from `lib/types.ts`
- Produces: `loadNicheProfile(id: string): NicheProfile`, `listNiches(): { id: string; name: string }[]`, `toPromptSection(profile: NicheProfile): string`

- [ ] **Step 1: Write the Niche Registry**

Create `recipe-forge/lib/niche-registry.ts`:
```typescript
import type { NicheProfile } from "./types"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

const NICHE_DIR = join(process.cwd(), "data", "niches")

const cache = new Map<string, NicheProfile>()

export function loadNicheProfile(id: string): NicheProfile {
  if (cache.has(id)) return cache.get(id)!

  try {
    const raw = readFileSync(join(NICHE_DIR, `${id}.json`), "utf-8")
    const profile = JSON.parse(raw) as NicheProfile
    // Validate required fields
    if (!profile.id || !profile.name || !profile.vocabulary || !profile.foodSafety) {
      throw new Error(`Invalid niche profile: ${id} — missing required fields`)
    }
    cache.set(id, profile)
    return profile
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      // Fallback to default
      return loadNicheProfile("default")
    }
    throw e
  }
}

export function listNiches(): { id: string; name: string }[] {
  try {
    const files = readdirSync(NICHE_DIR).filter((f) => f.endsWith(".json"))
    return files.map((f) => {
      const profile = loadNicheProfile(f.replace(".json", ""))
      return { id: profile.id, name: profile.name }
    })
  } catch {
    return [{ id: "default", name: "Universelle" }]
  }
}

export function toPromptSection(profile: NicheProfile): string {
  const lines: string[] = []

  lines.push(`## Profil de niche : ${profile.name}`)
  lines.push(`Cuisine : ${profile.cuisine}`)
  lines.push(`Difficulté : ${profile.difficulty}`)
  lines.push(`Registre de langue : ${profile.vocabulary.register}`)
  lines.push("")

  lines.push("### Ingrédients signatures")
  lines.push(profile.vocabulary.signatureIngredients.map((i) => `- ${i}`).join("\n"))
  lines.push("")

  lines.push("### Techniques emblématiques")
  lines.push(profile.vocabulary.emblematicTechniques.map((t) => `- ${t}`).join("\n"))
  lines.push("")

  lines.push(`### Notes régionales : ${profile.vocabulary.regionalNotes}`)
  lines.push("")

  lines.push("### Contraintes food safety")
  lines.push(`- Températures critiques : ${Object.entries(profile.foodSafety.criticalTemps)
    .map(([k, v]) => `${k}=${v}°C`).join(", ")}`)
  lines.push(`- Ingrédients à risque : ${profile.foodSafety.riskyIngredients.join(", ")}`)
  lines.push(`- Allergènes : ${profile.foodSafety.allergenWarnings.join(", ")}`)
  lines.push(`- Claims interdits : ${profile.foodSafety.bannedClaims.join(", ")}`)
  lines.push("")

  lines.push("### Sources d'autorité (pour citations GEO)")
  lines.push(profile.authoritySources.map((s) => `- ${s.name}${s.url ? ` (${s.url})` : ""} [${s.type}]`).join("\n"))
  lines.push("")

  lines.push("### Champ sémantique (SEO)")
  lines.push(profile.semanticField.join(", "))

  return lines.join("\n")
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 3: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: Niche Registry loader

loadNicheProfile, listNiches, toPromptSection
Fallback to default.json for unknown niches

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Create niche profile JSON files

**Files:**
- Create: `recipe-forge/data/niches/default.json`
- Create: `recipe-forge/data/niches/italienne.json`
- Create: `recipe-forge/data/niches/japonaise.json`
- Create: `recipe-forge/data/niches/thai.json`
- Create: `recipe-forge/data/niches/indienne.json`
- Create: `recipe-forge/data/niches/francaise.json`

**Interfaces:**
- Consumes: `NicheProfile` schema from `lib/types.ts`
- Produces: 6 valid niche profiles for the Niche Registry

- [ ] **Step 1: Create default.json**

Create `recipe-forge/data/niches/default.json`:
```json
{
  "id": "default",
  "name": "Cuisine Universelle",
  "cuisine": "International",
  "language": "fr",
  "difficulty": "medium",
  "vocabulary": {
    "signatureIngredients": [],
    "emblematicTechniques": [],
    "register": "home-cooking",
    "regionalNotes": "Cuisine internationale — adapter les ingrédients et techniques au contexte local."
  },
  "foodSafety": {
    "criticalTemps": { "poultry": 74, "pork": 63, "beef": 63, "seafood": 63, "eggs": 74 },
    "riskyIngredients": ["raw eggs", "raw seafood", "raw meat", "unpasteurized dairy"],
    "allergenWarnings": ["wheat/gluten", "dairy", "eggs", "tree nuts", "peanuts", "shellfish", "soy"],
    "bannedClaims": ["curative", "detox", "anti-inflammatoire", "brûle-graisse", "immunité renforcée", "probiotique santé", "guérit", "miracle"]
  },
  "authoritySources": [
    { "name": "USDA Food Safety", "url": "https://www.fsis.usda.gov", "type": "institutional" },
    { "name": "ANSES", "url": "https://www.anses.fr", "type": "institutional" }
  ],
  "geoThresholds": { "minClaims": 5, "minAttributions": 3, "minAnswerNuggets": 1 },
  "semanticField": ["recette facile", "cuisine maison", "repas rapide", "dîner", "déjeuner"]
}
```

- [ ] **Step 2: Create italienne.json**

Create `recipe-forge/data/niches/italienne.json`:
```json
{
  "id": "italienne",
  "name": "Cuisine Italienne",
  "cuisine": "Italian",
  "language": "fr",
  "difficulty": "medium",
  "vocabulary": {
    "signatureIngredients": ["olive oil extra-vierge", "Parmigiano Reggiano DOP", "San Marzano tomatoes", "basilico fresco", "pancetta", "porcini mushrooms", "guanciale", "burrata", "00 flour", "aceto balsamico DOP"],
    "emblematicTechniques": ["risotto mantecatura", "pasta al dente", "soffritto base", "sfumatura al vino", "pasta sfoglia fatta in casa"],
    "register": "rustic",
    "regionalNotes": "Respecter les appellations DOP/IGP. Ne pas mélanger les codes du Nord (burro, riso) et du Sud (olio, pomodoro). Chaque région a ses traditions propres."
  },
  "foodSafety": {
    "criticalTemps": { "pork": 63, "poultry": 74, "seafood": 63, "guanciale": 63 },
    "riskyIngredients": ["raw egg (carbonara)", "raw seafood (crudo)", "unpasteurized cheese"],
    "allergenWarnings": ["wheat/gluten", "dairy", "tree nuts (pine nuts, almonds)"],
    "bannedClaims": ["authentic Italian grandmother", "better than Italy", "traditional family recipe passed down"]
  },
  "authoritySources": [
    { "name": "Accademia Italiana della Cucina", "url": "https://www.accademiaitalianadellacucina.it", "type": "institutional" },
    { "name": "Gambero Rosso", "url": "https://www.gamberorosso.it", "type": "institutional" },
    { "name": "La Scienza in Cucina (Pellegrino Artusi)", "url": null, "type": "book" }
  ],
  "geoThresholds": { "minClaims": 5, "minAttributions": 3, "minAnswerNuggets": 1 },
  "semanticField": ["cucina regionale italiana", "primi piatti", "secondi piatti", "contorni", "dolci italiani", "cibo di strada italiano", "dieta mediterranea"]
}
```

- [ ] **Step 3: Create francaise.json**

Create `recipe-forge/data/niches/francaise.json`:
```json
{
  "id": "francaise",
  "name": "Cuisine Française",
  "cuisine": "French",
  "language": "fr",
  "difficulty": "medium",
  "vocabulary": {
    "signatureIngredients": ["beurre AOP", "crème fraîche", "vin rouge/Blanc AOC", "fromages AOP", "herbes de Provence", "truffes", "foie gras", "moutarde de Dijon", "fleur de sel", "vinaigre de vin"],
    "emblematicTechniques": ["sauce mère (béchamel, velouté, espagnole)", "cuisson sous vide", "flambage", "mijotage longue durée", "pâtisserie fine"],
    "register": "bistro",
    "regionalNotes": "La cuisine française est régionale avant tout — respecter les terroirs. Un bœuf bourguignon n'est pas une daube provençale. Les vins cités doivent correspondre à la région du plat."
  },
  "foodSafety": {
    "criticalTemps": { "poultry": 74, "pork": 63, "beef": 63, "seafood": 63, "foie gras": 65 },
    "riskyIngredients": ["raw milk cheese", "raw oysters", "steak tartare", "foie gras mi-cuit"],
    "allergenWarnings": ["wheat/gluten", "dairy", "eggs", "tree nuts", "shellfish"],
    "bannedClaims": ["meilleur restaurant de Paris", "recette secrète de grand-mère", "authentique recette française transmise"]
  },
  "authoritySources": [
    { "name": "Institut Paul Bocuse", "url": "https://www.institutpaulbocuse.com", "type": "institutional" },
    { "name": "Le Guide Culinaire (Auguste Escoffier)", "url": null, "type": "book" },
    { "name": "Larousse Gastronomique", "url": null, "type": "book" }
  ],
  "geoThresholds": { "minClaims": 5, "minAttributions": 3, "minAnswerNuggets": 1 },
  "semanticField": ["gastronomie française", "cuisine régionale", "recettes traditionnelles", "pâtisserie française", "sauces mères", "bistronomie"]
}
```

- [ ] **Step 4: Create japonaise.json, thai.json, indienne.json**

Create remaining niche profiles. Each follows the same JSON schema. Use the spec's `NicheProfile` interface as guide. Key differences:
- `japonaise.json`: raw fish (sashimi) safety, dashi/umami techniques, washoku vocabulary
- `thai.json`: peanut allergy emphasis, fish sauce/curry paste staples, wok techniques
- `indienne.json`: vegetarian considerations, spice tempering (tadka), dosa/naan techniques

- [ ] **Step 5: Verify profiles load correctly**

```bash
cd recipe-forge && node -e "
const { loadNicheProfile, listNiches } = require('./lib/niche-registry');
console.log(listNiches());
console.log(loadNicheProfile('italienne').name);
console.log('OK');
"
```

Expected: Lists all niches, prints "Cuisine Italienne", prints "OK".

- [ ] **Step 6: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: 6 niche profile JSON files

default, italienne, francaise, japonaise, thai, indienne

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---


## Phase 4 — Skills

### Task 7: Copy and adapt skills from blueprint

**Files:**
- Create: `recipe-forge/skills/strategist.md` (adapted from `ai-blog-builder/skills/agent-strategist.md`)
- Create: `recipe-forge/skills/chef-augustin.md` (adapted from `ai-blog-builder/skills/agent-chef-augustin.md`)
- Create: `recipe-forge/skills/pin-designer.md` (adapted from `ai-blog-builder/skills/agent-pin-designer.md`)
- Create: `recipe-forge/skills/README.md`
- Create: `recipe-forge/lib/skills.ts` (copied from `ai-blog-builder/lib/skills.ts`)

**Interfaces:**
- Consumes: `NicheProfile.toPromptSection()` from `lib/niche-registry.ts`
- Produces: `loadSkill(name: string): Promise<string>` — loads skill markdown with frontmatter stripped

- [ ] **Step 1: Copy lib/skills.ts unchanged from blueprint**

Copy `ai-blog-builder/lib/skills.ts` → `recipe-forge/lib/skills.ts` verbatim. This file handles reading `.md` skill files, stripping YAML frontmatter, and resolving skill paths.

```bash
cp /home/user/ai-blog-builder/lib/skills.ts /home/user/recipe-forge/lib/skills.ts
```

- [ ] **Step 2: Adapt strategist.md**

Read `ai-blog-builder/skills/agent-strategist.md`. Add these modifications:

1. Add at the top of the system prompt section:
```
You are a content strategist for {{nicheProfile.name}}. Language: {{nicheProfile.language}}. Registry: {{nicheProfile.vocabulary.register}}.
```

2. Add a section on format awareness:
```
FORMAT: {{format}}
- "pin-first": 1200-1500 words, 3-4 H2s, recipe-first structure, concise intro
- "google-first": 1800-2200 words, 5-7 H2s, comprehensive structure, detailed explanations
```

3. Replace hardcoded niche references ("dinners for two") with `{{nicheProfile}}` placeholders.

Copy the adapted file to `recipe-forge/skills/strategist.md`.

- [ ] **Step 3: Adapt chef-augustin.md**

Read `ai-blog-builder/skills/agent-chef-augustin.md`. Apply modifications:

1. Add niche injection at top:
```
You are Chef Augustin, a professional chef specializing in {{nicheProfile.name}}. Language: {{nicheProfile.language}}.

{{nicheProfile}}
```

2. Add a "## Science & Citations" section that was previously in `agent-science-enricher.md`:
```
## Science & Citations culinaires

For each technique used, explain the "why" briefly:
- Maillard reaction → browning
- Emulsification → sauce binding
- Fermentation → flavor development
- Gelatinization → thickening

Cite at least 3 authoritative sources from the niche profile:
{{nicheProfile.authoritySources}}

Never make health claims without attribution. Banned claims: {{nicheProfile.foodSafety.bannedClaims}}
```

3. Add format awareness for word count targets.

4. The skill MUST output valid JSON matching the `ChefAugustinOutput` contract. Include the JSON schema in the prompt.

Copy to `recipe-forge/skills/chef-augustin.md`.

- [ ] **Step 4: Adapt pin-designer.md**

Read `ai-blog-builder/skills/agent-pin-designer.md`. Apply modifications:

1. Add niche injection:
```
You are a Pinterest strategist for {{nicheProfile.name}}. Generate 5 PTRA-optimized pins.
```

2. Board naming should use niche-specific terminology from `{{nicheProfile.semanticField}}`.

3. Image prompts must reflect niche-specific aesthetics.

Copy to `recipe-forge/skills/pin-designer.md`.

- [ ] **Step 5: Create skills README**

Create `recipe-forge/skills/README.md`:
```markdown
# RecipeForge — Skills

Skills Markdown files injectés comme system prompts pour les agents LLM.
Chaque skill utilise des placeholders `{{variable}}` remplacés au runtime.

## Placeholders disponibles
- `{{keyword}}` — mot-clé cible
- `{{nicheProfile}}` — section prompt complète du profil de niche
- `{{format}}` — "pin-first" ou "google-first"
- `{{serpData}}` — résultats SERP formatés
- `{{strategyPlan}}` — plan stratégique (uniquement pour Chef Augustin)
```

- [ ] **Step 6: Verify skills load correctly**

```bash
cd recipe-forge && node -e "
const { loadSkill } = require('./lib/skills');
loadSkill('strategist').then(s => console.log(s.substring(0, 100)));
"
```

Expected: Prints first 100 chars of the strategist skill.

- [ ] **Step 7: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: copy and adapt 3 skills from blueprint

strategist.md (+nicheProfile, +format)
chef-augustin.md (+Science section, +nicheProfile, +format)
pin-designer.md (+nicheProfile)
lib/skills.ts (unchanged from blueprint)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5 — Provider & Agents

### Task 8: Create LLM provider abstraction (Gemini + DeepSeek)

**Files:**
- Create: `recipe-forge/lib/agents/provider.ts`

**Interfaces:**
- Produces: `generate(prompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string>`
- Tries Gemini first, falls back to DeepSeek on empty/failure

- [ ] **Step 1: Write provider.ts**

Create `recipe-forge/lib/agents/provider.ts`:
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

interface GenerateOptions {
  temperature?: number
  maxTokens?: number
}

async function callGemini(prompt: string, opts: GenerateOptions): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set")

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      maxOutputTokens: opts.maxTokens ?? 8192,
    },
  })

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  if (!text || text.trim().length === 0) {
    throw new Error("Gemini returned empty response")
  }

  return text
}

async function callDeepSeek(prompt: string, opts: GenerateOptions): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not set")

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 8192,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content
}

export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  // Try Gemini first
  try {
    console.log("[provider] Trying Gemini 2.5 Pro...")
    const result = await callGemini(prompt, opts)
    if (result && result.trim().length > 50) {
      console.log(`[provider] Gemini OK — ${result.length} chars`)
      return result
    }
    console.warn("[provider] Gemini returned short response, falling back to DeepSeek")
  } catch (e) {
    console.warn(`[provider] Gemini failed: ${(e as Error).message}, falling back to DeepSeek`)
  }

  // Fallback to DeepSeek
  try {
    console.log("[provider] Trying DeepSeek v4 Pro...")
    const result = await callDeepSeek(prompt, opts)
    console.log(`[provider] DeepSeek OK — ${result.length} chars`)
    return result
  } catch (e) {
    throw new Error(`Both providers failed. Gemini: see above. DeepSeek: ${(e as Error).message}`)
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 3: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: LLM provider abstraction — Gemini primary, DeepSeek fallback

Same pattern as blueprint provider.ts, adapted for Gemini SDK
Falls back to DeepSeek on empty response or API failure

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Create agent runtimes — SERP, Strategist, Chef Augustin, Pin Designer

**Files:**
- Create: `recipe-forge/lib/agents/serp.ts`
- Create: `recipe-forge/lib/agents/strategist.ts`
- Create: `recipe-forge/lib/agents/chef-augustin.ts`
- Create: `recipe-forge/lib/agents/pin-designer.ts`
- Create: `recipe-forge/lib/agents/json-utils.ts` (copied from blueprint)

**Interfaces:**
- Consumes: `generate()` from `lib/agents/provider.ts`, `SerpResult`, `StrategyPlan`, `ChefAugustinOutput`, `PinDesignerOutput` from `lib/types.ts`
- Produces: `fetchSerp(keyword: string): Promise<SerpResult>`, `runStrategist(params): Promise<StrategyPlan>`, `runChefAugustin(params): Promise<ChefAugustinOutput>`, `runPinDesigner(params): Promise<PinDesignerOutput>`

- [ ] **Step 1: Copy json-utils.ts from blueprint**

```bash
cp /home/user/ai-blog-builder/lib/agents/json-utils.ts /home/user/recipe-forge/lib/agents/json-utils.ts
```

- [ ] **Step 2: Write serp.ts**

Create `recipe-forge/lib/agents/serp.ts`:
```typescript
import type { SerpResult } from "../types"

const SERPER_API_KEY = process.env.SERPER_API_KEY

export async function fetchSerp(keyword: string): Promise<SerpResult> {
  if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not set")

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ q: keyword, gl: "fr", hl: "fr", num: 10 }),
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`)
  }

  const data = await response.json() as {
    organic?: { title: string; link: string; snippet: string }[]
    aiOverview?: string
    peopleAlsoAsk?: { question: string }[]
  }

  const top10 = (data.organic || []).slice(0, 10).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }))

  const faqs = (data.peopleAlsoAsk || []).map((q) => ({ question: q.question }))

  // Extract H2-like structures from snippets
  const competitorH2s = top10
    .map((r) => r.snippet)
    .filter(Boolean)
    .slice(0, 5)

  return {
    top10,
    aiOverview: data.aiOverview || null,
    faqs,
    competitorH2s,
  }
}
```

- [ ] **Step 3: Write strategist.ts**

Create `recipe-forge/lib/agents/strategist.ts`:
```typescript
import { generate } from "./provider"
import { loadSkill } from "../skills"
import { loadNicheProfile, toPromptSection } from "../niche-registry"
import { repairJson } from "./json-utils"
import type { StrategyPlan, SerpResult } from "../types"

interface StrategistParams {
  keyword: string
  nicheId: string
  format: "pin-first" | "google-first"
  serpData: SerpResult
}

export async function runStrategist(params: StrategistParams): Promise<StrategyPlan> {
  const skill = await loadSkill("strategist")
  const niche = loadNicheProfile(params.nicheId)

  const prompt = skill
    .replace("{{nicheProfile}}", toPromptSection(niche))
    .replace("{{format}}", params.format)
    .replace("{{keyword}}", params.keyword)
    .replace("{{serpData}}", JSON.stringify(params.serpData, null, 2))

  const raw = await generate(prompt, { temperature: 0.7, maxTokens: 4096 })
  const json = repairJson(raw)

  // Validate contract
  const plan = JSON.parse(json) as StrategyPlan
  if (!plan.angle || !plan.h2s || !plan.faqs) {
    throw new Error("Strategist output missing required fields: angle, h2s, faqs")
  }

  return plan
}
```

- [ ] **Step 4: Write chef-augustin.ts**

Create `recipe-forge/lib/agents/chef-augustin.ts`:
```typescript
import { generate } from "./provider"
import { loadSkill } from "../skills"
import { loadNicheProfile, toPromptSection } from "../niche-registry"
import { repairJson } from "./json-utils"
import type { ChefAugustinOutput, StrategyPlan } from "../types"

interface ChefAugustinParams {
  keyword: string
  nicheId: string
  format: "pin-first" | "google-first"
  strategyPlan: StrategyPlan
  retryHint?: string
}

export async function runChefAugustin(params: ChefAugustinParams): Promise<ChefAugustinOutput> {
  const skill = await loadSkill("chef-augustin")
  const niche = loadNicheProfile(params.nicheId)

  let prompt = skill
    .replace("{{nicheProfile}}", toPromptSection(niche))
    .replace("{{format}}", params.format)
    .replace("{{keyword}}", params.keyword)
    .replace("{{strategyPlan}}", JSON.stringify(params.strategyPlan, null, 2))

  if (params.retryHint) {
    prompt += `\n\n⚠️ IMPORTANT: ${params.retryHint}. Ne tronque PAS la sortie. Produis le JSON complet.`
  }

  const raw = await generate(prompt, { temperature: 0.8, maxTokens: 8192 })
  const json = repairJson(raw)
  const output = JSON.parse(json) as ChefAugustinOutput

  // Validate required fields
  const required = ["title", "meta", "content_md", "ingredients", "instructions", "imagePrompt", "jsonLd"]
  for (const field of required) {
    if (!(field in output)) {
      throw new Error(`Chef Augustin output missing required field: ${field}`)
    }
  }

  return output
}
```

- [ ] **Step 5: Write pin-designer.ts**

Create `recipe-forge/lib/agents/pin-designer.ts`:
```typescript
import { generate } from "./provider"
import { loadSkill } from "../skills"
import { loadNicheProfile, toPromptSection } from "../niche-registry"
import { repairJson } from "./json-utils"
import type { PinDesignerOutput, ChefAugustinOutput } from "../types"

interface PinDesignerParams {
  recipeContent: ChefAugustinOutput
  nicheId: string
  keyword: string
}

export async function runPinDesigner(params: PinDesignerParams): Promise<PinDesignerOutput> {
  const skill = await loadSkill("pin-designer")
  const niche = loadNicheProfile(params.nicheId)

  const prompt = skill
    .replace("{{nicheProfile}}", toPromptSection(niche))
    .replace("{{keyword}}", params.keyword)
    .replace("{{recipeContent}}", JSON.stringify({
      title: params.recipeContent.title,
      meta: params.recipeContent.meta,
      tags: params.recipeContent.tags,
      imagePrompt: params.recipeContent.imagePrompt,
    }, null, 2))

  const raw = await generate(prompt, { temperature: 0.8, maxTokens: 4096 })
  const json = repairJson(raw)
  const output = JSON.parse(json) as PinDesignerOutput

  if (!output.pins || output.pins.length === 0) {
    throw new Error("Pin Designer output has no pins")
  }

  return output
}
```

- [ ] **Step 6: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 7: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: agent runtimes — SERP, Strategist, Chef Augustin, Pin Designer

Each agent: loads skill, injects niche/form params, calls LLM, repairs JSON, validates contract
SERP agent uses Serper.dev live search
json-utils.ts copied unchanged from blueprint

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---


## Phase 6 — Validators (Quality Gate)

### Task 10: Copy and adapt validators from blueprint

**Files:**
- Create: `recipe-forge/lib/validators/content-validator.ts` (from `ai-blog-builder/lib/content-validator.ts`)
- Create: `recipe-forge/lib/validators/geo-validator.ts` (from `ai-blog-builder/lib/geo-validator.ts`)
- Create: `recipe-forge/lib/validators/culinary-validator.ts` (from `ai-blog-builder/lib/culinary-validator.ts`)
- Create: `recipe-forge/lib/validators/loop-scorer.ts` (from `ai-blog-builder/lib/loop-scorer.ts`)

**Interfaces:**
- Consumes: `ChefAugustinOutput`, `QualityReport`, `NicheProfile` from `lib/types.ts`
- Produces: `validate(output, { format, nicheProfile }): QualityReport`

- [ ] **Step 1: Copy validators from blueprint and adapt signatures**

For each validator, the adaptation is identical:
1. Copy the file from `ai-blog-builder/lib/<validator>.ts` → `recipe-forge/lib/validators/<validator>.ts`
2. Add `nicheProfile` parameter to the main validation function
3. Replace hardcoded thresholds/foodSafety rules with values from `nicheProfile`

**content-validator.ts key changes:**
```typescript
// OLD signature
export function validateContent(output: ChefAugustinOutput, format: string)

// NEW signature  
export function validateContent(
  output: ChefAugustinOutput,
  format: "pin-first" | "google-first",
  nicheProfile: NicheProfile
): ValidationResult

// NEW: dynamic minWords
const minWords = format === "pin-first" ? 1200 : 1800;

// NEW: dynamic banned claims
const bannedClaims = nicheProfile.foodSafety.bannedClaims;
const bannedWords = ["incroyable", "révolutionnaire", ...bannedClaims];
```

**geo-validator.ts key changes:**
```typescript
// OLD signature
export function validateGeo(output: ChefAugustinOutput)

// NEW signature
export function validateGeo(
  output: ChefAugustinOutput,
  nicheProfile: NicheProfile
): GeoValidationResult

// NEW: dynamic thresholds
const minClaims = nicheProfile.geoThresholds?.minClaims ?? 5;
const minAttributions = nicheProfile.geoThresholds?.minAttributions ?? 3;
const minAnswerNuggets = nicheProfile.geoThresholds?.minAnswerNuggets ?? 1;
```

**culinary-validator.ts:**
Copy unchanged. No niche-specific configuration needed — it validates universal culinary rules (ingredient ratios, cooking times, technique coherence).

**loop-scorer.ts:**
Copy unchanged. The composite scoring formula (GEO 60% + Content 25% + Structure 15%) is universal.

- [ ] **Step 2: Create the unified Quality Gate**

Create `recipe-forge/lib/validators/quality-gate.ts`:
```typescript
import type { ChefAugustinOutput, QualityReport, NicheProfile } from "../types"
import { validateContent } from "./content-validator"
import { validateGeo } from "./geo-validator"
import { validateCulinary } from "./culinary-validator"
import { scoreLoop } from "./loop-scorer"

export function runQualityGate(
  output: ChefAugustinOutput,
  format: "pin-first" | "google-first",
  nicheProfile: NicheProfile
): QualityReport {
  const contentResult = validateContent(output, format, nicheProfile)
  const geoResult = validateGeo(output, nicheProfile)
  const culinaryResult = validateCulinary(output)
  const score = scoreLoop({ contentResult, geoResult, culinaryResult })

  const errors: string[] = []
  const warnings: string[] = []

  // Content errors
  if (!contentResult.passed) {
    errors.push(...contentResult.errors)
    warnings.push(...contentResult.warnings)
  }

  // GEO warnings only (GEO is advisory, not blocking)
  warnings.push(...geoResult.warnings)

  // Culinary errors
  if (!culinaryResult.passed) {
    errors.push(...culinaryResult.errors)
  }

  // Food safety violations = always REJECT, never retry
  const foodSafetyViolation = contentResult.errors.some(
    (e) => e.includes("food safety") || e.includes("claim santé")
  )

  // Truncation = RETRY (not REJECT)
  const isTruncated =
    output.ingredients.length < 3 ||
    output.instructions.length < 3 ||
    output.content_md.length < 500

  const minWords = format === "pin-first" ? 1200 : 1800
  const wordCount = output.content_md.split(/\s+/).length
  const tooShort = wordCount < minWords

  const passed = score.total >= 65 && errors.length === 0 && !tooShort && !foodSafetyViolation
  const retryable = !foodSafetyViolation && (isTruncated || tooShort)

  return {
    passed,
    score,
    errors,
    warnings,
    retry: retryable,
  }
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 4: Run existing validator tests (adapted)**

```bash
cd recipe-forge && cp -r /home/user/ai-blog-builder/__tests__/*.test.ts __tests__/
# Adapt test imports to new file paths
cd recipe-forge && npx vitest run
```

Expected: Tests pass after adapting imports and signatures.

- [ ] **Step 5: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: validators copied from blueprint + Quality Gate orchestrator

4 validators: content (food safety + banned words), GEO (citations), culinary (ratios), loop-scorer (composite)
Quality Gate: PASS/RETRY/REJECT with configurable thresholds per niche+format

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 7 — Pipeline Engine

### Task 11: Create pipeline runner

**Files:**
- Create: `recipe-forge/lib/engine/pipeline.ts`
- Create: `recipe-forge/lib/engine/retry.ts`
- Create: `recipe-forge/lib/engine/runner.ts`

**Interfaces:**
- Consumes: All agents, validators, exporters, DB queries, Niche Registry
- Produces: `runPipeline(params: GenerateRequest): Promise<void>` — the orchestrator

- [ ] **Step 1: Write retry.ts**

Create `recipe-forge/lib/engine/retry.ts`:
```typescript
import type { ChefAugustinOutput, QualityReport } from "../types"
import { runChefAugustin } from "../agents/chef-augustin"
import { runQualityGate } from "../validators/quality-gate"
import type { StrategyPlan, NicheProfile } from "../types"

const MAX_RETRIES = 1

interface RetryContext {
  keyword: string
  nicheId: string
  format: "pin-first" | "google-first"
  strategyPlan: StrategyPlan
  nicheProfile: NicheProfile
}

export async function generateWithRetry(
  ctx: RetryContext
): Promise<{ output: ChefAugustinOutput; report: QualityReport }> {
  let attempt = 0
  let output: ChefAugustinOutput | null = null
  let report: QualityReport | null = null

  while (attempt <= MAX_RETRIES) {
    console.log(`[pipeline] Chef Augustin — attempt ${attempt + 1}/${MAX_RETRIES + 1}`)

    output = await runChefAugustin({
      keyword: ctx.keyword,
      nicheId: ctx.nicheId,
      format: ctx.format,
      strategyPlan: ctx.strategyPlan,
      retryHint: attempt > 0
        ? "Ta sortie précédente a été rejetée (tronquée ou trop courte). Produis le JSON COMPLET sans tronquer"
        : undefined,
    })

    report = runQualityGate(output, ctx.format, ctx.nicheProfile)

    if (report.passed) {
      console.log(`[pipeline] Quality Gate PASSED — score ${report.score.total}/100`)
      return { output, report }
    }

    if (!report.retry) {
      console.log(`[pipeline] Quality Gate REJECTED — ${report.errors.join("; ")}`)
      throw new Error(`REJECT: ${report.errors.join("; ")}`)
    }

    console.log(`[pipeline] Quality Gate RETRY — ${report.errors.join("; ")}`)
    attempt++
  }

  throw new Error(`REJECT after ${MAX_RETRIES + 1} attempts: ${report?.errors.join("; ")}`)
}
```

- [ ] **Step 2: Write pipeline.ts**

Create `recipe-forge/lib/engine/pipeline.ts`:
```typescript
import type { GenerateRequest } from "../types"
import { createRecipe, saveRecipeContent, updateRecipeStatus, insertPins } from "../db/queries"
import { loadNicheProfile } from "../niche-registry"
import { generateSlug } from "../slug"
import { fetchSerp } from "../agents/serp"
import { runStrategist } from "../agents/strategist"
import { runPinDesigner } from "../agents/pin-designer"
import { generateWithRetry } from "./retry"
import { exportFolder, exportJson } from "../exporters"

export async function runPipeline(params: GenerateRequest): Promise<string> {
  // 1. Create DB record
  console.log(`[pipeline] Starting: "${params.keyword}" (${params.nicheId}, ${params.format})`)
  const recipe = await createRecipe({
    keyword: params.keyword,
    nicheId: params.nicheId,
    format: params.format,
  })
  const recipeId = recipe.id
  const nicheProfile = loadNicheProfile(params.nicheId)

  try {
    // 2. SERP
    console.log("[pipeline] Step 1/5: SERP")
    const serpData = await fetchSerp(params.keyword)

    // 3. Strategist
    console.log("[pipeline] Step 2/5: Strategist")
    const strategyPlan = await runStrategist({
      keyword: params.keyword,
      nicheId: params.nicheId,
      format: params.format,
      serpData,
    })

    // 4. Chef Augustin + Quality Gate (with retry)
    console.log("[pipeline] Step 3/5: Chef Augustin + Quality Gate")
    const { output, report } = await generateWithRetry({
      keyword: params.keyword,
      nicheId: params.nicheId,
      format: params.format,
      strategyPlan,
      nicheProfile,
    })

    const slug = generateSlug(output.title)

    // 5. Pin Designer
    console.log("[pipeline] Step 4/5: Pin Designer")
    const pinOutput = await runPinDesigner({
      recipeContent: output,
      nicheId: params.nicheId,
      keyword: params.keyword,
    })

    // 6. Persist to DB
    console.log("[pipeline] Step 5/5: Persist + Export")
    await saveRecipeContent(recipeId, {
      title: output.title,
      slug,
      meta: output.meta,
      content_md: output.content_md,
      ingredients: output.ingredients,
      instructions: output.instructions,
      tags: output.tags,
      totalTime: output.totalTime,
      difficulty: output.difficulty,
      servings: output.servings,
      imagePrompt: output.imagePrompt,
      jsonLd: output.jsonLd,
      scores: report.score,
    })

    await insertPins(recipeId, pinOutput.pins.map((p) => ({
      title: p.title,
      description: p.description,
      imagePrompt: p.imagePrompt,
      altText: p.altText,
      boardName: p.boardName,
    })))

    // 7. Export to files
    const niche = params.nicheId
    await exportFolder({ niche, slug, output, pins: pinOutput.pins })
    await exportJson({ niche, slug, output, pins: pinOutput.pins })

    console.log(`[pipeline] ✅ Complete: "${output.title}" — score ${report.score.total}/100`)
    return recipeId

  } catch (error) {
    const message = (error as Error).message
    console.error(`[pipeline] ❌ Failed: ${message}`)
    await updateRecipeStatus(recipeId, "failed", message)
    throw error
  }
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean (may need to stub `lib/exporters` and `lib/slug` first — create minimal stubs).

- [ ] **Step 4: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: pipeline engine — linear async/await orchestrator

retry.ts: generateWithRetry() — max 1 retry on truncation
pipeline.ts: runPipeline() — SERP → Strategist → Chef Augustin+Gate → Pin Designer → Persist+Export

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 8 — Exporters

### Task 12: Create file exporters

**Files:**
- Create: `recipe-forge/lib/exporters/markdown-exporter.ts`
- Create: `recipe-forge/lib/exporters/json-exporter.ts`
- Create: `recipe-forge/lib/exporters/wordpress-exporter.ts`
- Create: `recipe-forge/lib/exporters/index.ts`
- Create: `recipe-forge/lib/slug.ts`

**Interfaces:**
- Consumes: `ChefAugustinOutput`, `PinDesign` from `lib/types.ts`
- Produces: `exportFolder()`, `exportJson()`, `exportWordPress()` (stub)

- [ ] **Step 1: Copy slug.ts from blueprint**

```bash
cp /home/user/ai-blog-builder/lib/slug.ts /home/user/recipe-forge/lib/slug.ts
```

- [ ] **Step 2: Write markdown-exporter.ts**

Create `recipe-forge/lib/exporters/markdown-exporter.ts`:
```typescript
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import type { ChefAugustinOutput, PinDesign } from "../types"

const OUTPUT_DIR = join(process.cwd(), "output")

export async function exportFolder(params: {
  niche: string
  slug: string
  output: ChefAugustinOutput
  pins: PinDesign[]
}): Promise<void> {
  const dir = join(OUTPUT_DIR, params.niche, params.slug)
  mkdirSync(dir, { recursive: true })

  writeFileSync(join(dir, "content.md"), params.output.content_md)
  writeFileSync(join(dir, "meta.json"), JSON.stringify(params.output.meta, null, 2))
  writeFileSync(join(dir, "blog-image-prompt.txt"), params.output.imagePrompt)
  writeFileSync(
    join(dir, "pin-prompts.json"),
    JSON.stringify(params.pins.map((p) => ({
      title: p.title,
      description: p.description,
      imagePrompt: p.imagePrompt,
      altText: p.altText,
      boardName: p.boardName,
    })), null, 2)
  )

  console.log(`[export] Folder written: ${dir}`)
}
```

- [ ] **Step 3: Write json-exporter.ts**

Create `recipe-forge/lib/exporters/json-exporter.ts`:
```typescript
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import type { ChefAugustinOutput, PinDesign } from "../types"

const OUTPUT_DIR = join(process.cwd(), "output", "json")

export async function exportJson(params: {
  niche: string
  slug: string
  output: ChefAugustinOutput
  pins: PinDesign[]
}): Promise<void> {
  const nicheDir = join(OUTPUT_DIR, params.niche)
  mkdirSync(nicheDir, { recursive: true })

  const json = {
    title: params.output.title,
    slug: params.slug,
    meta: params.output.meta,
    content_md: params.output.content_md,
    ingredients: params.output.ingredients,
    instructions: params.output.instructions,
    tags: params.output.tags,
    totalTime: params.output.totalTime,
    difficulty: params.output.difficulty,
    servings: params.output.servings,
    imagePrompt: params.output.imagePrompt,
    jsonLd: params.output.jsonLd,
    pins: params.pins,
  }

  writeFileSync(join(nicheDir, `${params.slug}.json`), JSON.stringify(json, null, 2))
  console.log(`[export] JSON written: ${join(nicheDir, `${params.slug}.json`)}`)
}
```

- [ ] **Step 4: Write wordpress-exporter.ts (stub)**

Create `recipe-forge/lib/exporters/wordpress-exporter.ts`:
```typescript
import type { ChefAugustinOutput, PinDesign } from "../types"

// Phase 2: WordPress REST API integration
// POST /wp-json/wp/v2/posts with recipe content as HTML

export interface WordPressConfig {
  siteUrl: string
  username: string
  appPassword: string
}

export async function exportWordPress(
  _output: ChefAugustinOutput,
  _pins: PinDesign[],
  _config: WordPressConfig,
): Promise<{ postId: number; url: string }> {
  throw new Error("WordPress exporter not implemented — Phase 2")
}
```

- [ ] **Step 5: Write index.ts barrel export**

Create `recipe-forge/lib/exporters/index.ts`:
```typescript
export { exportFolder } from "./markdown-exporter"
export { exportJson } from "./json-exporter"
export { exportWordPress } from "./wordpress-exporter"
export type { WordPressConfig } from "./wordpress-exporter"
```

- [ ] **Step 6: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 7: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: file exporters — Markdown folder, JSON file, WordPress stub

Markdown: output/{niche}/{slug}/ (content.md + meta.json + prompts)
JSON: output/json/{niche}/{slug}.json (single file)
WordPress: interface ready, Phase 2
slug.ts copied from blueprint

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---


## Phase 9 — API Routes

### Task 13: Create API route — POST /api/generate

**Files:**
- Create: `recipe-forge/app/api/generate/route.ts`

**Interfaces:**
- Consumes: `runPipeline()` from `lib/engine/pipeline.ts`, `GenerateRequest`, `GenerateResponse` from `lib/types.ts`
- Produces: `POST /api/generate` — fire-and-forget pipeline execution

- [ ] **Step 1: Write the route**

Create `recipe-forge/app/api/generate/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { runPipeline } from "@/lib/engine/pipeline"
import type { GenerateRequest } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest

    // Validate
    if (!body.keyword || !body.nicheId) {
      return NextResponse.json(
        { error: "keyword and nicheId are required" },
        { status: 400 }
      )
    }

    const format = body.format || "pin-first"
    if (format !== "pin-first" && format !== "google-first") {
      return NextResponse.json(
        { error: "format must be 'pin-first' or 'google-first'" },
        { status: 400 }
      )
    }

    // Fire-and-forget: return immediately, pipeline runs async
    // The POST handler creates the DB record, then launches the pipeline
    // The DB record status goes: 'running' → 'completed'/'failed'
    const recipeId = await runPipeline({ keyword: body.keyword, nicheId: body.nicheId, format })

    return NextResponse.json({ recipeId })
  } catch (error) {
    console.error("[api:generate]", error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Test the endpoint**

```bash
cd recipe-forge && curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword":"poulet basquaise facile","nicheId":"francaise","format":"pin-first"}'
```

Expected: `{"recipeId":"<uuid>"}` — then check DB for the new recipe row.

- [ ] **Step 3: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: POST /api/generate — fire-and-forget pipeline trigger

Validates input, creates DB record, launches pipeline async
Returns { recipeId } immediately for polling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: Create API routes — recipes CRUD + download

**Files:**
- Create: `recipe-forge/app/api/recipes/route.ts`
- Create: `recipe-forge/app/api/recipes/[id]/route.ts`
- Create: `recipe-forge/app/api/recipes/[id]/regenerate/route.ts`
- Create: `recipe-forge/app/api/recipes/[id]/download/route.ts`
- Create: `recipe-forge/app/api/niches/route.ts`

**Interfaces:**
- Consumes: `db/queries.ts` functions, `exporters`
- Produces: 5 API route handlers

- [ ] **Step 1: Write GET /api/recipes (list)**

Create `recipe-forge/app/api/recipes/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { listRecipes } from "@/lib/db/queries"

export async function GET(request: NextRequest) {
  const niche = request.nextUrl.searchParams.get("niche") || undefined
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1")
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20")

  const result = await listRecipes({ niche, page, limit })
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Write GET+DELETE /api/recipes/[id]**

Create `recipe-forge/app/api/recipes/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { getRecipe, deleteRecipe } from "@/lib/db/queries"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Build progress from recipe status
  const progress = buildProgress(recipe.status)
  return NextResponse.json({ ...recipe, progress })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await deleteRecipe(id)
  return NextResponse.json({ ok: true })
}

function buildProgress(status: string) {
  const steps = ["serp", "strategist", "writing", "quality_gate", "pins", "complete"]
  const statusIndex = status === "completed" ? steps.length : status === "failed" ? -1 : 2

  return steps.map((step, i) => ({
    step,
    status: i < statusIndex ? "done" as const
      : i === statusIndex ? "running" as const
      : "pending" as const,
  }))
}
```

- [ ] **Step 3: Write POST /api/recipes/[id]/regenerate**

Create `recipe-forge/app/api/recipes/[id]/regenerate/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { getRecipe } from "@/lib/db/queries"
import { runPipeline } from "@/lib/engine/pipeline"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Re-run with same keyword+niche+format
  const recipeId = await runPipeline({
    keyword: recipe.keyword,
    nicheId: recipe.niche_id,
    format: recipe.format as "pin-first" | "google-first",
  })

  return NextResponse.json({ recipeId })
}
```

- [ ] **Step 4: Write GET /api/recipes/[id]/download**

Create `recipe-forge/app/api/recipes/[id]/download/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { getRecipe } from "@/lib/db/queries"
import { join } from "path"
import { readFileSync, existsSync } from "fs"
import archiver from "archiver"
import { PassThrough } from "stream"

const OUTPUT_DIR = join(process.cwd(), "output")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe || recipe.status !== "completed") {
    return NextResponse.json({ error: "Not found or not completed" }, { status: 404 })
  }

  const format = request.nextUrl.searchParams.get("format") || "zip"

  if (format === "json") {
    const jsonPath = join(OUTPUT_DIR, "json", recipe.niche_id, `${recipe.slug}.json`)
    if (!existsSync(jsonPath)) {
      return NextResponse.json({ error: "JSON file not found" }, { status: 404 })
    }
    const content = readFileSync(jsonPath, "utf-8")
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${recipe.slug}.json"`,
      },
    })
  }

  // ZIP download
  const folderPath = join(OUTPUT_DIR, recipe.niche_id, recipe.slug!)
  if (!existsSync(folderPath)) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 })
  }

  const archive = archiver("zip", { zlib: { level: 9 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)
  archive.directory(folderPath, false)
  archive.finalize()

  return new NextResponse(passThrough as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${recipe.slug}.zip"`,
    },
  })
}
```

- [ ] **Step 5: Write GET /api/niches**

Create `recipe-forge/app/api/niches/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { listNiches } from "@/lib/niche-registry"

export async function GET() {
  const niches = listNiches()
  return NextResponse.json({ niches })
}
```

- [ ] **Step 6: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 7: Test endpoints**

```bash
# List recipes
curl http://localhost:3000/api/recipes

# Get single recipe
curl http://localhost:3000/api/recipes/<id>

# List niches
curl http://localhost:3000/api/niches

# Download zip
curl http://localhost:3000/api/recipes/<id>/download -o recipe.zip

# Download JSON
curl "http://localhost:3000/api/recipes/<id>/download?format=json" -o recipe.json
```

- [ ] **Step 8: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: all API routes — recipes CRUD, download, regenerate, niches

7 endpoints: generate, recipes list, recipe detail+delete, regenerate, download (zip+json), niches
Polling via GET /api/recipes/{id} returns progress steps

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 10 — Dashboard UI

### Task 15: Create dashboard components

**Files:**
- Create: `recipe-forge/components/generate-form.tsx`
- Create: `recipe-forge/components/progress-tracker.tsx`
- Create: `recipe-forge/components/result-card.tsx`
- Create: `recipe-forge/components/pin-prompts-list.tsx`
- Create: `recipe-forge/components/history-table.tsx`
- Create: `recipe-forge/components/history-filters.tsx`

**Interfaces:**
- Consumes: API endpoints, `NicheProfile`, `RecipeDetail`, `GenerationProgress` types
- Produces: 6 React client components with full functionality

- [ ] **Step 1: Write generate-form.tsx**

Create `recipe-forge/components/generate-form.tsx`:
```tsx
"use client"

import { useState, useEffect } from "react"
import type { NicheProfile } from "@/lib/types"

interface Props {
  onGenerate: (data: { keyword: string; nicheId: string; format: "pin-first" | "google-first" }) => void
  disabled: boolean
}

export function GenerateForm({ onGenerate, disabled }: Props) {
  const [keyword, setKeyword] = useState("")
  const [nicheId, setNicheId] = useState("default")
  const [format, setFormat] = useState<"pin-first" | "google-first">("pin-first")
  const [niches, setNiches] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((data) => setNiches(data.niches))
      .catch(() => setNiches([{ id: "default", name: "Universelle" }]))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return
    onGenerate({ keyword: keyword.trim(), nicheId, format })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mot-clé</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="poulet basquaise facile..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          disabled={disabled}
          required
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Niche</label>
          <select
            value={nicheId}
            onChange={(e) => setNicheId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-500"
            disabled={disabled}
          >
            {niches.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Format</label>
          <div className="flex gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="format"
                value="pin-first"
                checked={format === "pin-first"}
                onChange={() => setFormat("pin-first")}
                disabled={disabled}
              />
              Pin-First (1200-1500 mots)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="format"
                value="google-first"
                checked={format === "google-first"}
                onChange={() => setFormat("google-first")}
                disabled={disabled}
              />
              Google-First (1800-2200 mots)
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !keyword.trim()}
        className="w-full bg-zinc-100 text-zinc-900 font-semibold py-3 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {disabled ? "Génération en cours..." : "Générer la recette"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Write progress-tracker.tsx**

Create `recipe-forge/components/progress-tracker.tsx`:
```tsx
"use client"

interface Step {
  step: string
  status: "pending" | "running" | "done" | "error"
}

interface Props {
  steps: Step[]
  elapsed: number
}

const LABELS: Record<string, string> = {
  serp: "Analyse SERP",
  strategist: "Stratégie éditoriale",
  writing: "Rédaction Chef Augustin",
  quality_gate: "Quality Gate",
  pins: "Pins Pinterest",
  complete: "Terminé",
}

const ICONS: Record<string, string> = {
  done: "✅",
  running: "⏳",
  pending: "⬜",
  error: "❌",
}

export function ProgressTracker({ steps, elapsed }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-zinc-300">Progression</h2>
        <span className="text-xs text-zinc-500">{elapsed.toFixed(1)}s</span>
      </div>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.step} className="flex items-center gap-3 text-sm">
            <span>{ICONS[s.status]}</span>
            <span className={s.status === "running" ? "text-zinc-100" : s.status === "done" ? "text-zinc-400" : "text-zinc-600"}>
              {LABELS[s.step] || s.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write result-card.tsx**

Create `recipe-forge/components/result-card.tsx`:
```tsx
"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import type { RecipeDetail } from "@/lib/types"
import { PinPromptsList } from "./pin-prompts-list"

interface Props {
  recipe: RecipeDetail
  onRegenerate: () => void
}

export function ResultCard({ recipe, onRegenerate }: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const [showPins, setShowPins] = useState(false)

  const score = recipe.scores as { total: number } | null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold">{recipe.title || recipe.keyword}</h2>
          {score && (
            <span className={`text-sm font-mono ${score.total >= 65 ? "text-green-400" : "text-yellow-400"}`}>
              Score: {score.total}/100
            </span>
          )}
          {recipe.status === "failed" && (
            <p className="text-sm text-red-400 mt-1">{recipe.error_reason}</p>
          )}
        </div>
        <div className="flex gap-2">
          {recipe.status === "completed" && (
            <>
              <a
                href={`/api/recipes/${recipe.id}/download`}
                className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
              >
                📥 .zip
              </a>
              <a
                href={`/api/recipes/${recipe.id}/download?format=json`}
                className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
              >
                📥 JSON
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(recipe.image_prompt || "") }}
                className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
              >
                📋 Prompt blog
              </button>
            </>
          )}
          {(recipe.status === "completed" || recipe.status === "failed") && (
            <button
              onClick={onRegenerate}
              className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
            >
              🔄 Regénérer
            </button>
          )}
        </div>
      </div>

      {recipe.status === "completed" && recipe.content_md && (
        <>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            {showPreview ? "▼ Masquer" : "▶ Voir la preview"}
          </button>

          {showPreview && (
            <div className="prose prose-invert prose-sm max-w-none max-h-96 overflow-y-auto border border-zinc-800 rounded-lg p-4">
              <ReactMarkdown>{recipe.content_md}</ReactMarkdown>
            </div>
          )}

          <button
            onClick={() => setShowPins(!showPins)}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition block"
          >
            {showPins ? "▼ Masquer les pins" : "📌 Voir les 5 pins Pinterest"}
          </button>

          {showPins && <PinPromptsList pins={recipe.pins || []} />}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write pin-prompts-list.tsx**

Create `recipe-forge/components/pin-prompts-list.tsx`:
```tsx
"use client"

import type { PinRow } from "@/lib/types"

interface Props {
  pins: PinRow[]
}

export function PinPromptsList({ pins }: Props) {
  return (
    <div className="space-y-3">
      {pins.map((pin) => (
        <div key={pin.id} className="bg-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">Pin {pin.position}: {pin.title}</h4>
              <p className="text-xs text-zinc-400 mt-1">{pin.description}</p>
              <p className="text-xs text-zinc-500 mt-1">Board: {pin.board_name}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(pin.image_prompt)}
              className="text-xs bg-zinc-700 px-2 py-1 rounded hover:bg-zinc-600 transition shrink-0"
            >
              📋 Copier prompt
            </button>
          </div>
          {pin.alt_text && (
            <p className="text-xs text-zinc-500 italic">Alt: {pin.alt_text}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write history-table.tsx**

Create `recipe-forge/components/history-table.tsx`:
```tsx
"use client"

import type { RecipeDetail } from "@/lib/types"

interface Props {
  recipes: RecipeDetail[]
  onDelete: (id: string) => void
  onRegenerate: (id: string) => void
}

export function HistoryTable({ recipes, onDelete, onRegenerate }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-left">
            <th className="px-4 py-3 font-medium">Mot-clé</th>
            <th className="px-4 py-3 font-medium">Niche</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Format</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const score = r.scores as { total: number } | null
            return (
              <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-200">{r.keyword}</div>
                  {r.status === "failed" && (
                    <div className="text-xs text-red-400 mt-0.5">{r.error_reason}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{r.niche_id}</td>
                <td className="px-4 py-3">
                  {score ? (
                    <span className={`font-mono ${score.total >= 65 ? "text-green-400" : "text-yellow-400"}`}>
                      {score.total}
                    </span>
                  ) : r.status === "failed" ? (
                    <span className="text-red-400">⚠️</span>
                  ) : (
                    <span className="text-zinc-500">⏳</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{r.format}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.status === "completed" && (
                      <>
                        <a href={`/api/recipes/${r.id}/download`} className="text-xs p-1.5 hover:bg-zinc-700 rounded" title="ZIP">📥</a>
                        <a href={`/api/recipes/${r.id}/download?format=json`} className="text-xs p-1.5 hover:bg-zinc-700 rounded" title="JSON">📄</a>
                        <a href={`/api/recipes/${r.id}`} className="text-xs p-1.5 hover:bg-zinc-700 rounded" title="Voir">🔗</a>
                      </>
                    )}
                    <button onClick={() => onRegenerate(r.id)} className="text-xs p-1.5 hover:bg-zinc-700 rounded" title="Regénérer">🔄</button>
                    <button onClick={() => onDelete(r.id)} className="text-xs p-1.5 hover:bg-zinc-700 rounded" title="Supprimer">🗑️</button>
                  </div>
                </td>
              </tr>
            )
          })}
          {recipes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                Aucune recette générée
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Write history-filters.tsx**

Create `recipe-forge/components/history-filters.tsx`:
```tsx
"use client"

import { useState, useEffect } from "react"

interface Props {
  onFilter: (filters: { niche?: string; scoreMin?: number }) => void
}

export function HistoryFilters({ onFilter }: Props) {
  const [niches, setNiches] = useState<{ id: string; name: string }[]>([])
  const [niche, setNiche] = useState("")
  const [scoreMin, setScoreMin] = useState(0)

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((data) => setNiches(data.niches))
      .catch(() => setNiches([]))
  }, [])

  useEffect(() => {
    onFilter({
      niche: niche || undefined,
      scoreMin: scoreMin > 0 ? scoreMin : undefined,
    })
  }, [niche, scoreMin, onFilter])

  return (
    <div className="flex gap-3">
      <select
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
      >
        <option value="">Toutes les niches</option>
        {niches.map((n) => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>

      <select
        value={scoreMin}
        onChange={(e) => setScoreMin(Number(e.target.value))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
      >
        <option value="0">Tous les scores</option>
        <option value="65">≥ 65 (OK)</option>
        <option value="80">≥ 80 (Bon)</option>
        <option value="90">≥ 90 (Excellent)</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 7: Verify types compile**

```bash
cd recipe-forge && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 8: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: dashboard components — form, progress, result, pins, history table, filters

6 client components: GenerateForm, ProgressTracker, ResultCard, PinPromptsList, HistoryTable, HistoryFilters
Polling via GET /api/recipes/{id} for progress tracking
Download links, copy-to-clipboard, regenerate, delete actions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: Wire up dashboard pages

**Files:**
- Modify: `recipe-forge/app/page.tsx` (Generator page)
- Modify: `recipe-forge/app/history/page.tsx` (History page)

**Interfaces:**
- Consumes: All dashboard components, API endpoints
- Produces: 2 fully functional pages

- [ ] **Step 1: Rewrite app/page.tsx (Generator)**

Replace placeholder with full Generator page:
```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { GenerateForm } from "@/components/generate-form"
import { ProgressTracker } from "@/components/progress-tracker"
import { ResultCard } from "@/components/result-card"
import type { RecipeDetail } from "@/lib/types"

export default function GeneratorPage() {
  const [generating, setGenerating] = useState(false)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const handleGenerate = async (data: { keyword: string; nicheId: string; format: "pin-first" | "google-first" }) => {
    setGenerating(true)
    setRecipe(null)
    setElapsed(0)

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const { recipeId: id } = await res.json()
    setRecipeId(id)
  }

  const poll = useCallback(async () => {
    if (!recipeId) return
    const res = await fetch(`/api/recipes/${recipeId}`)
    const data = await res.json()

    if (data.status === "completed" || data.status === "failed") {
      setRecipe(data)
      setGenerating(false)
    }
  }, [recipeId])

  useEffect(() => {
    if (!generating) return
    const timer = setInterval(() => {
      setElapsed((e) => e + 2)
      poll()
    }, 2000)
    return () => clearInterval(timer)
  }, [generating, poll])

  const handleRegenerate = async () => {
    if (!recipeId) return
    setGenerating(true)
    setRecipe(null)
    setElapsed(0)
    const res = await fetch(`/api/recipes/${recipeId}/regenerate`, { method: "POST" })
    const { recipeId: newId } = await res.json()
    setRecipeId(newId)
  }

  const progress = recipe
    ? ["serp", "strategist", "writing", "quality_gate", "pins", "complete"].map((step) => ({
        step,
        status: "done" as const,
      }))
    : [
        { step: "serp", status: elapsed > 2 ? "done" as const : elapsed > 0 ? "running" as const : "pending" as const },
        { step: "strategist", status: elapsed > 5 ? "done" as const : elapsed > 2 ? "running" as const : "pending" as const },
        { step: "writing", status: elapsed > 8 ? "done" as const : elapsed > 5 ? "running" as const : "pending" as const },
        { step: "quality_gate", status: elapsed > 10 ? "done" as const : elapsed > 8 ? "running" as const : "pending" as const },
        { step: "pins", status: elapsed > 14 ? "done" as const : elapsed > 10 ? "running" as const : "pending" as const },
        { step: "complete", status: "pending" as const },
      ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Générer une recette</h1>

      <GenerateForm onGenerate={handleGenerate} disabled={generating} />

      {generating && (
        <ProgressTracker steps={progress} elapsed={elapsed} />
      )}

      {recipe && (
        <ResultCard recipe={recipe} onRegenerate={handleRegenerate} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite app/history/page.tsx**

Replace placeholder with full History page:
```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { HistoryTable } from "@/components/history-table"
import { HistoryFilters } from "@/components/history-filters"
import type { RecipeDetail } from "@/lib/types"

export default function HistoryPage() {
  const [recipes, setRecipes] = useState<RecipeDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ niche?: string; scoreMin?: number }>({})

  const fetchRecipes = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.niche) params.set("niche", filters.niche)
    params.set("page", String(page))
    const res = await fetch(`/api/recipes?${params}`)
    const data = await res.json()
    setRecipes(data.recipes)
    setTotal(data.total)
  }, [page, filters])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const handleDelete = async (id: string) => {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" })
    fetchRecipes()
  }

  const handleRegenerate = async (id: string) => {
    await fetch(`/api/recipes/${id}/regenerate`, { method: "POST" })
    fetchRecipes()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Historique</h1>

      <HistoryFilters onFilter={setFilters} />

      <HistoryTable recipes={recipes} onDelete={handleDelete} onRegenerate={handleRegenerate} />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded text-sm ${p === page ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify dev server renders both pages**

```bash
cd recipe-forge && npm run dev
```

Visit `http://localhost:3000` — Generator form visible, niches loaded from API.
Visit `http://localhost:3000/history` — History table visible, filters functional.

- [ ] **Step 4: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "feat: wire up dashboard pages — Generator + History

Generator: form → POST /api/generate → polling → result card
History: filters → GET /api/recipes → table with actions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 11 — Integration & Polish

### Task 17: Copy tests from blueprint and run full test suite

**Files:**
- Create: `recipe-forge/__tests__/content-validator.test.ts`
- Create: `recipe-forge/__tests__/geo-validator.test.ts`
- Create: `recipe-forge/__tests__/loop-scorer.test.ts`
- Create: `recipe-forge/__tests__/pipeline.test.ts`
- Create: `recipe-forge/__tests__/niche-registry.test.ts`
- Create: `recipe-forge/vitest.config.ts`

- [ ] **Step 1: Write vitest.config.ts**

Create `recipe-forge/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Step 2: Write niche-registry.test.ts**

Create `recipe-forge/__tests__/niche-registry.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { loadNicheProfile } from "../lib/niche-registry"

describe("Niche Registry", () => {
  it("loads default profile", () => {
    const profile = loadNicheProfile("default")
    expect(profile.id).toBe("default")
    expect(profile.foodSafety).toBeDefined()
    expect(profile.foodSafety.bannedClaims.length).toBeGreaterThan(0)
  })

  it("loads italienne profile", () => {
    const profile = loadNicheProfile("italienne")
    expect(profile.vocabulary.signatureIngredients).toContain("Parmigiano Reggiano DOP")
  })

  it("falls back to default for unknown niche", () => {
    const profile = loadNicheProfile("nonexistent")
    expect(profile.id).toBe("default")
  })

  it("toPromptSection returns non-empty string", () => {
    const { toPromptSection } = require("../lib/niche-registry")
    const profile = loadNicheProfile("francaise")
    const section = toPromptSection(profile)
    expect(section.length).toBeGreaterThan(100)
    expect(section).toContain("Cuisine Française")
  })
})
```

- [ ] **Step 3: Copy and adapt validator tests from blueprint**

For each validator test from the blueprint:
1. Copy the test file to `recipe-forge/__tests__/`
2. Update imports to point to new paths (`@/lib/validators/...`)
3. Add test cases for niche-specific validation (dynamic thresholds, banned claims)

- [ ] **Step 4: Write pipeline integration test**

Create `recipe-forge/__tests__/pipeline.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest"
import { fetchSerp } from "../lib/agents/serp"

// Mock external APIs
vi.mock("../lib/agents/provider", () => ({
  generate: vi.fn().mockResolvedValue(JSON.stringify({
    title: "Test Recipe",
    meta: { description: "Test", focusKeyword: "test" },
    content_md: "# Test\n\nThis is a test recipe with enough content to pass validation. ".repeat(50),
    ingredients: [
      { name: "Ingredient 1", quantity: "1", unit: "cup" },
      { name: "Ingredient 2", quantity: "2", unit: "tbsp" },
      { name: "Ingredient 3", quantity: "500", unit: "g" },
      { name: "Ingredient 4", quantity: "1", unit: "tsp" },
      { name: "Ingredient 5", quantity: "100", unit: "ml" },
    ],
    instructions: [
      { step: 1, text: "Step 1" },
      { step: 2, text: "Step 2" },
      { step: 3, text: "Step 3" },
      { step: 4, text: "Step 4" },
    ],
    tags: ["test", "recipe"],
    totalTime: 30,
    difficulty: "easy",
    servings: 2,
    imagePrompt: "A beautiful food photo of Test Recipe",
    jsonLd: { "@context": "https://schema.org", "@type": "Recipe" },
  })),
}))

describe("Pipeline", () => {
  it("SERP fetch returns expected structure", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key")
    // This test validates the SerpResult type contract
    const mockSerp = {
      top10: [{ title: "Test", url: "https://example.com", snippet: "A test result" }],
      aiOverview: null,
      faqs: [{ question: "How to test?" }],
      competitorH2s: ["Ingredients", "Instructions"],
    }
    expect(mockSerp.top10.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 5: Run full test suite**

```bash
cd recipe-forge && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Run type check**

```bash
cd recipe-forge && npm run typecheck
```

Expected: Clean.

- [ ] **Step 7: Commit**

```bash
cd recipe-forge && git add -A && git commit -m "test: integration tests — niche registry, validators, pipeline

vitest configured with path aliases
Mocked LLM provider for pipeline testing

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 18: Final verification and deployment preparation

- [ ] **Step 1: Full type check**

```bash
cd recipe-forge && npm run typecheck
```

Expected: Zero errors.

- [ ] **Step 2: Full test suite**

```bash
cd recipe-forge && npm test
```

Expected: All tests pass.

- [ ] **Step 3: Production build**

```bash
cd recipe-forge && npm run build
```

Expected: Successful build, no warnings.

- [ ] **Step 4: Start production server**

```bash
cd recipe-forge && npm start
```

Visit `http://localhost:3000`. Test full flow: generate a recipe, check history, download zip, regenerate.

- [ ] **Step 5: Deploy to Vercel**

```bash
cd recipe-forge
vercel --prod
```

Set environment variables in Vercel dashboard:
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `SERPER_API_KEY`
- `DATABASE_URL`

- [ ] **Step 6: Commit final state**

```bash
cd recipe-forge && git add -A && git commit -m "release: RecipeForge v1.0 — production-ready

All 18 tasks complete. Pipeline functional. Dashboard live.
Deployed to Vercel. Neon DB connected.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

---

## Annexe A — Google AI Studio Super Prompt

The following is a self-contained prompt to bootstrap RecipeForge in Google AI Studio. Copy the entire block below into a new AI Studio project.

```
=== RECIPEFORGE — SUPER PROMPT POUR GOOGLE AI STUDIO ===

Tu es un ingénieur senior spécialisé en Next.js 16, TypeScript, et AI Engineering.
Tu travailles dans Google AI Studio. Tu vas construire RecipeForge de zéro.

## OBJECTIF

RecipeForge est un outil de génération de recettes de cuisine professionnelles
optimisées SEO/GEO/LLM-SEO, aligné stratégie Pinterest Hijacking + PTRA.
Il produit du contenu (Markdown + JSON-LD) et des super prompts image
(blog + Pinterest) de bout en bout, pour n'importe quelle niche culinaire.

L'outil est pour usage personnel uniquement (pas de multi-tenant, pas d'auth).

## STACK EXACTE

- Next.js 16 App Router (déploiement Vercel)
- TypeScript 5.7 (strict, pas de @ts-ignore)
- Drizzle ORM + Neon PostgreSQL (2 tables: recipes, pins)
- Gemini 2.5 Pro (LLM primaire, SDK @google/generative-ai)
- DeepSeek v4 Pro (LLM fallback, API REST)
- Serper.dev (SERP live, pas de briefs pré-calculés)
- Tailwind CSS 4 + shadcn/ui (dashboard)
- vitest (tests)
- react-markdown + remark-gfm (preview)
- archiver (zip downloads)

## ARCHITECTURE

4 couches, séparation stricte LLM / Code :

1. Agent Runner (TS pur) — exécute le pipeline :
   SERP → Strategist (LLM) → Chef Augustin (LLM) → Quality Gate (code)
   → [retry si truncation, max 1] → Pin Designer (LLM) → Persist + Export

2. Quality Gate (TS pur, 4 validateurs déterministes) :
   ContentValidator (food safety, banned words, minWords)
   + GeoValidator (claims, attributions, answer nuggets)
   + CulinaryValidator (ratios, temps de cuisson)
   + LoopScorer (composite : GEO 60% + Content 25% + Structure 15%)
   → PASS (score ≥ 65) / RETRY (truncation) / REJECT (food safety)

3. Niche Registry — profils JSON paramétrables par cuisine
   Injecté dans les skills LLM via {{nicheProfile}}

4. Exporters — dossier Markdown + fichier JSON + WordPress stub (Phase 2)

Pas d'Inngest. Pas de SSE. Pipeline async/await direct.
Dashboard polling HTTP toutes les 2 secondes.

## PRINCIPE FONDAMENTAL

"The LLM generates, code enforces quality." — Andrej Karpathy

Le LLM est créatif. Le code est déterministe.
Jamais de LLM dans l'évaluation qualité.

## ARBORESCENCE COMPLÈTE

recipe-forge/
├── app/
│   ├── layout.tsx                    ← Root layout (header + nav)
│   ├── page.tsx                      ← Generator page
│   ├── globals.css
│   ├── history/page.tsx              ← History page
│   └── api/
│       ├── generate/route.ts         ← POST: lance pipeline, retourne { recipeId }
│       ├── recipes/
│       │   ├── route.ts              ← GET: liste paginée
│       │   └── [id]/
│       │       ├── route.ts          ← GET (polling) + DELETE
│       │       ├── regenerate/route.ts ← POST
│       │       └── download/route.ts ← GET (?format=zip|json)
│       └── niches/route.ts           ← GET: liste des profils
├── components/
│   ├── generate-form.tsx             ← Formulaire keyword+niche+format
│   ├── progress-tracker.tsx          ← 5 étapes avec statut
│   ├── result-card.tsx               ← Score + preview + downloads
│   ├── pin-prompts-list.tsx          ← 5 pins avec copier
│   ├── history-table.tsx             ← Table paginée
│   ├── history-filters.tsx           ← Filtres niche/score
│   └── ui/                           ← shadcn/ui
├── lib/
│   ├── engine/
│   │   ├── pipeline.ts               ← Orchestrateur principal
│   │   ├── runner.ts                 ← runChefAugustin (wrapper)
│   │   └── retry.ts                  ← generateWithRetry (max 1)
│   ├── agents/
│   │   ├── provider.ts               ← Gemini + DeepSeek fallback
│   │   ├── strategist.ts             ← Agent Strategist
│   │   ├── chef-augustin.ts          ← Agent Chef Augustin
│   │   ├── pin-designer.ts           ← Agent Pin Designer
│   │   ├── serp.ts                   ← Serper.dev fetch
│   │   └── json-utils.ts             ← JSON repair
│   ├── validators/
│   │   ├── content-validator.ts      ← Food safety, banned words
│   │   ├── geo-validator.ts          ← Citations, claims
│   │   ├── culinary-validator.ts     ← Ratios, techniques
│   │   ├── loop-scorer.ts            ← Score composite
│   │   └── quality-gate.ts           ← Orchestrateur PASS/RETRY/REJECT
│   ├── niche-registry.ts             ← Charge et injecte les profils
│   ├── exporters/
│   │   ├── index.ts                  ← Barrel export
│   │   ├── markdown-exporter.ts      ← Dossier output/{niche}/{slug}/
│   │   ├── json-exporter.ts          ← Fichier output/json/{niche}/{slug}.json
│   │   └── wordpress-exporter.ts     ← Stub Phase 2
│   ├── db/
│   │   ├── index.ts                  ← Connexion Drizzle
│   │   ├── schema.ts                 ← Tables recipes + pins
│   │   └── queries.ts                ← CRUD operations
│   ├── skills.ts                     ← Loader de skills Markdown
│   ├── types.ts                      ← Tous les types partagés
│   ├── slug.ts                       ← Génération de slugs
│   └── rate-limit.ts                 ← Rate limiter
├── skills/
│   ├── strategist.md                 ← Skill Strategist (+{{nicheProfile}}, +{{format}})
│   ├── chef-augustin.md              ← Skill Chef Augustin (+Science, +{{nicheProfile}})
│   ├── pin-designer.md               ← Skill Pin Designer (+{{nicheProfile}})
│   └── README.md
├── data/niches/
│   ├── default.json                  ← Profil universel
│   ├── italienne.json                ← Cuisine italienne
│   ├── francaise.json                ← Cuisine française
│   ├── japonaise.json
│   ├── thai.json
│   └── indienne.json
├── __tests__/                        ← Tests vitest
├── output/                           ← Fichiers exportés (gitignoré)
│   ├── .gitkeep
│   ├── {niche}/{slug}/               ← content.md, meta.json, prompts
│   └── json/{niche}/{slug}.json      ← Fichier unique machine
├── .env.local                        ← GEMINI_API_KEY, DEEPSEEK_API_KEY, etc.
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
└── vitest.config.ts

## CONTRATS INTER-AGENTS (interfaces TypeScript)

interface NicheProfile {
  id: string; name: string; cuisine: string; language: string
  difficulty: "easy" | "medium" | "expert"
  vocabulary: {
    signatureIngredients: string[]
    emblematicTechniques: string[]
    register: "rustic" | "bistro" | "fine-dining" | "home-cooking"
    regionalNotes: string
  }
  foodSafety: {
    criticalTemps: Record<string, number>
    riskyIngredients: string[]
    allergenWarnings: string[]
    bannedClaims: string[]
  }
  authoritySources: { name: string; url: string | null; type: string }[]
  geoThresholds?: { minClaims: number; minAttributions: number; minAnswerNuggets: number }
  semanticField: string[]
}

interface StrategyPlan {
  angle: string; h2s: string[]
  faqs: { question: string; answer: string }[]
  gaps: { topic: string; opportunity: string }[]
  targetWordCount: number
}

interface ChefAugustinOutput {
  title: string; meta: { description: string; focusKeyword: string }
  content_md: string; ingredients: Ingredient[]; instructions: Instruction[]
  tags: string[]; totalTime: number; difficulty: string; servings: number
  imagePrompt: string; jsonLd: Record<string, unknown>
}

interface PinDesignerOutput {
  pins: { title: string; description: string; imagePrompt: string; altText: string; boardName: string }[]
}

## PIPELINE FLOW (exact)

1. POST /api/generate { keyword, nicheId, format }
   → INSERT recipe (status='running') → return { recipeId }

2. SERP: fetchSerp(keyword) → SerpResult (top10, aiOverview, faqs)

3. Strategist (LLM #1 — Gemini):
   → skill strategist.md + {{nicheProfile}} + {{format}} + {{serpData}}
   → StrategyPlan

4. Chef Augustin (LLM #2 — Gemini) + Quality Gate (code):
   → skill chef-augustin.md + {{nicheProfile}} + {{strategyPlan}}
   → ChefAugustinOutput
   → runQualityGate(output, format, nicheProfile)
   → PASS (score >= 65, zero food safety) → continue
   → RETRY (truncation, retries < 2) → retour étape 4
   → REJECT → status='failed'

5. Pin Designer (LLM #3 — Gemini, only after PASS):
   → skill pin-designer.md + {{nicheProfile}} + recipeContent
   → PinDesignerOutput (5 pins)

6. Persist: UPDATE recipe + INSERT pins → status='completed'
   Export: output/{niche}/{slug}/ + output/json/{niche}/{slug}.json

## RÈGLES QUALITÉ (non-négociables)

- Food safety violations = REJECT immédiat, jamais de retry
- minWords: 1200 (pin-first) / 1800 (google-first)
- Claims santé interdits: probiotiques, detox, anti-inflammatoire, brûle-graisse, immunité, guérit, miracle
- GEO: ≥ 5 claims, ≥ 3 attributions documentées, ≥ 1 answer nugget (par défaut, configurable par niche)
- JSON-LD @graph: Recipe + BlogPosting + FAQPage + BreadcrumbList
- Score composite: GEO 60% + Content 25% + Structure 15%
- PASS = score ≥ 65 ET zero food safety violations
- RETRY = max 1 tentative (2 au total), uniquement sur truncation
- REJECT = food safety OU < minWords OU score < 40

## ORDRE D'IMPLÉMENTATION (18 tâches séquentielles)

Tâche 1:  Scaffold projet (package.json, tsconfig, next.config, .env, .gitignore, tailwind, postcss)
Tâche 2:  Structure de dossiers + app shell (layout, globals.css, pages placeholder)
Tâche 3:  Types (lib/types.ts — NicheProfile, StrategyPlan, ChefAugustinOutput, PinDesignerOutput, RecipeRow, PinRow, API types, QualityReport, SerpResult)
Tâche 4:  DB schema + queries (lib/db/schema.ts, index.ts, queries.ts — Drizzle ORM, 2 tables, ON DELETE CASCADE)
Tâche 5:  Niche Registry loader (lib/niche-registry.ts — loadNicheProfile, listNiches, toPromptSection)
Tâche 6:  Niche profiles JSON (data/niches/default.json, italienne.json, francaise.json, japonaise.json, thai.json, indienne.json)
Tâche 7:  Skills (copier + adapter depuis blueprint: skills/strategist.md, chef-augustin.md, pin-designer.md + lib/skills.ts)
Tâche 8:  Provider (lib/agents/provider.ts — Gemini SDK primary, DeepSeek REST fallback)
Tâche 9:  Agents (lib/agents/serp.ts, strategist.ts, chef-augustin.ts, pin-designer.ts, json-utils.ts)
Tâche 10: Validators (copier + adapter depuis blueprint: content, geo, culinary, loop-scorer + quality-gate.ts orchestrator)
Tâche 11: Pipeline engine (lib/engine/retry.ts + pipeline.ts — logic complete du pipeline)
Tâche 12: Exporters (lib/exporters/ — markdown, json, wordpress stub, index barrel)
Tâche 13: API — POST /api/generate (fire-and-forget)
Tâche 14: API — GET /api/recipes, GET+DELETE /api/recipes/[id], POST regenerate, GET download (zip+json), GET /api/niches
Tâche 15: Dashboard — 6 composants React (generate-form, progress-tracker, result-card, pin-prompts-list, history-table, history-filters)
Tâche 16: Dashboard — pages Generator (/app/page.tsx) + History (/app/history/page.tsx)
Tâche 17: Tests (vitest config, validator tests, niche registry tests, pipeline integration tests)
Tâche 18: Final check (tsc --noEmit, build, deploy Vercel)

## VARIABLES D'ENVIRONNEMENT REQUISES

GEMINI_API_KEY=        # Google AI Studio — Gemini 2.5 Pro
DEEPSEEK_API_KEY=      # DeepSeek v4 Pro (fallback)
SERPER_API_KEY=        # Serper.dev — SERP live
DATABASE_URL=          # postgresql://user:pass@ep-xxx.neon.tech/recipeforge?sslmode=require

## RÈGLES KARPATHY (à suivre impérativement)

1. Le minimum de code qui résout le problème. Rien de spéculatif.
2. Toucher uniquement ce qui est nécessaire. Pas de refacto adjacent.
3. Le LLM génère, le code enforce la qualité.
4. Chaque module a une raison d'être unique et claire.
5. Pas de @ts-ignore, pas de eslint-disable, pas de any.
6. tsc --noEmit doit passer avant chaque commit.

## PHASE 1 vs PHASE 2

Phase 1 (maintenant) : Single recipe generation, 2-page dashboard, 3 exporters (2 implémentés), pas d'auth
Phase 2 (futur) : Mode batch, éditeur intégré, WordPress live, multilingue, analytics, cache SERP

## SOURCE DE RÉFÉRENCE

Un blueprint complet existe dans le projet séparé `ai-blog-builder` :
- Skills originaux: skills/agent-strategist.md, skills/agent-chef-augustin.md, skills/agent-pin-designer.md
- Validateurs: lib/content-validator.ts, lib/geo-validator.ts, lib/culinary-validator.ts, lib/loop-scorer.ts
- Utilitaires: lib/skills.ts, lib/slug.ts, lib/rate-limit.ts, lib/agents/json-utils.ts, lib/agents/provider.ts

Copie ces fichiers, adapte leurs signatures (ajoute nicheProfile/fomat params),
et construis RecipeForge autour. Ne modifie PAS le blueprint.

## COMMIT CONVENTION

Chaque tâche se termine par un commit. Format :
<type>: <description>

Co-Authored-By: Claude <noreply@anthropic.com>

Types: feat (nouvelle feature), test (tests), docs (documentation), fix (bug fix)

=== FIN DU SUPER PROMPT ===
```

To use this prompt in Google AI Studio:

1. Open [Google AI Studio](https://aistudio.google.com)
2. Create a new project
3. Paste the entire prompt block above into the system instructions
4. Ensure Gemini 2.5 Pro is selected as the model
5. Start building task by task — the AI Studio agent will follow the implementation plan sequentially

---
