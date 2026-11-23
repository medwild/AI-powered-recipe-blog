// components/recipe-index.tsx
// Numbered grid of recipe mini-cards shown under a roundup article's intro —
// an at-a-glance index that jumps to each recipe page. Compact cards (number +
// image + title + total time), NOT the full RecipeCard (already used in the
// "Related Recipes" section).
import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import type { RecipeCardData } from "@/lib/types"
import { fromIsoDuration } from "@/lib/utils/duration"
import { cloudinaryUrl } from "@/lib/cloudinary-url"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils/cn"

export function RecipeIndex({ recipes }: { recipes: RecipeCardData[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-balance">
        All {recipes.length} recipes in this guide
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {recipes.map((r, i) => (
          <Link
            key={r.id}
            href={`/recipes/${r.slug}`}
            className="card-hover group flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {r.heroImageUrl ? (
                <Image
                  src={cloudinaryUrl(r.heroImageUrl, 200)}
                  alt={r.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={FOOD_BLUR_PLACEHOLDER}
                />
              ) : null}
              <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary">
                {r.title}
              </span>
              {r.totalTime ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {fromIsoDuration(r.totalTime)}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
