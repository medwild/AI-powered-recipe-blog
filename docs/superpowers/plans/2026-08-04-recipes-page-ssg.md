# /recipes Page SSG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Passer `/recipes` en SSG (Static Site Generation) pour accélérer le chargement, améliorer le SEO/GEO, et économiser le quota DB Neon.

**Architecture:** La page utilise `searchParams` dans `generateMetadata` + `searchPublishedRecipes(q, cat)` — ce qui la force en SSR dynamique (chaque visite = requête DB). La recherche est DÉJÀ client-side (`RecipeSearch` est `"use client"`). Donc on peut :
1. Retirer la dépendance à `searchParams` serveur (les redirects `?cat=`/`?cluster=` deviennent des routes propres déjà existantes)
2. Forcer `export const dynamic = "force-static"` (SSG pur)
3. `export const revalidate = 3600` (ISR — re-génère toutes les heures après publication)

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Neon PostgreSQL.

## Global Constraints
- Règle absolue : jamais de route catch-all dynamique — routes explicites uniquement
- Ne jamais retirer un filtre `content_type` d'une query publique
- `npx tsc --noEmit` obligatoire après modification
- Pas de `// @ts-ignore`, pas de `as any`
- Ne pas casser la recherche client (RecipeSearch)

---

## File Structure
| Fichier | Modification |
|---|---|
| `app/recipes/page.tsx` | Retirer `searchParams` de `generateMetadata`, forcer SSG, retirer le slice |

## Interfaces
- `searchPublishedRecipes(q, cat)` — retourne toutes les recettes sans filtre
- `getRecipeCategories()` — toutes les catégories
- `getPublishedArticlesLight()` — articles AOR (light)
- `RecipeSearch` (client) — gère la recherche/filtres côté client

---

### Task 1: Passer /recipes en SSG + retirer le slice

**Files:**
- Modify: `app/recipes/page.tsx`

**Interfaces:**
- Consumes: rien de nouveau
- Produces: page statique générée au build

**Context :** la page devient statique ; la recherche reste client. Les redirects `?cat=`/`?cluster=` servent déjà via les routes propres `/recipes/category/{slug}` et `/recipes/cluster/{id}` (301 existants) — on peut les retirer du serveur.

- [ ] **Step 1: Retirer `searchParams` de `generateMetadata`**

```tsx
// Avant : export async function generateMetadata({ searchParams }: { searchParams: Promise<{...}> })
// Après :
export const dynamic = "force-static"
export const revalidate = 3600 // ISR — re-génère 1x/heure après publication

export async function generateMetadata(): Promise<Metadata> {
  // Plus de searchParams — la page est statique
  return {
    title: "All Recipes for Two — Easy Weeknight Dinners",
    description: "Simple, small-batch recipes for two — tested, scaled for two, ready tonight.",
    alternates: { canonical: "/recipes" },
  }
}
```

- [ ] **Step 2: Retirer la logique searchParams + redirects serveur**

```tsx
// Retirer :
//   const { q, cat, cluster } = await searchParams
//   const isFiltered = !!(q || cat)
//   if (cat && ...) permanentRedirect(...)
//   if (cluster && ...) permanentRedirect(...)
// La recherche est client-side (RecipeSearch) — les ?cat=/?cluster= ne sont plus servis par le serveur
```

- [ ] **Step 3: Retirer le slice(0,3) et passer à tous les articles**

```tsx
// Avant : const displayArticles = articles.slice(0, 3)
// Après : const displayArticles = articles  // tous les articles AOR
```

- [ ] **Step 4: Vérifier `tsc`**

Run: `npx tsc --noEmit`
Expected: PAS d'erreur

- [ ] **Step 5: Vérifier le rendu (build statique)**

Run: `npm run build` (ou `next build`)
Expected: la page `/recipes` est générée au build (statique), 30 recettes + tous les articles

- [ ] **Step 6: Commit**

```bash
git add app/recipes/page.tsx
git commit -m "perf: /recipes page to SSG+ISR — faster load, better GEO, saves Neon quota

The page was dynamic (SSR) due to searchParams — every visit hit the DB
(consuming Neon free-plan quota). Search is already client-side (RecipeSearch
'use client'), so the page can be static. force-static + revalidate=3600 (ISR)
re-generates hourly after publications. Also removed slice(0,3) on AOR
articles — all are now served. Redirects ?cat=/?cluster= were already
superseded by clean routes (301).
"
```

---

### Task 2: Vérification finale

**Files:**
- Run: `npm run build`, `curl /recipes`

**Interfaces:**
- Consumes: Task 1
- Produces: validation

- [ ] **Step 1: Build + vérif statique**

Run: `npm run build` puis `curl -s http://localhost:3000/recipes | grep -c "RecipeCard\|href=\"/recipes/"` 
Expected: ~30 recettes présentes dans le HTML

- [ ] **Step 2: Vérif recherche client intacte**

Run: ouvrir `/recipes` dans le navigateur, taper une recherche
Expected: la recherche filtre côté client sans reload serveur

---
