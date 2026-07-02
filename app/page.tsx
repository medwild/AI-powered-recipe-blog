import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Clock, ChefHat, Sparkles, TrendingUp } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { Button } from "@/components/ui/button"
import { getPublishedRecipes, getRecipeCategories } from "@/lib/queries"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export const revalidate = 60

export default async function HomePage() {
  const [recipes, categories] = await Promise.all([
    getPublishedRecipes(),
    getRecipeCategories(),
  ])
  const featured = recipes.slice(0, 3)
  const recent = recipes.slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
            <div className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                AI-written and optimized recipes
              </span>
              <h1 className="font-serif text-4xl leading-tight text-balance md:text-5xl">
                French cooking, simple and always successful.
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
                Generous recipes, tested and explained step by step. Each
                article is designed to save you time in the kitchen.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  render={<Link href="/recettes" />}
                  nativeButton={false}
                  size="lg"
                >
                  Browse recipes
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  render={<Link href="/dashboard" />}
                  nativeButton={false}
                  size="lg"
                  variant="outline"
                >
                  Editorial Studio
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-border aspect-[4/3]">
              <Image
                src="/hero-kitchen.png"
                alt="Kitchen counter with fresh ingredients"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                placeholder="blur"
                blurDataURL={FOOD_BLUR_PLACEHOLDER}
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ChefHat className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{recipes.length}</div>
                <div className="text-xs text-muted-foreground">Published recipes</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{"<30"}</div>
                <div className="text-xs text-muted-foreground">Min on average</div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="mb-6 font-serif text-2xl">Explore by category</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/recettes?cat=${encodeURIComponent(cat)}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Featured */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          {recipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <h2 className="font-serif text-2xl">No published recipes</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Head over to the Editorial Studio to generate your first
                recipe from a keyword.
              </p>
              <Button
                render={<Link href="/dashboard" />}
                nativeButton={false}
                className="mt-6"
              >
                Open the Studio
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-end justify-between">
                <h2 className="font-serif text-3xl">Featured</h2>
                <Link
                  href="/recettes"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View all
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              {recent.length > 3 ? (
                <>
                  <h2 className="mb-8 mt-16 font-serif text-3xl">
                    Most recent
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {recent.slice(3).map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center">
            <h2 className="font-serif text-3xl text-balance">
              Ready to cook?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Browse our recipe collection and find inspiration
              for your next meal.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                render={<Link href="/recettes" />}
                nativeButton={false}
                size="lg"
              >
                View all recipes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Organization + WebSite JSON-LD for E-E-A-T */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Chef Augustin",
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com",
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/hero-kitchen.png`,
              sameAs: [
                "https://www.instagram.com/chefaugustin",
                "https://www.pinterest.com/chefaugustin",
                "https://www.youtube.com/@chefaugustin",
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Chef Augustin",
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/recettes?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            },
          ]),
        }}
      />
    </div>
  )
}