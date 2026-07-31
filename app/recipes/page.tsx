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
import { getClusterById } from "@/lib/cluster-resolver"
import { tagToSlug } from "@/lib/tag-utils"

export const revalidate = 60

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; cluster?: string }>
}): Promise<Metadata> {
  const { q, cat, cluster } = await searchParams
  const isFiltered = !!(q || cat)

  // Redirect ?cluster= to clean /recipes/cluster/[slug] URLs (301 permanent)
  if (cluster && getClusterById(cluster)) {
    permanentRedirect(`/recipes/cluster/${cluster}`)
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

  // Redirect ?cluster=X to /recipes/cluster/{slug} (301 permanent)
  if (cluster && getClusterById(cluster)) {
    permanentRedirect(`/recipes/cluster/${cluster}`)
  }

  const [recipes, categories, articles] = await Promise.all([
    searchPublishedRecipes(q, cat),
    getRecipeCategories(),
    getPublishedArticles(),
  ])

  const displayArticles = articles.slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recipes" },
          ]}
        />

        <header className="mt-4 mb-8">
          <h1 className="font-serif text-4xl text-balance">All Recipes for Two</h1>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Simple, small-batch recipes for real weeknights and practical home
            cooking. Browse by search or filter.
          </p>
        </header>

        {/* Search */}
        <div className="mb-8">
          <Suspense>
            <RecipeSearch
              categories={categories}
              currentSearch={q || ""}
              currentCategory={cat || ""}
            />
          </Suspense>
        </div>

        {/* Recipe Grid */}
        <h2 className="sr-only">Browse recipes</h2>
        {recipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {q || cat
                ? "No recipes match your search."
                : "No recipes published yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        )}

        {/* Cross-link: Related Articles (default mode only) */}
        {displayArticles.length > 0 && !q && !cat ? (
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
