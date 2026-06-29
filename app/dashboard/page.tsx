import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeGenerator } from "@/components/dashboard/recipe-generator"
import { RecipeRow } from "@/components/dashboard/recipe-row"
import { DashboardLogout } from "@/components/dashboard/dashboard-logout"
import { getAllRecipes } from "@/lib/queries"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Editorial Studio",
  description: "Generate and manage your SEO-optimized recipes.",
}

export default async function DashboardPage() {
  const recipes = await getAllRecipes()
  const published = recipes.filter((r) => r.status === "published").length
  const drafts = recipes.filter((r) => r.status === "draft").length

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-4xl text-balance">Editorial Studio</h1>
            <p className="mt-2 text-muted-foreground">
              Multi-agent pipeline: SERP analysis, SEO writing and image
              generation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-lg bg-secondary px-3 py-2">
                <strong className="font-semibold">{recipes.length}</strong> recipes
              </span>
              <span className="rounded-lg bg-secondary px-3 py-2">
                <strong className="font-semibold">{published}</strong> published
              </span>
              <span className="rounded-lg bg-secondary px-3 py-2">
                <strong className="font-semibold">{drafts}</strong> drafts
              </span>
            </div>
          </div>
          <DashboardLogout />
        </header>

        <RecipeGenerator />

        <section className="mt-10">
          <h2 className="mb-4 font-serif text-2xl">Your recipes</h2>
          {recipes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              No recipes yet. Start your first generation above.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recipes.map((recipe) => (
                <RecipeRow key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
