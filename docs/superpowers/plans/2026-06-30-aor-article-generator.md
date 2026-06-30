# Aor Article Generator — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un Step 13 optionnel au pipeline Inngest qui génère un article Aor (technique/guide/histoire/équipement) à partir d'une recette, avec image FLUX-1, maillage interne automatique, et JSON-LD Article.

**Architecture:** 1 nouvel agent (`aor-writer.ts`) + 1 skill (`agent-aor-writer.md`), 3 colonnes DB sur `recipes`, 1 step Inngest optionnel, 1 template page `[category]/[slug]`, 2 routes API articles, correctif JSON-LD recettes existantes.

**Tech Stack:** TypeScript 5.7, Next.js 16 App Router, Inngest 4.7, Drizzle ORM, Cloudflare Workers AI (FLUX-1-Schnell), NaraRouter (Mistral Medium 3.5)

## Global Constraints

- **Ne jamais renommer un step Inngest existant** (règle CLAUDE.md)
- **Ne pas modifier l'ordre des steps 1-12**
- **`npx tsc --noEmit` obligatoire** après toute modification
- **`npm run test:pipeline`** doit continuer à passer (8/8)
- **Le pipeline recette doit fonctionner sans `generateAorArticle`** (step 13 conditionnel)
- **Pas de renommage de la table `recipes`** (règle DB)
- **Colonnes DB ajoutées doivent être `nullable` ou avoir `.default()`** (règle DB)
- **Aucune variable d'env ne doit être hardcodée**
- **CRITICAL OUTPUT RULE** dans tous les skills LLM : "Start with `{`, end with `}`"

---

### Task 1: DB Schema — 3 colonnes sur `recipes`

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `content_type: "recipe" | "article"`, `category: string | null`, `linked_content_id: number | null` on the `recipes` table

- [ ] **Step 1: Ajouter les 3 colonnes dans `lib/db/schema.ts`**

Ouvrir `lib/db/schema.ts`. Repérer la table `recipes` (après la colonne `workflowLog`). Ajouter les 3 colonnes :

```typescript
// Dans la définition de la table recipes, après workflowLog:
    workflowLog: jsonb("workflow_log").$type<WorkflowLogEntry[]>().default([]),
    // v7.0 Aor — content type differentiation
    content_type: text("content_type").default("recipe"),
    category: text("category"),
    linked_content_id: integer("linked_content_id"),
```

- [ ] **Step 2: Push le schéma vers Neon**

```bash
npx drizzle-kit push
```

Expected: "Schema is up to date" ou confirmation que les colonnes ont été ajoutées.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(db): add content_type, category, linked_content_id for Aor articles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Agent Aor Writer — runtime

**Files:**
- Create: `lib/inngest/functions/agents/aor-writer.ts`

**Interfaces:**
- Consumes: `loadSkillContent` from `@/lib/skills`, `runTextAndParseJson` from `@/lib/agents/nararouter`, `SeoPlan` type from `./strategist`, `StructuredSerp` type (inline from generate-recipe pattern)
- Produces: `AorArticle` type, `agentAorWriter()` function

- [ ] **Step 1: Créer `lib/inngest/functions/agents/aor-writer.ts`**

