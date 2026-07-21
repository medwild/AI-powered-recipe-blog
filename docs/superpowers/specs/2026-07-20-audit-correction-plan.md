# Super Prompt — Correction Post-Audit Frontend Chef Augustin

> **Donne ce prompt à Claude Code dans le dossier du projet v0.**
> Contexte : un audit complet a été réalisé (rapport ci-dessous). Ce prompt liste toutes les corrections à appliquer, groupées par lot, avec le code exact à implémenter.

---

## Résumé de l'audit — Score 66/100

| Critère | Score |
|---|---|
| Composants | 19/25 |
| Pages | 18/20 |
| Design System | 19/25 |
| Architecture | 7/15 🔴 |
| SEO | 3/15 🔴 |

**14 CRITICAL, 10 WARNINGS, 5 INFO** identifiés.

---

## Lot 1 — Architecture & Routing (6 corrections CRITICAL)

### 1.1 Renommer proxy.ts → middleware.ts

```bash
mv proxy.ts middleware.ts
```

Puis remplacer le contenu par :

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_PATHS = ["/dashboard"]
const AUTH_COOKIE = "dashboard_auth"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()
  const cookie = req.cookies.get(AUTH_COOKIE)
  const expectedToken = process.env.DASHBOARD_SECRET_TOKEN
  if (!expectedToken) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (cookie?.value === expectedToken) {
    return NextResponse.next()
  }
  return NextResponse.redirect(new URL("/login", req.url))
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
```

### 1.2 Créer les pages manquantes pour la navigation

Le `SiteHeader` a des liens vers `/techniques`, `/guides`, `/about`, `/studio`. Créer des pages placeholder pour éviter les 404 :

**Créer `app/techniques/page.tsx` :**
```typescript
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Techniques",
  description: "French cooking techniques explained step by step.",
  alternates: { canonical: "/techniques" },
}

export default function TechniquesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <h1 className="font-serif text-4xl">Techniques</h1>
        <p className="mt-4 text-muted-foreground">Coming soon — cooking techniques articles.</p>
      </main>
      <SiteFooter />
    </div>
  )
}
```

**Créer `app/guides/page.tsx`** — même structure, titre "Guides", description "Cooking guides and reference articles."

**Créer `app/about/page.tsx`** — même structure, titre "About Chef Augustin", description "French-trained chef sharing practical recipes for two."

**Créer `app/dashboard/page.tsx` :**
```typescript
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Studio — protected area.</p>
    </div>
  )
}
```

### 1.3 Créer la route article `app/[category]/[slug]/page.tsx`

⚠️ **ATTENTION** : Ceci est une route catch-all TEMPORAIRE pour éviter les 404 sur les ArticleCards existants. La spec interdit les catch-all en production — cette route sera remplacée par des routes explicites (`app/techniques/[slug]`, `app/guides/[slug]`, etc.) quand les articles seront créés.

```typescript
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ArticleCard } from "@/components/article-card"

const VALID_CATEGORIES = ["techniques", "guides", "histoire", "equipement", "idees"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const { category } = await params
  if (!VALID_CATEGORIES.includes(category)) return { title: "Not found" }
  return {
    title: "Article",
    alternates: { canonical: `/${category}/${params}` },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}) {
  const { category } = await params
  if (!VALID_CATEGORIES.includes(category)) notFound()
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <p className="text-muted-foreground">Article coming soon.</p>
      </main>
      <SiteFooter />
    </div>
  )
}
```

### 1.4 Ajouter metadataBase dans `app/layout.tsx`

Trouver le bloc `metadata` et ajouter :

```typescript
export const metadata: Metadata = {
  // ... existing fields ...
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  ),
  // ... rest of existing fields ...
}
```

Supprimer aussi la ligne `generator: 'v0.app'` du metadata.

### 1.5 Ajouter generateMetadata sur `app/page.tsx`

```typescript
import type { Metadata } from "next"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}
```

### 1.6 Corriger le routing ArticleCard

Dans `components/article-card.tsx`, vérifier que le href est dynamique :

```typescript
<Link
  href={`/${article.category ?? "techniques"}/${article.slug}`}
  // ...
>
```

---

## Lot 2 — SEO Foundation (5 corrections CRITICAL)

### 2.1 Créer `app/sitemap.ts`

```typescript
import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/recettes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/techniques`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ]
}
```

### 2.2 Créer `app/robots.ts`

