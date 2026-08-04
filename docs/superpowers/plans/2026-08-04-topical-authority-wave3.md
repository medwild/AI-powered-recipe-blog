# Topical Authority & VAGUE 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réaligner les 30 recettes existantes sur leurs entités réelles (long-tail), construire les hubs guides/idees pour les 21 keywords de collection (topical authority façon Koray Gübür), mettre en place le silo de liens, et relancer la VAGUE 3 (4 recettes + hubs) sur Opus 4.8.

**Architecture:** Topical map à 3 niveaux : Pillars (`/guides/cooking-for-two`, `/idees/dinner-ideas-for-two`) → Category hubs (guides/idees par besoin/méthode/régime/occasion) → Leaf recipes (les plats). Chaque page = une entité. Les hubs listent les recettes existantes (déterministe, depuis la DB, zéro lien halluciné) + intro éditoriale. Silo de liens : hub → cards → recettes ; recettes → footer « Related: hub ». Schema ItemList sur hubs, Recipe sur leaves, BreadcrumbList partout.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Tailwind 4, shadcn/ui, Neon PostgreSQL.

## Global Constraints

- Règle absolue : jamais de route catch-all dynamique (`[category]`, `[...slug]`) — routes explicites uniquement (`.claude/rules/global.md` §1)
- Ne jamais retirer un filtre `content_type` d'une query publique — `getRecipeBySlug()` → `content_type = 'recipe'`, `getArticleBySlug()` → `content_type = 'article'` (§2.2)
- RecipeCard → UNIQUEMENT recette (`/recettes/{slug}`) ; ArticleCard → UNIQUEMENT article (`/{category}/{slug}`) (§6)
- Ne jamais truncate mécaniquement un meta title — réécrire naturellement sous 60 chars (§3.5)
- Jamais de claim santé sans source vérifiable (probiotics, gut health, immune boost, etc. → BLOCK) (§3.3)
- `npx tsc --noEmit` obligatoire après toute modification du pipeline
- Le skill Markdown `chef-augustin-mega.md` ne doit pas être modifié sans vérifier l'agent runtime
- Pas de `// @ts-ignore`, pas de `eslint-disable`, pas de `as any` (§9)
- Ne jamais exposer `DATABASE_URL`/clés côté client (§7)
- Le batch `scripts/batch-wave3.mjs` envoie `category` (ignoré par la route) → il faut `aorCategory` (guides|idees) pour les hubs
- Provider : Tokenmix (Opus 4.8) — `TOKENMIX_MODEL=claude-opus-4.8`, une seule clé active `sk-tm-up6w…`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `lib/db/schema.ts` | Schéma `recipes` — `keyword`, `content_type`, `category` (déjà présents, pas de migration) |
| `lib/queries.ts` | Requêtes existantes : `getRecipeBySlug`, `getArticleBySlug`, `getPublishedRecipes`, `getPublishedArticles`, `getRelatedRecipes` |
| `lib/hub-content.ts` | **NOUVEAU** — catalogue déterministe des hubs (slug, titre, meta, intro, tags de curation) + mapping keyword→hub |
| `app/guides/page.tsx`, `app/idees/page.tsx` | Pages listing existantes (CategoryListing) |
| `app/guides/[slug]/page.tsx`, `app/idees/[slug]/page.tsx` | Routes articles existantes (ArticleDetail) |
| `components/category-listing.tsx` | Composant listing existant (CategoryListing) |
| `components/hub-listing.tsx` | **NOUVEAU** — rendu d'un hub : intro éditoriale + cards des recettes curatées + ItemList schema |
| `scripts/realign-keywords.ts` | **NOUVEAU** — script one-shot : re-cible le `keyword` des 19 recettes mismatch sur leur entité réelle |
| `scripts/batch-wave3.mjs` | Batch VAGUE 3 — à corriger (aorCategory + retirer les 2 off-intent) |
| `lib/generate-recipe-pure.ts` | Pipeline de génération (inspecter pour la génération hubs) |

## Interfaces

- `getRecipeBySlug(slug: string)` → recette `content_type='recipe'` publiée | null
- `getArticleBySlug(slug: string)` → article `content_type='article'` publié | null
- `getPublishedRecipes()` / `getPublishedArticles()` → listes publiées
- `getRelatedRecipes(currentId, tags)` → recettes liées (pour cards des hubs)

