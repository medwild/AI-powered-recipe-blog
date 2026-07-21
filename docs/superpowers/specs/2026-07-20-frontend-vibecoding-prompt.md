# Super-Prompt Vibecoding — Front-End AI Blog Chef Augustin

> **Date :** 2026-07-20
> **Version :** 1.0.0
> **Audience :** AI coders (Horizon AI Builder → Claude Code)
> **Objectif :** Recréer le front-end complet du blog AI Chef Augustin via vibecoding, avec SEO/GEO/LLM optimization intégrée.

---

## Stratégie — Deux artefacts, deux outils

| Phase | Outil | Artefact | Focus |
|---|---|---|---|
| 1 — Prototype visuel | Horizon AI Builder (Hostinger) | Prompt #1 : Design System + Pages | UI/UX, design system, composants, responsive |
| 2 — Amélioration technique | Claude Code | Prompt #2 : Technical SEO/GEO Enhancement | SEO, GEO, JSON-LD, performance, quality gates |

**Principe Karpathy appliqué :** chaque outil reçoit exactement ce qu'il fait le mieux. Horizon = design visuel. Claude Code = ingénierie de précision. Pas de chevauchement, pas de redondance.

---

## Prompt #1 — Horizon AI Builder : Design System + Pages

> **Cible :** Horizon AI Builder (Hostinger) ou équivalent (v0, Bolt, Lovable)
> **Stack imposée :** Next.js 16 App Router, Tailwind CSS 4, shadcn/ui, Lucide Icons
> **Output attendu :** 3 pages (Homepage, Listing recettes, Page recette) + ~13 composants partagés
>
> **⚠️ RÈGLE FONDAMENTALE — DESIGN UNIQUEMENT, PAS DE COMPORTEMENT :**
> Horizon doit générer le HTML visuel, les classes Tailwind, et la structure des composants.
> **Ne PAS implémenter :** IntersectionObserver, Wake Lock API, useTransition, router.push,
> keyboard event handlers, aria-* dynamiques, state management complexe.
> Tout le comportement JavaScript sera ajouté par Claude Code en Phase 2.
> Ce qu'Horizon doit produire : markup sémantique + classes Tailwind + structure de composants.
> Les composants "client" ci-dessous le sont à titre indicatif — Horizon les génère en
> Server Components avec le markup statique. Claude Code ajoutera "use client" et la logique.

---

### §0 — Data Contracts (interfaces TypeScript que les composants attendent)

```
Recipe:
  slug: string, title: string, heroImageUrl?: string, excerpt?: string
  totalTime?: string, servings?: string, difficulty?: string
  tags?: string[], prepTime?: string, cookTime?: string
  ingredients?: { name: string; quantity?: string }[]
  instructions?: { step: number; text: string }[]
  contentMarkdown?: string, metaTitle?: string, metaDescription?: string
  publishedAt?: Date, updatedAt?: Date

Article:
  slug: string, title: string, heroImageUrl?: string, excerpt?: string
  category?: string, publishedAt?: Date
  contentMarkdown?: string, metaTitle?: string, metaDescription?: string

Crumb:
  label: string, href: string
```

---

### §0b — Dépendances DB (PLACEHOLDERS — seront branchés par Claude Code)

```
⚠️ Les fonctionnalités suivantes nécessitent une base de données.
Horizon doit générer le markup statique avec des DONNÉES FACTICES (hardcodées).
Claude Code remplacera par des queries réelles.

[DB] RecipeCard — données factices : titre "Sample Recipe", temps "30 min", etc.
[DB] ArticleCard — données factices : titre "Sample Article", date "July 2026"
[DB] RecipeSearch — utiliser un tableau de catégories hardcodé : ["Chicken", "Pasta", "Vegetarian", ...]
[DB] Related Recipes — grille statique de 3 RecipeCards avec données factices
[DB] Linked Article box — markup statique, caché par défaut (Claude Code gérera l'affichage conditionnel)
[DB] Cluster mode (listing) — markup statique avec cluster name/excerpt/stats hardcodés
[DB] Badges dynamiques — utiliser des badges hardcodés pour l'exemple ("Quick & Easy", "One-Pan")
[DB] "Why This Recipe Works" — markup statique avec texte exemple
```

---

### §0c — CSS personnalisé requis (à mettre dans globals.css)

```
/* Card hover effect — referenced by RecipeCard & ArticleCard */
.card-hover {
  transition: all 300ms ease;
}
.card-hover:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: oklch(0.55 0.05 30 / 0.2);
}

/* Cookie banner entrance */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 300ms ease-out;
}

/* Food blur placeholder — base64 blur hash for next/image */
/* Used as blurDataURL prop. Value: a tiny (8x8) warm beige blur PNG base64 */
/* Define in lib/utils.ts as FOOD_BLUR_PLACEHOLDER */

/* Print: hide sticky header, nav, footer, cookie banner */
@media print {
  header, nav, footer, [role="banner"] { display: none !important; }
  body { font-size: 12pt; }
  a { text-decoration: underline; }
}
```

---

### §1 — Project Identity & Constraints

```
PROJECT: Chef Augustin — Dinner for Two
NICHE: Easy weeknight dinners for two people (US audience, couples, small households)
TONE: Warm authority, French-trained chef writing for American home cooks
BRAND COLORS: Primary = terracotta #c2683f, use shadcn/ui CSS variables for theming
STACK:
  - Next.js 16 App Router (Server Components by default, "use client" only for interactivity)
  - Tailwind CSS 4 + @tailwindcss/typography (prose classes)
  - shadcn/ui components (Button, Card, Badge, Input, Separator, Skeleton)
  - Lucide React for all icons (ChefHat, Clock, Flame, Users, ArrowRight, Search, X, Printer, Share2, ChevronRight, ChevronDown, Sparkles, Menu, BookOpen, ArrowLeft, Check)
  - next-themes for dark/light mode (ThemeProvider in root layout)
  - next/image for all images (remote pattern: res.cloudinary.com)
  - Geist font (UI, --font-geist-sans) + Playfair Display (headings, --font-playfair) via next/font/google

CRITICAL ROUTING CONSTRAINT:
  - ALL routes are EXPLICIT (never use catch-all [category] or [...slug])
  - Recipe pages: /recettes/[slug]
  - Recipe listing: /recettes
  - Homepage: /
  - There are NO routes like /articles/*, /blog/*, /category/* — never create these

3 PAGES TO GENERATE:
  1. Homepage (/)
  2. Recipe Listing (/recettes)
  3. Recipe Detail (/recettes/[slug])

DARK MODE: Must support light and dark themes via next-themes. Use CSS variables.
ACCESSIBILITY: Skip-to-content link (sr-only, visible on focus), semantic HTML, aria-labels.
```

