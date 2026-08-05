/**
 * /recipes/category/[slug] — Clean category URLs (v14.3)
 *
 * Replaces the old ?cat= query parameter with static paths.
 * generateStaticParams ensures only known tags are served (404 for made-up slugs).
 */
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { getPublishedRecipesByTag, getRecipeCategories } from "@/lib/queries"
import { tagToSlug, slugToTag } from "@/lib/tag-utils"

// Seuil Google anti-thin-content : une catégorie avec < 3 recettes n'apporte
// pas de valeur → noindex (évite le scaled content abuse sur les 100+ pages fines).
const MIN_RECIPES_FOR_INDEX = 3

/**
 * Handwritten intro paragraphs for the 22 indexable categories (≥ 3 recipes).
 * Keys are the exact tags as stored in the DB (slugToTag returns original
 * casing/spacing). Replaces the template skeleton that produced duplicate
 * paragraphs across pages. Noindex categories (< 3 recipes) keep the template
 * fallback (Google ignores them).
 */
const CATEGORY_INTROS: Record<string, string[]> = {
  "30-minute": [
    "Dinner in 30 minutes or less, sized for two. These weeknight recipes lean on quick sears, one-pan cooking, and sauces that come together while the pasta boils — tested so the timing actually fits a Tuesday.",
  ],
  "30-minute meal": [
    "Complete meals for two that fit in a half-hour window. Each recipe pairs a protein with a side or sauce in a single pan, so the whole dinner lands on the table at the same time — no separate prep tracks.",
  ],
  chicken: [
    "The most versatile weeknight protein, portioned for two. From skillet sears to one-pan bakes, these chicken recipes are tested at two-serving scale so the breast stays juicy and the sauce actually clings.",
  ],
  "chicken breast": [
    "Boneless chicken breast recipes built for two people. The challenge is keeping a small breast tender instead of dry — these recipes control heat, pan size, and resting time so it works first try.",
  ],
  chocolate: [
    "Small-batch chocolate recipes for two — molten cakes, chocolate lava cakes, and easy desserts that feel indulgent without a half tray of leftovers.",
  ],
  "comfort food": [
    "Small-batch comfort food for two — creamy pastas, hearty stews, and slow-simmered dishes that taste like a long cook even on a short night. Portions sized so you don't drown in leftovers.",
  ],
  "date night": [
    "Date-night dinners for two that feel restaurant-worthy without the reservation — romantic mains and sides designed to impress at home.",
  ],
  dessert: [
    "Desserts scaled for two — individual cakes, cookies, and puddings that are ready while you still want them. No half-eaten tray in the fridge.",
  ],
  "dinner for two": [
    "The core collection: complete dinners designed and tested for exactly two servings. Every recipe lists precise pan sizes and timings, because dividing a family recipe in half rarely works as-is.",
  ],
  easy: [
    "The easiest recipes for two — short ingredient lists, forgiving techniques, and dinners that come together in one pan. Built for real weeknights.",
  ],
  "for two": [
    "Every recipe in this collection is built around two servings — no scaling guesswork, no half-empty fridge containers. Skillet, sheet pan, or slow cooker, the portions and timings are tuned for a small household.",
  ],
  italian: [
    "Italian-inspired dinners for two — creamy pastas, chicken parmesan-style bakes, and one-pan Italian classics tested at small-batch scale.",
  ],
  lemon: [
    "Bright, lemony dinners for two — lemon butter chicken, lemon garlic sauces, and pasta dishes where citrus does the heavy lifting.",
  ],
  "one pan": [
    "One pan, two plates, minimal cleanup. These skillet and sheet-pan dinners for two are tested so the sauce reduces correctly in a smaller surface — no overcooked protein, no burned fond.",
  ],
  orzo: [
    "Orzo dinners for two — one-pan orzo with chicken, shrimp, and salmon, where the pasta cooks right in the sauce for a creamy, fuss-free meal.",
  ],
  pasta: [
    "Pasta recipes for two — creamy one-pan pastas, garlic butter noodles, and small-batch classics that taste like a long simmer in half the time.",
  ],
  quick: [
    "Quick dinners for two — ready in about 30 minutes with real technique, not shortcuts that cost flavor. Short ingredient lists, hot pans, and methods that fit a weeknight schedule.",
  ],
  "quick dinner": [
    "Complete weeknight dinners for two that are genuinely quick — on the table in about 30 minutes from a short ingredient list, with hot-pan techniques that keep the flavor.",
  ],
  rice: [
    "Rice-bowl and rice-based dinners for two — one-pan chicken and rice, flavorful grains, and fast weeknight bowls built around a single pot.",
  ],
  "small batch": [
    "Small-batch cooking for two — recipes developed and tested at two-serving scale so portions, pan sizes, and timings are right the first time.",
  ],
  weeknight: [
    "Weeknight-friendly recipes for two: fast prep, common ingredients, and forgiving techniques. Designed to be cooked after a workday without a trip to a specialty store.",
  ],
  "weeknight dinner": [
    "The weeknight dinner collection for two — reliable meals that come together quickly and scale naturally to two servings, with clear steps and exact timings.",
  ],
}