---

### Task 1: Script de réalignement des keywords (19 recettes mismatch)

**Files:**
- Create: `scripts/realign-keywords.ts`
- Modify: (aucun — DB directe via Drizzle)

**Interfaces:**
- Consumes: `db` de `@/lib/db`, `recipes` de `@/lib/db/schema`
- Produces: met à jour `recipes.keyword` pour 19 recettes ; log de chaque changement

**Context :** les 19 recettes ont un keyword de collection (GUIDE/IDEAS) mais un contenu = plat spécifique. On re-cible sur l'entité réelle (déjà dans le titre/slug). Chirurgical, pas de régénération.

- [ ] **Step 1: Créer le mapping** (dans le script)

```ts
// scripts/realign-keywords.ts
import "dotenv/config"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const REALIGN: Record<number, string> = {
  1: "garlic butter chicken rice bowls for two",
  6: "easy asian beef noodle stir fry for two",
  9: "pan seared steak dinner for two with garlic butter",
  11: "2 quart slow cooker chicken and gravy for two",
  14: "molten chocolate lava cakes for two",
  21: "easy chicken enchiladas for two",
  24: "4 ingredient feta brine chicken breast for two",
  31: "pan seared chicken breast with creamy tomato garlic sauce for two",
  32: "one pan ground beef and tomato rice skillet for two",
  33: "chocolate lava cakes for two",
  38: "sheet pan thanksgiving dinner for two with herb roasted chicken",
  39: "25 minute pan seared chicken with herb butter pan sauce",
  42: "garlic butter chicken bites with blistered tomatoes for two",
  44: "one sheet pan easter dinner for two with herb crusted lamb",
  46: "one pan baked ziti for two",
  47: "30 minute lemon butter chicken pasta for two",
  49: "25 minute one pan garlic herb chicken for two",
  51: "35 minute one skillet chicken and rice for two",
  53: "30 minute one pan lemon garlic chicken for two",
}

async function main() {
  for (const [id, keyword] of Object.entries(REALIGN)) {
    const [row] = await db
      .update(recipes)
      .set({ keyword })
      .where(eq(recipes.id, Number(id)))
      .returning({ id: recipes.id, slug: recipes.slug, keyword: recipes.keyword })
    if (row) console.log(`✅ #${row.id} ${row.slug} → "${row.keyword}"`)
    else console.warn(`⚠️ #${id} introuvable`)
  }
  console.log("Réalignement terminé.")
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Exécuter le script**

Run: `npx tsx scripts/realign-keywords.ts`
Expected: 19 lignes `✅ #id slug → "keyword"` ; 0 `⚠️ introuvable`

- [ ] **Step 3: Vérifier en DB**

Run: `SELECT id, slug, keyword FROM recipes WHERE id IN (1,6,9,11,14,21,24,31,32,33,38,39,42,44,46,47,49,51,53)`
Expected: chaque keyword = le nouveau long-tail (pas le head-term)

- [ ] **Step 4: Commit**

```bash
git add scripts/realign-keywords.ts
git commit -m "feat: realign 19 recipe keywords on their actual dish entities (Koray topical map)"
```

---

### Task 2: Créer le catalogue de hubs (lib/hub-content.ts)

**Files:**
- Create: `lib/hub-content.ts`

**Interfaces:**
- Consumes: rien (données statiques)
- Produces:
  - `interface Hub { slug: string; category: "guides" | "idees"; title: string; metaTitle: string; metaDescription: string; intro: string[]; curateTags: string[] }`
  - `HUBS: Hub[]` — les 21 hubs
  - `function getHubBySlug(slug: string): Hub | undefined`

**Context :** les 21 keywords de collection de la VAGUE 3 deviennent des hubs. Chaque hub curate des recettes existantes par tags (`curateTags`) — déterministe, pas de liens hallucinés.

- [ ] **Step 1: Définir l'interface et les 21 hubs**

