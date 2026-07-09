import Image from "next/image"
import Link from "next/link"
import type { Recipe } from "@/lib/db/schema"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"
import { PinButton } from "@/components/pin-button"

export function RecipeHero({ recipe }: { recipe: Recipe }) {
  const tags = recipe.tags ?? []

  return (
    <header className="mx-auto max-w-3xl px-4 pt-6">
      {/* Badges row */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tags.length > 0
          ? tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))
          : null}
        {recipe.totalTime ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {recipe.totalTime}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h1 className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-tight text-balance text-foreground">
        {recipe.title}
      </h1>

      {/* Excerpt */}
      {recipe.excerpt ? (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {recipe.excerpt}
        </p>
      ) : null}

      {/* Author + Date */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          By{" "}
          <Link
            href="/about"
            className="font-medium text-foreground underline decoration-primary/40 hover:decoration-primary transition-colors"
          >
            Chef Augustin Lefèvre
          </Link>
        </span>
        {recipe.publishedAt ? (
          <span>
            Published{" "}
            <time dateTime={recipe.publishedAt.toISOString().split("T")[0]}>
              {recipe.publishedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </span>
        ) : null}
        {/* Show "Updated" only if updatedAt is at least 7 days after publishedAt — signals content freshness to users and LLMs */}
        {recipe.updatedAt && recipe.publishedAt &&
          (recipe.updatedAt.getTime() - recipe.publishedAt.getTime()) > 7 * 24 * 60 * 60 * 1000 ? (
          <span>
            · Updated{" "}
            <time dateTime={recipe.updatedAt.toISOString().split("T")[0]}>
              {recipe.updatedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </span>
        ) : null}
      </div>

      {/* Hero Image */}
      {recipe.heroImageUrl ? (
        <figure className="mt-8 overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10 relative aspect-[2/3]">
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            placeholder="blur"
            blurDataURL={FOOD_BLUR_PLACEHOLDER}
          />
          <PinButton
            imageUrl={recipe.heroImageUrl}
            pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/recettes/${recipe.slug}`}
            title={recipe.title}
          />
          <figcaption className="sr-only">Photo: {recipe.title}</figcaption>
        </figure>
      ) : (
        <div className="mt-8 flex aspect-[2/3] items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/20">
          <p className="text-sm text-muted-foreground/60 font-serif">
            Photo coming soon
          </p>
        </div>
      )}
    </header>
  )
}
