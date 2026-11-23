import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import type { RecipeCardData } from "@/lib/types"

/**
 * HomepageStartCooking — clean recipe grid, no horizontal scroll.
 *
 * Follows Sally's Baking Addiction "Popular Now" pattern:
 * a responsive grid of recipe cards that adapts to the viewport
 * without forcing the user to scroll horizontally. The food
 * photography does the selling — no abstract claims needed.
 */
export function HomepageStartCooking({ recipes }: { recipes: RecipeCardData[] }) {
  if (recipes.length === 0) return null

  const display = recipes.slice(0, 4)

  return (
    <section className="border-b border-border bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">Easy Dinner Recipes for Two</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tested, scaled for two, ready tonight.
            </p>
          </div>
          <Link
            href="/recipes"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {display.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
          ))}
        </div>

        <div className="mt-6 sm:hidden text-center">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all recipes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
