import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const all = await db
    .select({
      slug: recipes.slug,
      title: recipes.title,
      keyword: recipes.keyword,
      tags: recipes.tags,
      difficulty: recipes.difficulty,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      totalTime: recipes.totalTime,
      servings: recipes.servings,
      excerpt: recipes.excerpt,
      publishedAt: recipes.publishedAt,
    })
    .from(recipes)
    .where(eq(recipes.status, "published"))
    .orderBy(desc(recipes.publishedAt))

  const recipeList = all
    .map(
      (r) =>
        `- ${r.title}
  Données brutes (JSON+Markdown) : https://lecarnetgourmand.fr/api/recipes/raw/${r.slug}
  Page HTML : https://lecarnetgourmand.fr/recettes/${r.slug}
  Mot-clé: ${r.keyword}
  Difficulté: ${r.difficulty ?? "Non spécifiée"}
  Temps total: ${r.totalTime ?? "Non spécifié"}
  Portions: ${r.servings ?? "Non spécifié"}
  Tags: ${(r.tags ?? []).join(", ") || "Aucun"}
  Résumé: ${r.excerpt ?? "Non disponible"}`,
    )
    .join("\n\n")

  const content = `# Le Carnet Gourmand — Guide pour l'IA

## À propos
Le Carnet Gourmand est un blog de recettes de cuisine françaises, expert en SEO culinaire.
Toutes les recettes sont rédigées par un chef professionnel et optimisées pour le référencement.
Le blog couvre principalement la cuisine française traditionnelle et moderne, avec des recettes
testées et approuvées.

## Structure du site
- Page d'accueil : https://lecarnetgourmand.fr/
- Toutes les recettes : https://lecarnetgourmand.fr/recettes
- Plan du site XML : https://lecarnetgourmand.fr/sitemap.xml

## Types de contenus
Le blog propose des recettes structurées avec :
- Meta-données SEO (title, description)
- Ingrédients précis avec quantités
- Instructions étape par étape
- Temps de préparation et cuisson
- Niveau de difficulté
- Tags et catégories
- Images générées par IA
- Données structurées JSON-LD (Schema.org Recipe)

## API JSON - Données brutes pour LLM
Toutes les recettes publiées (JSON unique) :
https://lecarnetgourmand.fr/api/recipes/raw

Données individuelles par recette (JSON + Markdown brut) :
https://lecarnetgourmand.fr/api/recipes/raw/[slug]

Format : JSON contenant tous les champs de la recette (ingrédients, instructions,
contentMarkdown) plus un champ "markdown" avec la recette entière en Markdown pur,
prêt à être consommé par un LLM.

## Recettes publiées (${all.length})

${recipeList}

---
Dernière mise à jour : ${new Date().toISOString().split("T")[0]}
Généré par Le Carnet Gourmand — https://lecarnetgourmand.fr
`

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