```typescript
// Agent 7 — Aor Writer (Article de blog SEO)
//
// Génère un article Aor (Outer Section) orthogonal à une recette.
// Couvre un angle technique, historique, ingrédient ou équipement.
// Ne répète JAMAIS la recette — contenu 100% complémentaire.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-aor-writer")  (règles, anti-duplicate, contrat)
//   User prompt   ← buildUserPrompt()                       (recette source, angle, catégorie)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import type { SeoPlan } from "./strategist"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AorCategory = "techniques" | "guides" | "histoire" | "equipement"

export type AorWriterInput = {
  keyword: string
  recipeTitle: string
  recipeSlug: string
  recipeUrl: string
  seoPlan: SeoPlan
  serp: Record<string, unknown>   // StructuredSerp — évite dépendance circulaire
  aorCategory: AorCategory
  aorAngle: string | null
}

export type AorArticle = {
  title: string
  slug: string
  category: AorCategory
  metaTitle: string
  metaDescription: string
  contentMarkdown: string
  excerpt: string
  linkedRecipeSlug: string
  linkedRecipeTitle: string
  anchorText: string
  tags: string[]
  jsonLd: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(input: AorWriterInput): string {
  const angleLine = input.aorAngle
    ? `Angle éditorial imposé : "${input.aorAngle}"`
    : `Angle éditorial : DÉDUIS-LE automatiquement à partir des content_opportunities du SeoPlan et de la catégorie "${input.aorCategory}".`

  const categoryGuide: Record<AorCategory, string> = {
    techniques: "Rédige un article PÉDAGOGIQUE qui explique la SCIENCE ou la TECHNIQUE derrière la recette.",
    guides: "Rédige un GUIDE EXHAUSTIF sur un ingrédient clé de la recette.",
    histoire: "Rédige une NARRATION CULTURELLE sur l'histoire ou l'origine du plat/technique.",
    equipement: "Rédige une ANALYSE COMPARATIVE d'un équipement essentiel à la recette.",
  }

  return `Recette source :
  Titre : ${input.recipeTitle}
  URL : ${input.recipeUrl}
  Slug : ${input.recipeSlug}

Mot-clé principal : ${input.keyword}

${angleLine}

Catégorie Aor : ${input.aorCategory}
${categoryGuide[input.aorCategory]}

Plan SEO (SeoPlan) :
${JSON.stringify(input.seoPlan, null, 2).substring(0, 8000)}

Données SERP :
${JSON.stringify(input.serp, null, 2).substring(0, 4000)}

