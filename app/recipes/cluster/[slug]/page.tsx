/**
 * /recipes/cluster/[slug] — Clean cluster hub URLs (v14.4)
 *
 * Replaces the old ?cluster= query parameter with static paths.
 * Each cluster is a pillar page in the hub-and-spoke topical architecture.
 */
import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { searchPublishedRecipes, getRecipeCategories } from "@/lib/queries"
import { resolveCluster, getClusterById, getAllClusters } from "@/lib/cluster-resolver"
import { tagToSlug } from "@/lib/tag-utils"
import { CANONICAL_CATEGORIES } from "@/lib/category-consolidation"


export async function generateStaticParams() {
  const clusters = getAllClusters()
  return clusters.map((c) => ({ slug: c.id }))
}

// Unknown cluster slugs must return a true 404, not a soft-404 200
// (Seobility/audit 2026-08-05).
export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cluster = getClusterById(slug)

  if (!cluster) notFound()

  // Cluster names already end with "for Two" — append the suffix only when
  // needed to avoid "One-Pan Dinners for Two — Dinners for Two" (word repetition).
  const suffix = cluster.name.toLowerCase().endsWith("for two") ? "" : " — Dinners for Two"

  return {
    title: `${cluster.name}${suffix}`,
    description: cluster.description,
    alternates: { canonical: `/recipes/cluster/${slug}` },
    robots: "index, follow",
    openGraph: {
      title: cluster.name,
      description: cluster.description,
      type: "website",
    },
  }
}

export default async function ClusterPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cluster = getClusterById(slug)

  if (!cluster) notFound()

  // Backward-compatible: if someone hits /recipes?cluster=X, redirect to clean URL.
  // (Handled by the recipes page, not here — this page is the canonical destination.)

  const [allRecipes, categories] = await Promise.all([
    searchPublishedRecipes(undefined, undefined),
    getRecipeCategories(),
  ])

  // Filter recipes by cluster tag match
  const displayRecipes = allRecipes.filter((r) => {
    const rc = resolveCluster((r.tags ?? []) as string[])
    return rc?.id === cluster.id
  })

  // Stats
  const totalTimeMinutes = displayRecipes.reduce((sum, r) => {
    const match = (r.totalTime ?? "").match(/(\d+)/)
    return sum + (match ? parseInt(match[1], 10) : 25)
  }, 0)
  const avgTime = displayRecipes.length > 0
    ? Math.round(totalTimeMinutes / displayRecipes.length)
    : null

  // Sibling clusters for cross-linking
  const siblingClusters = cluster.siblings
    .map((id) => getClusterById(id))
    .filter((c): c is NonNullable<typeof c> => {
      if (!c) return false
      return allRecipes.some((r) => {
        const rc = resolveCluster((r.tags ?? []) as string[])
        return rc?.id === c.id
      })
    })
    .slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recipes" },
            { label: cluster.name, href: `/recipes/cluster/${slug}` },
          ]}
        />

        <header className="mt-4 mb-8">
          <h1 className="font-serif text-4xl text-balance">{cluster.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            {cluster.description}
          </p>
          {/* Stats row */}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {displayRecipes.length} recipe{displayRecipes.length !== 1 ? "s" : ""}
            </span>
            {avgTime ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                ~{avgTime} min avg
              </span>
            ) : null}
          </div>
        </header>

        {displayRecipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No recipes in this category yet. Check back soon!
            </p>
          </div>
        ) : (
          <>
            <h2 className="sr-only">{cluster.name} recipes</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
          </>
        )}

        {/* Browse all categories — canonical only (merged thin categories 301
            to their parent — lib/category-consolidation.ts) */}
        <section className="mt-16 border-t border-border pt-14 text-center">
          <h2 className="font-serif text-2xl">Browse by ingredient</h2>
          <p className="mt-2 mb-6 text-muted-foreground">
            Explore recipes by ingredient, technique, or cuisine.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.filter((cat) => CANONICAL_CATEGORIES.has(cat.toLowerCase())).map((cat) => (
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

        {/* Cross-links to sibling clusters */}
        {siblingClusters.length > 0 ? (
          <section className="mt-16 border-t border-border pt-14">
            <h2 className="font-serif text-2xl mb-6">Explore more dinners for two</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siblingClusters.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/recipes/cluster/${sibling.id}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <h3 className="font-serif text-lg group-hover:text-primary transition-colors">
                    {sibling.name}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
