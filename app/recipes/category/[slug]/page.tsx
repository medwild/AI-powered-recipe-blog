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
import { CANONICAL_CATEGORIES } from "@/lib/category-consolidation"

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
    "The collection covers the two most reliable ways to cook chicken for two. There are one-pan dinners where the sauce builds around the sear — garlic butter, tomato-garlic rice, lemon butter orzo — plus slow-cooker versions that simmer hands-free in a 2-quart pot while you get on with the evening.",
    "Most recipes land in the 25–40 minute range and use one skillet or sheet pan, which keeps cleanup proportional to the meal. Sizes are built around two servings, so a chicken breast stays at the thickness and heat that cooks through without drying, and a sauce for two reduces in a 10-inch pan without scorching. If you cook for two most nights, this is the collection to start with.",
  ],
  "chicken breast": [
    "Boneless chicken breast recipes built for two people. The challenge is keeping a small breast tender instead of dry — these recipes control heat, pan size, and resting time so it works first try.",
    "Here that problem is the whole point. Every recipe starts with how to cook two small breasts so they stay juicy: pan-seared with a hot skillet and a resting period, slow-cooked low and slow, or brined in feta brine for extra moisture before the sear.",
    "You'll find a 30-minute Mediterranean chicken orzo with feta and olives, a 4-ingredient feta brine chicken breast for a bare-minimum ingredient list, and a slow cooker chicken and rice that needs no babysitting. Each one is sized for two servings with the pan and timing written for a small breast, not a family cut.",
  ],
  chocolate: [
    "Small-batch chocolate recipes for two — molten cakes, chocolate lava cakes, and easy desserts that feel indulgent without a half tray of leftovers.",
  ],
  "comfort food": [
    "Small-batch comfort food for two — creamy pastas, hearty stews, and slow-simmered dishes that taste like a long cook even on a short night. Portions sized so you don't drown in leftovers.",
    "The lineup keeps the classics you crave at two-person scale: stovetop mac and cheese made in one pot with no baking step, chicken pot pie under a flaky puff pastry lid, and creamy mashed potatoes portioned for two plates.",
    "Each recipe solves the small-batch version of the problem — a béchamel that reduces in a smaller pan, a pot pie filling that sets without a family-sized casserole, mashed potatoes that stay creamy in a 2-quart pot. They're sized so the indulgence stops at the edge of the plate, not the fridge.",
  ],
  "date night": [
    "Date-night dinners for two that feel restaurant-worthy without the reservation — romantic mains and sides designed to impress at home.",
    "The menu runs from a pan-seared steak with garlic butter and blistered green beans to a 30-minute lemon butter chicken pasta, with molten chocolate lava cakes and creamy mashed potatoes as the sides and finishes that close the evening.",
    "These recipes are built around timing you can actually manage: each dish is scaled for two and written with a single timeline, so the steak rests while the beans blister and the lava cakes bake for exactly 12 to 15 minutes. No separate prep tracks, no plating gymnastics — dinner that looks like more effort than it took.",
  ],
  dessert: [
    "Desserts scaled for two — individual cakes, cookies, and puddings that are ready while you still want them. No half-eaten tray in the fridge.",
  ],
  "dinner for two": [
    "The core collection: complete dinners designed and tested for exactly two servings. Every recipe lists precise pan sizes and timings, because dividing a family recipe in half rarely works as-is.",
    "This is the full catalog — 30+ dinners that range from 20-minute skillet pastas to a sheet pan Thanksgiving dinner for two. You'll find one-pan chicken and rice, slow cooker chicken and gravy, Asian beef noodle stir-fry, lasagna in a single skillet, salmon orzo, chili Colorado, and garlic butter chicken bites, among others.",
    "The through-line is the scaling: pans are sized so sauces reduce instead of scorching, proteins are cut for two and cooked at the heat that keeps them tender, and timings are written for the meal as a whole, not per component. If you're looking for a specific dinner for tonight, start here.",
  ],
  easy: [
    "The easiest recipes for two — short ingredient lists, forgiving techniques, and dinners that come together in one pan. Built for real weeknights.",
    "Most of the collection is one-pan cooking: enchilada skillets, chicken and tomato rice, garlic butter chicken with orzo, ground beef and tomato rice, beef ramen noodles, and slow cooker chicken for the nights you want it even easier. The 4-ingredient feta brine chicken breast is the floor for effort — a handful of ingredients and one technique.",
    "What makes these 'easy' is structure, not shortcuts that cost flavor: sauces build in the same pan as the protein, ingredients are mostly pantry staples, and each recipe has a clear order of operations so you're never juggling three pans. Most are on the table in 25 to 40 minutes with a single skillet to wash.",
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
  "one-pan": [
    "One pan, two plates, minimal cleanup. These skillet and sheet-pan dinners for two are tested so the sauce reduces correctly in a smaller surface — no overcooked protein, no burned fond.",
    "It's the largest single cooking style on the site: 25 recipes built around a 10- or 12-inch skillet or a quarter sheet pan. The lineup runs from chicken and rice with garlic butter tomato sauce to beef ramen noodles, enchilada skillets, steak dinners, shrimp orzo, and garlic butter chicken pasta.",
    "The recipes are written so the sauce does the work in the same vessel as the protein — sear, deglaze, simmer, done. Because the pan is smaller than a family skillet, the techniques note where to pull a piece of chicken early and where to let a sauce reduce faster, so the result is a dinner that tastes layered without a sink full of dishes.",
  ],
  orzo: [
    "Orzo dinners for two — one-pan orzo with chicken, shrimp, and salmon, where the pasta cooks right in the sauce for a creamy, fuss-free meal.",
    "The collection is a set of four dinner templates, each built around the same clever trick: the orzo cooks directly in the liquid of the sauce, absorbing flavor while it simmers. You'll find white wine lemon chicken orzo, Mediterranean chicken orzo with feta and olives, creamy parmesan garlic chicken orzo, and salmon orzo with dill and capers.",
    "Because the pasta cooks in the pan, there's no separate pot, no draining, and no starch to lose — the sauce turns creamy from the orzo itself. Each recipe is sized for two with the liquid measured for a 10-inch skillet, so it comes together in one pan in about 30 to 40 minutes.",
  ],
  pasta: [
    "Pasta recipes for two — creamy one-pan pastas, garlic butter noodles, and small-batch classics that taste like a long simmer in half the time.",
    "The collection leans on one-pan technique: a garlic butter chicken with orzo, a slow cooker chicken and ground beef ragu over pasta, and a pan-seared chicken breast with creamy tomato garlic pasta. Each one builds a sauce that coats the pasta rather than a plain jarred topping.",
    "Portions are measured for two servings, which changes the pasta math — less water, a smaller pan, and a sauce that clings instead of flooding a family-size bowl. Timings stay under 45 minutes, and most recipes are single-pot once the pasta is in.",
    "The one-pan approach matters more at this scale: with less pasta in the pan, the starch it releases thickens the sauce faster, so you don't need a second pot or a roux. That's why these recipes cook the pasta directly in the liquid, then finish with a handful of cheese or butter off the heat.",
  ],
  quick: [
    "Quick dinners for two — ready in about 30 minutes with real technique, not shortcuts that cost flavor. Short ingredient lists, hot pans, and methods that fit a weeknight schedule.",
    "The bar here is honest: dinner on the table in roughly half an hour, cooked properly. A 25-minute one-pan garlic herb chicken, garlic butter chicken rice bowls, and garlic butter chicken bites with blistered tomatoes and spinach cover the collection.",
    "Speed comes from structure, not from skipping steps: a hot pan does the searing while the sauce reduces, rice and chicken finish in the same skillet, and the ingredient lists stay short enough to shop without a list. Each recipe is written with the order of operations laid out so you're not standing over four burners at once.",
  ],
  rice: [
    "Rice-bowl and rice-based dinners for two — one-pan chicken and rice, flavorful grains, and fast weeknight bowls built around a single pot.",
    "The collection centers on the one-pan chicken and rice formula: chicken seared in the skillet, rice added with liquid, everything simmered together until the rice absorbs the sauce. You'll find garlic tomato chicken and rice, ground beef and tomato rice, slow cooker chicken and rice, and easy meal ideas built on the same pattern.",
    "Cooking rice for two in a 10-inch skillet is its own skill — the water ratio and heat need to match a smaller surface — and each recipe spells that out. Most take 30 to 45 minutes and produce exactly two servings, no half-pan of leftovers.",
  ],
  "small batch": [
    "Small-batch cooking for two — recipes developed and tested at two-serving scale so portions, pan sizes, and timings are right the first time.",
    "The collection is a tour of what changes when you cook for two instead of six: stovetop mac and cheese that skips the baking dish, lasagna built in one skillet, a sheet-pan-style chicken pot pie with a puff pastry lid, molten chocolate lava cakes, and creamy mashed potatoes in a small pot.",
    "Each recipe adjusts the technique that actually matters at small scale — smaller pans, faster reduction, shorter cooking windows — so a two-serving dish comes out the way a family recipe does in a full-size vessel. This is the collection to read first if you keep ending up with leftovers you didn't want.",
  ],
  "quick dinner": [
    "Complete weeknight dinners for two that are genuinely quick — on the table in about 30 minutes from a short ingredient list, with hot-pan techniques that keep the flavor.",
  ],
  weeknight: [
    "Weeknight-friendly recipes for two: fast prep, common ingredients, and forgiving techniques. Designed to be cooked after a workday without a trip to a specialty store.",
    "The 16 recipes here span the weeknight playbook: one-pan chicken and rice, garlic butter chicken pasta, beef ramen noodles, an enchilada skillet, chili Colorado, slow cooker chicken and gravy, even chocolate chip cookies for the nights dessert is non-negotiable.",
    "What they share is tolerance for a tired cook: forgiving heat windows, swaps you can make with what's in the fridge, and a single main dish per night rather than a recipe that needs sides and a plan. Most are done in 30 to 40 minutes, and every one is written for exactly two servings.",
  ],
  "weeknight dinner": [
    "The weeknight dinner collection for two — reliable meals that come together quickly and scale naturally to two servings, with clear steps and exact timings.",
    "This is the focused set of complete dinners — 11 recipes that each work as a standalone meal for two people on a regular evening: white wine lemon chicken orzo, an enchilada skillet, Asian beef noodle stir-fry, parmesan garlic chicken orzo, a pan-seared steak dinner, chicken pot pie, slow cooker chicken and gravy, and more.",
    "The criteria for making this list are strict: one main dish, no separate sides required, common ingredients, and a clear timeline from prep to plate. If a recipe needs a specialty ingredient or a second pan, it lives in a different collection. The result is a shortlist you can trust on a Tuesday.",
  ],
  "ground beef": [
    "Ground beef recipes for two — skillet dinners and small-batch classics that are quick, filling, and easy to scale down.",
    "The collection shows how far ground beef stretches in a two-person kitchen: a one-skillet lasagna that skips the baking dish, a slow cooker chicken and ground beef ragu over pasta, easy beef ramen noodles in 25 minutes, and a ground beef and tomato rice skillet built for the week.",
    "Because ground beef browns fast, these recipes lean on one-pan assembly — the meat seasons the sauce in the same skillet the rest of the dish cooks in. Portions are measured for two servings and most recipes take 25 to 45 minutes from first sizzle to plate.",
    "If you're used to cooking ground beef for a family, the two-serving version is a different exercise: a smaller pan means the beef browns in less time, and the liquid ratio for a sauce needs to match the smaller surface. These recipes spell out both, so the beef stays browned rather than steamed and the sauce coats without flooding.",
  ],
  "slow cooker": [
    "Slow cooker recipes for two — set-and-forget dinners sized for a 2-quart cooker, from chicken and gravy to hearty ragu.",
    "These recipes are built for a small slow cooker — roughly 2 quarts — because cooking for two in a full-size crock pot leaves you buried in leftovers. You'll find slow cooker chicken and gravy, a chicken and ground beef ragu, chicken and rice, and a crockpot chicken and tomato rice.",
    "Each recipe adjusts for the small-batch reality of slow cooking: liquid ratios that don't drown two servings, cook times that work in a smaller vessel, and proteins that come out tender rather than dried out. Set it before work or an hour before dinner, and the meal is done when you are.",
  ],
}

