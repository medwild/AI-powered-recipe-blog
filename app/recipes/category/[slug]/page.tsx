/**
 * /recipes/category/[slug] — Clean category URLs (v14.3)
 *
 * Replaces the old ?cat= query parameter with static paths.
 * generateStaticParams ensures only known tags are served (404 for made-up slugs).
 */
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { getPublishedRecipes, getRecipeCategories } from "@/lib/queries"
import { tagToSlug, slugToTag } from "@/lib/tag-utils"

export const revalidate = 60

export async function generateStaticParams() {
  const categories = await getRecipeCategories()
  return categories.map((tag) => ({ slug: tagToSlug(tag) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const categories = await getRecipeCategories()
  const tag = slugToTag(slug, categories)

  if (!tag) notFound()

  return {
    title: tag,
    description: `Browse our collection of ${tag.toLowerCase()} recipes — tested, scaled for two, ready tonight.`,
    alternates: { canonical: `/recipes/category/${slug}` },
    robots: "index, follow",
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [allRecipes, categories] = await Promise.all([
    getPublishedRecipes(),
    getRecipeCategories(),
  ])

  const tag = slugToTag(slug, categories)
  if (!tag) {
    // Try to redirect from old ?cat= format (cat query param ended up here somehow)
    // If the slug doesn't match any known tag, 404
    notFound()
  }

  // Filter recipes by tag (case-insensitive)
  const recipes = allRecipes.filter((r) =>
    (r.tags ?? []).some((t: string) => t.toLowerCase() === tag.toLowerCase()),
  )

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recipes" },
            { label: tag, href: `/recipes/category/${slug}` },
          ]}
        />

        <header className="mt-4 mb-8">
          <h1 className="font-serif text-4xl text-balance">{tag}</h1>
          <div className="mt-3 max-w-2xl text-muted-foreground leading-relaxed space-y-3">
            <p>
              Looking for the best <strong>{tag.toLowerCase()}</strong> for two people?
              You&rsquo;re in the right place. Our collection of {recipes.length}{" "}
              {tag.toLowerCase()} recipe{recipes.length !== 1 ? "s" : ""} brings
              professional French technique to your weeknight table — scaled down,
              tested, and ready when you are.
            </p>
            <p>
              Every recipe is developed for couples and small households: no
              leftovers that die in the back of the fridge, no ingredient waste,
              and no compromising on the flavors that make a dish worth cooking
              twice. Whether you&rsquo;re after a quick 30-minute dinner or a
              slow-cooked weekend project, these recipes prove that cooking for
              two is the best way to cook.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        {recipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No recipes in this category yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        )}

        {/* Cross-link to all recipes */}
        <section className="mt-16 border-t border-border pt-14 text-center">
          <h2 className="font-serif text-2xl">Browse all categories</h2>
          <p className="mt-2 mb-6 text-muted-foreground">
            Explore more dinner-for-two recipes by ingredient, technique, or occasion.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.slice(0, 20).map((cat) => (
              <Link
                key={cat}
                href={`/recipes/category/${tagToSlug(cat)}`}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
