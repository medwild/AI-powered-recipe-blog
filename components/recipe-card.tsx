import Image from "next/image"
import Link from "next/link"
import { Clock, Users } from "lucide-react"
import type { RecipeCardData } from "@/lib/types"
import { PinButton } from "@/components/pin-button"
import { fromIsoDuration } from "@/lib/utils/duration"
import { cloudinaryUrl } from "@/lib/cloudinary-url"

export function RecipeCard({ recipe, aspectRatio }: { recipe: RecipeCardData; aspectRatio?: string }) {
  const ratio = aspectRatio ?? "2/3"
  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        href={`/recipes/${recipe.slug}`}
        className={`relative overflow-hidden bg-muted block aspect-[${ratio}]`}
        tabIndex={-1}
      >
        {recipe.heroImageUrl ? (
          <>
            <Image
              src={cloudinaryUrl(recipe.heroImageUrl, 800)}
              alt={recipe.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <PinButton
              imageUrl={recipe.heroImageUrl}
              pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"}/recipes/${recipe.slug}`}
              title={recipe.title}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/30">
            <span className="font-serif text-sm text-muted-foreground/60">
              Coming soon
            </span>
          </div>
        )}
        {recipe.difficulty ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-medium text-foreground">
            {recipe.difficulty}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-xl leading-snug text-balance">
          <Link
            href={`/recipes/${recipe.slug}`}
            className="group-hover:text-primary"
          >
            {recipe.title}
          </Link>
        </h3>
        {/* Excerpt intentionally omitted from listing cards — avoids 260+ duplicate content blocks.
             The full excerpt is displayed on the recipe's own page via RecipeHero. */}
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {recipe.totalTime ? (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {fromIsoDuration(recipe.totalTime)}
            </span>
          ) : null}
          {recipe.servings ? (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.servings}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