export async function generateStaticParams() {
  const categories = await getRecipeCategories()
  return categories.map((tag) => ({ slug: tagToSlug(tag) }))
}

// Unknown slugs (not in generateStaticParams) must return a true 404, not a
// soft-404 200 with the not-found page (Seobility/audit 2026-08-05).
export const dynamicParams = false

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
              // No templated "collection of N" boilerplate — thin categories are
              // noindex anyway; a plain count line reads naturally (Seobility
              // flagged the old template as scaled-content pattern 2026-08-05).
              <p>
                {recipes.length === 1
                  ? `This ${tag.toLowerCase()} recipe is scaled for two people — tested at two-serving size with no leftovers and no wasted ingredients.`
                  : `${recipes.length} ${tag.toLowerCase()} recipes scaled for two people — tested at two-serving size, no leftovers, no waste.`
                  }
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <h2 className="sr-only">{categoryTitle(tag)}</h2>
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

        {/* ItemList JSON-LD — category as a collection of Recipe items (AI
            citation + rich-result eligibility; the recipes themselves carry
            full Recipe schema) */}
        {recipes.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: categoryTitle(tag),
                numberOfItems: recipes.length,
                itemListElement: recipes.map((recipe, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `https://www.chefaugustin.com/recipes/${recipe.slug}`,
                  name: recipe.title,
                })),
              }),
            }}
          />
        ) : null}


        {/* Cross-link to canonical categories only (merged thin categories 301
            to their parent — lib/category-consolidation.ts; linking to them
            would point at redirects and dilute equity on 119 near-duplicates) */}
        <section className="mt-16 border-t border-border pt-14 text-center">
          <h2 className="font-serif text-2xl">Browse all categories</h2>
          <p className="mt-2 mb-6 text-muted-foreground">
            Explore more dinner-for-two recipes by ingredient, technique, or occasion.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.filter((cat) => CANONICAL_CATEGORIES.has(cat.toLowerCase())).map((cat) => (
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
