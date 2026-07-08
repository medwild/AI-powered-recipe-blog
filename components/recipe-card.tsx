import Image from "next/image"
import Link from "next/link"
import { Clock, Users } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"
import { PinButton } from "@/components/pin-button"

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recettes/${recipe.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {recipe.heroImageUrl ? (
          <>
            <Image
              src={recipe.heroImageUrl || "/placeholder.svg"}
              alt={recipe.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <PinButton
              imageUrl={recipe.heroImageUrl}
              pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/recettes/${recipe.slug}`}
              title={recipe.title}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center font-serif text-sm text-muted-foreground">
            Sans illustration
          </div>
        )}
        {recipe.difficulty ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-medium text-foreground">
            {recipe.difficulty}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-xl leading-snug text-balance group-hover:text-primary">
          {recipe.title}
        </h3>
        {recipe.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {recipe.excerpt}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {recipe.totalTime ? (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.totalTime}
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
    </Link>
  )
}
