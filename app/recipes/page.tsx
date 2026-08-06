import { Suspense } from "react"
import nextDynamic from "next/dynamic"
import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { ArticleCard } from "@/components/article-card"
import { Breadcrumbs } from "@/components/breadcrumbs"

const RecipeSearch = nextDynamic(() => import("@/components/recipe-search").then((m) => m.RecipeSearch))
import { searchPublishedRecipes, getRecipeCategories, getPublishedArticlesLight } from "@/lib/queries"
import { getAllClusters } from "@/lib/cluster-resolver"
import { canonicalCategories } from "@/lib/category-consolidation"
import { tagToSlug } from "@/lib/tag-utils"

// SSG + ISR : page statique générée au build, re-générée 1x/heure après publication.
// Économise le quota DB Neon (0 requête par visite) + charge instantanée (CDN).
// La recherche est client-side (RecipeSearch "use client") — pas besoin de searchParams serveur.
export const dynamic = "force-static"
export const revalidate = 3600 // ISR — re-génère 1x/heure après publication

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "All Recipes for Two — Easy Weeknight Dinners",
    description:
      "Simple, small-batch recipes for two — tested, scaled for two, ready tonight.",
    alternates: { canonical: "/recipes" },
    openGraph: {
      title: "All Recipes for Two | Chef Augustin",
      description:
        "Simple, small-batch recipes for two — tested, scaled for two, ready tonight.",
      type: "website",
    },
  }
}

export default async function RecipesPage() {
  const [recipes, categories, articles] = await Promise.all([
    searchPublishedRecipes(), // toutes les recettes (pas de filtre serveur — la recherche est client)
    getRecipeCategories(),
    getPublishedArticlesLight(),
  ])

  const displayArticles = articles
  const clusters = getAllClusters()

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
              currentSearch=""
              currentCategory=""
            />
          </Suspense>
        </div>

        {/* Recipe Grid */}
        <h2 className="sr-only">Browse recipes</h2>
        {recipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No recipes published yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        )}

        {/* Browse by category */}
        <section className="mt-16 border-t border-border pt-14 text-center">
            <h2 className="font-serif text-2xl">Browse by category</h2>
            <p className="mt-2 mb-6 text-muted-foreground">
              Explore recipes by ingredient, cuisine, or technique.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {canonicalCategories(categories).map((cat) => (
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

        {/* Browse by collection */}
        {clusters.length > 0 ? (
          <section className="mt-16 border-t border-border pt-14">
            <h2 className="font-serif text-2xl text-center mb-6">Browse by collection</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clusters.map((c) => (
                <Link
                  key={c.id}
                  href={`/recipes/cluster/${c.id}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <h3 className="font-serif text-lg group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Cross-link: Related Articles */}
        {displayArticles.length > 0 ? (
          <section className="mt-16 border-t border-border pt-14">
            <div className="mb-8">
              <div>
                <h2 className="font-serif text-2xl">Cooking Tips &amp; Guides</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Learn the techniques behind the recipes.
                </p>
              </div>
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
