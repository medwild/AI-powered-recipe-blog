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
import { searchPublishedRecipes } from "@/lib/queries"
import { resolveCluster, getClusterById, getAllClusters } from "@/lib/cluster-resolver"

export const revalidate = 60

export async function generateStaticParams() {
  const clusters = getAllClusters()
  return clusters.map((c) => ({ slug: c.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cluster = getClusterById(slug)

  if (!cluster) notFound()

  return {
    title: `${cluster.name} — Dinners for Two`,
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

  const allRecipes = await searchPublishedRecipes(undefined, undefined)

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

        {/* Why this cluster matters */}
        {displayRecipes.length > 0 ? (
          <section className="mt-14 border-t border-border pt-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-serif text-2xl">Why {cluster.name.toLowerCase()} matter</h2>
              <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  {cluster.description}
                </p>
                <p>
                  With {displayRecipes.length} recipe{displayRecipes.length !== 1 ? "s" : ""} in this
                  collection, you have a full toolkit for building dinners around this approach.
                  Each recipe is written for two people, tested at that scale, and designed to work
                  in a real home kitchen — not a restaurant line. The techniques you learn here
                  transfer across cuisines: master one pan sauce, and you can adapt it to whatever
                  protein and vegetables are in your fridge this week.
                </p>
                <p>
                  Browse the recipes below, pick one that matches your energy level tonight, and cook
                  with confidence. If you enjoy these, check out the related collections — each one
                  offers a different angle on the same core idea: practical, delicious dinners built
                  for two.
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
                { "@type": "ListItem", position: 3, name: cluster.name, item: `https://www.chefaugustin.com/recipes/cluster/${slug}` },
              ],
            }),
          }}
        />

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
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {sibling.description}
                  </p>
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
