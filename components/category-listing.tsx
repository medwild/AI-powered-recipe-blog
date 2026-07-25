import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

/**
 * Canonical category label map — single source of truth for the 5 article categories.
 * Used by: CategoryListing, ArticleCard, ArticleDetail, ArticleJsonLd, sitemap.
 * When adding a category, update this map AND create the route files (§1.4 in routing-seo.md).
 */
export const CATEGORY_LABELS: Record<string, string> = {
  techniques: "Techniques",
  guides: "Guides",
  histoire: "Histoire",
  equipement: "Équipement",
  idees: "Idées",
}

export function categoryMetadata(category: string): Metadata {
  const label = CATEGORY_LABELS[category] ?? category
  return {
    title: label,
    description: `Browse our ${label.toLowerCase()} articles — French cooking tips, techniques, and guides.`,
    alternates: { canonical: `/${category}` },
    robots: { index: false }, // categories are empty until article pipeline exists
    openGraph: {
      title: `${label} | Chef Augustin`,
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
          <h1 className="font-serif text-4xl text-balance">{label}</h1>
          <p className="mt-2 text-muted-foreground">
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </p>
        </header>

        {articles.length === 0 ? (
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
                  {article.excerpt ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
