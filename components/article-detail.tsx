import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RecipeCard } from "@/components/recipe-card"
import { getArticleBySlug, getRelatedForArticle } from "@/lib/queries"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { CATEGORY_LABELS } from "@/components/category-listing"
import { PinButton } from "@/components/pin-button"

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

function ArticleJsonLd({
  article,
}: {
  article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>
}) {
  const base = (article.jsonLd as Record<string, unknown>) ?? {}
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Blog"

  if (base["@graph"] && Array.isArray(base["@graph"])) {
    const graph = base["@graph"] as Record<string, unknown>[]
    const hasBreadcrumb = graph.some((n) => n["@type"] === "BreadcrumbList")
    const enrichedGraph = hasBreadcrumb
      ? graph
      : [
          ...graph,
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: categoryLabel, item: `${SITE}/${article.category}` },
              { "@type": "ListItem", position: 3, name: article.title },
            ],
          },
        ]
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ ...base, "@graph": enrichedGraph }),
        }}
      />
    )
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: article.title,
              description: article.metaDescription || article.excerpt,
              author: { "@type": "Person", name: "Chef Augustin Lefevre" },
              datePublished: article.publishedAt?.toISOString(),
              image: article.heroImageUrl,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                { "@type": "ListItem", position: 2, name: categoryLabel, item: `${SITE}/${article.category}` },
                { "@type": "ListItem", position: 3, name: article.title },
              ],
            },
          ],
        }),
      }}
    />
  )
}

export async function ArticleDetail({ slug }: { slug: string }) {
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== "published") {
    notFound()
  }

  const relatedRecipes = await getRelatedForArticle(article.linked_content_id as number | null)
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Blog"

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <Link
            href={`/${article.category}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {categoryLabel}
          </Link>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-8">
          {article.heroImageUrl ? (
            <div className="relative mb-8 aspect-[2/3] overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10">
              <Image
                src={article.heroImageUrl}
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
                pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/${article.category}/${article.slug}`}
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
                  {new Date(article.publishedAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              ) : null}
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {article.title}
            </h1>
          </header>

          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={article.contentMarkdown ?? ""} />
          </div>
        </article>

        <ArticleJsonLd article={article} />

        {relatedRecipes.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="mb-8 font-serif text-2xl text-balance">
              Recettes Associées
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
