import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeArticle } from "@/components/recipe-article"
import { RecipeCard } from "@/components/recipe-card"
import { getRecipeBySlug, getPublishedRecipes, getRelatedRecipes } from "@/lib/queries"

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const recipes = await getPublishedRecipes()
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
      canonical: `/recettes/${recipe.slug}`,
    },
    openGraph: {
      title: recipe.metaTitle || recipe.title,
      description: recipe.metaDescription || recipe.excerpt || undefined,
      type: "article",
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

function RecipeJsonLd({
  recipe,
}: {
  recipe: NonNullable<Awaited<ReturnType<typeof getRecipeBySlug>>>
}) {
  const base = (recipe.jsonLd as Record<string, unknown>) ?? {}

  // v5.2+ pipeline: @graph container with Recipe + BlogPosting + FAQPage + BreadcrumbList
  if (base["@graph"] && Array.isArray(base["@graph"])) {
    const graph = base["@graph"] as Record<string, unknown>[]
    // Merge dynamic fields into the Recipe node
    const enrichedGraph = graph.map((node) => {
      if (node["@type"] === "BlogPosting") {
        return {
          ...node,
          mainEntity: { "@id": "#recipe" },
          publisher: {
            "@type": "Organization",
            name: "Chef Augustin",
            url: "https://chefaugustin.com",
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

  if (!recipe || recipe.status !== "published") {
    notFound()
  }

  const relatedRecipes = await getRelatedRecipes(recipe.id, recipe.tags ?? [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <Link
            href="/recettes"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All recipes
          </Link>
        </div>
        <RecipeArticle recipe={recipe} />
        <RecipeJsonLd recipe={recipe} />

        {relatedRecipes.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="mb-8 font-serif text-2xl text-balance">
              More Recipes You'll Love
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
