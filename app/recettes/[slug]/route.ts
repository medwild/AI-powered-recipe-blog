import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getRecipeBySlug } from "@/lib/queries"
import { RECIPE_SLUG_REDIRECTS } from "@/lib/recipe-slug-redirects"

function origin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000"
  const proto = req.headers.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export const dynamic = "force-dynamic"

/**
 * Ancien schéma d'URL français `/recettes/{slug}` (pré-migration `/recipes`).
 *
 * Remplace l'ancien wildcard `next.config` `/recettes/:path*` → `/recipes/:path*`
 * qui servait une chaîne 308 → 404 (soft-404) pour les slugs morts — flag GSC
 * "Sitemap : Toutes les pages connues" (validation échouée 20→22/08).
 *
 * Logique (résolution au moment de la requête, jamais de chaîne morte) :
 *  - recette live sous ce slug        → 308 → /recipes/{slug}
 *  - slug legacy avec successeur live → 308 → /recipes/{successeur} (mono-saut)
 *  - slug mort (aucune recette)       → 404 natif (pas de redirect → pas de chaine)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // 1. Recette publiée sous ce slug exact → redirection canonique mono-saut
  const recipe = await getRecipeBySlug(slug)
  if (recipe) {
    return NextResponse.redirect(
      new URL(`/recipes/${recipe.slug}`, origin(req)),
      308,
    )
  }

  // 2. Slug legacy pointant vers un successeur live → 308 direct (pas de chaîne)
  const successor = RECIPE_SLUG_REDIRECTS[slug]
  if (successor) {
    return NextResponse.redirect(
      new URL(`/recipes/${successor}`, origin(req)),
      308,
    )
  }

  // 3. Slug mort → 404 natif. Un vrai 404 est le signal correct pour Google
  //    (URL supprimée) ; il met fin à la chaîne 308→404 qui causait le flag.
  return new NextResponse(null, { status: 404 })
}