---

### §2 — Design System

```
COLORS (CSS variables via shadcn/ui):
  --primary: #c2683f (terracotta)
  --primary-foreground: white
  --background: white (light) / near-black (dark)
  --foreground: near-black (light) / near-white (dark)
  --muted / --muted-foreground: gray scale
  --card: white (light) / dark-surface (dark)
  --border: light gray (light) / dark gray (dark)
  --secondary: warm gray

TYPOGRAPHY:
  Headings (H1, H2, H3, card titles): Playfair Display, font-serif, font-semibold or font-bold
  Body, UI, metadata: Geist, font-sans
  H1: text-[clamp(1.8rem,4.5vw,2.8rem)] leading-tight text-balance
  H2: font-serif text-2xl
  Card titles: font-serif text-xl leading-snug text-balance

SPACING & BORDERS:
  Cards: rounded-2xl or rounded-3xl, border border-border, overflow-hidden
  Badges/Pills: rounded-full
  Buttons: rounded-xl (lg CTA) or rounded-full (pills)
  Section padding: px-4 py-14 (standard), pt-12 (inter-section)
  Max content width: max-w-5xl (listings/homepage), max-w-3xl (article body)

SHADOWS:
  Hero images: shadow-2xl shadow-primary/10
  Card hover: hover:shadow-md
  Ambient glow (hero): bg-primary/5 blur-3xl (behind image, decorative)

BACKDROP BLUR:
  Sticky header: bg-background/85 backdrop-blur
  Cookie banner: bg-card/95 backdrop-blur
  Meta pills: bg-card/80 backdrop-blur

COMPONENT KIT (shadcn/ui):
  Use: Button, Card, Badge, Input, Separator, Skeleton
  Button variants: default (primary), outline, ghost
  NEVER create custom button components — use shadcn/ui Button
  Use Skeleton for all loading states (animate-pulse)
```

---

### §3 — Shared Components (13 total)

```
3.1 SiteHeader [client component]
  - Sticky top-0 z-40, border-b border-border, bg-background/85 backdrop-blur
  - Height: h-16, max width: max-w-5xl, px-4
  - Logo (left): rounded-full bg-primary circle with ChefHat icon + "Chef Augustin" text in Playfair
  - Desktop nav (hidden on mobile): Recipe, Techniques, Guides, About links + ThemeToggle
  - Mobile: hamburger Menu button (right), overlay panel with close X + nav links + ThemeToggle
  - Mobile menu: absolute below header, full width, bg-background/95 backdrop-blur
  - Overlay: fixed inset-0 bg-black/20, closes on click
  - Escape key closes mobile menu
  - Body scroll lock when mobile menu open (overflow: hidden)
  - Props: optional `actions` slot for JumpToRecipeDesktop

3.2 SiteFooter [server component]
  - mt-20, border-t border-border, bg-secondary/30
  - 4-column grid (sm:grid-cols-4): Brand, Explore, Legal, Connect
  - Brand column: "Chef Augustin" serif + tagline + "AI-assisted recipes · Human-tested & verified · {year}"
  - Explore: links to /recettes, /techniques, /guides, /about
  - Legal: links to /privacy, /terms, /contact
  - Connect: social icons (Instagram, Pinterest, YouTube) — rounded-full circles, border, hover:text-primary
  - Social icons from lucide-react or simple SVG paths

3.3 RecipeCard [server component]
  - <article> with card-hover class (CSS: transition-all duration-300 hover:shadow-md hover:border-primary/20)
  - rounded-2xl, border border-border, bg-card, overflow-hidden
  - Image area: aspect-[4/3], next/image fill, object-cover, group-hover:scale-105 transition (500ms)
  - PinButton overlay (top-right corner, z-10)
  - Difficulty badge overlay (top-left): rounded-full bg-background/90 backdrop-blur
  - No image fallback: bg-secondary/30 centered "Coming soon" text
  - Content area: p-5, flex flex-col gap-3
  - Title: font-serif text-xl leading-snug, link to /recettes/{slug}, group-hover:text-primary
  - Excerpt: line-clamp-2, text-sm text-muted-foreground
  - Footer: mt-auto flex gap-4 text-xs text-muted-foreground
  - Clock icon + totalTime, Users icon + servings
  - Props: recipe object, optional aspectRatio (default "4/3")

3.4 ArticleCard [server component]
  - Similar to RecipeCard but:
  - Image aspect: aspect-[2/3]
  - Category badge overlay: bg-primary/90 text-primary-foreground (top-left)
  - No image fallback: BookOpen icon (center, muted)
  - Footer: publishedAt date (formatted "Month DD, YYYY")
  - href: /{category}/{slug} instead of /recettes/{slug}
  - Props: article object

3.5 Breadcrumbs [server component]
  - <nav aria-label="Breadcrumb">, mx-auto max-w-3xl, px-4 pt-6
  - Ordered list, flex-wrap, gap-1.5, text-sm text-muted-foreground
  - ChevronRight separator between items (h-3.5 w-3.5)
  - Last item: font-medium text-foreground, aria-current="page"
  - Other items: Link with hover:text-foreground
  - INLINE JSON-LD: generates <script type="application/ld+json"> with BreadcrumbList
  - Props: crumbs: { label: string; href: string }[]

3.6 ThemeToggle [client component]
  - Button that cycles light ↔ dark via next-themes useTheme()
  - Sun/Moon icon from lucide-react
  - Rounded-full, border, hover:bg-secondary transition

3.7 CookieBanner [client component]
  - fixed bottom-0 left-0 right-0, z-50
  - border-t border-border, bg-card/95 backdrop-blur
  - Text + "Learn more" link to /privacy + "Accept" button (bg-primary)
  - localStorage: "cookie-consent" check, hides after accept
  - animate-fade-in-up on appear

3.8 JumpToRecipeDesktop [client component]
  - Pill button: inline-flex, rounded-full bg-primary text-primary-foreground, px-3.5 py-1.5
  - ChevronDown icon (h-3.5 w-3.5)
  - Hidden on mobile (hidden md:inline-flex)
  - Uses IntersectionObserver: hides when #ingredients-section enters viewport
  - Smooth-scrolls to #ingredients-section on click
  - Respects prefers-reduced-motion
  - Hover: scale-105, shadow-md shadow-primary/25

3.9 JumpToRecipeMobile [client component]
  - Full-width bar: md:hidden, bg-primary text-primary-foreground
  - Same IntersectionObserver logic as desktop variant
  - Animated max-h transition (max-h-11 when visible, max-h-0 when hidden)

3.10 PinButton [client component]
  - absolute top-3 right-3 z-10
  - rounded-full bg-[#E60023] text-white, px-3 py-1.5 text-xs font-bold
  - Pinterest SVG icon + "Save" text
  - Hover: bg-[#BD081C], scale-105, shadow-xl shadow-[#E60023]/30
  - Opens Pinterest share URL in new window
  - Props: imageUrl, pageUrl, title

3.11 CookModeToggle [client component]
  - Toggle button: rounded-full border, px-3.5 py-1.5 text-xs font-semibold
  - ChefHat icon with pulse animation indicator when active
  - Uses Screen Wake Lock API (navigator.wakeLock.request("screen"))
  - Fallback: keep-alive setInterval when API unsupported
  - Active state: border-primary/40, bg-primary/10, text-primary

3.12 RecipeActionBar [client component]
  - Sits between ingredients and instructions
  - mx-auto max-w-3xl px-4 pt-6
  - 4 action buttons in flex-wrap gap-3:
    1. "Tips & FAQ" — anchor link to #article-body (ArrowDown icon)
    2. "Print" — window.print() (Printer icon)
    3. "Share" — navigator.share() fallback clipboard (Share2 icon) + toast "Link copied"
    4. "Save to Pinterest" — Pinterest share URL
  - Each button: rounded-xl border border-border bg-card px-4 py-3, hover:bg-secondary hover:border-primary/30

3.13 SkeletonCard
  - Used in loading.tsx for grid placeholders
  - rounded-xl border border-border bg-card overflow-hidden
  - Image area: aspect-[4/3] animate-pulse bg-muted
  - Content area: 3 h-4/h-5 bars animate-pulse rounded bg-muted
```

