# Super Prompt — JSON-LD + GEO + Quality Gates (Prompt #2 — Couches 3/4/5)

> **Donne ce prompt à Claude Code dans le dossier du projet v0 corrigé.**
> Contexte : le front-end visuel est terminé et audité (score 90/100). Il manque les couches techniques :
> - JSON-LD structured data (SEO Schema.org)
> - GEO/LLM optimization (llm.txt, raw API, AI crawler bots)
> - Content Quality Gates (validateurs déterministes)

---

## Partie 1 — JSON-LD Structured Data (4 composants)

### 1.1 RecipeJsonLd — @graph pour les pages recette

**Créer `components/recipe-jsonld.tsx` :**

```typescript
type RecipeData = {
  title: string
  slug: string
  metaDescription?: string | null
  excerpt?: string | null
  heroImageUrl?: string | null
  publishedAt?: Date | null
  servings?: string | null
  tags?: string[] | null
  ingredients?: { name: string; quantity?: string }[] | null
  instructions?: { step: number; text: string }[] | null
  jsonLd?: unknown
}

export function RecipeJsonLd({ recipe }: { recipe: RecipeData }) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  const base = (recipe.jsonLd as Record<string, unknown>) ?? {}

  // v5.2+ pipeline: @graph container with Recipe + BlogPosting + FAQPage + BreadcrumbList
  if (base["@graph"] && Array.isArray(base["@graph"])) {
    const graph = base["@graph"] as Record<string, unknown>[]
    const enrichedGraph = graph.map((node) => {
      if (node["@type"] === "BlogPosting") {
        return {
          ...node,
          mainEntity: { "@id": "#recipe" },
          publisher: {
            "@type": "Organization",
            name: "Chef Augustin",
            url: SITE,
          },
        }
      }
      if (node["@type"] === "Recipe") {
        return {
          ...node,
          "@id": "#recipe",
          name: recipe.title,
          description: recipe.metaDescription || recipe.excerpt || undefined,
          image: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
          datePublished: recipe.publishedAt?.toISOString(),
          recipeYield: recipe.servings || node.recipeYield || undefined,
          keywords: (recipe.tags ?? []).join(", "),
          recipeIngredient: (recipe.ingredients ?? []).map((i) =>
            [i.quantity, i.name].filter(Boolean).join(" ")
          ),
          recipeInstructions: (recipe.instructions ?? []).map((s) => ({
            "@type": "HowToStep",
            position: s.step,
            text: s.text,
          })),
        }
      }
      return node
    })

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": enrichedGraph,
          }),
        }}
      />
    )
  }

  // Legacy fallback: flat Recipe object
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: recipe.title,
          description: recipe.metaDescription || recipe.excerpt || undefined,
          image: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
          datePublished: recipe.publishedAt?.toISOString(),
          author: {
            "@type": "Person",
            name: "Chef Augustin Lefèvre",
          },
          recipeYield: recipe.servings || undefined,
          keywords: (recipe.tags ?? []).join(", "),
          recipeIngredient: (recipe.ingredients ?? []).map((i) =>
            [i.quantity, i.name].filter(Boolean).join(" ")
          ),
          recipeInstructions: (recipe.instructions ?? []).map((s) => ({
            "@type": "HowToStep",
            position: s.step,
            text: s.text,
          })),
        }),
      }}
    />
  )
}
```

**Intégrer dans `app/recettes/[slug]/page.tsx` :**

Ajouter l'import et placer `<RecipeJsonLd recipe={recipe} />` juste avant `</div>` (avant la fermeture du container principal), au même niveau que `<SiteFooter />`.

### 1.2 ArticleJsonLd — @graph pour les pages article

**Créer `components/article-jsonld.tsx` :**

