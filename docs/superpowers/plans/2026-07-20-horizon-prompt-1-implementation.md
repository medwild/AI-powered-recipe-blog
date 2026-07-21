# Prompt #1 Horizon — Implementation Plan

> **For agentic workers:** Execute this plan round by round. Each round = one Horizon prompt → validate → commit. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer le front-end visuel complet du blog Chef Augustin via Horizon AI Builder en 4 rounds de prompts, en partant d'un projet Next.js 16 vierge.

**Architecture:** 4 rounds Horizon séquentiels — chaque round produit des composants validables indépendamment. Round 1 = scaffold projet. Round 2 = design system + composants partagés. Round 3 = homepage + listing. Round 4 = page recette. Entre chaque round : `npx tsc --noEmit` + inspection visuelle + commit git.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4, shadcn/ui, Lucide React, next-themes, Geist + Playfair Display fonts.

## Global Constraints

- Routes explicites uniquement (pas de catch-all `[category]` ou `[...slug]`)
- Server Components par défaut, "use client" sera ajouté par Claude Code en Phase 2
- Toutes les données sont hardcodées/factices (DB branchée par Claude Code)
- Primary color: #c2683f (terracotta), dark mode via next-themes
- Images: `next/image` avec `remotePattern: res.cloudinary.com`, placeholder blur
- Pas de IntersectionObserver, pas de Wake Lock API, pas de useState — markup visuel UNIQUEMENT

---

## Préparation

- [ ] Lire le Prompt #1 complet : `docs/superpowers/specs/2026-07-20-frontend-vibecoding-prompt.md`
- [ ] Créer un repo git local vide : `mkdir chef-augustin-frontend && cd chef-augustin-frontend && git init`
- [ ] Préparer une image placeholder 8×8 beige en base64 pour `FOOD_BLUR_PLACEHOLDER`

---

## Round 1 — Project Bootstrap + Design System Foundation

**Prompt Horizon :**