---

### §4 — Pages (3 pages)

```
4.1 HOMEPAGE (/) — 7 sections in order

A. HomepageHero
  - border-b border-border, max-w-5xl, px-4 py-10 md:py-16
  - Mobile-first: image on top, then text (grid md:grid-cols-2 md:gap-12)
  - Image: rounded-3xl, border border-border, shadow-2xl shadow-primary/10, aspect-[16/9] md:aspect-[3/2]
  - Ambient glow behind image: absolute -inset-4 -z-10 rounded-[2rem] bg-primary/5 blur-3xl
  - priority loading on image
  - Text column (left on desktop, below on mobile):
    - Badge: rounded-full bg-primary/10 text-primary text-xs font-semibold "Small-batch recipes for two" + ChefHat icon
    - H1: font-serif, "Easy Weeknight Dinners" + "for Two" in text-primary/80
    - Description paragraph: text-muted-foreground text-pretty
    - Trust pills (3): ~30 min to table / Scaled for 2 / French technique
      Each: rounded-xl border border-border/60 bg-card/80 backdrop-blur, icon + text
    - CTA: shadcn Button (size="lg") "Browse all recipes" → Link to /recettes, ArrowRight icon

B. HomepageStats
  - border-b border-border bg-secondary/30
  - grid grid-cols-2 md:grid-cols-3, gap-6, px-4 py-10
  - 3 stat items: Small-batch / ~30 min / Tested
  - Each: dl with dt (rounded-full bg-primary/10 icon circle) + dd (text-2xl font-bold + text-xs description)

C. HomepageStartCooking
  - max-w-5xl px-4 py-14
  - H2: "Start Cooking" + link "View all recipes" → /recettes
  - Grid of 6 RecipeCards (sm:grid-cols-2 lg:grid-cols-3)

D. HomepageCategories
  - Horizontal scrollable row of category pills (or flex-wrap)
  - Each pill: rounded-full, bg-secondary hover:bg-primary/20, Link to /recettes?cluster={id}

E. HomepageFeatured
  - max-w-5xl px-4 py-14, border-t border-border
  - H2: "Featured Recipes"
  - Row of 4 RecipeCards with prominent styling

F. HomepageArticles
  - max-w-5xl px-4 py-14, border-t border-border
  - H2: "Cooking Tips & Guides" + "View all" → /techniques
  - Grid of 3 ArticleCards

G. HomepageCTA
  - Centered CTA section with bg-primary/5, rounded-3xl
  - "Ready to cook?" headline + "Browse all recipes" Button

4.2 RECIPE LISTING (/recettes)

A. Header
  - max-w-5xl px-4 py-14
  - Breadcrumbs: Home > Recipes
  - H1: font-serif text-4xl "All recipes"
  - Description paragraph
  - Optional cluster mode: shows cluster name, description, stats (recipe count, avg time)

B. RecipeSearch [client component]
  - Search input: rounded-xl border border-border, Search icon left, X clear button right
  - Placeholder: "Search by ingredient, meal, or keyword…"
  - Category filter pills (expandable):
    - "All" pill (active = bg-primary text-primary-foreground)
    - Up to 12 visible category pills (rounded-full, bg-secondary)
    - "+N more filters" expand button when >12 categories
    - "Show less" collapse button
  - Uses useTransition() for smooth URL updates without blocking

C. Recipe Grid
  - sm:grid-cols-2 lg:grid-cols-3 gap-6
  - RecipeCard for each recipe (only show if heroImageUrl exists)

D. Empty State
  - rounded-xl border border-dashed border-border bg-card p-12 text-center
  - "No recipes match your search" or "No recipes published yet"

E. Cross-Link Articles Section
  - border-t border-border pt-14 mt-16
  - H2: "Cooking Tips & Guides"
  - Grid of 3 ArticleCards
  - Only shown when no search/filter active

4.3 RECIPE DETAIL (/recettes/[slug]) — 14 sections in EXACT order

1. Breadcrumbs (cluster-aware: Home > Recipes > [Cluster] > Title)

2. Hero Image
  - Rounded-3xl, border border-border, shadow-2xl shadow-primary/10
  - Aspect: aspect-[3/2] md:aspect-[2/3]
  - next/image fill, object-cover, priority loading
  - PinButton overlay (top-right)
  - sr-only figcaption
  - No image fallback: dashed border placeholder "Photo coming soon"

3. Badges Row (below image, mt-5)
  - Dynamically inferred from recipe data:
    - Speed badge: "Quick & Easy" / "30 Minutes" (Clock icon)
    - Technique badge: "One-Pan" / "Slow Cooker" (Flame icon)
    - Dietary badge: "Gluten-Free" / "Vegetarian" / "High Protein"
    - Difficulty badge (if not "Easy")
  - Each badge: rounded-full bg-primary/10 text-primary text-xs font-semibold
  - Total time pill: rounded-full bg-secondary text-xs font-medium

4. Title H1
  - font-serif text-[clamp(1.8rem,4.5vw,2.8rem)] leading-tight text-balance

5. Triple CTA Row (Sally's Baking Addiction pattern)
  - "Save" (Pinterest red pill with SVG icon)
  - "Jump to Recipe" (primary/10 pill, ArrowDown icon, links to #ingredients-section)
  - "Print" (secondary pill, window.print())
  - CookModeToggle
  - All: rounded-full, text-xs font-semibold

6. "Why This Recipe Works" Value Prop Box
  - Only shown if content contains it
  - rounded-2xl bg-gradient-to-br from-primary/[0.06] to-primary/[0.02]
  - border border-primary/15, px-5 py-4
  - Sparkles icon in rounded-full bg-primary/10 circle
  - "Why This Recipe Works" label (text-xs uppercase tracking-wide text-primary)
  - Value prop text (text-sm leading-relaxed)

7. Meta Pills (Prep / Cook / Servings / Difficulty)
  - flex-wrap gap-2.5
  - Each: rounded-xl border border-border/60 bg-card/80 backdrop-blur, px-3.5 py-2.5
  - Icon (Clock/Flame/Users/ChefHat) in top-left, label above value
  - Label: text-[10px] uppercase tracking-wider
  - Value: text-sm font-semibold

8. Excerpt
  - text-base leading-relaxed text-muted-foreground text-pretty

9. Author + Date Row
  - "By [Chef Augustin Lefèvre]" (link to /about, underline decoration-primary/40)
  - Published date with <time> element
  - Updated date (shown only if >7 days after publish)

10. INGREDIENTS SECTION
  - <section id="ingredients-section" aria-labelledby="ingredients-heading">
  - scroll-mt-20 (for JumpToRecipe anchor)
  - Rounded-3xl card: bg-card, border border-border/80, p-6 sm:p-8
  - Lined paper texture background (CRITICAL VISUAL DETAIL):
    repeating-linear-gradient(0deg, transparent, transparent 28px, oklch(0.55 0.01 90 / 0.07) 28px, oklch(0.55 0.01 90 / 0.07) 29px)
  - H2: "Ingredients" with ChefHat icon
  - Interactive ingredient rows (client component):
    - Each row: flex items-center gap-3.5, border-b border-dashed border-border/40, pb-3
    - Checkbox circle: rounded-full border-2, h-6 w-6
      - Unchecked: border-muted-foreground/25, hover:border-primary/40
      - Checked: border-primary bg-primary text-primary-foreground, Check icon
    - Ingredient name: leading-relaxed, line-through + opacity-40 when checked
    - Quantity: ml-auto, tabular-nums text-sm font-medium
    - role="checkbox", aria-checked, tabIndex=0, keyboard Enter/Space toggle

11. RECIPE ACTION BAR
  - See §3.12 component (Tips & FAQ | Print | Share | Save to Pinterest)

12. INSTRUCTIONS SECTION
  - <section aria-labelledby="instructions-heading">
  - H2: "Instructions", font-serif text-2xl
  - Numbered list (ol), flex flex-col gap-8
  - Each step (li): relative flex gap-5
  - OVERSIZED BACKGROUND NUMBER (CRITICAL VISUAL DETAIL):
    - absolute -top-8 -left-2, select-none, font-serif, text-[7rem], leading-none
    - text-primary/[0.04], pointer-events-none, hidden sm:block
  - Foreground number circle: z-10, h-10 w-10, rounded-full bg-primary
    - text-sm font-semibold text-primary-foreground
  - Step text: z-10, pt-1.5, text-base leading-relaxed

13. ARTICLE BODY (FAQ, Tips, Nutrition)
  - <section id="article-body" aria-labelledby="article-body-heading" scroll-mt-20>
  - sr-only H2: "Article and tips"
  - prose prose-lg prose-neutral max-w-none
  - react-markdown + remark-gfm rendering
  - Custom component overrides:
    - h2: font-serif text-2xl font-bold mt-10 mb-5
    - h3: font-serif text-xl font-bold mt-8 mb-4
    - p: text-base leading-relaxed my-4
    - ul/ol: my-4 list-disc/decimal pl-6, role="list"
    - a: text-primary underline hover:text-primary/80
    - blockquote: border-l-4 border-primary/40 pl-5 italic text-muted-foreground
  - Security: disallowedElements=["script","style","meta","link","head","html","body"]

14. RELATED RECIPES
  - border-t border-border mt-12 pt-14
  - H2: "More [Cluster Name]" or "Related Recipes"
  - Grid sm:grid-cols-2 lg:grid-cols-3 gap-6
  - Each: rounded-xl border border-border bg-card overflow-hidden
    - Image aspect-[4/3], hover:scale-105
    - Title font-serif text-sm line-clamp-2
    - Total time text-xs
  - LINKED ARTICLE: "Read the Deep Dive" box (if recipe has linked article)
    - rounded-xl border, hover:border-primary/40, group
    - "Read the Deep Dive" label + article title + excerpt + ArrowRight icon
```

