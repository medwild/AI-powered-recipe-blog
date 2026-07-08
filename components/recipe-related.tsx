import type { Recipe } from "@/lib/db/schema"
import { RecipeCard } from "@/components/recipe-card"

export function RecipeRelated({ recipes }: { recipes: Recipe[] }) {
  if (!recipes || recipes.length === 0) return null

  return (
    <section
      aria-labelledby="related-heading"
      className="mx-auto max-w-5xl px-4 py-16"
    >
      <h2
        id="related-heading"
        className="font-serif text-2xl sm:text-3xl mb-8 text-balance text-foreground"
      >
        More Recipes You&apos;ll Love
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </div>
    </section>
  )
}