> Je veux créer un blog de cuisine Next.js 16. Configure le projet avec cette stack :
>
> - Next.js 16 App Router + TypeScript strict
> - Tailwind CSS 4 + @tailwindcss/typography
> - shadcn/ui (Button, Card, Badge, Input, Separator, Skeleton)
> - lucide-react, next-themes
> - Polices: Geist (--font-geist-sans) + Playfair Display (--font-playfair) via next/font/google, display:swap
> - next.config.mjs: remotePatterns pour res.cloudinary.com, headers CSP+HSTS (voir spec), rewrites llms.txt→/llm.txt
>
> globals.css:
> - Thème shadcn/ui avec primary = #c2683f, support dark mode
> - Classes CSS personnalisées :
>   - .card-hover { transition: all 300ms ease; } .card-hover:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: oklch(0.55 0.05 30 / 0.2); }
>   - @keyframes fade-in-up { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
>   - .animate-fade-in-up { animation: fade-in-up 300ms ease-out; }
>   - @media print { header, nav, footer, [role="banner"] { display: none !important; } body { font-size: 12pt; } }
>
> app/layout.tsx:
> - <html lang="en" suppressHydrationWarning className={geist.variable + playfair.variable}>
> - <body className="font-sans antialiased bg-background">
> - Skip-to-content: <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground focus:shadow-lg">Skip to content</a>
> - ThemeProvider attribute="class" defaultTheme="light" enableSystem
> - <div id="main-content" tabIndex={-1}> wrapper
>
> middleware.ts: protège /dashboard/* via cookie dashboard_auth, matcher: ['/dashboard/:path*']
>
> app/not-found.tsx: ChefHat icon + "Page not found" + "This page seems to have disappeared from our kitchen" + Back to home + View recipes buttons
> app/error.tsx: "Something went wrong" + Try again + Back to home
> app/loading.tsx: Header skeleton bar + grid de 3 skeleton cards (image + 3 text bars animate-pulse)
> app/page.tsx: placeholder minimal "Chef Augustin — Coming soon"
>
> CRITICAL: Pas de routes catch-all. Pas de /articles, /blog, /category.

**Expected files:** `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`, `middleware.ts`, `next.config.mjs`, `tsconfig.json`, `package.json`, `components/ui/*.tsx`, `lib/utils.ts`

**Validation:**
- [ ] `npm install && npx tsc --noEmit` passe
- [ ] `npm run dev` → localhost:3000 affiche la homepage placeholder
- [ ] Skip-to-content visible au focus clavier

**Commit:** `git add -A && git commit -m "feat: Round 1 — project bootstrap, layout, middleware, state pages"`

---

## Round 2 — Composants Partagés

**Prompt Horizon :**

> Ajoute les composants partagés du blog. SERVER COMPONENTS UNIQUEMENT — markup visuel, pas de JS.
> Toutes les données sont FACTICES et hardcodées.
>
> **SiteHeader** (`components/site-header.tsx`):
> - sticky top-0 z-40 h-16 max-w-5xl mx-auto px-4, bg-background/85 backdrop-blur, border-b
> - Logo gauche: cercle bg-primary+ChefHat+"Chef Augustin" font-serif
> - Desktop nav (hidden md:): Recipes, Techniques, Guides, About, Studio — liens text-muted-foreground hover:text-foreground
> - ThemeToggle à droite (icône soleil/lune, rounded-full border)
> - Props: actions?: React.ReactNode
>
> **SiteFooter** (`components/site-footer.tsx`):
> - mt-20 border-t bg-secondary/30, 4 colonnes sm:grid-cols-4: Brand/Explore/Legal/Connect
> - Social icons: Instagram, Pinterest, YouTube en cercles border
>
> **Breadcrumbs** (`components/breadcrumbs.tsx`):
> - nav aria-label, ol flex-wrap, ChevronRight séparateurs, last item aria-current
> - Props: crumbs: {label, href}[]
>
> **ThemeToggle** (`components/theme-toggle.tsx`): bouton icône, rounded-full border
>
> **CookieBanner** (`components/cookie-banner.tsx`): fixed bottom-0 z-50, texte + "Learn more" + bouton Accept bg-primary
>
> **RecipeCard** (`components/recipe-card.tsx`) — DONNÉES FACTICES:
> - article card-hover rounded-2xl border overflow-hidden
> - Image aspect-[4/3], group-hover:scale-105, badge "Easy" top-left, PinButton placeholder top-right
> - Content p-5: titre font-serif text-xl, excerpt line-clamp-2, footer Clock+"30 min" + Users+"2 servings"
> - Props: recipe: {slug, title, heroImageUrl?, excerpt?, totalTime?, servings?, difficulty?}
>
> **ArticleCard** (`components/article-card.tsx`) — DONNÉES FACTICES:
> - Même structure, aspect-[2/3], badge catégorie bg-primary/90, footer date "July 20, 2026"
> - href = /{category}/{slug}, BookOpen si pas d'image
>
> **SkeletonCard** (`components/ui/skeleton.tsx`): aspect-[4/3] bg-muted animate-pulse + 3 bars
>
> CRITICAL: Pas de "use client". Markup statique uniquement.

**Expected files:** `components/site-header.tsx`, `site-footer.tsx`, `breadcrumbs.tsx`, `theme-toggle.tsx`, `cookie-banner.tsx`, `recipe-card.tsx`, `article-card.tsx`

**Validation:**
- [ ] `npx tsc --noEmit` passe
- [ ] RecipeCard affiche image + badges + titre + temps/servings
- [ ] ArticleCard affiche image + badge catégorie + date
- [ ] SiteHeader sticky avec logo + nav desktop
- [ ] SiteFooter 4 colonnes responsive

**Commit:** `git add -A && git commit -m "feat: Round 2 — shared components (header, footer, cards, breadcrumbs, cookie)"`

---

## Round 3 — Homepage + Recipe Listing

**Prompt Horizon :**

> Crée les 2 premières pages. Utilise les composants du Round 2. DONNÉES FACTICES partout.
>
> **HOMEPAGE** (`app/page.tsx` — remplace le placeholder) — 7 sections:
> 1. HomepageHero: grid md:grid-cols-2, image+ambient glow, badge, H1 "Easy Weeknight Dinners for Two", 3 trust pills, CTA Button "Browse all recipes"
> 2. HomepageStats: bg-secondary/30, 3 stats (Small-batch/~30 min/Tasted), icônes+texte
> 3. HomepageStartCooking: H2 "Start Cooking" + 6 RecipeCards
> 4. HomepageCategories: pills clusters: "Slow Cooker","One-Pan","Budget Meals","Chicken","Asian-Inspired"
> 5. HomepageFeatured: H2 "Featured" + 4 RecipeCards
> 6. HomepageArticles: H2 "Cooking Tips & Guides" + 3 ArticleCards
> 7. HomepageCTA: bg-primary/5 rounded-3xl, "Ready to cook?" + Button
>
> **RECIPE LISTING** (`app/recettes/page.tsx`):
> - Breadcrumbs Home>Recipes, H1 "All recipes", description
> - RecipeSearch (markup visuel): input Search icon left, placeholder, "All" pill actif + 12 catégories pills + "+3 more filters"
> - Grid 9 RecipeCards (sm:2 lg:3)
> - Empty state (caché): border-dashed, "No recipes match your search"
> - Cross-link: H2 "Cooking Tips & Guides" + 3 ArticleCards
>
> Crée aussi: `components/homepage/` (homepage-hero, -stats, -start-cooking, -categories, -featured, -articles, -cta), `components/recipe-search.tsx`

**Expected files:** `app/page.tsx`, `app/recettes/page.tsx`, `components/homepage/*.tsx` (7), `components/recipe-search.tsx`

**Validation:**
- [ ] `npx tsc --noEmit` passe
- [ ] Homepage: 7 sections visibles dans l'ordre, CTA fonctionnel → /recettes
- [ ] /recettes: search bar + 12 pills + 9 RecipeCards + Articles section
- [ ] Responsive: 1→2→3 colonnes

**Commit:** `git add -A && git commit -m "feat: Round 3 — homepage + recipe listing page"`

---

## Round 4 — Recipe Detail Page

**Prompt Horizon :**

> Crée la page recette complète — 14 sections dans l'ordre. SERVER COMPONENT, données FACTICES.
> `app/recettes/[slug]/page.tsx`
>
> **ATTENTION — 2 DÉTAILS VISUELS CRITIQUES :**
>
> A) INGREDIENTS — FOND PAPIER LIGNÉ :
>    repeating-linear-gradient(0deg, transparent, transparent 28px, oklch(0.55 0.01 90 / 0.07) 28px, oklch(0.55 0.01 90 / 0.07) 29px)
>    sur un div absolute inset-0 pointer-events-none dans la carte ingrédients
>
> B) INSTRUCTIONS — CHIFFRES EN FILIGRANE GÉANTS :
>    absolute -top-8 -left-2, font-serif text-[7rem], text-primary/[0.04], select-none pointer-events-none, hidden sm:block
>
> **14 SECTIONS :**
> 1. Breadcrumbs: Home > Recipes > "Quick Chicken Stir Fry for Two"
> 2. Hero Image: rounded-3xl shadow-2xl shadow-primary/10, aspect-[3/2] md:aspect-[2/3], PinButton overlay
> 3. Badges: "Quick & Easy","One-Pan" (bg-primary/10) + total time pill (bg-secondary)
> 4. Title H1: font-serif clamp
> 5. CTA Row: Save (Pinterest red), Jump to Recipe (→#ingredients-section), Print, Cook Mode
> 6. "Why This Recipe Works" box: dégradé from-primary/[0.06] to-primary/[0.02], Sparkles icon
> 7. Meta Pills: Prep/Cook/Servings/Difficulty avec icônes
> 8. Excerpt
> 9. Author + Date + Updated
> 10. INGREDIENTS (id="ingredients-section", scroll-mt-20): carte rounded-3xl, FOND PAPIER LIGNÉ, 8 ingrédients avec checkboxes visuels (cercles border, non interactifs)
> 11. Recipe Action Bar: Tips&FAQ↑, Print, Share, Save Pinterest — 4 boutons
> 12. INSTRUCTIONS: <ol>, 6 steps, CHIFFRES FILIGRANE GÉANTS, foreground number circles
> 13. Article Body (id="article-body"): prose prose-lg, markdown exemple (FAQ, tips), h2/h3 serif, blockquote border-l-4
> 14. Related Recipes: H2 "More One-Pan Dinners" + 3 mini cards + Linked Article box ("Read the Deep Dive")
>
> Crée aussi: `components/recipe-hero.tsx`, `recipe-ingredients.tsx`, `recipe-instructions.tsx`, `recipe-article-body.tsx`, `recipe-action-bar.tsx`, `recipe-related.tsx`, `jump-to-recipe.tsx`, `pin-button.tsx`, `cook-mode-toggle.tsx`
>
> CRITICAL: Pas de "use client". Markup visuel UNIQUEMENT.

**Expected files:** `app/recettes/[slug]/page.tsx`, `components/recipe-*.tsx` (6), `components/jump-to-recipe.tsx`, `components/pin-button.tsx`, `components/cook-mode-toggle.tsx`

**Validation:**
- [ ] `npx tsc --noEmit` passe
- [ ] Les 14 sections sont visibles dans l'ordre
- [ ] Fond papier ligné visible dans la section ingrédients
- [ ] Chiffres filigrane 7rem visibles sur desktop (sms:block)
- [ ] Hero image aspect change entre mobile [3/2] et desktop [2/3]
- [ ] "Jump to Recipe" → href="#ingredients-section"
- [ ] Article body rend le markdown avec prose styling
- [ ] Related Recipes + Linked Article box visibles

**Commit:** `git add -A && git commit -m "feat: Round 4 — recipe detail page with all 14 sections"`

---

## Vérification finale

- [ ] `npx tsc --noEmit` — zéro erreur
- [ ] `npm run build` — succès
- [ ] Curls de vérification :
  - `curl -s -o /dev/null -w "%{http_code}" localhost:3000` → 200
  - `curl -s -o /dev/null -w "%{http_code}" localhost:3000/recettes` → 200
  - `curl -s -o /dev/null -w "%{http_code}" localhost:3000/recettes/test` → 200
  - `curl -s -o /dev/null -w "%{http_code}" localhost:3000/articles/test` → 404
- [ ] Inspection visuelle : terracotta #c2683f, Playfair titres, Geist body, dark mode, responsive
- [ ] Export projet depuis Horizon
- [ ] `git add -A && git commit -m "chore: post-Horizon validation — all checks passed"`

---

## Résumé

| Round | Contenu | Fichiers | Validation clé |
|---|---|---|---|
| 1 | Bootstrap projet | ~12 | `npm run dev` OK, layout + state pages |
| 2 | Composants partagés | 8 | Cards + header + footer visibles |
| 3 | Homepage + Listing | 10 | 7 sections homepage + grid recettes |
| 4 | Recipe Detail | 10 | 14 sections, watermark numbers, lined paper |
| Final | Validation | — | `tsc --noEmit`, `npm run build`, curls 200/404 |