```typescript
type ArticleData = {
  title: string
  slug: string
  category?: string | null
  metaDescription?: string | null
  excerpt?: string | null
  heroImageUrl?: string | null
  publishedAt?: Date | null
  updatedAt?: Date | null
  jsonLd?: unknown
}

const CATEGORY_LABELS: Record<string, string> = {
  techniques: "Techniques",
  guides: "Guides",
  histoire: "Histoire",
  equipement: "Équipement",
  idees: "Idées",
}

export function ArticleJsonLd({ article }: { article: ArticleData }) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  const base = (article.jsonLd as Record<string, unknown>) ?? {}
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Blog"

  if (base["@graph"] && Array.isArray(base["@graph"])) {
    const graph = base["@graph"] as Record<string, unknown>[]
    const enrichedGraph = graph.map((node) => {
      const type = node["@type"] as string | undefined
      if (type === "Article" || type === "BlogPosting") {
        return {
          ...node,
          headline: article.title,
          description: article.metaDescription || article.excerpt || node.description,
          image: article.heroImageUrl || node.image,
          datePublished: article.publishedAt?.toISOString() || node.datePublished,
          dateModified: article.updatedAt?.toISOString() || node.dateModified,
          author: node.author ?? { "@type": "Person", name: "Chef Augustin Lefevre" },
          publisher: node.publisher ?? { "@type": "Organization", name: "Chef Augustin", url: SITE },
        }
      }
      return node
    })

    const hasBreadcrumb = enrichedGraph.some((n) => n["@type"] === "BreadcrumbList")
    const finalGraph = hasBreadcrumb
      ? enrichedGraph
      : [
          ...enrichedGraph,
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: categoryLabel, item: `${SITE}/${article.category}` },
              { "@type": "ListItem", position: 3, name: article.title },
            ],
          },
        ]

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ "@context": "https://schema.org", "@graph": finalGraph }),
        }}
      />
    )
  }

  // Legacy fallback
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: article.title,
              description: article.metaDescription || article.excerpt,
              author: { "@type": "Person", name: "Chef Augustin Lefevre" },
              datePublished: article.publishedAt?.toISOString(),
              image: article.heroImageUrl,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                { "@type": "ListItem", position: 2, name: categoryLabel, item: `${SITE}/${article.category}` },
                { "@type": "ListItem", position: 3, name: article.title },
              ],
            },
          ],
        }),
      }}
    />
  )
}
```

**Intégrer dans `app/[category]/[slug]/page.tsx`** avec `<ArticleJsonLd article={article} />`.

### 1.3 HomepageJsonLd — Organization + WebSite + SearchAction

**Créer `components/homepage-jsonld.tsx` :**

```typescript
export function HomepageJsonLd() {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Chef Augustin",
            url: SITE,
            logo: `${SITE}/hero-kitchen.png`,
            description:
              "Chef Augustin Lefevre shares practical small-batch dinner recipes for two.",
            sameAs: [
              "https://www.instagram.com/chefaugustin",
              "https://www.pinterest.com/chefaugustin",
              "https://www.youtube.com/@chefaugustin",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Chef Augustin",
            url: SITE,
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE}/recettes?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
        ]),
      }}
    />
  )
}
```

**Intégrer dans `app/page.tsx`** avec `<HomepageJsonLd />` avant `</div>`.

### 1.4 BreadcrumbJsonLd — intégré dans le composant Breadcrumbs

**Modifier `components/breadcrumbs.tsx`** pour ajouter le JSON-LD inline :

```typescript
"use client" // ou garder en server component si les crumbs sont passés en props

import Link from "next/link"
import { ChevronRight } from "lucide-react"

type Crumb = { label: string; href: string }

function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: crumb.label,
            item: `${SITE}${crumb.href}`,
          })),
        }),
      }}
    />
  )
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-4 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : null}
                {isLast ? (
                  <span className="font-medium text-foreground" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      <BreadcrumbJsonLd crumbs={crumbs} />
    </>
  )
}
```

---

## Partie 2 — GEO & LLM Optimization (3 fichiers)

### 2.1 Créer `app/llm.txt/route.ts`

```typescript
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"

export async function GET() {
  const content = `# Chef Augustin — LLM Guide

## About
Chef Augustin is a Pinterest-first recipe blog focused on Easy Weeknight Dinners for Two.
Small-batch dinner recipes designed for two people — one-pan meals, quick pastas,
mini slow cooker recipes, budget-friendly options. Content spans 5 clusters:
Slow Cooker, One-Pan Dinners, Budget Meals, Chicken Dinners, Asian-Inspired.

## Site Structure
- Homepage: ${SITE}/
- All recipes: ${SITE}/recettes
- XML Sitemap: ${SITE}/sitemap.xml
- Raw data API: ${SITE}/api/recipes/raw

## Content Types
Structured recipes with SEO metadata, precise ingredients, step-by-step instructions,
AI-generated food photography, and JSON-LD structured data (Schema.org Recipe + BlogPosting + FAQPage + BreadcrumbList).

