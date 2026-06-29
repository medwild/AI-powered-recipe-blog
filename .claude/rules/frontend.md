# Règles frontend

## Next.js App Router
- **Server Components par défaut** — ajouter `"use client"` uniquement si interactivité nécessaire
- Layout racine : `app/layout.tsx`
- Pages publiques : `app/recettes/[slug]/page.tsx` (SSR dynamique)
- Dashboard : `app/dashboard/page.tsx` (protégé par middleware)
- `app/loading.tsx` et `app/not-found.tsx` pour les états de chargement

## Composants
- shadcn/ui : `components/ui/` — ne pas modifier sans comprendre le composant Radix sous-jacent
- Dashboard : `components/dashboard/` — recipe-generator, recipe-row, dashboard-logout
- Publics : `components/` — recipe-card, recipe-article, recipe-search, site-header, site-footer, theme-toggle

## Styling
- Tailwind CSS 4 avec `@tailwindcss/typography` (classes `prose`)
- `cn()` depuis `lib/utils.ts` pour merger les classes Tailwind (clsx + tailwind-merge)
- Polices : Geist (UI) + Playfair Display (titres) — chargées via Google Fonts
- Dark mode : `next-themes` (ThemeProvider dans layout)
- Pas de CSS modules, pas de styled-components

## Rendu Markdown
- `react-markdown` + `remark-gfm` pour le contenu des recettes
- Composant `recipe-article.tsx` gère l'affichage complet (ingrédients, instructions, contenu)

## Pages et SEO
- `app/sitemap.ts` : génération dynamique du sitemap
- `app/robots.ts` : règles robots.txt
- `app/feed.xml/route.ts` : flux RSS
- `app/llm.txt/route.ts` : fichier llm.txt
- JSON-LD Schema.org intégré dans les pages recette