---

### §5 — States & Responsive Behavior

```
LOADING STATES:
  - Use Skeleton components everywhere
  - Skeleton pattern: h-X w-Y animate-pulse rounded bg-muted
  - loading.tsx: full page skeleton with header bar + grid of 3 skeleton cards
  - Card skeleton: image area (animate-pulse bg-muted) + 3 text bars

EMPTY STATES:
  - rounded-xl border border-dashed border-border bg-card p-12 text-center
  - Contextual message + link to homepage or browse all

ERROR STATE (error.tsx):
  - "Something went wrong" H1 + description
  - "Try again" button (reset) + "Back to home" link

NOT FOUND (not-found.tsx):
  - ChefHat icon (large, muted), "Page not found" H1
  - "This page seems to have disappeared from our kitchen" message
  - "Back to home" + "View recipes" buttons

RESPONSIVE BREAKPOINTS:
  - Mobile (<768px): 1 column grid, hamburger menu, full-width JumpToRecipe bar
  - Tablet (768-1024px): 2 column grid
  - Desktop (>1024px): 3 column grid, horizontal nav, pill JumpToRecipe
  - Image aspects adjust: [3/2] mobile → [2/3] desktop for recipe hero

MICRO-INTERACTIONS:
  - Card hover: image scale(1.05), shadow-lift, border-color transition
  - PinButton: scale(1.05) + shadow-xl on hover
  - Links: color transition on hover (text-primary or hover:text-primary)
  - Mobile menu: smooth open/close, overlay fade
  - Ingredient checkbox: smooth strikethrough + color transition (200ms)
  - CookMode: ChefHat pulse animation when active
  - All transitions: duration-200 or duration-300 (respect prefers-reduced-motion)
```

