import type { Recipe } from "@/lib/db/schema"

/**
 * Construit une représentation Markdown complète d'une recette,
 * prête à être consommée par un LLM.
 */
export function buildRecipeMarkdown(
  recipe: Pick<
    Recipe,
    | "title"
    | "excerpt"
    | "prepTime"
    | "cookTime"
    | "totalTime"
    | "servings"
    | "difficulty"
    | "tags"
    | "ingredients"
    | "instructions"
    | "contentMarkdown"
  >,
): string {
  return [
    `# ${recipe.title}`,
    "",
    `> ${recipe.excerpt ?? ""}`,
    "",
    "## Informations",
    `- Préparation : ${recipe.prepTime ?? "N/A"}`,
    `- Cuisson : ${recipe.cookTime ?? "N/A"}`,
    `- Total : ${recipe.totalTime ?? "N/A"}`,
    `- Portions : ${recipe.servings ?? "N/A"}`,
    `- Difficulté : ${recipe.difficulty ?? "N/A"}`,
    `- Tags : ${(recipe.tags ?? []).join(", ")}`,
    "",
    "## Ingrédients",
    ...(recipe.ingredients ?? []).map(
      (i) => `- ${i.quantity ?? ""} ${i.name}`.trim(),
    ),
    "",
    "## Préparation",
    ...(recipe.instructions ?? []).map((s) => `${s.step}. ${s.text}`),
    "",
    recipe.contentMarkdown ?? "",
  ].join("\n")
}