RÈGLE ABSOLUE — Ne répète PAS les ingrédients, étapes, ou instructions de la recette.
Produis UN lien contextuel avec ancre riche vers la recette source dans le corps du texte.
Longueur : 800-1200 mots.
Structure : H2 informatifs (pas "Ingredients", pas "Instructions").
Ton : expert pédagogique qui explique le "pourquoi", pas de "moi je" narratif.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentAorWriter(input: AorWriterInput): Promise<AorArticle> {
  const systemPrompt = await loadSkillContent("agent-aor-writer")
  const userPrompt = buildUserPrompt(input)

  const result = await runTextAndParseJson<AorArticle>(
    systemPrompt,
    userPrompt,
    { temperature: 0.4, maxTokens: 6144 },
  )

  return result
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/functions/agents/aor-writer.ts
git commit -m "feat: add Aor Writer agent runtime

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Skill agent-aor-writer.md

**Files:**
- Create: `skills/agent-aor-writer.md`

**Interfaces:**
- Consumes: Loaded by `loadSkillContent("agent-aor-writer")` (referenced in Task 2)
- Produces: System prompt for Aor article generation

- [ ] **Step 1: Créer `skills/agent-aor-writer.md`**

S'inspirer de la structure de `skills/agent-writer.md` (sections Input Contract, Output Schema, règles). Contenu :

```markdown
# Agent Aor Writer — Rédacteur d'Articles de Blog SEO

Tu es un rédacteur SEO senior spécialisé en contenu culinaire technique.
Tu écris pour "Le Carnet Gourmand", un blog de cuisine haut de gamme.

## §1 Rôle

Tu rédiges des articles de blog (Aor — Outer Section) qui couvrent la science,
l'histoire, les ingrédients, ou l'équipement DERRIÈRE une recette.

Tu NE rédiges PAS de recettes. Tu NE listes PAS d'ingrédients ou d'étapes.

## §2 Input Contract

Tu reçois :
- Les données d'une recette déjà générée (titre, URL, slug)
- Un plan SEO (SeoPlan) contenant les cibles sémantiques
- Une catégorie Aor (techniques | guides | histoire | equipement)
- Un angle éditorial (fourni ou à déduire)

## §3 Règles Fondamentales

### Règle 1 — ORTHOGONALITÉ ABSOLUE
Tu ne dois JAMAIS répéter le contenu de la recette source :
- Pas d'ingrédients
- Pas d'étapes de préparation
- Pas de temps de cuisson
- Pas de quantités

Tu couvres ce que la recette NE couvre PAS.

### Règle 2 — ANGLE UNIQUE
Chaque article a un angle clair :
- techniques → science + application pratique
- guides → exhaustivité sur un ingrédient
- histoire → narration culturelle sourcée
- equipement → analyse comparative + recommandation

### Règle 3 — UN LIEN CONTEXTUEL
Tu produis UN lien vers la recette source, intégré naturellement
dans le corps du texte (milieu d'article, après un H2).
Le lien utilise une ancre riche et descriptive.

Exemple :
"C'est précisément cette réaction que nous maîtrisons dans
[notre recette du croissant parfait](/recettes/croissant),
où chaque paramètre de température est calibré au degré près."

INTERDIT : "cliquez ici", "voir la recette", "lire la suite".

## §4 Voix et Ton

- Expert pédagogique, pas chef qui raconte sa vie
- Pas de "je", pas de "moi", pas d'anecdotes personnelles
- Explications claires, précises, vulgarisées sans être simplistes
- Ton confiant mais pas arrogant

## §5 Structure

- H1 : titre accrocheur avec bénéfice clair
- H2 : sections informatives (pas "Ingredients", pas "Instructions")
- 800-1200 mots
- 1 lien contextuel Aor→Recette
- FAQ 3-5 questions en fin d'article (format **Question ?** suivi de réponse)

## §6 Contenu par Catégorie

### techniques
- Expliquer le "pourquoi" scientifique
- Donner des repères pratiques (températures, temps, ratios)
- Mentionner la recette source comme exemple d'application

### guides
- Couvrir les variétés/types de l'ingrédient
- Expliquer les critères de choix
- Donner des conseils de conservation/utilisation
- Mentionner la recette source comme cas d'usage

### histoire
- Narration chronologique ou thématique
- Citer des sources crédibles (chefs, livres, institutions)
- Faire le lien avec la pratique moderne
- Mentionner la recette source comme héritage contemporain

### equipement
- Comparer 2-4 options (matériaux, prix, durabilité)
- Expliquer les critères de choix
- Donner une recommandation claire
- Mentionner la recette source comme cas d'usage concret

## §7 Contraintes Techniques

- Pas de markdown dans les valeurs JSON (les strings sont du texte pur)
- Les URLs sont en format relatif (/techniques/...)
- Le slug est généré en français, sans accents, mots séparés par des tirets

## §8 FAQ

Génère 3-5 questions en format **Question ?** suivies de réponses concises.
Les questions doivent être naturelles (pas de bourrage de mots-clés).

## §9 CRITICAL OUTPUT RULE

No reasoning or analysis. Start with `{`, end with `}`.
Pure JSON output ONLY. No markdown fences, no prose before or after.

## §10 Output Schema

```json
{
  "title": "String — H1 de l'article (max 70 chars)",
  "slug": "String — slug URL (ex: reaction-maillard-cuisson)",
  "category": "techniques | guides | histoire | equipement",
  "metaTitle": "String — balise <title> (peut différer du H1, max 60 chars)",
  "metaDescription": "String — meta description (max 160 chars)",
  "contentMarkdown": "String — article complet en Markdown, 800-1200 mots, avec lien contextuel Aor→Recette inclus",
  "excerpt": "String — extrait 1-2 phrases pour les cards",
  "linkedRecipeSlug": "String — slug de la recette source",
  "linkedRecipeTitle": "String — titre de la recette source",
  "anchorText": "String — texte d'ancre enrichi du lien Aor→Recette",
  "tags": ["String — 3-7 tags pertinents"],
  "jsonLd": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": "#article",
        "headline": "String",
        "description": "String",
        "author": {
          "@type": "Person",
          "name": "Chef Augustin Lefèvre",
          "url": "https://lecarnetgourmand.fr/about"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Le Carnet Gourmand",
          "url": "https://lecarnetgourmand.fr"
        },
        "datePublished": "ISO 8601 — utiliser la valeur fournie dans l'input",
        "dateModified": "ISO 8601 — même que datePublished",
        "image": "URL de l'image hero — sera remplacée au runtime",
        "mainEntityOfPage": "URL canonique complète"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Question ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Réponse"
            }
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://lecarnetgourmand.fr/"},
          {"@type": "ListItem", "position": 2, "name": "CategoryName", "item": "https://lecarnetgourmand.fr/category-slug"},
          {"@type": "ListItem", "position": 3, "name": "ArticleTitle", "item": "URL canonique"}
        ]
      }
    ]
  }
}
```

## §11 Exemple

Pour une recette de croissant et la catégorie "techniques" avec l'angle
"La réaction de Maillard — pourquoi 190°C est la température magique" :

```json
{
  "title": "La Réaction de Maillard — Pourquoi 190°C Est la Température Magique en Cuisine",
  "slug": "reaction-maillard-temperature-cuisson",
  "category": "techniques",
  "metaTitle": "Réaction de Maillard : Pourquoi Cuire à 190°C | Le Carnet Gourmand",
  "metaDescription": "Découvrez la science derrière la croûte dorée : la réaction de Maillard expliquée simplement. Températures, chimie et astuces de chef.",
  "contentMarkdown": "## Qu'est-ce que la Réaction de Maillard ?\n\n...(800-1200 mots avec lien contextuel)...",
  "excerpt": "La réaction de Maillard est le secret d'une croûte dorée et savoureuse. Voici comment la maîtriser.",
  "linkedRecipeSlug": "croissant",
  "linkedRecipeTitle": "Croissant Parfait — Feuilletage Maison | Chef Augustin",
  "anchorText": "notre recette du croissant parfait",
  "tags": ["réaction de Maillard", "science culinaire", "température", "croûte dorée", "technique"],
  "jsonLd": { ... }
}
```
```

