import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HUBS } from "@/lib/hub-content"

/**
 * Canonical category label map — single source of truth for the 5 article categories.
 * Used by: CategoryListing, ArticleCard, ArticleDetail, ArticleJsonLd, sitemap.
 * When adding a category, update this map AND create the route files (§1.4 in routing-seo.md).
 */
export const CATEGORY_LABELS: Record<string, string> = {
  techniques: "Techniques",
  guides: "Guides",
  histoire: "History",
  equipement: "Equipment",
  idees: "Ideas",
}

/**
 * Descriptive page titles — keyword-rich, longer than the nav label.
 * Used for <title> and H1 (nav labels stay short: "Techniques", "Guides", …).
 */
const CATEGORY_TITLES: Record<string, string> = {
  techniques: "Cooking Techniques & Skills",
  guides: "Kitchen Guides & Tips",
  histoire: "History of French Cooking",
  equipement: "Kitchen Equipment & Tools",
  idees: "Dinner Ideas for Two",
}

/** Unique intro descriptions — one sentence per category. */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  techniques: "Master the fundamental skills that make French cooking effortless — from knife work to sauce-making, these techniques are the building blocks of every great dinner.",
  guides: "Practical, no-nonsense kitchen guides and tips to help you navigate cooking for two with confidence. Ingredient deep-dives, equipment recommendations, and step-by-step walkthroughs.",
  histoire: "The stories behind the dishes — where they come from, why they work, and how French culinary tradition shaped the way we cook today.",
  equipement: "The right tool makes every recipe easier. Honest reviews of pots, pans, knives, and gadgets — what's worth buying and what's just marketing.",
  idees: "Menu ideas, seasonal inspiration, and creative ways to turn a handful of ingredients into a memorable dinner for two — no recipes required.",
}

/** Editorial body content — 2-3 paragraphs per category (~150-200 words). */
const CATEGORY_BODY: Record<string, string[]> = {
  techniques: [
    "Great cooking isn't about following recipes blindly — it's about understanding why things work. A properly seared piece of chicken doesn't happen by accident. A sauce that stays glossy instead of breaking is the result of technique, not luck. In this section, we break down the core skills that every home cook should have in their toolkit, from the right way to hold a knife to the science behind a perfect emulsion.",
    "Each technique article is written with the home kitchen in mind — no professional equipment required, no assumptions about what you already know. Whether you're learning to deglaze a pan for the first time or refining your roasting technique, these guides meet you where you are.",
  ],
  guides: [
    "Ever bought an ingredient because a recipe called for it, then stared at the leftover three-quarters of the package wondering what to do with it? Our guides are designed to prevent exactly that. We go deep on single ingredients, explain which brands are worth the money, and show you how to substitute when you're in a pinch.",
    "Beyond ingredients, we cover the tools and appliances that make cooking for two easier. A pan that's too big ruins a sauce for two. A slow cooker that's too large dries out a small batch. Our equipment guides are honest, researched, and focused on the specific needs of small-household cooking.",
  ],
  histoire: [
    "French cuisine didn't appear out of nowhere. Every technique, every sauce, every classic pairing has a story — often a surprising one. The dishes we think of as 'fancy restaurant food' started in home kitchens, built on necessity and local ingredients. Understanding that history doesn't just make you a better cook; it makes cooking more fun.",
    "In this section, we explore the origins of the dishes and techniques that shape modern cooking. From the medieval roots of French onion soup to the accidental invention of tarte Tatin, these stories connect your weeknight dinner to centuries of culinary tradition.",
  ],
  equipement: [
    "Cooking for two people changes the equipment equation. That 12-inch skillet that's perfect for a family of four? It's too big — your sauce reduces too fast, your protein steams instead of sears. The 6-quart stand mixer? Overkill for a two-person batch of cookies. We test and recommend tools sized for small-batch cooking, because the right pan size matters more than the brand name.",
    "Every recommendation is based on real testing in a home kitchen. We don't accept free products for reviews, and we don't recommend anything we wouldn't buy with our own money. From the perfect 8-inch nonstick pan to the 2-quart slow cooker that actually fits two servings, these guides help you build a kitchen that works at your scale.",
  ],
  idees: [
    "Some nights you don't need a recipe — you need an idea. A jumping-off point. Something that turns the chicken in your fridge and the vegetables on your counter into dinner without a trip to the store. This section is all about inspiration: seasonal menus, flavor pairings, and creative approaches to cooking for two.",
    "We also share ideas for special occasions — date night menus that feel restaurant-worthy without the stress, holiday meals scaled to two place settings, and clever ways to use up the odds and ends that tend to accumulate in a small kitchen. Think of this as your idea bank for the nights when you want to cook something great but don't know where to start.",
  ],
}

