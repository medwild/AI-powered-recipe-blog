import type { Recipe } from "@/lib/db/schema"
import { RecipeHero } from "@/components/recipe-hero"
import { RecipeActionBar } from "@/components/recipe-action-bar"
import { RecipeIngredients } from "@/components/recipe-ingredients"
import { RecipeInstructions } from "@/components/recipe-instructions"
import { RecipeArticleBody } from "@/components/recipe-article-body"
import { RelatedRecipes } from "@/components/related-recipes"
import { RecipeRating } from "@/components/recipe-rating"
import { getRecipeRating } from "@/lib/queries"

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

      {/* Section 6: Rate this recipe — before related recipes */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <RecipeRating
          recipeId={recipe.id}
          initialAvg={ratings.avg ?? 0}
          initialCount={ratings.count}
        />
      </section>

      {/* Section 7: Related Recipes — cluster-aware sidebar */}
      <RelatedRecipes recipe={recipe} />
    </article>
  )
}