---

### §6 — Print Styles

```
PRINT BEHAVIOR:
  - window.print() called via Print buttons (hero CTA row + RecipeActionBar)
  - @media print rules defined in globals.css (§0c): hide header/nav/footer/cookie banner
  - Browser handles the rest (background removal, font sizing)
```

---

---

## Prompt #2 — Claude Code : Technical SEO/GEO Enhancement Spec

> **Cible :** Claude Code (agent local avec filesystem access)
> **Contexte :** Projet Next.js 16 existant généré par Horizon. Ce prompt couvre TOUTES les couches techniques non-design.
> **Principe Karpathy :** chaque fichier a un contrat clair. Pas de code spéculatif. Les validateurs déterministes sont la source de vérité.

---

### §0 — Behaviors à injecter (logique JS retirée du prompt Horizon)

```
Ces comportements doivent être AJOUTÉS par Claude Code aux composants générés par Horizon.

0.1 JumpToRecipeDesktop + JumpToRecipeMobile
  - Ajouter "use client"
  - IntersectionObserver sur #ingredients-section → toggle visibilité
  - Smooth-scroll (behavior: prefers-reduced-motion ? "instant" : "smooth")
  - États: visible, reducedMotion
  - Props: aucun (utilise l'ID global #ingredients-section)

0.2 CookModeToggle
  - Ajouter "use client"
  - navigator.wakeLock.request("screen") avec fallback setInterval 30s
  - États: active, supported
  - aria-pressed dynamique
  - Props: aucun

0.3 PinButton
  - Ajouter "use client"
  - window.open(pinUrl, "_blank", "noopener,noreferrer") au clic
  - Construction URL: https://pinterest.com/pin/create/button/?url=...&media=...&description=...
  - Props: imageUrl: string, pageUrl: string, title: string

0.4 RecipeIngredients (checkboxes interactifs)
  - Ajouter "use client"
  - useState checked par ingrédient
  - role="checkbox", aria-checked dynamique, tabIndex=0
  - Keyboard: Enter/Space → toggle
  - Props: ingredients: Ingredient[]

0.5 RecipeActionBar
  - Ajouter "use client"
  - Share: navigator.share() avec fallback navigator.clipboard.writeText() + toast sonner
  - Print: window.print()
  - Pinterest save: construction URL avec pageUrl (useEffect pour window.location.href)
  - Props: title: string

0.6 RecipeSearch
  - Ajouter "use client"
  - useTransition() + router.push() avec URLSearchParams
  - Catégories expansibles: useState showAll
  - Clear button: réinitialise le param q
  - Props: categories: string[], currentSearch: string, currentCategory: string

0.7 SiteHeader (mobile menu)
  - Ajouter "use client"
  - useState open/close
  - Escape key → close
  - Body scroll lock (document.body.style.overflow = "hidden")
  - Props: actions?: React.ReactNode

0.8 CookieBanner
  - Ajouter "use client"
  - localStorage.getItem("cookie-consent") → setVisible
  - accept(): localStorage.setItem + setVisible(false)

0.9 ThemeToggle
  - Ajouter "use client"
  - next-themes useTheme() → toggle light/dark
  - Sun/Moon icon swap

0.10 Card hover
  - Ajouter la classe CSS .card-hover dans globals.css (définie en §0c du Prompt #1)
```

---

### §A — Architecture Routing (CONTRACTS NON-NÉGOCIABLES)

```
A.1 ROUTES EXPLICITES UNIQUEMENT
  - Chaque route = un dossier dédié dans app/
  - INTERDIT : [category]/[slug], [...slug], tout catch-all dynamique
  - 3 patterns de page publique :
    • Recette : app/recettes/[slug]/page.tsx
    • Listing : app/recettes/page.tsx
    • Homepage : app/page.tsx

A.2 MATRICE CONTENT_TYPE → URL → COMPOSANT → QUERY
  content_type "recipe" :
    URL: /recettes/{slug}
    Card: RecipeCard (href=/recettes/{slug})
    Query: getRecipeBySlug(slug) — filtre content_type = 'recipe'
  content_type "article" :
    URL: /{category}/{slug}
    Card: ArticleCard (href=/{category}/{slug})
    Query: getArticleBySlug(slug) — filtre content_type = 'article'

A.3 RÈGLE ABSOLUE — FILTRE CONTENT_TYPE
  Toute query publique DOIT filtrer par content_type.
  Sans ce filtre → un article servi comme recette → /recettes/{article-slug} → 404.
  getRecipeBySlug()  → WHERE slug = X AND content_type = 'recipe'
  getArticleBySlug() → WHERE slug = X AND content_type = 'article'

A.4 URLS QUI DOIVENT RETOURNER 404
  /articles/*, /blog/*, /category/*, /recipe/*, /post/*
  /api/* (routes protégées ou inexistantes)
  /dashboard/* (si non authentifié → redirect /login)

A.5 CATEGORY_LABELS (single source of truth)
  techniques → "Techniques"
  guides → "Guides"
  histoire → "Histoire"
  equipement → "Équipement"
  idees → "Idées"
```

