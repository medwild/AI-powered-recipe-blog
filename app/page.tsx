import { Suspense } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { getPublishedRecipes, getPublishedArticles, getRecipeCategories, getLatestRecipeHero } from "@/lib/queries"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export const revalidate = 60

/** Below-fold sections — async child so Suspense can stream. */
async function HomepageContent() {
  const [recipes, articles, categories] = await Promise.all([
    getPublishedRecipes(),
    getPublishedArticles(),
    getRecipeCategories(),
  ])
  const featured = recipes.slice(0, 4)
  const recent = recipes.slice(0, 6)
  const latestArticles = articles.slice(0, 3)

  return (
    <>
      <HomepageStartCooking recipes={recent} />
      <HomepageCategories categories={categories} />
      <HomepageFeatured featured={featured} recent={recent} />
      <HomepageArticles articles={latestArticles} />
      <HomepageCTA />
      <HomepageJsonLd />
    </>
  )
}

function BelowFoldSkeleton() {
  return (
    <div className="space-y-12 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function HomePage() {
  // Fetch just the hero image/title (1 row) — renders instantly
  const latestRecipe = await getLatestRecipeHero()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HomepageHero
          heroImage={latestRecipe?.heroImageUrl ?? undefined}
          heroAlt={latestRecipe?.title ?? undefined}
        />
        <Suspense fallback={<BelowFoldSkeleton />}>
          <HomepageContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
