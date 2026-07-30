import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HomepageHero } from "@/components/homepage/homepage-hero"
import { HomepageStartCooking } from "@/components/homepage/homepage-start-cooking"
import { HomepageCategories } from "@/components/homepage/homepage-categories"
import { HomepageFeatured } from "@/components/homepage/homepage-featured"
import { HomepageArticles } from "@/components/homepage/homepage-articles"
import { HomepageCTA } from "@/components/homepage/homepage-cta"
import { HomepageJsonLd } from "@/components/homepage/homepage-jsonld"
import { getPublishedRecipes, getPublishedArticles, getRecipeCategories, getLatestRecipeHero } from "@/lib/queries"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export const revalidate = 60

export default async function HomePage() {
  // Fetch all data at the page level — no Suspense streaming needed
  // (avoids duplicate <main> in raw HTML from React streaming fallback)
  const [latestRecipe, recipes, articles, categories] = await Promise.all([
    getLatestRecipeHero(),
    getPublishedRecipes(),
    getPublishedArticles(),
    getRecipeCategories(),
  ])

  const featured = recipes.slice(0, 4)
  const recent = recipes.slice(0, 6)
  const latestArticles = articles.slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HomepageHero
          heroImage={latestRecipe?.heroImageUrl ?? undefined}
          heroAlt={latestRecipe?.title ?? undefined}
        />
        {/* Editorial intro — signals topic authority and E-E-A-T to search engines */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-medium text-primary tracking-wide uppercase">
                By Chef Augustin Lefèvre
              </p>
              <h2 className="mt-2 font-serif text-2xl text-balance">
                Small-batch cooking, big French technique
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                Most recipes are written for four to six people. Scaling down isn&apos;t
                just division — it&apos;s a different way of cooking. A pan that&apos;s too
                wide burns the sauce. A roast for two dries out faster than one for six.
                Every recipe here is developed and tested specifically for two people:
                the right pan size, the right timing, the right ingredient quantities.
                No guessing, no waste, no sad leftovers wilting in the fridge.
                Just practical weeknight dinners that work the first time.
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{recipes.length}+ recipes</span>{" "}
                tested and scaled for two — with new additions every month.
              </p>
            </div>
          </div>
        </section>
        <HomepageStartCooking recipes={recent} />
        <HomepageCategories categories={categories} />
        <HomepageFeatured featured={featured} recent={recent} />
        <HomepageArticles articles={latestArticles} />
        <HomepageCTA />
        <HomepageJsonLd />
      </main>
      <SiteFooter />
    </div>
  )
}