---

### §B — SEO Technique Layer

```
B.1 GENERATEMETADATA() PAR PAGE
  Chaque page.tsx exporte une fonction generateMetadata() avec :
  - title: recipe.metaTitle || recipe.title (template: "%s | Chef Augustin")
  - description: recipe.metaDescription || recipe.excerpt
  - alternates: { canonical: "/recettes/{slug}" }
  - openGraph: title, description, type ("article" ou "website"), images
  - twitter: card "summary_large_image", title, description, images
  - robots (listing page filtrée): { index: false, follow: true } si q ou cat présents

B.2 LAYOUT ROOT METADATA (app/layout.tsx)
  - metadataBase: new URL(NEXT_PUBLIC_SITE_URL || 'https://chefaugustin.com')
  - title: { default: 'Chef Augustin — Easy Weeknight Dinners for Two', template: '%s | Chef Augustin' }
  - verification.google: NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  - other['google-adsense-account']: NEXT_PUBLIC_ADSENSE_PUBLISHER_ID (si défini)
  - viewport: { colorScheme: 'light dark', themeColor: '#c2683f' }

B.3 ISR + STATIC GENERATION
  export const revalidate = 300 (recette), 60 (listing/homepage)
  export const dynamicParams = true
  generateStaticParams(): retourne tous les slugs publiés pour pré-génération

B.4 SITEMAP (app/sitemap.ts)
  - Recettes : /recettes/{slug}, priority 0.8, changeFrequency "weekly"
  - Articles : /{category}/{slug}, priority 0.7, changeFrequency "monthly"
  - Catégories : /{category}, priority 0.7, "weekly"
  - Statiques : /privacy, /terms, priority 0.5, "monthly"
  - Homepage : priority 1, "daily"
  - /recettes : priority 0.9, "daily"
  - /about : priority 0.6, "monthly"

B.5 ROBOTS.TXT (app/robots.ts)
  - userAgent "*": allow "/", disallow ["/dashboard", "/api/"]
  - userAgent "OAI-SearchBot": allow "/"
  - userAgent "PerplexityBot": allow "/"
  - userAgent "Bingbot": allow "/"
  - userAgent "Googlebot": allow "/"
  - sitemap: BASE_URL/sitemap.xml

B.6 RSS FEED (app/feed.xml/route.ts)
  - RSS 2.0 + atom:link
  - <item> par recette : title CDATA, link, guid, description CDATA
  - <enclosure> si heroImageUrl (type image/jpeg)
  - Cache-Control: public, max-age=3600, s-maxage=3600

B.7 BALISES TEMPORELLES
  - <time dateTime={ISO}> avec formatted date
  - updatedAt affiché seulement si >7 jours après publishedAt
```

---

### §C — JSON-LD Structured Data (INTÉGRITÉ DES DONNÉES)

```
C.1 RÈGLE D'INTÉGRITÉ
  Pas de données JSON-LD non visibles dans le contenu de la page.
  Pas de nutrition dans le JSON-LD sans section nutrition dans le markdown.
  Pas d'auteur sans mention dans le contenu.

C.2 RECIPE PAGE — @graph
  Nodes: Recipe + BlogPosting + FAQPage (optionnel) + BreadcrumbList
  Recipe node:
    - @id: "#recipe"
    - name, description, image[], datePublished, recipeYield, keywords
    - recipeIngredient: [quantity, name].filter(Boolean).join(" ")
    - recipeInstructions: [{ @type: "HowToStep", position: step, text }]
  BlogPosting node:
    - mainEntity: { "@id": "#recipe" }
    - publisher: { "@type": "Organization", name: "Chef Augustin", url: SITE_URL }
  Breadcrumbs auto-générés par le composant Breadcrumbs (inline JSON-LD)

C.3 ARTICLE PAGE — @graph
  Nodes: Article + BreadcrumbList
  - headline, description, image, datePublished, dateModified
  - author: { "@type": "Person", name: "Chef Augustin Lefevre" }
  - publisher: { "@type": "Organization", name: "Chef Augustin", url: SITE_URL }
  - BreadcrumbList auto-enrichi si absent du @graph

C.4 HOMEPAGE — Organization + WebSite
  Organization: name, url, logo, description, sameAs [Instagram, Pinterest, YouTube]
  WebSite: name, url, potentialAction.SearchAction avec urlTemplate /recettes?q={search_term_string}
```

---

### §D — GEO & LLM Optimization

```
D.1 LLM.TXT (app/llm.txt/route.ts)
  - Text/plain, Cache-Control: public max-age=3600
  - Sections:
    • About (site description, niche, content types)
    • Site Structure (URLs clés)
    • Raw Data API for LLMs (endpoints listés)
    • Published Recipes (titre + lien raw + HTML + métadonnées)
    • Published Articles (titre + lien HTML + catégorie)
  - Last updated: date courante

D.2 RAW DATA API
  GET /api/recipes/raw → JSON array de toutes les recettes publiées
    - Champs publics: slug, title, metaTitle, metaDescription, excerpt, difficulty,
      prepTime, cookTime, totalTime, servings, tags, ingredients, instructions,
      contentMarkdown, imageUrl, publishedAt, markdown (reconstruit via buildRecipeMarkdown()
      depuis lib/markdown.ts — combine tous les champs en markdown lisible par LLM)
    - Cache-Control: public, max-age=3600, s-maxage=3600
  GET /api/recipes/raw/[slug] → JSON single recette
    - Filtre: content_type = 'recipe' AND status = 'published'

D.3 LLMS.TXT REWRITE
  next.config.mjs → rewrites: [{ source: "/llms.txt", destination: "/llm.txt" }]

D.4 AI CRAWLER BOTS (robots.ts)
  Allow explicite: OAI-SearchBot, PerplexityBot, Bingbot, Googlebot
```

---

### §E — Content Quality Gates (TRIPLE FILET DÉTERMINISTE)