```typescript
import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/"],
      },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

### 2.3 Ajouter `<time dateTime>` dans `ArticleCard`

Remplacer la date hardcodée par :

```typescript
{article.publishedAt ? (
  <time
    dateTime={new Date(article.publishedAt).toISOString()}
    className="mt-auto pt-2 text-xs text-muted-foreground"
  >
    {new Date(article.publishedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}
  </time>
) : null}
```

### 2.4 Ajouter canonical dans les pages existantes

Dans `app/recettes/page.tsx`, ajouter au `generateMetadata` :

```typescript
alternates: { canonical: "/recettes" },
```

Dans `app/recettes/[slug]/page.tsx`, ajouter au `generateMetadata` :

```typescript
alternates: { canonical: `/recettes/${recipe.slug}` },
```

### 2.5 Nettoyer `app/layout.tsx` — supprimer v0

Supprimer la ligne :
```typescript
generator: 'v0.app',  // ← À SUPPRIMER
```

---

## Lot 3 — Component Fixes (5 corrections)

### 3.1 Créer `components/theme-toggle.tsx` standalone

```typescript
"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary transition-colors"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}
```

Puis dans `components/site-header.tsx`, remplacer le ThemeToggle inline par :

```typescript
import { ThemeToggle } from "@/components/theme-toggle"
// ... et utiliser <ThemeToggle /> au lieu du code inline
```

### 3.2 Fix RecipeInstructions — number circles

Dans `components/recipe-instructions.tsx`, trouver les cercles de chiffres et remplacer `bg-foreground` par `bg-primary text-primary-foreground` :

```typescript
<span
  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
  aria-hidden="true"
>
  {step.step}
</span>
```

### 3.3 Ajouter react-markdown dans RecipeArticleBody

```bash
npm install react-markdown remark-gfm
```

Puis remplacer le contenu hardcodé de `components/recipe-article-body.tsx` par :

```typescript
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function RecipeArticleBody({
  contentMarkdown,
}: {
  contentMarkdown: string | null
}) {
  if (!contentMarkdown) return null

  return (
    <section
      id="article-body"
      aria-labelledby="article-body-heading"
      className="mx-auto max-w-3xl px-4 pt-12 scroll-mt-20"
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
            a: ({ node: _node, ...props }) => (
              <a className="text-primary underline hover:text-primary/80" {...props} />
            ),
            blockquote: ({ node: _node, ...props }) => (
              <blockquote className="border-l-4 border-primary/40 pl-5 italic my-4 text-muted-foreground" {...props} />
            ),
          }}
        >
          {contentMarkdown}
        </ReactMarkdown>
      </div>
    </section>
  )
}
```

### 3.4 Ajouter prose-neutral dans RecipeArticleBody

Voir la correction 3.3 ci-dessus — `prose-neutral` est inclus dans les classes.

### 3.5 Fix checkboxes border-2 dans RecipeIngredients

Dans `components/recipe-ingredients.tsx`, remplacer `border` par `border-2` sur les checkboxes :

```typescript
<span
  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
    checked
      ? "border-primary bg-primary text-primary-foreground"
      : "border-muted-foreground/25 group-hover:border-primary/40"
  }`}
>
```

---

## Lot 4 — Behaviors (4 corrections WARNING)

### 4.1 CookieBanner — ajouter le state

Remplacer `components/cookie-banner.tsx` par :

```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent")
    if (!stored) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use cookies to analyze traffic and serve personalized ads.{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline hover:text-primary/80"
          >
            Learn more
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
```

### 4.2 CookModeToggle — implémenter la fonctionnalité

Remplacer `components/cook-mode-toggle.tsx` par :

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { ChefHat } from "lucide-react"

export function CookModeToggle() {
  const [active, setActive] = useState(false)

  const toggle = useCallback(async () => {
    if (active) {
      setActive(false)
      return
    }
    try {
      if ("wakeLock" in navigator) {
        await navigator.wakeLock.request("screen")
      }
      setActive(true)
    } catch {
      setActive(true)
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      document.title = document.title
    }, 30_000)
    return () => clearInterval(interval)
  }, [active])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/10"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
      }`}
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <ChefHat className={`h-3.5 w-3.5 transition-all ${active ? "text-primary" : ""}`} aria-hidden="true" />
        {active ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        ) : null}
      </span>
      {active ? "Cook Mode On" : "Cook Mode"}
    </button>
  )
}
```

### 4.3 JumpToRecipe — ajouter le variant mobile

Remplacer `components/jump-to-recipe.tsx` par les deux variants (desktop pill + mobile bar) :

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"

function useJumpToRecipe() {
  const [visible, setVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const target = document.getElementById("ingredients-section")
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "0px 0px 0px 0px", threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      const target = document.getElementById("ingredients-section")
      if (target) {
        target.scrollIntoView({
          behavior: reducedMotion ? "instant" : "smooth",
          block: "start",
        })
        target.focus({ preventScroll: true })
      }
    },
    [reducedMotion]
  )

  return { visible, reducedMotion, handleClick }
}

