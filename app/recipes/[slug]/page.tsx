import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeArticle } from "@/components/recipe-article"
import { JumpToRecipeDesktop, JumpToRecipeMobile } from "@/components/jump-to-recipe"
import { getRecipeBySlug, getPublishedRecipesLight, getLinkedArticle, getRecipeRating } from "@/lib/queries"

// SSG pure — pages generated at build time, regenerated on-demand via revalidatePath()
export const dynamicParams = true

export async function generateStaticParams() {
  const recipes = await getPublishedRecipesLight()
  return recipes.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe || recipe.status !== "published") {
    return { title: "Recipe not found" }
  }
  return {
    title: recipe.metaTitle || recipe.title,
    description: recipe.metaDescription || recipe.excerpt || undefined,
    alternates: {
      canonical: `/recipes/${recipe.slug}`,
    },
    openGraph: {
      title: recipe.metaTitle || recipe.title,
      description: recipe.metaDescription || recipe.excerpt || undefined,
      type: "article",
      url: `/recipes/${recipe.slug}`, // audit 2026-08-08 P2-10 (og:url → homepage sinon)
      images: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: recipe.metaTitle || recipe.title,
      description: recipe.metaDescription || recipe.excerpt || undefined,
      images: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
    },
  }
}

// Cuisine mapping — the mega-skill fills recipeCuisine with tag-like values
// ("Easy Weeknight Dinners for Two") instead of a valid cuisine ("American").
// Derive it deterministically from tags instead; "American" is the default
// position (easy weeknight dinners), overridden when a tag names a cuisine.
const CUISINE_TAGS: Record<string, string> = {
  italian: "Italian",
  french: "French",
  mexican: "Mexican",
  asian: "Asian",
  chinese: "Chinese",
  japanese: "Japanese",
  indian: "Indian",
  mediterranean: "Mediterranean",
  thai: "Thai",
  spanish: "Spanish",
  greek: "Greek",
}

function deriveCuisine(tags: string[] | null | undefined): string {
  for (const tag of tags ?? []) {
    for (const [key, cuisine] of Object.entries(CUISINE_TAGS)) {
      if (tag.includes(key)) return cuisine
    }
  }
  return "American"
}