```
E.1 CONTENTVALIDATOR (lib/content-validator.ts) — 12 checks

  [BLOCKING ERRORS]
  1. BANNED WORDS TIER 1 (22 termes)
     "delve", "dive into", "unlock", "unleash", "elevate", "transform",
     "embark", "journey", "in today's world", "it's worth noting that",
     "moreover", "furthermore", "robust", "holistic", "paradigm", "synergy",
     "game-changer", "leverage", "utilize", "nestled",
     "bursting with flavor", "melts in your mouth"
     → BANNED_WORD_REPLACEMENTS map pour scrub déterministe
  2. INTERNAL VIBE TOKENS: [WARM], [SHARP], [WINK], [GRIT], [GLOW],
     <!--WARM-->, <!--SHARP-->, <!--WINK-->, <!--GRIT-->, <!--GLOW-->
  3. WORD COUNT: error <1200 (google) / <800 (pin-first)
  4. GEO CITABILITY: score <60 = error (inline via checkCitability)
  5. TITLE EMPTY = error
  6. HEALTH CLAIMS (9 patterns): probiotics, digestion, gut health, immune,
     detox, anti-inflammatory, fat-burning, blood pressure/cholesterol,
     cancer/heart disease/diabetes prevention
  7. INGREDIENT-CONTENT MATCH <50% = error
  8. FOOD SAFETY USDA (CRITICAL — bloque même en AUTOPILOT):
     - Poultry ≤165°F, Ground meat ≤160°F, Steak/roast ≤145°F,
       Pork ≤145°F, Fish ≤145°F, Leftovers ≤165°F
     - Oven context detection ("preheat oven to 350°F" ≠ meat internal temp)
     - Carryover cooking detection ("pull at 158°F, carryover to 165°F" → safe)
  9. INSTRUCTION STEP: step doit être integer ≥1, text non vide

  [WARNINGS]
  10. Word count <1500 (google) / <1000 (pin-first)
  11. Meta title >60 chars, meta description <120 ou >160 chars
  12. Sentence rhythm: consecutive same openings, -ly adverbs >2/paragraph,
      short sentences <3, long sentences <2

E.2 GEO VALIDATOR (lib/geo-validator.ts)
  - 3 CLAIM PATTERNS: numberedFact, quantifiedComparison, causalClaim
  - 7 ATTRIBUTION PATTERNS: namedAuthority, firstPersonTesting, testingClaim,
    personalRecommendation, causalAttribution, externalAuthority, externalStudy
  - Validation co-occurrence: attribution ne compte QUE si un claim existe
    dans le même paragraphe
  - ANSWER NUGGETS: H2 question → 25-120 mots réponse avec chiffre ou entité nommée
  - SCORING: claimsScore×0.40 + attributionsScore×0.25 + nuggetsScore×0.20 + densityScore×0.15
  - Thresholds ENV: GEO_CLAIMS_MIN (6), GEO_ATTRIBUTIONS_MIN (2), GEO_NUGGETS_MIN (4)
  - GEO_ATTRIBUTIONS_MIN=2 (DeepSeek v4 Pro), 4 (Anthropic Claude)

E.3 LOOP SCORER (lib/loop-scorer.ts)
  - GEO citability: 60% (deterministic, most reliable)
  - Content quality: 25% (error/warning/bannedWord penalties)
  - Structure: 15% (error-free = 100)
  - Used for quality logging — no longer drives iterative loop (v13 single-pass)

E.4 CULINARY VALIDATOR (lib/culinary-validator.ts)
  - Ingredient ratios, cook times, temperatures plausibility checks
  - Warning-only — informs but doesn't block

E.5 CONTENT SIMILARITY (checkContentSimilarity)
  - Jaccard bigram overlap, >60% = near-duplicate
  - Catching: "chicken stir fry for two" vs "quick chicken stir fry for two"
```

---

### §F — Performance & Security Headers

```
F.1 SECURITY HEADERS (next.config.mjs → headers())
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  - Content-Security-Policy:
    • default-src 'self'
    • script-src 'self' 'unsafe-inline' 'unsafe-eval'
    • style-src 'self' 'unsafe-inline'
    • img-src 'self' https://res.cloudinary.com data: blob:
    • font-src 'self'
    • connect-src 'self' https://res.cloudinary.com
    • frame-ancestors 'none'
    • base-uri 'self'
    • form-action *

F.2 IMAGE OPTIMIZATION
  - next/image: priority sur hero, placeholder="blur" + blurDataURL (FOOD_BLUR_PLACEHOLDER)
  - sizes responsive: "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  - remotePatterns: res.cloudinary.com, chefaugustin.com

F.3 FONT LOADING
  - next/font/google: Geist + Playfair_Display
  - display: 'swap', subsets: ['latin']

F.4 VERCEL CONFIG (vercel.json)
  - framework: nextjs
  - regions: ["cdg1"]
  - env: NEXT_PUBLIC_SITE_URL = https://chefaugustin.com

F.5 SKIP-TO-CONTENT (WCAG 2.1 AA)
  - <a href="#main-content"> sr-only, focus:not-sr-only
  - Styled: fixed, top-left, z-50, rounded, bg-primary, shadow-lg
```

---

### §G — Middleware & Auth

```
G.1 MIDDLEWARE (middleware.ts)
  - Protège /dashboard et sous-routes
  - Cookie: dashboard_auth comparé à DASHBOARD_SECRET_TOKEN (≥32 chars hex)
  - Redirection: /login si non authentifié
  - Matcher: ['/dashboard/:path*']

G.2 RATE LIMITING (lib/rate-limit.ts)
  - checkRateLimit(): in-memory, par IP
  - Configurable: RATE_LIMIT_MAX_PER_MINUTE (défaut 3)
  - Appliqué sur POST /api/recipes/generate
```

---

### §H — Implementation Checklist (ordre exact par dépendance)

