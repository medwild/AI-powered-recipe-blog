import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"

const CATEGORY_LABELS: Record<string, string> = {
  techniques: "Technique",
  guides: "Guide",
  histoire: "Histoire",
  equipement: "Équipement",
}

export function ArticleCard({ article }: { article: Recipe }) {
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Article"

  return (
    <Link
      href={`/${article.category ?? "techniques"}/${article.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {article.heroImageUrl ? (
          <Image
            src={article.heroImageUrl}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-serif text-sm text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-30" aria-hidden="true" />
          </div>
        )}
        {article.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary/90 backdrop-blur px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {categoryLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-xl leading-snug text-balance group-hover:text-primary">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        ) : null}
        {article.publishedAt ? (
          <div className="mt-auto pt-2 text-xs text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        ) : null}
      </div>
    </Link>
  )
}
