import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"
import { PinButton } from "@/components/pin-button"
import { CATEGORY_LABELS } from "@/components/category-listing"

export function ArticleCard({ article }: { article: Recipe }) {
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Article"

  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        href={`/${article.category ?? "techniques"}/${article.slug}`}
        className="relative aspect-[2/3] overflow-hidden bg-muted block"
        tabIndex={-1}
      >
        {article.heroImageUrl ? (
          <>
            <Image
              src={article.heroImageUrl}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <PinButton
              imageUrl={article.heroImageUrl}
              pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"}/${article.category ?? "techniques"}/${article.slug}`}
              title={article.title}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/30">
            <BookOpen className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
          </div>
        )}
        {article.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary/90 backdrop-blur px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {categoryLabel}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-xl leading-snug text-balance">
          <Link
            href={`/${article.category ?? "techniques"}/${article.slug}`}
            className="group-hover:text-primary"
          >
            {article.title}
          </Link>
        </h3>
        {article.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        ) : null}
        {article.publishedAt ? (
          <div className="mt-auto pt-2 text-xs text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        ) : null}
      </div>
    </article>
  )
}