export function JumpToRecipeDesktop() {
  const { visible, reducedMotion, handleClick } = useJumpToRecipe()

  return (
    <a
      href="#ingredients-section"
      onClick={handleClick}
      className={`hidden md:inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${reducedMotion ? "!transition-none hover:!scale-100 active:!scale-100" : ""}`}
      aria-label="Jump to recipe ingredients"
    >
      Jump to Recipe
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}

export function JumpToRecipeMobile() {
  const { visible, reducedMotion, handleClick } = useJumpToRecipe()

  return (
    <a
      href="#ingredients-section"
      onClick={handleClick}
      className={`md:hidden flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium transition-all duration-300 active:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        visible ? "max-h-11 py-2.5 opacity-100" : "max-h-0 py-0 opacity-0 pointer-events-none overflow-hidden"
      } ${reducedMotion ? "!transition-none" : ""}`}
      aria-label="Jump to recipe ingredients"
    >
      Jump to Recipe
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}
```

### 4.4 RecipeSearch — implémenter le filtrage

Ajouter `"use client"` en haut de `components/recipe-search.tsx` et implémenter la logique de filtrage :

```typescript
"use client"

import { useState, useCallback, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, X } from "lucide-react"

const VISIBLE_CATEGORIES = 12

export function RecipeSearch({
  categories,
  currentSearch,
  currentCategory,
}: {
  categories: string[]
  currentSearch: string
  currentCategory: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)

  const visibleCategories = showAll ? categories : categories.slice(0, VISIBLE_CATEGORIES)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search by ingredient, meal, or keyword…"
          defaultValue={currentSearch}
          onChange={(e) => {
            startTransition(() => {
              router.push(`${pathname}?${createQueryString("q", e.target.value)}`, { scroll: false })
            })
          }}
          className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-label="Search recipes"
        />
        {currentSearch ? (
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push(`${pathname}?${createQueryString("q", "")}`, { scroll: false })
              })
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push(`${pathname}?${createQueryString("cat", "")}`, { scroll: false })
              })
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              !currentCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                startTransition(() => {
                  router.push(
                    `${pathname}?${createQueryString("cat", cat === currentCategory ? "" : cat)}`,
                    { scroll: false }
                  )
                })
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                cat === currentCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
          {categories.length > VISIBLE_CATEGORIES && !showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              +{categories.length - VISIBLE_CATEGORIES} more filters
            </button>
          ) : null}
          {showAll && categories.length > VISIBLE_CATEGORIES ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
```

---

## Lot 5 — Polish (3 corrections INFO)

### 5.1 Footer — vrais liens sociaux

Dans `components/site-footer.tsx`, remplacer `href="#"` par :

```typescript
<SocialIcon href="https://www.instagram.com/chefaugustin" label="Instagram">
  <InstagramIcon className="h-4 w-4" />
</SocialIcon>
<SocialIcon href="https://www.pinterest.com/chefaugustin" label="Pinterest">
  <PinterestIcon className="h-4 w-4" />
</SocialIcon>
<SocialIcon href="https://www.youtube.com/@chefaugustin" label="YouTube">
  <YouTubeIcon className="h-4 w-4" />
</SocialIcon>
```

### 5.2 Ajouter Suspense autour du RecipeSearch

Dans `app/recettes/page.tsx`, entourer `<RecipeSearch ... />` de :

```typescript
import { Suspense } from "react"

// ...
<Suspense>
  <RecipeSearch categories={categories} currentSearch={""} currentCategory={""} />
</Suspense>
```

### 5.3 Ajouter generateMetadata sur not-found.tsx

Si `app/not-found.tsx` est un Server Component, ajouter :

```typescript
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "404 — Page not found",
}
```

---

## Validation finale

Après avoir appliqué toutes les corrections :

```bash
npx tsc --noEmit          # Doit passer sans erreur
npm run build             # Doit réussir
curl localhost:3000 → 200
curl localhost:3000/recettes → 200
curl localhost:3000/recettes/test → 200
curl localhost:3000/techniques → 200 (ne doit plus être 404)
curl localhost:3000/guides → 200
curl localhost:3000/about → 200
curl localhost:3000/articles/test → 404
curl localhost:3000/sitemap.xml → 200 XML
curl localhost:3000/robots.txt → 200
```

---

## Ordre d'exécution recommandé

1. **Lot 1** (Architecture) — débloque toutes les URLs
2. **Lot 2** (SEO) — sitemap, robots, canonical
3. **Lot 3** (Components) — react-markdown, ThemeToggle, fixes visuels
4. **Lot 4** (Behaviors) — interactivité
5. **Lot 5** (Polish) — finitions
6. **Validation finale** — curls + build

**Après chaque lot :** `npx tsc --noEmit` + commit git.