- [ ] **Step 2: Vérifier que le skill est référençable**

Le nom de fichier `skills/agent-aor-writer.md` doit correspondre à l'appel `loadSkillContent("agent-aor-writer")` dans le runtime (Task 2). Vérifier que `loadSkillContent` lit les fichiers `.md` depuis `skills/` :

```bash
grep -n 'loadSkillContent\|skills/' lib/skills.ts | head -5
```

Expected: La fonction charge depuis le dossier `skills/`.

- [ ] **Step 3: Commit**

```bash
git add skills/agent-aor-writer.md
git commit -m "feat: add Aor Writer skill — 11 sections, anti-duplicate rules, JSON-LD Article

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Step 13 + Semantic Linker dans generate-recipe.ts

**Files:**
- Modify: `lib/inngest/functions/generate-recipe.ts`

**Interfaces:**
- Consumes: `agentAorWriter` from `./agents/aor-writer`, `agentImagePromptOptimizer` (existing), `runImage` from `@/lib/agents/cloudflare`, `uploadImage` from `@/lib/agents/cloudinary`, `slugify` from `@/lib/slug`
- Produces: Step 13 `agent-6-aor-article` (conditionnel), Semantic Linker inline

- [ ] **Step 1: Ajouter l'import de l'agent Aor Writer**

En haut de `generate-recipe.ts`, dans la section des imports d'agents, ajouter après les autres imports :

```typescript
import { agentAorWriter } from "./agents/aor-writer"
import type { AorCategory } from "./agents/aor-writer"
```

- [ ] **Step 2: Ajouter `aorCategory` et `aorAngle` dans le type des données Inngest**

Repérer l'interface ou le type des données Inngest (généralement défini via `z.object` ou inline au début du fichier). Ajouter les champs optionnels :

```typescript
// Dans l'event data type :
aorCategory?: string   // "techniques" | "guides" | "histoire" | "equipement"
aorAngle?: string      // optionnel — angle éditorial
```

- [ ] **Step 3: Ajouter Step 13 après Step 12 (A/B Tracking)**

Repérer la fin du Step 12 (A/B Tracking). Insérer Step 13 après :

```typescript
      // =====================================================================
      // Step 13 — Agent 6: Aor Article (optionnel, warning)
      // =====================================================================
      if (event.data.aorCategory) {
        try {
          await step.run("agent-6-aor-article", async () => {
            await appendLog(
              recipeId,
              logEntry("Aor Writer", "running",
                `Generating ${event.data.aorCategory} article — angle: ${event.data.aorAngle || "auto-deduced"}`),
            )

            const validCategories: AorCategory[] = ["techniques", "guides", "histoire", "equipement"]
            const category = validCategories.includes(event.data.aorCategory as AorCategory)
              ? (event.data.aorCategory as AorCategory)
              : "techniques"

            const recipeUrl = `https://lecarnetgourmand.fr/recettes/${finalRecipe!.slug}`

            const aorResult = await agentAorWriter({
              keyword,
              recipeTitle: finalRecipe!.title,
              recipeSlug: finalRecipe!.slug,
              recipeUrl,
              seoPlan,
              serp: structuredSerp as Record<string, unknown>,
              aorCategory: category,
              aorAngle: event.data.aorAngle ?? null,
            })

            // Ensure unique slug
            let articleSlug = slugify(aorResult.slug) || slugify(aorResult.title) || "article"
            const baseSlug = articleSlug
            let suffix = 0
            while (true) {
              const existing = await db.query.recipes.findFirst({
                where: (r, { eq, and }) =>
                  and(eq(r.slug, articleSlug), eq(r.content_type, "article")),
              })
              if (!existing) break
              suffix += 1
              articleSlug = `${baseSlug}-${suffix}`
            }

            // Generate hero image
            await appendLog(recipeId, logEntry("Aor Image", "running",
              "Optimizing image prompt for article angle"))
            const imagePrompt = await agentImagePromptOptimizer({
              title: aorResult.title,
              tags: aorResult.tags,
              keyword,
            })
            await appendLog(recipeId, logEntry("Aor Image", "running",
              "Generating article image via FLUX-1-Schnell"))
            const imageBuffer = await runImage(imagePrompt)
            const imageUrl = await uploadImage(imageBuffer, {
              folder: "articles",
              publicId: `article-${articleSlug}`,
            })
            await appendLog(recipeId, logEntry("Aor Image", "done",
              "Article image uploaded to Cloudinary"))

            // Enrich JSON-LD with dynamic fields
            const now = new Date().toISOString()
            const categoryLabels: Record<string, string> = {
              techniques: "Techniques",
              guides: "Guides",
              histoire: "Histoire",
              equipement: "Équipement",
            }
            const categoryLabel = categoryLabels[category] || "Techniques"
            const enrichedJsonLd = {
              ...aorResult.jsonLd,
              "@graph": ((aorResult.jsonLd["@graph"] as Record<string, unknown>[]) ?? []).map(node => {
                if (node["@type"] === "Article") {
                  return {
                    ...node,
                    datePublished: now,
                    dateModified: now,
                    image: imageUrl,
                    mainEntityOfPage: `https://lecarnetgourmand.fr/${category}/${articleSlug}`,
                  }
                }
                return node
              }),
            }

            // Semantic Linker — inject link into article contentMarkdown
            const linkPhrase = `Cette technique est magnifiquement illustrée dans [${aorResult.anchorText}](/${category === "equipement" ? "equipement" : category}/${aorResult.linkedRecipeSlug || finalRecipe!.slug}), où chaque détail compte.`
            const linkedContent = aorResult.contentMarkdown.replace(
              /\n\n(?=## )/,
              `\n\n${linkPhrase}\n\n`,
            )

            // Insert article into DB
            const [articleRow] = await db
              .insert(recipes)
              .values({
                slug: articleSlug,
                keyword,
                title: aorResult.title,
                metaTitle: aorResult.metaTitle,
                metaDescription: aorResult.metaDescription,
                contentMarkdown: linkedContent,
                excerpt: aorResult.excerpt,
                status: "draft",
                content_type: "article",
                category,
                linked_content_id: recipeId,
                heroImageUrl: imageUrl,
                tags: aorResult.tags,
                jsonLd: enrichedJsonLd,
                workflowLog: [],
              })
              .returning({ id: recipes.id })

            // Reverse link — add mention in the recipe
            if (articleRow?.id && finalRecipe) {
              const reverseLink = `\n\n### Pour Aller Plus Loin\n\nPour comprendre la science derrière cette recette, consultez [notre article : ${aorResult.title}](/articles/${articleSlug}).`
              const updatedRecipeContent = (finalRecipe.contentMarkdown ?? "") + reverseLink
              await db
                .update(recipes)
                .set({
                  contentMarkdown: updatedRecipeContent,
                  linked_content_id: articleRow.id,
                })
                .where(eq(recipes.id, recipeId))
            }

            await appendLog(recipeId, logEntry("Aor Writer", "done",
              `Article "${aorResult.title}" published — /${category}/${articleSlug} — linked to recipe #${recipeId}`))

            // Track in self-improvement
            await appendLog(recipeId, logEntry("Self-Improvement", "done",
              `Aor article saved: /${category}/${articleSlug}`))
          })
        } catch (err) {
          await logPipelineError({
            recipeId,
            stepName: "agent-6-aor-article",
            errorType: "unknown",
            message: (err as Error).message,
            severity: "warning",
          })
          await appendLog(recipeId, logEntry("Aor Writer", "error",
            `Aor article generation failed (non-blocking): ${(err as Error).message}`))
        }
      }
```

- [ ] **Step 4: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: No errors. Corriger les imports manquants si nécessaire.

- [ ] **Step 5: Commit**

```bash
git add lib/inngest/functions/generate-recipe.ts
git commit -m "feat: add Step 13 — Aor Article generator with Semantic Linker

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Template page `[category]/[slug]`

**Files:**
- Create: `app/[category]/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getArticleBySlug` from `@/lib/queries`, `getRelatedForArticle` from `@/lib/queries`, `SiteHeader`, `SiteFooter`, `RecipeCard`
- Produces: SSR page for Aor articles at `/[category]/[slug]`

- [ ] **Step 1: Ajouter les fonctions de requête dans `lib/queries.ts`**

Ajouter après `getRecipeBySlug` :

```typescript
export async function getArticleBySlug(slug: string) {
  const rows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
    .limit(1)
  return rows[0] ?? null
}

export async function getRelatedForArticle(linkedRecipeId: number | null) {
  if (!linkedRecipeId) return []
  // Return the linked recipe + up to 2 other published recipes
  const linked = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, linkedRecipeId))
    .limit(1)
  const others = await db
    .select()
    .from(recipes)
    .where(
      and(
        eq(recipes.status, "published"),
        eq(recipes.content_type, "recipe"),
        ne(recipes.id, linkedRecipeId),
      ),
    )
    .limit(2)
  return [...linked, ...others]
}
```

- [ ] **Step 2: Créer `app/[category]/[slug]/page.tsx`**

```typescript
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { getArticleBySlug, getRelatedForArticle } from "@/lib/queries"
import { MarkdownRenderer } from "@/components/markdown-renderer"

export const revalidate = 300
export const dynamicParams = true

const CATEGORY_LABELS: Record<string, string> = {
  techniques: "Techniques",
  guides: "Guides",
  histoire: "Histoire",
  equipement: "Équipement",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published" && article.status !== "draft") {
    return { title: "Article not found" }
  }
  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt || undefined,
    alternates: { canonical: `/${article.category}/${article.slug}` },
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || undefined,
      type: "article",
      images: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    },
  }
}

function ArticleJsonLd({
  article,
}: {
  article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>
}) {
  const base = (article.jsonLd as Record<string, unknown>) ?? {}
  if (base["@graph"] && Array.isArray(base["@graph"])) {
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(base),
        }}
      />
    )
  }
  // Fallback
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.metaDescription || article.excerpt,
          author: { "@type": "Person", name: "Chef Augustin Lefèvre" },
          datePublished: article.publishedAt?.toISOString(),
          image: article.heroImageUrl,
        }),
      }}
    />
  )
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || (article.status !== "published" && article.status !== "draft")) {
    notFound()
  }

  const relatedRecipes = await getRelatedForArticle(article.linked_content_id as number | null)
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Blog"

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <Link
            href={`/${article.category}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {categoryLabel}
          </Link>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-8">
          {/* Hero Image */}
          {article.heroImageUrl ? (
            <div className="mb-8 overflow-hidden rounded-2xl">
              <img
                src={article.heroImageUrl}
                alt={article.title}
                className="w-full object-cover aspect-[16/9]"
              />
            </div>
          ) : null}

          {/* Header */}
          <header className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {categoryLabel}
              </span>
              {article.publishedAt ? (
                <time dateTime={new Date(article.publishedAt).toISOString()}>
                  {new Date(article.publishedAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              ) : null}
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {article.title}
            </h1>
          </header>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={article.contentMarkdown ?? ""} />
          </div>
        </article>

        <ArticleJsonLd article={article} />

        {/* Related Recipes */}
        {relatedRecipes.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="mb-8 font-serif text-2xl text-balance">
              Recettes Associées
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 3: Vérifier que `MarkdownRenderer` existe**

```bash
ls components/markdown-renderer.tsx 2>/dev/null || echo "Not found — creating it"
```

Si le composant n'existe pas, le créer :

```typescript
// components/markdown-renderer.tsx
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function MarkdownRenderer({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
}
```

- [ ] **Step 4: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/[category]/[slug]/page.tsx lib/queries.ts components/markdown-renderer.tsx
git commit -m "feat: add Aor article page template [category]/[slug] with JSON-LD

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: API routes + Server Actions pour articles

**Files:**
- Create: `app/api/articles/raw/route.ts`
- Create: `app/api/articles/raw/[slug]/route.ts`
- Create: `app/actions/articles.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db`, `recipes` table
- Produces: `GET /api/articles/raw`, `GET /api/articles/raw/[slug]`, `publishArticle()`, `deleteArticle()`

- [ ] **Step 1: Créer `app/api/articles/raw/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(recipes)
      .where(eq(recipes.content_type, "article"))
      .orderBy(recipes.id)
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Créer `app/api/articles/raw/[slug]/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const row = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
      .limit(1)
    if (!row.length) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }
    return NextResponse.json(row[0])
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 3: Créer `app/actions/articles.ts`**

```typescript
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

function checkAuth() {
  const token = cookies().get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    throw new Error("Unauthorized")
  }
}

export async function publishArticle(slug: string) {
  checkAuth()
  await db
    .update(recipes)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
}

export async function deleteArticle(slug: string) {
  checkAuth()
  await db
    .delete(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
  redirect("/dashboard")
}
```

- [ ] **Step 4: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/articles/ app/actions/articles.ts
git commit -m "feat: add article API routes + server actions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: JSON-LD fixes on recipe pages + sitemap

**Files:**
- Modify: `app/recettes/[slug]/page.tsx`
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: `getRecipeBySlug`, `getPublishedRecipes`, `getArticleBySlug`
- Produces: Corrected Recipe JSON-LD with `@id` and `mainEntity`, sitemap with article URLs

- [ ] **Step 1: Corriger le JSON-LD des recettes — ajouter `@id` et `mainEntity`**

Dans `app/recettes/[slug]/page.tsx`, fonction `RecipeJsonLd`, enrichir le nœud BlogPosting :

```typescript
// Dans la boucle enrichedGraph.map((node) => { ... })
// Après le bloc if (node["@type"] === "Recipe"), ajouter :
      if (node["@type"] === "BlogPosting") {
        return {
          ...node,
          mainEntity: { "@id": "#recipe" },
          publisher: {
            "@type": "Organization",
            "name": "Le Carnet Gourmand",
            "url": "https://lecarnetgourmand.fr",
          },
        }
      }
```

Et ajouter `"@id": "#recipe"` au nœud Recipe :

```typescript
      if (node["@type"] === "Recipe") {
        return {
          ...node,
          "@id": "#recipe",
          name: recipe.title,
          // ... le reste inchangé
        }
      }
```

- [ ] **Step 2: Mettre à jour le sitemap**

Dans `app/sitemap.ts`, ajouter les URLs des articles :

```typescript
// Après la requête getPublishedRecipes(), ajouter :
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Dans la fonction sitemap() :
const articles = await db
  .select({ slug: recipes.slug, category: recipes.category, updatedAt: recipes.updatedAt })
  .from(recipes)
  .where(eq(recipes.content_type, "article"))

const articleUrls = articles.map((a) => ({
  url: `https://lecarnetgourmand.fr/${a.category}/${a.slug}`,
  lastModified: a.updatedAt ?? new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.7,
}))

