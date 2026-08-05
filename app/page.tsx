import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HomepageHero } from "@/components/homepage/homepage-hero"
import { HomepageStartCooking } from "@/components/homepage/homepage-start-cooking"
import { HomepageCategories } from "@/components/homepage/homepage-categories"
import { HomepageClusters } from "@/components/homepage/homepage-clusters"
import { HomepageFeatured } from "@/components/homepage/homepage-featured"
import { HomepageArticles } from "@/components/homepage/homepage-articles"
import { HomepageCTA } from "@/components/homepage/homepage-cta"
import { HomepageJsonLd } from "@/components/homepage/homepage-jsonld"
import { getAllClusters } from "@/lib/cluster-resolver"
import { getPublishedRecipesLight, getPublishedArticlesLight, getRecipeCategories, getLatestRecipeHero } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Easy Weeknight Dinners for Two",
  description:
    "Practical small-batch dinner recipes scaled for two people. One-pan dinners, quick pastas, and mini slow cooker recipes — no waste, no stress.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Chef Augustin — Easy Weeknight Dinners for Two",
    description:
      "Practical small-batch dinner recipes scaled for two people. One-pan dinners, quick pastas, and mini slow cooker recipes.",
    type: "website",
  },
}

// SSG — page generated at build time, regenerated on-demand via revalidatePath() in actions
export default async function HomePage() {
  // Lightweight queries: only the 9 columns RecipeCard/ArticleCard actually use
  const [latestRecipe, recipes, articles, categories] = await Promise.all([
    getLatestRecipeHero(),
    getPublishedRecipesLight(),
    getPublishedArticlesLight(),
    getRecipeCategories(),
  ])

  const clusters = getAllClusters()
  const featured = recipes.slice(0, 4)
  // Non-overlapping: HomepageStartCooking + HomepageFeatured use distinct recipe sets
  const recent = recipes.slice(4, 10)
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
                Welcome to <strong>Easy Weeknight Dinners for Two</strong> — your go-to
                resource for practical meals scaled for two people. Most recipes are written
                for four to six. Scaling down isn&apos;t just division — it&apos;s a different way
                of cooking. A pan that&apos;s too wide burns the sauce. A roast for two dries
                out faster than one for six. Every recipe here is developed and tested
                specifically for two people: the right pan size, the right timing, the right
                ingredient quantities. No guessing, no waste, no sad leftovers wilting in
                the fridge. Just practical weeknight dinners that work the first time.
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
        <HomepageClusters clusters={clusters} />
        <HomepageFeatured featured={featured} recent={recent} />
        <HomepageArticles articles={latestArticles} />
        <HomepageCTA />
        <HomepageJsonLd />
      </main>
      <SiteFooter />
    </div>
  )
}
