import type { Recipe } from "@/lib/db/schema"
import Link from "next/link"
import { RecipeHero } from "@/components/recipe-hero"
import { RecipeActionBar } from "@/components/recipe-action-bar"
import { RecipeIngredients } from "@/components/recipe-ingredients"
import { RecipeInstructions } from "@/components/recipe-instructions"
import { RecipeArticleBody } from "@/components/recipe-article-body"
import { RelatedRecipes } from "@/components/related-recipes"
import { RecipeRating } from "@/components/recipe-rating"
import { getRecipeRating } from "@/lib/queries"
import { getHubForRecipe } from "@/lib/hub-content"

export async function RecipeArticle({ recipe }: { recipe: Recipe }) {
  const ratings = await getRecipeRating(recipe.id)

  return (
    <article>
      {/* Section 1: Hero — image-first, title, metadata, badges, author */}
      <RecipeHero recipe={recipe} />

      {/* Section 2: Ingredients — interactive checkboxes (above the fold for Pinterest) */}
      <RecipeIngredients ingredients={recipe.ingredients ?? []} />

      {/* Section 3: Action Bar — Tips & FAQ, Print, Share, Save */}
      <RecipeActionBar title={recipe.title} />

      {/* Section 4: Instructions — numbered steps */}
      <RecipeInstructions instructions={recipe.instructions ?? []} />

      {/* Section 5: Article Body — markdown FAQ, tips, nutrition */}
      <RecipeArticleBody contentMarkdown={recipe.contentMarkdown} ingredients={recipe.ingredients} instructions={recipe.instructions} title={recipe.title} />

      {/* Nutrition disclaimer — YMYL trust (audit 2026-08-08 P2-14). Visible,
          minimal, no full nutrition section (AdSense policy). */}
      <section className="mx-auto max-w-3xl px-4">
        <p className="text-xs text-muted-foreground">
          Nutrition information is an estimate and provided for convenience only.
        </p>
      </section>

      {/* Section 6: Rate this recipe — before related recipes */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <RecipeRating
          recipeId={recipe.id}
          initialAvg={ratings.avg ?? 0}
          initialCount={ratings.count}
        />
      </section>

      {/* Section 6.5: Related hub — link silo leaf→hub (topical authority) */}
      {(() => {
        const hub = getHubForRecipe(recipe.tags ?? [])
        if (!hub) return null
        return (
          <section className="mx-auto max-w-3xl px-4 pb-10">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Looking for more ideas? Browse our{" "}
                <Link
                  href={`/${hub.category}/${hub.slug}`}
                  className="font-medium text-primary underline"
                >
                  {hub.title}
                </Link>
              </p>
            </div>
          </section>
        )
      })()}

      {/* Section 7: Related Recipes — cluster-aware sidebar */}
      <RelatedRecipes recipe={recipe} />
    </article>
  )
}
