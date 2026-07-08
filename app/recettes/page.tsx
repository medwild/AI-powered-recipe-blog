import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { ArticleCard } from "@/components/article-card"
import { RecipeSearch } from "@/components/recipe-search"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { searchPublishedRecipes, getRecipeCategories, getPublishedArticles } from "@/lib/queries"

export const revalidate = 60

export const metadata: Metadata = {
  title: "All recipes",
  description:
    "Browse our collection of French cooking recipes, optimized and explained step by step.",
  alternates: { canonical: "/recettes" },
  openGraph: {
    title: "All recipes | Chef Augustin",
    description:
      "Browse our collection of French cooking recipes, optimized and explained step by step.",
    type: "website",
  },
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>
}) {
  const { q, cat } = await searchParams
  const [recipes, categories, articles] = await Promise.all([
    searchPublishedRecipes(q, cat),
    getRecipeCategories(),
    getPublishedArticles(),
  ])

  // Only show recipes with images in the public grid
  const displayRecipes = recipes.filter((r) => r.heroImageUrl)
  const displayArticles = articles.filter((a) => a.heroImageUrl).slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recettes" },
          ]}
        />
        <header className="mt-4 mb-8">
          <h1 className="font-serif text-4xl text-balance">All recipes</h1>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Simple, small-batch recipes for real weeknights and practical home
            cooking. Browse by search or filter.
          </p>
        </header>

        <div className="mb-8">
          <Suspense>
            <RecipeSearch
              categories={categories}
              currentSearch={q || ""}
              currentCategory={cat || ""}
            />
          </Suspense>
        </div>

        {displayRecipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {q || cat
                ? "No recipes match your search."
                : "No recipes published yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {/* Cross-link: Related Articles */}
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