```ts
// lib/hub-content.ts
export interface Hub {
  slug: string
  category: "guides" | "idees"
  title: string
  metaTitle: string
  metaDescription: string
  intro: string[]
  curateTags: string[]
}

export const HUBS: Hub[] = [
  {
    slug: "easy-dinner-ideas-for-two",
    category: "guides",
    title: "Easy Dinner Ideas for Two",
    metaTitle: "Easy Dinner Ideas for Two (30-Minute Meals)",
    metaDescription: "Quick, easy dinner ideas for two people — one-pan meals, 30-minute dinners, and small-batch favorites from Chef Augustin.",
    intro: [
      "Cooking for two doesn't mean cooking twice. ...",
    ],
    curateTags: ["dinner for two", "easy", "one-pan", "30-minute", "weeknight"],
  },
  // ... 20 autres hubs (voir mapping ci-dessous)
]

export function getHubBySlug(slug: string): Hub | undefined {
  return HUBS.find((h) => h.slug === slug)
}
```

**Mapping des 21 hubs** (slug → category → curateTags) :

| Slug | Cat | curateTags |
|---|---|---|
| easy-dinner-ideas-for-two | guides | dinner for two, easy, one-pan, 30-minute, weeknight |
| quick-and-easy-dinner-recipes-for-two | guides | quick, easy, dinner for two |
| healthy-dinner-ideas-for-two | idees | healthy, dinner for two, 30-minute |
| romantic-dinner-ideas-for-two | idees | romantic, date night, dinner for two |
| easy-meal-ideas-for-two | idees | easy, dinner for two, meal |
| dinner-recipe-ideas-for-two | idees | dinner for two, ideas, easy |
| slow-cooker-recipes-for-two | guides | slow cooker, crockpot, dinner for two |
| crockpot-recipes-for-two | guides | crockpot, slow cooker, dinner for two |
| easy-recipes-for-two | guides | easy, dinner for two, one-pan |
| recipes-for-two | guides | dinner for two, small batch |
| fast-and-easy-dinner-for-2 | guides | fast, easy, dinner for two, 30-minute |
| simple-healthy-dinner-ideas-for-two | idees | healthy, simple, dinner for two |
| easy-whole30-recipes | guides | whole30, dinner for two, easy |
| easy-carnivore-recipes | guides | carnivore, dinner for two, easy |
| easy-low-fodmap-recipes | guides | low fodmap, dinner for two, easy |
| easy-ibs-dinner-recipes | guides | low fodmap, ibs, dinner for two |
| easy-lactose-free-dinner-recipes | guides | lactose free, dairy free, dinner for two |
| easy-meals-for-beginners | guides | easy, beginner, dinner for two, one-pan |
| baking-for-2 | guides | baking, small batch, dessert |
| dinner-recipes-for-two | idees | dinner for two, easy, one-pan |
| easy-to-cook-dinner-for-two | idees | easy, dinner for two, beginner |

- [ ] **Step 2: Vérifier que le mapping est complet** — 21 hubs, chacun avec `curateTags` qui matchent des recettes existantes (ex. « dinner for two » matche ~20 recettes)

- [ ] **Step 3: Commit**

```bash
git add lib/hub-content.ts
git commit -m "feat: hub catalog for 21 collection keywords (topical map level 2)"
```

---

### Task 3: Composant hub-listing (rendu + ItemList schema)

**Files:**
- Create: `components/hub-listing.tsx`
- Modify: (utilise `getHubBySlug`, `getPublishedRecipes`)

**Interfaces:**
- Consumes: `getHubBySlug`, `getPublishedRecipes`, `recipes` (pour tags), `RecipeCard`
- Produces: `HubListing({ hub }: { hub: Hub })` → section avec intro + grid de RecipeCards + `<script type="application/ld+json">` ItemList

**Context :** chaque hub = intro éditoriale + cards des recettes dont les tags intersectent `curateTags`. Le schema ItemList liste les URLs des recettes (pas inventées — depuis la DB).

- [ ] **Step 1: Écrire le composant**

