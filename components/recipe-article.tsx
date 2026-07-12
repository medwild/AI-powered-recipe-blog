import type { Recipe } from "@/lib/db/schema"
import { RecipeHero } from "@/components/recipe-hero"
import { RecipeActionBar } from "@/components/recipe-action-bar"
import { RecipeIngredients } from "@/components/recipe-ingredients"
import { RecipeInstructions } from "@/components/recipe-instructions"
import { RecipeArticleBody } from "@/components/recipe-article-body"
import { RelatedRecipes } from "@/components/related-recipes"

export function RecipeArticle({ recipe }: { recipe: Recipe }) {
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
      <RecipeArticleBody contentMarkdown={recipe.contentMarkdown} />

      {/* Section 6: Related Recipes — cluster-aware sidebar */}
      <RelatedRecipes recipe={recipe} />
    </article>
  )
}