```
PHASE 1 — FONDATIONS (pas de dépendances)
  [ ] next.config.mjs — CSP, HSTS, X-Frame, X-Content-Type, Referrer-Policy,
      remotePatterns (res.cloudinary.com), rewrites (llms.txt→/llm.txt)
  [ ] .env.example — toutes les variables documentées avec commentaires
  [ ] vercel.json — region cdg1, framework nextjs
  [ ] tsconfig.json — strict, paths @/ → ./
  [ ] lib/markdown.ts — buildRecipeMarkdown() (nécessaire pour Phase 4 API raw)

PHASE 2 — LAYOUT & MIDDLEWARE
  [ ] app/layout.tsx — fonts (Geist + Playfair), metadata, viewport, ThemeProvider,
      SkipToContent, Analytics, Toaster, CookieBanner
  [ ] app/globals.css — Tailwind imports, CSS variables, prose overrides
  [ ] middleware.ts — dashboard auth
  [ ] lib/utils.ts — cn() (clsx + tailwind-merge), FOOD_BLUR_PLACEHOLDER

PHASE 3 — SEO FILES
  [ ] app/sitemap.ts
  [ ] app/robots.ts
  [ ] app/feed.xml/route.ts
  [ ] app/llm.txt/route.ts

PHASE 4 — API ROUTES
  [ ] app/api/recipes/raw/route.ts
  [ ] app/api/recipes/raw/[slug]/route.ts

PHASE 5 — STATE PAGES
  [ ] app/not-found.tsx
  [ ] app/error.tsx
  [ ] app/loading.tsx

PHASE 6 — PAGES (avec generateMetadata + generateStaticParams + revalidate)
  [ ] app/page.tsx
  [ ] app/recettes/page.tsx
  [ ] app/recettes/[slug]/page.tsx

PHASE 7 — BEHAVIORS (ajouter "use client" + logique JS aux composants Horizon)
  [ ] SiteHeader → mobile menu (useState, Escape key, body scroll lock)
  [ ] ThemeToggle → next-themes useTheme()
  [ ] CookieBanner → localStorage check
  [ ] JumpToRecipeDesktop + JumpToRecipeMobile → IntersectionObserver + smooth-scroll
  [ ] CookModeToggle → Wake Lock API + keep-alive fallback
  [ ] PinButton → Pinterest URL construction + window.open
  [ ] RecipeIngredients → checkbox toggle + keyboard handlers + aria-*
  [ ] RecipeActionBar → navigator.share/clipboard + window.print
  [ ] RecipeSearch → useTransition + URLSearchParams + expandable categories
  [ ] globals.css → ajouter .card-hover, .animate-fade-in-up, @media print

PHASE 8 — TECHNICAL ENHANCEMENTS (markdown rendering + JSON-LD + sécurité)
  [ ] components/breadcrumbs.tsx — ajouter BreadcrumbJsonLd inline
  [ ] components/recipe-article-body.tsx — react-markdown + remark-gfm + prose + disallowedElements
  [ ] components/markdown-renderer.tsx — composant partagé pour les articles
  [ ] RecipeJsonLd — @graph (Recipe + BlogPosting + FAQPage + BreadcrumbList), intégrité données
  [ ] ArticleJsonLd — @graph (Article + BreadcrumbList), auto-enrichissement breadcrumb
  [ ] HomepageJsonLd — Organization + WebSite + SearchAction

PHASE 9 — QUALITY GATES
  [ ] lib/geo-validator.ts — 3 claim + 7 attribution patterns + nuggets
  [ ] lib/content-validator.ts — 12 checks déterministes
  [ ] lib/loop-scorer.ts — GEO 60% + Content 25% + Structure 15%
  [ ] lib/culinary-validator.ts — validation additionnelle

PHASE 10 — VÉRIFICATION
  [ ] npx tsc --noEmit
  [ ] curl localhost:3000 → 200
  [ ] curl localhost:3000/recettes → 200
  [ ] curl localhost:3000/recettes/{slug} → 200
  [ ] curl localhost:3000/articles/test → 404
  [ ] curl localhost:3000/sitemap.xml → 200 XML
  [ ] curl localhost:3000/robots.txt → 200 text
  [ ] curl localhost:3000/feed.xml → 200 XML
  [ ] curl localhost:3000/llm.txt → 200 text
  [ ] curl localhost:3000/api/recipes/raw → 200 JSON
```

---

## Workflow d'exécution

```
ÉTAPE 1 — Prototype visuel (Horizon)
  1. Copier le Prompt #1 complet dans Horizon
  2. Itérer sur le design jusqu'à satisfaction visuelle
  3. Exporter le projet Next.js

ÉTAPE 2 — Import vers Claude Code
  1. git init + git add + git commit (sauvegarde du prototype Horizon)
  2. Ouvrir le projet dans Claude Code

ÉTAPE 3 — Enhancement technique (Claude Code)
  1. Donner le Prompt #2 à Claude Code
  2. Exécuter phase par phase (§H)
  3. Après chaque phase: npx tsc --noEmit
  4. Vérifier les URLs clés (200/404)

ÉTAPE 4 — Intégration backend
  1. Configurer la DB (Neon PostgreSQL + Drizzle)
  2. Brancher les queries (lib/queries.ts)
  3. Activer le pipeline Inngest (génération de contenu)
```

---

## Références croisées

- `CLAUDE.md` — Architecture pipeline v13, stack, contrats inter-agents
- `.claude/rules/routing-seo.md` — Règles SEO non-négociables
- `.claude/rules/global.md` — 15 règles NEVER
- `.claude/rules/karpathy.md` — Qualité de code, simplicité
- `.claude/rules/security.md` — Secrets, auth, validation
- `.claude/rules/frontend.md` — Composants, styling, App Router
- `.claude/rules/ai-pipeline.md` — Steps Inngest, agents IA
- `.claude/rules/api.md` — Conventions API, rate limiting
- `.env.example` — Toutes les variables d'environnement
```

---

## Validation croisée

Avant d'utiliser ces prompts, vérifier que :
- [ ] Tous les composants listés dans le Prompt #1 existent dans le codebase de référence
- [ ] Les 12 checks du ContentValidator sont documentés dans le Prompt #2
- [ ] Les poids du Loop Scorer sont corrects (GEO 60% + Content 25% + Structure 15%)
- [ ] Les thresholds GEO sont les bons (ATTRIBUTIONS_MIN=2 pour DeepSeek, 4 pour Claude)
- [ ] Les 6 règles USDA food safety sont incluses
- [ ] Les 9 patterns health claims sont listés
- [ ] Les 22 banned words Tier 1 sont complets
- [ ] La checklist §H couvre tous les fichiers à créer