```tsx
// components/hub-listing.tsx
import Link from "next/link"
import { getHubBySlug } from "@/lib/hub-content"
import { getPublishedRecipes } from "@/lib/queries"
import { RecipeCard } from "@/components/recipe-card"

export async function HubListing({ slug }: { slug: string }) {
  const hub = getHubBySlug(slug)
  if (!hub) return null

  const recipes = await getPublishedRecipes()
  const curated = recipes.filter((r) =>
    hub.curateTags.some((t) => (r.tags ?? []).includes(t)),
  )

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.title,
    numberOfItems: curated.length,
    itemListElement: curated.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.chefaugustin.com/recettes/${r.slug}`,
      name: r.title,
    })),
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{hub.title}</h1>
      {hub.intro.map((p, i) => <p key={i} className="mt-4 text-gray-600">{p}</p>)}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {curated.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </article>
  )
}
```

- [ ] **Step 2: Vérifier que `RecipeCard` accepte le type de `getPublishedRecipes()`** (props compatibles) — sinon adapter l'appel

- [ ] **Step 3: Commit**

```bash
git add components/hub-listing.tsx
git commit -m "feat: HubListing component with ItemList schema (topical hubs)"
```

---

### Task 4: Brancher les hubs sur les routes guides/idees

**Files:**
- Modify: `app/guides/[slug]/page.tsx`, `app/idees/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getHubBySlug` (lib/hub-content), `HubListing` (components)
- Produces: si le slug = un hub → rendu `HubListing` ; sinon → `ArticleDetail` (comportement existant)

**Context :** un hub n'est PAS un article de la DB — c'est une page déterministe générée depuis le catalogue. Les routes `[slug]` doivent le brancher avant l'appel article.

- [ ] **Step 1: Modifier la route guides**

```tsx
// app/guides/[slug]/page.tsx
import { getHubBySlug } from "@/lib/hub-content"
import { HubListing } from "@/components/hub-listing"
// ... imports existants