function RecipeJsonLd({
  recipe,
  ratingAvg,
  ratingCount,
}: {
  recipe: NonNullable<Awaited<ReturnType<typeof getRecipeBySlug>>>
  ratingAvg: number | null
  ratingCount: number
}) {
  const base = (recipe.jsonLd as Record<string, unknown>) ?? {}

  // v5.2+ pipeline: @graph container with Recipe + BlogPosting + FAQPage + BreadcrumbList
  if (base["@graph"] && Array.isArray(base["@graph"])) {
    const graph = base["@graph"] as Record<string, unknown>[]
    // Merge dynamic fields into the Recipe node, deduplicate BreadcrumbList
    const seenTypes = new Set<string>()
    const enrichedGraph = graph
      .filter((node) => {
        const type = node["@type"] as string | undefined
        if (!type) return true
        // Breadcrumbs component already emits BreadcrumbList globally — skip to avoid duplicate
        if (type === "BreadcrumbList") return false
        if (seenTypes.has(type)) return false // skip duplicates
        seenTypes.add(type)
        return true
      })
      .map((node) => {
      if (node["@type"] === "BlogPosting") {
        // Enrich author with url for E-E-A-T signal
        const author = (node.author as Record<string, unknown>) ?? {}
        return {
          ...node,
          author: {
            ...author,
            url: author.url || `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"}/about`,
          },
          image: (node.image === "<placeholder>" || !node.image)
            ? (recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined)
            : node.image,
          mainEntity: { "@id": "#recipe" },
          datePublished: recipe.publishedAt?.toISOString(),
          dateModified: recipe.updatedAt?.toISOString(),
          publisher: {
            "@type": "Organization",
            name: "Chef Augustin",
            url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com",
          },
        }
      }
      if (node["@type"] === "Recipe") {
        // recipeCuisine is overridden deterministically below (deriveCuisine) —
        // the LLM value is dropped because the mega-skill fills it with tag-like
        // values ("Easy Weeknight Dinners for Two") instead of a valid cuisine.
        const cleanNode = node as Record<string, unknown>
        // author is a required property for Google Recipe rich results; the LLM
        // sometimes omits it from the Recipe node (it lives on BlogPosting only).
        // Enrich/fallback here so every recipe is eligible.
        const author = (node.author as Record<string, unknown>) ?? {}
        const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"
        return {
          ...cleanNode,
          "@id": "#recipe",
          author: Object.keys(author).length
            ? { ...author, url: author.url || `${SITE}/about` }
            : { "@type": "Person", name: "Chef Augustin Lefèvre", url: `${SITE}/about` },
          name: recipe.title,
          description: recipe.metaDescription || recipe.excerpt || undefined,
          image: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
          datePublished: recipe.publishedAt?.toISOString(),
          dateModified: recipe.updatedAt?.toISOString() || node.dateModified,
          recipeYield: recipe.servings || node.recipeYield || undefined,
          keywords: (recipe.tags ?? []).join(", ") || recipe.keyword,
          // Single category value (schema.org expects one category, not a
          // comma-joined tag list redundant with keywords) — audit 2026-08-08 P2-11
          recipeCategory: recipe.tags?.[0] || undefined,
          recipeCuisine: deriveCuisine(recipe.tags),
          ...(ratingAvg !== null && ratingCount > 0 ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: String(ratingAvg),
              ratingCount,
              bestRating: "5",
              worstRating: "1",
            },
          } : {}),
          recipeIngredient: (recipe.ingredients ?? []).map((i) =>
            [i.quantity, i.name].filter(Boolean).join(" "),
          ),
          recipeInstructions: (recipe.instructions ?? []).map((s) => ({
            "@type": "HowToStep",
            position: s.step,
            image: s.step === 1 && recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
            name: (() => {
              // Extract a short name from the instruction text (first sentence, max 80 chars)
              const firstSentence = s.text.split(/[.!?][\s\n]/)[0] ?? s.text
              if (firstSentence.length <= 80) return firstSentence
              const cut = firstSentence.substring(0, 80)
              const lastSpace = cut.lastIndexOf(" ")
              return (lastSpace > 40 ? cut.substring(0, lastSpace) : cut) + "…"
            })(),
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

  // Legacy: flat Recipe object (pre-v5.2 pipeline)
  const jsonLd: Record<string, unknown> = {
    ...base,
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.metaDescription || recipe.excerpt || undefined,
    image: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
    datePublished: recipe.publishedAt?.toISOString(),
    author: base.author ?? {
      "@type": "Person",
      name: "Chef Augustin Lefèvre",
    },
    recipeYield: recipe.servings || base.recipeYield || undefined,
    recipeCategory: (recipe.tags ?? []).slice(0, 3).join(", ") || undefined,
    recipeCuisine: deriveCuisine(recipe.tags),
    keywords: (recipe.tags ?? []).join(", ") || recipe.keyword,
    recipeIngredient: (recipe.ingredients ?? []).map((i) =>
      [i.quantity, i.name].filter(Boolean).join(" "),
    ),
    recipeInstructions: (recipe.instructions ?? []).map((s) => ({
      "@type": "HowToStep",
      position: s.step,
      text: s.text,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)

  // Defense-in-depth: getRecipeBySlug already filters status="published" (fix 1.4),
  // but we keep this check in case the query is ever relaxed for dashboard/admin use.
  if (!recipe || recipe.status !== "published") {
    notFound()
  }

  const [linkedArticle, ratings] = await Promise.all([
    getLinkedArticle(recipe.id),
    getRecipeRating(recipe.id),
  ])

  // Rich Pin readiness check (server-side quality gate)
  const richPinReady = {
    claimed_domain: process.env.NEXT_PUBLIC_SITE_URL ? "verified" : "missing",
    recipe_schema_present: !!(recipe.jsonLd),
    open_graph_present: true, // OG tags from generateMetadata()
    required_recipe_fields_present: !!(
      recipe.title && recipe.heroImageUrl &&
      (recipe.ingredients?.length ?? 0) > 0 &&
      (recipe.instructions?.length ?? 0) > 0
    ),
    canonical_url_valid: !!recipe.slug,
    image_url_valid: !!recipe.heroImageUrl,
    status: "pass" as const,
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader actions={<JumpToRecipeDesktop />} />
      <JumpToRecipeMobile />
      <main className="flex-1">
        {/* Breadcrumbs are rendered inside RecipeHero with cluster path for richer SEO */}
        <RecipeArticle recipe={recipe} />

        {/* Linked AOR Article */}
        {linkedArticle ? (
          <section className="mx-auto max-w-3xl px-4 pb-8">
            <Link
              href={`/${linkedArticle.category ?? "techniques"}/${linkedArticle.slug}`}
              className="group flex items-start gap-4 rounded-xl border border-border bg-secondary/20 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30"
            >
              <div className="flex-1">
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  Read the Deep Dive
                </span>
                <h3 className="mt-1 font-serif text-lg leading-snug group-hover:text-primary">
                  {linkedArticle.title}
                </h3>
                {linkedArticle.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {linkedArticle.excerpt}
                  </p>
                ) : null}
              </div>
              <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
            </Link>
          </section>
        ) : null}

      </main>
      <RecipeJsonLd
        recipe={recipe}
        ratingAvg={ratings.avg}
        ratingCount={ratings.count}
      />
      <SiteFooter />
    </div>
  )
}