// Ajouter articleUrls au return : ...recipeUrls, ...articleUrls
```

- [ ] **Step 3: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/recettes/[slug]/page.tsx app/sitemap.ts
git commit -m "fix: JSON-LD @id + mainEntity + publisher on recipe pages, articles in sitemap

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Validation API + Vérification finale

**Files:**
- Modify: `app/api/recipes/generate/route.ts`
- Modify: `scripts/test-pipeline.ts`

**Interfaces:**
- Consumes: `AorCategory` type from agent
- Produces: Validated `aorCategory` param, passing test suite

- [ ] **Step 1: Ajouter la validation des nouveaux paramètres dans la route generate**

Dans `app/api/recipes/generate/route.ts`, après la validation de `keyword`, ajouter :

```typescript
  // Aor article params (Step 13 — optional)
  const validAorCategories = ["techniques", "guides", "histoire", "equipement"]
  let aorCategory: string | undefined
  let aorAngle: string | undefined

  if (body?.generateAorArticle === true) {
    aorCategory = body?.aorCategory?.toString().trim()
    if (!aorCategory || !validAorCategories.includes(aorCategory)) {
      return NextResponse.json(
        {
          error: `aorCategory invalide. Valeurs acceptées : ${validAorCategories.join(", ")}`,
        },
        { status: 400 },
      )
    }
    aorAngle = body?.aorAngle?.toString().trim() || undefined
  }