export default async function GuidesArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hub = getHubBySlug(slug)
  if (hub) return <HubListing slug={slug} />
  return <ArticleDetail slug={slug} />
}
```

- [ ] **Step 2: Modifier la route idees** (même logique)

```tsx
// app/idees/[slug]/page.tsx — même structure, hub.category = "idees"
```

- [ ] **Step 3: Vérifier `tsc`**

Run: `npx tsc --noEmit`
Expected: PAS d'erreur

- [ ] **Step 4: Commit**

```bash
git add app/guides/[slug]/page.tsx app/idees/[slug]/page.tsx
git commit -m "feat: serve topical hubs on guides/idees slug routes"
```

---

### Task 5: Silo de liens — footer « Related hub » sur les recettes

**Files:**
- Modify: `components/recipe-article.tsx` (ou `recipe-related.tsx`)

**Interfaces:**
- Consumes: `getHubBySlug` (mapping reverse), `recipes.slug` → hub dédié
- Produces: un footer « Related: [hub] » pointant du leaf vers son hub (remonte le silo)

**Context :** chaque recette doit lier vers SON hub (silo). Mapping recette → hub par tags (le tag « dinner for two » → hub easy-dinner-ideas-for-two, etc.). Déterministe.

- [ ] **Step 1: Ajouter le mapping reverse** (dans hub-content.ts)

```ts
// lib/hub-content.ts — ajouter
export function getHubForRecipe(tags: string[]): Hub | undefined {
  // Priorité : tag « easy » → easy-dinner-ideas-for-two ; « healthy » → healthy-dinner-ideas-for-two ; etc.
  const priority = [
    ["healthy", "healthy-dinner-ideas-for-two"],
    ["romantic", "romantic-dinner-ideas-for-two"],
    ["slow cooker", "slow-cooker-recipes-for-two"],
    ["crockpot", "crockpot-recipes-for-two"],
    ["easy", "easy-dinner-ideas-for-two"],
  ]
  for (const [tag, slug] of priority) {
    if (tags.some((t) => t.toLowerCase().includes(tag))) return getHubBySlug(slug)
  }
  return undefined
}
```

- [ ] **Step 2: Afficher le footer dans recipe-article**

```tsx
// recipe-article.tsx — après le contenu
const hub = getHubForRecipe(recipe.tags ?? [])
{hub && (
  <div className="mt-8 rounded-lg bg-gray-50 p-4">
    <p className="text-sm text-gray-600">
      Looking for more ideas? Browse our{" "}
      <Link href={`/${hub.category}/${hub.slug}`} className="font-medium text-primary underline">
        {hub.title}
      </Link>
    </p>
  </div>
)}
```

- [ ] **Step 3: Vérifier `tsc`** — `npx tsc --noEmit` sans erreur

- [ ] **Step 4: Commit**

```bash
git add lib/hub-content.ts components/recipe-article.tsx
git commit -m "feat: recipe→hub footer links (link silo, leaf→hub)"
```

---

### Task 6: Corriger le batch VAGUE 3 (aorCategory + retirer les off-intent)

**Files:**
- Modify: `scripts/batch-wave3.mjs`

**Interfaces:**
- Consumes: route `POST /api/recipes/generate` (body : `keyword`, `aorCategory`)
- Produces: batch des 25 keywords (4 recettes + 21 hubs) avec `aorCategory` correct

**Context :** la route ignore `category` et n'accepte que `aorCategory` (guides|idees) pour les articles. Les 2 off-intent (candlelight, texas roadhouse) sont retirés. Les 4 vraies recettes restent `aorCategory` absent (→ recette).

- [ ] **Step 1: Mettre à jour le mapping dans le script**

```mjs
// scripts/batch-wave3.mjs
const WAVE3 = [
  // 4 vraies recettes (aorCategory absent → recette)
  { keyword: "easy lasagna recipe" },
  { keyword: "easy slow cooker pasta recipes" },
  { keyword: "easy chili colorado recipe" },
  { keyword: "easy beef ramen noodle recipes" },
  // 21 hubs (aorCategory guides|idees)
  { keyword: "easy dinner ideas for two", aorCategory: "guides" },
  { keyword: "quick and easy dinner recipes for two", aorCategory: "guides" },
  // ... (les 21 hubs du mapping Task 2)
]
```

- [ ] **Step 2: Vérifier que `AOR_CATEGORY_MAP` couvre bien guides/idees**

- [ ] **Step 3: Commit**

```bash
git add scripts/batch-wave3.mjs
git commit -m "fix: batch wave3 uses aorCategory, drops off-intent keywords"
```

---

### Task 7: Relancer la VAGUE 3 (après recharge Tokenmix)

**Files:**
- Run: `npm run dev` + `node scripts/batch-wave3.mjs`

**Interfaces:**
- Consumes: route generate (provider Tokenmix/Opus 4.8), PreGenGate
- Produces: 4 recettes + 21 hubs publiés

**Context :** nécessite que `TOKENMIX_MODEL=claude-opus-4.8` ET que le solde payant Tokenmix soit rechargé (sinon 402). Le PreGenGate doit passer (aucun slug dupliqué).

- [ ] **Step 1: Vérifier la config provider**

Run: `grep -E "^TOKENMIX_MODEL|^TOKENMIX_API_KEY" .env.local`
Expected: `TOKENMIX_MODEL=claude-opus-4.8` + clé active

- [ ] **Step 2: Vérifier qu'aucun draft ne bloque**

Run: `SELECT slug FROM recipes WHERE status IN ('draft','generating')`
Expected: 0 ligne (sinon supprimer les résidus)

- [ ] **Step 3: Lancer le serveur + le batch**

Run: `npm run dev` (background) puis `node scripts/batch-wave3.mjs`
Expected: les 25 keywords passent le PreGenGate ; génération Opus 4.8

- [ ] **Step 4: Vérifier les publications**

Run: `SELECT id, slug, status, content_type, category FROM recipes WHERE status='published' ORDER BY id`
Expected: 30 existantes + 4 recettes + 21 articles (guides/idees)

- [ ] **Step 5: Commit (si fichiers générés/modifiés)**

---

### Task 8: Vérification finale + mémoires

**Files:**
- Run: `npx tsc --noEmit`, audit rapide

**Interfaces:**
- Consumes: tout le plan
- Produces: validation + mise à jour des mémoires

**Context :** clôture du sprint topical authority.

- [ ] **Step 1: Vérifier `tsc` et l'état final**

Run: `npx tsc --noEmit` → PAS d'erreur
Run: `curl -s https://www.chefaugustin.com/guides/easy-dinner-ideas-for-two` → 200 (si déployé)

- [ ] **Step 2: Mettre à jour les mémoires** (session wave3 : SERP research faite, hubs construits, vagues)

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "docs: close topical authority sprint (SERP-verified intent, hubs, silo)"
```

---

