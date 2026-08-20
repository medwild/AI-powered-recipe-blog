import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeIndex } from "@/components/recipe-index"
import { getArticleBySlug, getRelatedForArticle, getRecipesBySlugs } from "@/lib/queries"
import type { RecipeCardData } from "@/lib/types"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils/cn"
import { cloudinaryUrl } from "@/lib/cloudinary-url"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { CATEGORY_LABELS } from "@/components/category-listing"
import { PinButton } from "@/components/pin-button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ArticleJsonLd } from "@/components/article/article-jsonld"

/** Extraire les slugs `/recipes/{slug}` du markdown, en ordre d'apparition,
 *  dédupliqués. L'ordre = ordre de l'index (et de l'ItemList jsonLd). */
function extractRecipeSlugs(markdown: string): string[] {
  const slugs: string[] = []
  const seen = new Set<string>()
  const re = /\/recipes\/([a-z0-9][a-z0-9-]*)/g
  let m
  while ((m = re.exec(markdown)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      slugs.push(m[1])
    }
  }
  return slugs
}

export function articleMetadata(article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>, category: string): Metadata {
  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt || undefined,
    alternates: { canonical: `/${article.category ?? category}/${article.slug}` },
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || undefined,
      type: "article",
      images: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || undefined,
      images: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    },
  }
}

export async function ArticleDetail({ slug }: { slug: string }) {
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== "published") {
    notFound()
  }

  const relatedRecipes = await getRelatedForArticle(article.linked_content_id as number | null)
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Blog"

  // --- Index de recettes (roundups) : mini-cartes sous l'intro ---
  const contentMarkdown = article.contentMarkdown ?? ""
  const recipeSlugs = extractRecipeSlugs(contentMarkdown)
  let indexRecipes: RecipeCardData[] = []
  if (recipeSlugs.length > 0) {
    const fetched = await getRecipesBySlugs(recipeSlugs)
    const bySlug = new Map(fetched.map((r) => [r.slug, r]))
    // Réordonner selon le markdown (inArray ne garantit pas l'ordre)
    indexRecipes = recipeSlugs
      .map((s) => bySlug.get(s))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
  }

  // Split au premier "\n## " — l'index se place SOUS le paragraphe d'intro,
  // avant la première section H2. Split uniquement si un index existe.
  const splitAt = indexRecipes.length > 0 ? contentMarkdown.indexOf("\n## ") : -1
  const introPart = splitAt !== -1 ? contentMarkdown.slice(0, splitAt) : contentMarkdown
  const bodyPart = splitAt !== -1 ? contentMarkdown.slice(splitAt) : ""

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: categoryLabel, href: `/${article.category}` },
            { label: article.title, href: `/${article.category}/${article.slug}` },
          ]}
        />

        <article className="mx-auto max-w-3xl px-4 py-8 pt-2">
          {article.heroImageUrl ? (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10">
              <Image
                src={cloudinaryUrl(article.heroImageUrl, 1200)}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                placeholder="blur"
                blurDataURL={FOOD_BLUR_PLACEHOLDER}
              />
              <PinButton
                imageUrl={article.heroImageUrl}
                pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"}/${article.category}/${article.slug}`}
                title={article.title}
              />
            </div>
          ) : null}

          <header className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {categoryLabel}
              </span>
              {article.publishedAt ? (
                <time dateTime={new Date(article.publishedAt).toISOString()}>
                  {new Date(article.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              ) : null}
              {article.updatedAt && article.publishedAt &&
                (new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime()) > 7 * 24 * 60 * 60 * 1000 ? (
                <span className="text-muted-foreground/70">
                  · Updated{" "}
                  <time dateTime={new Date(article.updatedAt).toISOString()}>
                    {new Date(article.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </span>
              ) : null}
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {article.title}
            </h1>
            {/* Author byline — E-E-A-T signal for AI crawlers and Google
                 (audit claude 20/08: "zero signal E-E-A-T visible en haut").
                 Only claims sourced by the brand: French technique + real-world
                 kitchen experience. NO invented years (global.md rule 13). */}
            <p className="mt-4 text-sm text-muted-foreground">
              By <span className="font-medium text-foreground">Chef Augustin Lefèvre</span>
              {" "}— small-batch dinners for two, grounded in French technique
            </p>
          </header>

          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={introPart} />
          </div>

          {indexRecipes.length > 0 ? <RecipeIndex recipes={indexRecipes} /> : null}

          {splitAt !== -1 ? (
            <div className="prose prose-lg max-w-none">
              <MarkdownRenderer content={bodyPart} />
            </div>
          ) : null}
        </article>

        {relatedRecipes.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="mb-8 font-serif text-2xl text-balance">
              Related Recipes
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <ArticleJsonLd article={article} />
      <SiteFooter />
    </div>
  )
}