```

Et dans l'appel `inngest.send`, ajouter les nouveaux champs :

```typescript
  await inngest.send({
    name: "recipe/generate",
    data: {
      recipeId: created.id,
      keyword,
      ...(aorCategory ? { aorCategory, aorAngle } : {}),
    },
  })
```

- [ ] **Step 2: Ajouter un test de validation aorCategory**

Dans `scripts/test-pipeline.ts`, ajouter un test :

```typescript
// Test 9: aorCategory validation
{
  const validCategories = ["techniques", "guides", "histoire", "equipement"]
  const invalid = "cuisine"
  const result = validCategories.includes(invalid)
  console.assert(result === false, "invalid aorCategory should be rejected")
  console.assert(validCategories.includes("techniques"), "techniques should be valid")
  console.log("  ✅ Test 9: aorCategory validation passed")
}
```

- [ ] **Step 3: Lancer la suite de tests**

```bash
npm run test:pipeline
```

Expected: 9/9 passent.

- [ ] **Step 4: Lancer la vérification TypeScript et lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: No errors.

- [ ] **Step 5: Commit final**

```bash
git add app/api/recipes/generate/route.ts scripts/test-pipeline.ts
git commit -m "feat: add aorCategory validation + test coverage

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Vérification finale

```bash
# 1. Tous les tests passent
npm run test:pipeline   # Expected: 9/9

# 2. Compilation propre
npx tsc --noEmit        # Expected: no errors

# 3. Lint propre
npm run lint            # Expected: no errors

# 4. Schéma DB à jour
npx drizzle-kit push    # Expected: no pending changes

# 5. Smoke test complet
# Lancer le serveur, générer une recette avec generateAorArticle=true,
# vérifier que l'article est bien créé et le lien bidirectionnel injecté
```