## For LLMs
- All recipes (JSON): ${SITE}/api/recipes/raw
- Individual recipe (JSON + Markdown): ${SITE}/api/recipes/raw/[slug]

---
Last updated: ${new Date().toISOString().split("T")[0]}
Generated by Chef Augustin — ${SITE}
`

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
```

### 2.2 Créer `app/api/recipes/raw/route.ts`

```typescript
import { NextResponse } from "next/server"
import { getAllRecipes } from "@/lib/recipes" // ← adapter à ta source de données

export const dynamic = "force-dynamic"

export async function GET() {
  const all = getAllRecipes() // ← remplacer par la vraie query DB plus tard

  const raw = all.map((recipe) => ({
    slug: recipe.slug,
    title: recipe.title,
    excerpt: recipe.excerpt,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    contentMarkdown: recipe.contentMarkdown ?? null,
    imageUrl: recipe.heroImageUrl ?? null,
    publishedAt: recipe.publishedAt ?? null,
  }))

  return NextResponse.json(raw, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
```

### 2.3 Créer `app/api/recipes/raw/[slug]/route.ts`

```typescript
import { NextResponse } from "next/server"
import { getRecipeBySlug } from "@/lib/recipes" // ← adapter à ta source de données

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const recipe = getRecipeBySlug(slug) // ← remplacer par la vraie query DB plus tard

  if (!recipe) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.json({
    slug: recipe.slug,
    title: recipe.title,
    metaTitle: recipe.metaTitle ?? null,
    metaDescription: recipe.metaDescription ?? null,
    excerpt: recipe.excerpt ?? null,
    contentMarkdown: recipe.contentMarkdown ?? null,
    heroImageUrl: recipe.heroImageUrl ?? null,
    tags: recipe.tags ?? [],
    prepTime: recipe.prepTime ?? null,
    cookTime: recipe.cookTime ?? null,
    totalTime: recipe.totalTime ?? null,
    servings: recipe.servings ?? null,
    difficulty: recipe.difficulty ?? null,
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    publishedAt: recipe.publishedAt ?? null,
  })
}
```

### 2.4 Ajouter le rewrite llms.txt dans `next.config.mjs`

Dans le bloc `rewrites` (ou le créer si absent) :

```javascript
async rewrites() {
  return [
    {
      source: "/llms.txt",
      destination: "/llm.txt",
    },
  ]
},
```

---

## Partie 3 — Content Quality Gates (4 validateurs)

Ces fichiers sont des fonctions pures — pas d'API, pas de DB. Ils seront utilisés plus tard par le pipeline Inngest.

### 3.1 Créer `lib/content-validator.ts`

