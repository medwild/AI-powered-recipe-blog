import { NextResponse, type NextRequest } from "next/server"
import { getRecipeBySlug } from "@/lib/public-data"
import { RECIPE_SLUG_REDIRECTS } from "@/lib/recipe-slug-redirects"

const CANONICAL_PUBLIC_ORIGIN = "https://www.chefaugustin.com"

function getSafePublicOrigin(req: NextRequest): string {
  const hostHeader = (req.headers.get("host") ?? "").trim().toLowerCase()
  const hostname = hostHeader.split(":")[0]
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://${hostHeader}`
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin
      }
    } catch {
      // Fall back to canonical production origin
    }
  }

  return CANONICAL_PUBLIC_ORIGIN
}

/**
 * Legacy French route `/recettes/{slug}` -> single-hop 308 redirect to `/recipes/{target}`,
 * or native 404 for unknown/dead slugs. Zero SQL queries.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const origin = getSafePublicOrigin(req)

  const recipe = await getRecipeBySlug(slug)
  if (recipe) {
    return NextResponse.redirect(new URL(`/recipes/${recipe.slug}`, origin), 308)
  }

  const successor = RECIPE_SLUG_REDIRECTS[slug]
  if (successor) {
    return NextResponse.redirect(new URL(`/recipes/${successor}`, origin), 308)
  }

  return new NextResponse(null, { status: 404 })
}
