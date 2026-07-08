import type { Recipe } from "@/lib/db/schema"
import { RecipeHero } from "@/components/recipe-hero"
import { RecipeMetaBar } from "@/components/recipe-meta-bar"
import { RecipeActionBar } from "@/components/recipe-action-bar"
import { RecipeIngredients } from "@/components/recipe-ingredients"
import { RecipeInstructions } from "@/components/recipe-instructions"
import { RecipeArticleBody } from "@/components/recipe-article-body"

export function RecipeArticle({ recipe }: { recipe: Recipe }) {
  return (
    <article>
      {/* Section 1: Hero — image, title, excerpt, badges, author */}
      <RecipeHero recipe={recipe} />

      {/* Section 2: Meta Bar — prep, cook, servings, difficulty */}
      <RecipeMetaBar recipe={recipe} />

      {/* Section 3: Action Bar — jump, print, share, pinterest */}
      <RecipeActionBar title={recipe.title} />

      {/* Section 4: Ingredients — interactive checkboxes */}
      <RecipeIngredients ingredients={recipe.ingredients ?? []} />

      {/* Section 5: Instructions — numbered steps */}
      <RecipeInstructions instructions={recipe.instructions ?? []} />

      {/* Section 6: Article Body — markdown FAQ, tips, nutrition */}
      <RecipeArticleBody contentMarkdown={recipe.contentMarkdown} />
    </article>
  )
}