```typescript
// ContentValidator — Deterministic pre-publication quality checks.
// Pure functions — no API calls, no DB access, no side effects.

const BANNED_WORDS_TIER1 = [
  "delve", "dive into", "unlock", "unleash", "elevate", "transform",
  "embark", "journey", "in today's world", "it's worth noting that",
  "moreover", "furthermore", "robust", "holistic", "paradigm", "synergy",
  "game-changer", "leverage", "utilize", "nestled",
  "bursting with flavor", "melts in your mouth",
]

const INTERNAL_TOKENS = [
  "[WARM]", "[SHARP]", "[WINK]", "[GRIT]", "[GLOW]",
  "<!--WARM-->", "<!--SHARP-->", "<!--WINK-->", "<!--GRIT-->", "<!--GLOW-->",
]

const HEALTH_CLAIM_PATTERNS = [
  /\bprobiotics?\b/i,
  /\bimproves?\s+digest(?:ion|ibility)\b/i,
  /\b(gut|digestive)\s+health\b/i,
  /\b(boosts?|strengthens?)\s+(the\s+)?immune\s+system\b/i,
  /\bdetox(?:ifying|es)?\b/i,
  /\banti-?inflammatory\b/i,
  /\bfat-?burning\b/i,
  /\blowers?\s+(blood\s+pressure|cholesterol)\b/i,
  /\bprevents?\s+(cancer|heart\s+disease|diabetes)\b/i,
]

export interface ValidationError {
  field: string
  severity: "error" | "warning"
  message: string
}

export interface ValidationResult {
  passed: boolean
  errors: ValidationError[]
}

export interface ValidatableDraft {
  contentMarkdown?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  title?: string | null
  ingredients?: { name: string; quantity?: string }[] | null
  instructions?: { step: number; text: string }[] | null
  contentType?: string | null
  format?: "google" | "pin-first"
}

export function validateContent(draft: ValidatableDraft): ValidationResult {
  const errors: ValidationError[] = []
  const md = draft.contentMarkdown ?? ""

  // 1. Banned vocabulary
  for (const word of BANNED_WORDS_TIER1) {
    if (md.toLowerCase().includes(word.toLowerCase())) {
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Banned word (Tier 1) found: "${word}"`,
      })
    }
  }

  // 2. Internal token leak
  for (const token of INTERNAL_TOKENS) {
    if (md.includes(token)) {
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Internal vibe token leaked: ${token}`,
      })
    }
  }

  // 3. Word count
  const wordCount = md.split(/\s+/).filter(Boolean).length
  const minWords = draft.format === "pin-first" ? 800 : 1200
  const warnWords = draft.format === "pin-first" ? 1000 : 1500
  if (wordCount < minWords) {
    errors.push({
      field: "contentMarkdown",
      severity: "error",
      message: `Content too short: ${wordCount} words (min: ${minWords})`,
    })
  } else if (wordCount < warnWords) {
    errors.push({
      field: "contentMarkdown",
      severity: "warning",
      message: `Content below target: ${wordCount} words (target: ${warnWords}+)`,
    })
  }

  // 4. Title
  if (!draft.title?.trim()) {
    errors.push({ field: "title", severity: "error", message: "Title is empty" })
  }

  // 5. Meta length
  if (draft.metaTitle && draft.metaTitle.length > 60) {
    errors.push({
      field: "metaTitle",
      severity: "warning",
      message: `Meta title too long: ${draft.metaTitle.length} chars (max: 60)`,
    })
  }
  if (draft.metaDescription) {
    if (draft.metaDescription.length < 120) {
      errors.push({
        field: "metaDescription",
        severity: "warning",
        message: `Meta description too short: ${draft.metaDescription.length} chars (min: 120)`,
      })
    }
    if (draft.metaDescription.length > 160) {
      errors.push({
        field: "metaDescription",
        severity: "warning",
        message: `Meta description too long: ${draft.metaDescription.length} chars (max: 160)`,
      })
    }
  }

  // 6. Health claims
  for (const pattern of HEALTH_CLAIM_PATTERNS) {
    if (pattern.test(md)) {
      const match = md.match(pattern)?.[0] ?? ""
      errors.push({
        field: "contentMarkdown",
        severity: "error",
        message: `Unsourced health claim: "${match}". Cite a source or remove.`,
      })
    }
  }

  // 7. Recipe-only checks
  const isRecipe = !draft.contentType || draft.contentType === "recipe"
  if (isRecipe) {
    if (!draft.ingredients?.length) {
      errors.push({ field: "ingredients", severity: "error", message: "No ingredients" })
    }
    if (!draft.instructions?.length) {
      errors.push({ field: "instructions", severity: "error", message: "No instructions" })
    }
  }

  const criticalErrors = errors.filter((e) => e.severity === "error")
  return { passed: criticalErrors.length === 0, errors }
}
```

### 3.2 Créer `lib/geo-validator.ts`

```typescript
// GEO Validator — Deterministic citation-quality scoring.
// Pure functions — no API calls, no DB access, no side effects.

export type CitabilityReport = {
  score: number
  claims: { count: number; minRequired: number; matches: string[] }
  attributions: { count: number; minRequired: number; matches: string[] }
  nuggets: { count: number; minRequired: number; matches: string[] }
  passed: boolean
  feedback: string
}

const CLAIM_PATTERNS = [
  { name: "numberedFact", regex: /\b(\d{2,4}°[FC]|\d{1,3}\s*(minutes?|mins?|hours?|grams?|ounces?|cups?|tablespoons?|teaspoons?|lbs?|pounds?|ml|liters?|cm|inches?)\b|\d+:\d+\s*ratio|\d{1,3}%\s*(less|more|moisture|tender|fat|protein))/gi },
  { name: "quantifiedComparison", regex: /\b(unlike|compared to|instead of|rather than|vs\.?)\s+(most|other|traditional|standard|typical)\s[^.!?]*\d+/gi },
  { name: "causalClaim", regex: /\b(because|which creates|which means|resulting in|preventing|ensuring|this (is why|allows|keeps|prevents|creates|makes))\b/gi },
]

const ATTRIBUTION_PATTERNS = [
  { name: "namedAuthority", regex: /Chef Augustin( Lefèvre)?\s+(recommends?|suggests?|advises?|notes?|explains?|insists?|prefers?|swears?\sby|teaches?)/gi },
  { name: "firstPersonTesting", regex: /I(?:'ve|\shave)\s+(tested|tried|experimented|made|cooked|baked)\s[^.!?]*\d+/gi },
  { name: "testingClaim", regex: /\b(tested|tried|experimented with)\s[^.!?]*\b(\d+|dozens?|multiple|several|many)\s+(times|batches|ways|temperatures|methods|variations)/gi },
  { name: "personalRecommendation", regex: /\b(my\s+(go-to|favorite|preferred|recommended|trusted)|I\s+(swear by|recommend|prefer|always (use|reach for)|never (skip|use)))/gi },
  { name: "causalAttribution", regex: /\b(based on\s+(my\s+)?(testing|experience|experiments|research)|according to\s+(culinary\s+)?(tradition|science|research)|from\s+(my\s+)?(testing|experience|kitchen))/gi },
  { name: "externalAuthority", regex: /\b(according to|per|as)\s+(the\s+)?(USDA|FDA|American Society|National Center|King Arthur|Serious Eats|America'?s Test Kitchen|Modernist Cuisine|Harold McGee|J\.?\s?Kenji|University of|Institute of)[^.!?\n]{20,120}/gi },
  { name: "externalStudy", regex: /\b(the\s+)?(USDA|FDA|American Society|National Center|King Arthur|Serious Eats|America'?s Test Kitchen|Modernist Cuisine|McGee|López-Alt|Myhrvold|University of|Institute of)\s+(found|shows?|explains?|notes?|recommends?|confirms?|demonstrates?|measured|tested)\b/gi },
]

function extractMatches(regex: RegExp, text: string): string[] {
  const seen = new Set<string>()
  const matches: string[] = []
  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const trimmed = match[0].trim().substring(0, 120)
    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      matches.push(trimmed)
    }
  }
  return matches
}

function countAnswerNuggets(markdown: string): { count: number; matches: string[] } {
  const matches: string[] = []
  const lines = markdown.split("\n")
  const headingRegex = /^##\s+.+\?$/
  const numberRegex = /\d/
  const entityRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!headingRegex.test(line)) continue
    const blockLines: string[] = []
    let j = i + 1
    while (j < lines.length) {
      const nextLine = lines[j]
      if (/^#{1,3}\s/.test(nextLine)) break
      if (nextLine.trim() === "" && j + 1 < lines.length && lines[j + 1].trim() === "") break
      if (nextLine.trim()) blockLines.push(nextLine.trim())
      j++
    }
    const block = blockLines.join(" ")
    const wordCount = block.split(/\s+/).filter(Boolean).length
    if (wordCount >= 25 && wordCount <= 120 && (numberRegex.test(block) || entityRegex.test(block))) {
      const preview = block.substring(0, 100).trim() + (block.length > 100 ? "…" : "")
      matches.push(`[${line.replace(/^##\s+/, "")}] ${preview}`)
    }
  }
  return { count: matches.length, matches }
}

export function checkCitability(markdown: string, wordCount: number): CitabilityReport {
  const allClaimMatches: string[] = []
  for (const pattern of CLAIM_PATTERNS) {
    allClaimMatches.push(...extractMatches(pattern.regex, markdown))
  }
  const allAttrMatches: string[] = []
  for (const pattern of ATTRIBUTION_PATTERNS) {
    allAttrMatches.push(...extractMatches(pattern.regex, markdown))
  }
  const nuggets = countAnswerNuggets(markdown)

  const claimsCount = allClaimMatches.length
  const attributionsCount = allAttrMatches.length
  const nuggetsCount = nuggets.count
  const minClaims = 6, minAttributions = 2, minNuggets = 4

  const claimsScore = Math.min(claimsCount / minClaims, 1) * 100
  const attributionsScore = Math.min(attributionsCount / minAttributions, 1) * 100
  const nuggetsScore = Math.min(nuggetsCount / minNuggets, 1) * 100
  const densityScore = wordCount > 0
    ? Math.min((claimsCount + attributionsCount + nuggetsCount) / wordCount * 1000 / 3, 1) * 100
    : 0

  const score = Math.round(claimsScore * 0.4 + attributionsScore * 0.25 + nuggetsScore * 0.2 + densityScore * 0.15)
  const passed = score >= 60

  let feedback: string
  if (score >= 70) {
    feedback = `Strong citability (${score}/100). Claims: ${claimsCount}, Attributions: ${attributionsCount}, Nuggets: ${nuggetsCount}.`
  } else if (score >= 60) {
    feedback = `Marginal citability (${score}/100).`
  } else {
    feedback = `Low citability (${score}/100). Needs more claims/attributions/nuggets.`
  }

  return {
    score,
    claims: { count: claimsCount, minRequired: minClaims, matches: allClaimMatches.slice(0, 10) },
    attributions: { count: attributionsCount, minRequired: minAttributions, matches: allAttrMatches.slice(0, 10) },
    nuggets: { count: nuggetsCount, minRequired: minNuggets, matches: nuggets.matches.slice(0, 10) },
    passed,
    feedback,
  }
}
```

### 3.3 Créer `lib/loop-scorer.ts`

```typescript
// Loop Scorer — Composite quality scoring for the Quality Gate.
// Pure functions — no side effects, no API calls, no DB access.

import type { CitabilityReport } from "@/lib/geo-validator"
import type { ValidationResult } from "@/lib/content-validator"

export interface LoopScore {
  total: number
  geoComponent: number
  contentComponent: number
  structureComponent: number
  breakdown: string
}

export function computeLoopScore(
  citability: CitabilityReport,
  validation: ValidationResult,
): LoopScore {
  const geoComponent = Math.round(citability.score * 0.6)
  const errorCount = validation.errors.filter((e) => e.severity === "error").length
  const warnCount = validation.errors.filter((e) => e.severity === "warning").length
  const contentRaw = Math.max(0, 100 - errorCount * 15 - warnCount * 5)
  const contentComponent = Math.round(contentRaw * 0.25)
  const structureRaw = errorCount === 0 ? 100 : Math.max(0, 100 - errorCount * 10)
  const structureComponent = Math.round(structureRaw * 0.15)
  const total = geoComponent + contentComponent + structureComponent

  const breakdown =
    `GEO:${citability.score}/100→${geoComponent} ` +
    `Content:${contentRaw}/100→${contentComponent} ` +
    `Structure:${structureRaw}/100→${structureComponent} ` +
    `= ${total}/100`

  return { total, geoComponent, contentComponent, structureComponent, breakdown }
}
```

---

## Validation

```bash
npx tsc --noEmit     # Doit passer
npm run build        # Doit réussir

# Vérifier les nouveaux endpoints
curl localhost:3000/llm.txt → 200 (text/plain)
curl localhost:3000/llms.txt → 200 (redirigé vers /llm.txt)
curl localhost:3000/api/recipes/raw → 200 (JSON array)
curl localhost:3000/api/recipes/raw/test-slug → 200 (JSON object)

# Vérifier le JSON-LD dans les pages
curl -s localhost:3000 | grep "application/ld+json"   # Homepage: Organization + WebSite
curl -s localhost:3000/recettes/test | grep "application/ld+json"  # Recipe: @graph
```

---

## Fichiers créés/modifiés — Résumé

| Fichier | Action | Partie |
|---|---|---|
| `components/recipe-jsonld.tsx` | Créer | JSON-LD |
| `components/article-jsonld.tsx` | Créer | JSON-LD |
| `components/homepage-jsonld.tsx` | Créer | JSON-LD |
| `components/breadcrumbs.tsx` | Modifier (ajout JSON-LD inline) | JSON-LD |
| `app/recettes/[slug]/page.tsx` | Modifier (intégrer RecipeJsonLd) | JSON-LD |
| `app/[category]/[slug]/page.tsx` | Modifier (intégrer ArticleJsonLd) | JSON-LD |
| `app/page.tsx` | Modifier (intégrer HomepageJsonLd) | JSON-LD |
| `app/llm.txt/route.ts` | Créer | GEO |
| `app/api/recipes/raw/route.ts` | Créer | GEO |
| `app/api/recipes/raw/[slug]/route.ts` | Créer | GEO |
| `next.config.mjs` | Modifier (rewrite llms.txt) | GEO |
| `lib/content-validator.ts` | Créer | Quality Gates |
| `lib/geo-validator.ts` | Créer | Quality Gates |
| `lib/loop-scorer.ts` | Créer | Quality Gates |

**Total : 10 créations, 4 modifications, 14 fichiers.**
