import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import type { RecipeCardData } from "@/lib/types"

export function HomepageFeatured({
  featured,
  recent,
}: {
  featured: RecipeCardData[]
  recent: RecipeCardData[]
}) {
  if (featured.length === 0) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl">Featured</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with these — they're worth it.
          </p>
        </div>
        <Link
          href="/recipes"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* 4 cards — 2×2 on desktop, 2×2 on tablet, 1 column on mobile */}
      <div className="grid gap-5 sm:grid-cols-2">
        {featured.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
        ))}
      </div>

      {recent.length > 4 ? (
        <>
          <h2 className="mb-8 mt-16 font-serif text-3xl">
            Most recent
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(4).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
