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
    title: `${tag} Recipes for Two — Easy Weeknight Dinners`,
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
          <h1 className="font-serif text-4xl text-balance">{tag} Recipes for Two</h1>
          <div className="mt-3 max-w-2xl text-muted-foreground leading-relaxed space-y-3">
            <p>
              Looking for the best <strong>{tag}</strong> recipes for two people?
              You&rsquo;re in the right place. Our collection of {recipes.length}{" "}
              {tag.toLowerCase()} recipe{recipes.length !== 1 ? "s" : ""} brings
              professional French technique to your weeknight table — scaled down,
              tested, and ready when you are.
            </p>
            <p>
              {recipes.length === 1
                ? `This ${tag.toLowerCase()} recipe is the only one you need — developed, tested, and scaled for two people with no leftovers and no wasted ingredients.`
                : `All ${recipes.length} ${tag.toLowerCase()} recipes are developed for two people: no leftovers that die in the back of the fridge, no ingredient waste, and no compromise on flavor. Whether you're after a quick weeknight fix or a slow-cooked weekend project, each recipe is tested at two-serving scale so it works the first time.`
              }
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <h2 className="sr-only">{tag} recipes</h2>
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

        {/* Why this category works for two */}
        {recipes.length > 0 ? (
          <section className="mt-14 border-t border-border pt-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-serif text-2xl">Why {tag} recipes work for two</h2>
              <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Cooking {tag.toLowerCase()} for two people isn&rsquo;t just about dividing a larger recipe in half.
                  Pan sizes change, cooking times shift, and ingredient proportions need recalibrating.
                  A skillet that&rsquo;s too wide burns off your sauce; one that&rsquo;s too crowded steams instead of sears.
                  Every recipe in this collection is developed and tested at two-serving scale, so the techniques
                  and timings are exactly right.
                </p>
                <p>
                  {recipes.length === 1
                    ? `This single ${tag.toLowerCase()} recipe packs everything you need — no filler, no fluff, just one reliable dish that works every time.`
                    : `With ${recipes.length} tested ${tag.toLowerCase()} recipes to choose from, you can plan anything from a 15-minute weeknight staple to a slow weekend project. Each one is written with clear steps, exact pan sizes, and real-world timing so you can cook with confidence — even on a Tuesday night after work.`
                  }
                </p>
                <p>
                  Got leftovers? Most recipes here make exactly two servings. Some make enough for lunch the next day —
                  intentional leftovers that actually reheat well, not the sad container that gets pushed to the back
                  of the fridge. Because cooking for two should mean less waste, not less ambition.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* BreadcrumbList JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.chefaugustin.com/" },
                { "@type": "ListItem", position: 2, name: "Recipes", item: "https://www.chefaugustin.com/recipes" },
                { "@type": "ListItem", position: 3, name: tag, item: `https://www.chefaugustin.com/recipes/category/${slug}` },
              ],
            }),
          }}
        />

        {/* Cross-link to all categories */}
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