export function categoryMetadata(category: string): Metadata {
  const label = CATEGORY_LABELS[category] ?? category
  const title = CATEGORY_TITLES[category] ?? label
  return {
    title,
    description: `Browse our ${label.toLowerCase()} articles — French cooking tips, techniques, and guides.`,
    alternates: { canonical: `/${category}` },
    robots: "index, follow",
    openGraph: {
      title: `${title} | Chef Augustin`,
      description: `Browse our ${label.toLowerCase()} articles — French cooking tips, techniques, and guides.`,
      type: "website",
    },
  }
}

export async function CategoryListing({ category }: { category: string }) {
  const articles = await db
    .select({
      slug: recipes.slug,
      title: recipes.title,
      excerpt: recipes.excerpt,
      heroImageUrl: recipes.heroImageUrl,
      publishedAt: recipes.publishedAt,
      category: recipes.category,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.content_type, "article"),
        eq(recipes.category, category),
        eq(recipes.status, "published"),
      ),
    )
    .orderBy(desc(recipes.publishedAt))

  const label = CATEGORY_LABELS[category] ?? category

  // Hubs catalogue (lib/hub-content.ts) pour cette catégorie — les 22 pages
  // de collection guides/idees. S'ils existent, on les liste sous les articles
  // (évite le "0 articles" alors que le contenu existe).
  const catalogHubs = HUBS.filter((h) => h.category === category)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Home
        </Link>

        <header className="mb-10">
          <h1 className="font-serif text-4xl text-balance">{CATEGORY_TITLES[category] ?? label}</h1>
          {CATEGORY_DESCRIPTIONS[category] ? (
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              {CATEGORY_DESCRIPTIONS[category]}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {articles.length} article{articles.length !== 1 ? "s" : ""}
            </span>
          </p>
        </header>

        {articles.length === 0 && catalogHubs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No articles in this category yet.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Browse the homepage
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {catalogHubs.map((hub) => (
              <article key={hub.slug}>
                <Link
                  href={`/${hub.category}/${hub.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/50 block h-full"
                >
                  <div className="aspect-[16/9] bg-secondary flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      Collection
                    </span>
                  </div>
                  <div className="p-4">
                    <h2 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                      {hub.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {hub.metaDescription}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
            {articles.map((article) => (
              <article key={article.slug}>
                <Link
                  href={`/${article.category}/${article.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/50 block"
                >
                {article.heroImageUrl ? (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={article.heroImageUrl}
                      alt={article.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-secondary flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      No image
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  {/* Excerpt omitted — same rationale as RecipeCard */}
                </div>
              </Link>
              </article>
            ))}
          </div>
        )}

        {/* Editorial body — unique per category for SEO depth */}
        {CATEGORY_BODY[category] ? (
          <section className="mt-14 border-t border-border pt-12">
            <div className="mx-auto max-w-2xl space-y-4 text-muted-foreground leading-relaxed">
              {CATEGORY_BODY[category].map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        {/* Cross-category links — ensures every article category links to every other */}
        <section className="mt-14 border-t border-border pt-12 text-center">
          <h2 className="font-serif text-2xl mb-4">Explore more</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(CATEGORY_LABELS)
              .filter(([key]) => key !== category)
              .map(([key, label]) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {label}
                </Link>
              ))}
            <Link
              href="/recipes"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              All Recipes
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