export async function generateStaticParams() {
  const categories = await getRecipeCategories()
  return categories.map((tag) => ({ slug: tagToSlug(tag) }))
}

/**
 * Page title for a category: title-cases the tag and drops a redundant
 * trailing "For Two" so "Dinner For Two" doesn't become "Dinner For Two
 * Recipes for Two" (word repetition). No "— Easy Weeknight Dinners" suffix —
 * it pushed titles past the ~580px SERP limit on 22 category pages.
 */
function categoryTitle(tag: string): string {
  const titleCased = tag.replace(/\b\w/g, (c) => c.toUpperCase())
  // Strip a trailing "For Two" (e.g. "Dinner For Two" → "Dinner"), but keep
  // the whole string when the tag IS "For Two" (→ fallback below, no repetition)
  const base = titleCased === "For Two" ? "" : titleCased.replace(/ For Two$/i, "").trim()
  // Generic "for two" tag → fallback that doesn't repeat the brand keyword
  return base ? `${base} Recipes for Two` : "All Recipes for Two"
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const categories = await getRecipeCategories()
  const tag = slugToTag(slug, categories)

  if (!tag) notFound()

  const recipes = await getPublishedRecipesByTag(tag)
  const isThin = recipes.length < MIN_RECIPES_FOR_INDEX

  return {
    title: categoryTitle(tag),
    description: `Browse our collection of ${tag.toLowerCase()} recipes — tested, scaled for two, ready tonight.`,
    alternates: { canonical: `/recipes/category/${slug}` },
    robots: isThin ? "noindex, follow" : "index, follow",
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [categories] = await Promise.all([
    getRecipeCategories(),
  ])

  const tag = slugToTag(slug, categories)
  if (!tag) {
    // Try to redirect from old ?cat= format (cat query param ended up here somehow)
    // If the slug doesn't match any known tag, 404
    notFound()
  }

  // Same title-case as generateMetadata — keeps title, H1 and breadcrumb consistent.
  const titleTag = tag.replace(/\b\w/g, (c) => c.toUpperCase())

  // SQL-level tag filtering — fetches only matching recipes, not all 30+
  const recipes = await getPublishedRecipesByTag(tag)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recipes" },
            { label: titleTag, href: `/recipes/category/${slug}` },
          ]}
        />

        <header className="mt-4 mb-8">
          <h1 className="font-serif text-4xl text-balance">{categoryTitle(tag)}</h1>
          <div className="mt-3 max-w-2xl text-muted-foreground leading-relaxed space-y-3">
            {CATEGORY_INTROS[tag] ? (
              CATEGORY_INTROS[tag].map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>
                  Looking for the best <strong>{tag}</strong> recipes for two people?
                  You&rsquo;re in the right place. Our collection of {recipes.length}{" "}
                  {tag.toLowerCase()} recipe{recipes.length !== 1 ? "s" : ""} brings
                  professional French technique to your weeknight table — scaled down,
                  tested, and ready when you are.
                </p>
                <p>
                  {recipes.length === 1
                    ? `This ${tag.toLowerCase()} recipe is the only one you need — developed, tested, and scaled for two people with no leftovers and no wasted ingredients.`
                    : `All ${recipes.length} ${tag.toLowerCase()} recipes are developed for two people: no leftovers that die in the back of the fridge, no ingredient waste, and no compromise on flavor. Whether you're after a quick weeknight fix or a slow-cooked weekend project, each recipe is tested at two-serving scale so it works the first time.`
                  }
                </p>
              </>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <h2 className="sr-only">{tag} recipes</h2>
        {recipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No recipes in this category yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
            ))}
          </div>
        )}

        {/* BreadcrumbList JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.chefaugustin.com/" },
                { "@type": "ListItem", position: 2, name: "Recipes", item: "https://www.chefaugustin.com/recipes" },
                { "@type": "ListItem", position: 3, name: tag, item: `https://www.chefaugustin.com/recipes/category/${slug}` },
              ],
            }),
          }}
        />

        {/* Cross-link to all categories */}
        <section className="mt-16 border-t border-border pt-14 text-center">
          <h2 className="font-serif text-2xl">Browse all categories</h2>
          <p className="mt-2 mb-6 text-muted-foreground">
            Explore more dinner-for-two recipes by ingredient, technique, or occasion.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/recipes/category/${tagToSlug(cat)}`}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
