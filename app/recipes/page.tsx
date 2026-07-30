import { Suspense } from "react"
import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { permanentRedirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { ArticleCard } from "@/components/article-card"
import { Breadcrumbs } from "@/components/breadcrumbs"

const RecipeSearch = dynamic(() => import("@/components/recipe-search").then((m) => m.RecipeSearch))
import { searchPublishedRecipes, getRecipeCategories, getPublishedArticles } from "@/lib/queries"
import { resolveCluster, getClusterById, getAllClusters } from "@/lib/cluster-resolver"
import { tagToSlug } from "@/lib/tag-utils"

export const revalidate = 60

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; cluster?: string }>
}): Promise<Metadata> {
  const { q, cat, cluster } = await searchParams
  const isFiltered = !!(q || cat)

  if (cluster) {
    const c = getClusterById(cluster)
    if (c) {
      return {
        title: c.name,
        description: c.description,
        alternates: { canonical: `/recipes?cluster=${cluster}` },
        robots: "index, follow",
        openGraph: {
          title: c.name,
          description: c.description,
          type: "website",
        },
      }
    }
  }

  return {
    title: "All recipes",
    description:
      "Browse our collection of French cooking recipes, optimized and explained step by step.",
    alternates: { canonical: "/recipes" },
    robots: isFiltered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "All recipes | Chef Augustin",
      description:
        "Browse our collection of French cooking recipes, optimized and explained step by step.",
      type: "website",
    },
  }
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; cluster?: string }>
}) {
  const { q, cat, cluster } = await searchParams

  // Redirect ?cat=X to /recipes/category/{slug} (301 permanent)
  if (cat) {
    permanentRedirect(`/recipes/category/${tagToSlug(cat)}`)
  }

  const [recipes, categories, articles] = await Promise.all([
    searchPublishedRecipes(q, cat),
    getRecipeCategories(),
    getPublishedArticles(),
  ])

  // Hub mode: filter by cluster
  const clusterData = cluster ? getClusterById(cluster) : null
  const displayRecipes = clusterData
    ? recipes.filter((r) => {
        const rc = resolveCluster((r.tags ?? []) as string[])
        return rc?.id === cluster
      })
    : recipes

  const displayArticles = articles.slice(0, 3)

  // Hub page stats
  const totalTimeMinutes = clusterData
    ? displayRecipes.reduce((sum, r) => {
        const match = (r.totalTime ?? "").match(/(\d+)/)
        return sum + (match ? parseInt(match[1], 10) : 25)
      }, 0)
    : 0
  const avgTime = displayRecipes.length > 0
    ? Math.round(totalTimeMinutes / displayRecipes.length)
    : null

  // Sibling clusters for cross-linking
  const siblingClusters = clusterData
    ? clusterData.siblings
        .map((id) => getClusterById(id))
        .filter((c): c is NonNullable<typeof c> => {
          if (!c) return false
          // Only show siblings that have at least 1 published recipe
          return recipes.some((r) => {
            const rc = resolveCluster((r.tags ?? []) as string[])
            return rc?.id === c.id
          })
        })
        .slice(0, 3)
    : []

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={
            clusterData
              ? [
                  { label: "Home", href: "/" },
                  { label: "Recipes", href: "/recipes" },
                  { label: clusterData.name, href: `/recipes?cluster=${cluster}` },
                ]
              : [
                  { label: "Home", href: "/" },
                  { label: "Recipes", href: "/recipes" },
                ]
          }
        />

        {clusterData ? (
          /* ── Hub Mode ── */
          <>
            <header className="mt-4 mb-8">
              <h1 className="font-serif text-4xl text-balance">{clusterData.name}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
                {clusterData.description}
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
          </>
        ) : (
          /* ── Default Mode ── */
          <header className="mt-4 mb-8">
            <h1 className="font-serif text-4xl text-balance">All recipes</h1>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Simple, small-batch recipes for real weeknights and practical home
              cooking. Browse by search or filter.
            </p>
          </header>
        )}

        {/* Search — only in default mode */}
        {!clusterData ? (
          <div className="mb-8">
            <Suspense>
              <RecipeSearch
                categories={categories}
                currentSearch={q || ""}
                currentCategory={cat || ""}
              />
            </Suspense>
          </div>
        ) : null}

        {/* Recipe Grid */}
        {displayRecipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {clusterData
                ? "No recipes in this category yet. Check back soon!"
                : q || cat
                  ? "No recipes match your search."
                  : "No recipes published yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        )}

        {/* Hub: Cross-links to sibling clusters */}
        {clusterData && siblingClusters.length > 0 ? (
          <section className="mt-16 border-t border-border pt-14">
            <h2 className="font-serif text-2xl mb-6">Explore more dinners for two</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siblingClusters.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/recipes?cluster=${sibling.id}`}
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

        {/* Cross-link: Related Articles (default mode only) */}
        {!clusterData && displayArticles.length > 0 && !q && !cat ? (
          <section className="mt-16 border-t border-border pt-14">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-serif text-2xl">Cooking Tips &amp; Guides</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Learn the techniques behind the recipes.
                </p>
              </div>
              <Link
                href="/techniques"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
