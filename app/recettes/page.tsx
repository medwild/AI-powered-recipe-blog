import { Suspense } from "react"
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeSearch } from "@/components/recipe-search"
import { searchPublishedRecipes, getRecipeCategories } from "@/lib/queries"

export const revalidate = 60

export const metadata: Metadata = {
  title: "All recipes",
  description:
    "Browse our collection of French cooking recipes, optimized and explained step by step.",
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>
}) {
  const { q, cat } = await searchParams
  const [recipes, categories] = await Promise.all([
    searchPublishedRecipes(q, cat),
    getRecipeCategories(),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <header className="mb-10">
          <h1 className="font-serif text-4xl text-balance">All recipes</h1>
          <p className="mt-2 text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} to discover.
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
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}