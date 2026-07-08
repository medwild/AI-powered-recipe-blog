import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import { Button } from "@/components/ui/button"
import type { Recipe } from "@/lib/db/schema"

export function HomepageFeatured({
  featured,
  recent,
}: {
  featured: Recipe[]
  recent: Recipe[]
}) {
  if (featured.length === 0) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl">Featured</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with these — they&apos;re worth it.
          </p>
        </div>
        <Link
          href="/recettes"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:row-span-2">
          <RecipeCard recipe={featured[0]} />
        </div>
        {featured.slice(1, 3).map((recipe) => (
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
    </section>
  )
}
