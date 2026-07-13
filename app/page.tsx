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
import { getPublishedRecipes, getPublishedArticles, getRecipeCategories } from "@/lib/queries"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export const revalidate = 60

export default async function HomePage() {
  const [recipes, articles, categories] = await Promise.all([
    getPublishedRecipes(),
    getPublishedArticles(),
    getRecipeCategories(),
  ])
  const featured = recipes.slice(0, 4)
  const recent = recipes.slice(0, 6)
  const latestArticles = articles.slice(0, 3)
  const latestRecipe = recipes[0]

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HomepageHero
          heroImage={latestRecipe?.heroImageUrl ?? undefined}
          heroAlt={latestRecipe?.title ?? undefined}
        />
        <HomepageStartCooking recipes={recent} />
        <HomepageCategories categories={categories} />
        <HomepageFeatured featured={featured} recent={recent} />
        <HomepageArticles articles={latestArticles} />
        <HomepageCTA />
      </main>
      <SiteFooter />
      <HomepageJsonLd />
    </div>
  )
}
