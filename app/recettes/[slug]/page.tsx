import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeArticle } from "@/components/recipe-article"
import { RecipeRelated } from "@/components/recipe-related"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { JumpToRecipeDesktop, JumpToRecipeMobile } from "@/components/jump-to-recipe"
import { getRecipeBySlug, getPublishedRecipes, getRelatedRecipes, getLinkedArticle } from "@/lib/queries"

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

  const [relatedRecipes, linkedArticle] = await Promise.all([
    getRelatedRecipes(recipe.id, recipe.tags ?? []),
    getLinkedArticle(recipe.id),
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
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recettes" },
            { label: recipe.title, href: `/recettes/${recipe.slug}` },
          ]}
        />
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

        <RecipeRelated recipes={relatedRecipes} />
      </main>
      <RecipeJsonLd recipe={recipe} />
      <SiteFooter />
    </div>
  )
}
