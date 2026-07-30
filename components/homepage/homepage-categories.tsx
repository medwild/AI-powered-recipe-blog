import Link from "next/link"
import { tagToSlug } from "@/lib/tag-utils"

export function HomepageCategories({ categories }: { categories: string[] }) {
  if (!categories.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <h2 className="mb-2 font-serif text-2xl">Explore by category</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Find exactly what you&apos;re in the mood for.
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.slice(0, 15).map((cat) => (
          <Link
            key={cat}
            href={`/recipes/category/${tagToSlug(cat)}`}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            {cat}
          </Link>
        ))}
        {categories.length > 15 ? (
          <Link
            href="/recipes"
            className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            View all {categories.length} categories →
          </Link>
        ) : null}
      </div>
    </section>
  )
}
