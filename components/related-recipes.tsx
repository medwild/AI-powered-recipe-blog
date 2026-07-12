import Link from "next/link"
import Image from "next/image"
import { resolveCluster } from "@/lib/cluster-resolver"
import { getRelatedRecipes, getPublishedRecipes } from "@/lib/queries"
import type { Recipe } from "@/lib/db/schema"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"

export async function RelatedRecipes({ recipe }: { recipe: Recipe }) {
  const tags = (recipe.tags ?? []) as string[]
  const cluster = resolveCluster(tags)

  // Get same-cluster recipes via tag overlap
  const related = await getRelatedRecipes(recipe.id, tags)

  // Get cross-cluster recipes (2 from different clusters)
  let crossCluster: Recipe[] = []
  if (cluster) {
    const allPublished = await getPublishedRecipes()
    crossCluster = allPublished
      .filter((r) => {
        if (r.id === recipe.id) return false
        // Already in related?
        if (related.some((rel) => rel.id === r.id)) return false
        const rc = resolveCluster((r.tags ?? []) as string[])
        return rc?.id !== cluster.id
      })
      .filter((r) => r.heroImageUrl)
      .slice(0, 2)
  }

  const allRelated = [...related.slice(0, 4), ...crossCluster]

  if (allRelated.length === 0) return null

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 border-t border-border mt-12">
      <h2 className="font-serif text-2xl mb-6">
        {cluster ? `More ${cluster.name}` : "Related Recipes"}
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allRelated.map((r) => (
          <Link
            key={r.id}
            href={`/recettes/${r.slug}`}
            className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20"
          >
            {r.heroImageUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={r.heroImageUrl}
                  alt={r.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  placeholder="blur"
                  blurDataURL={FOOD_BLUR_PLACEHOLDER}
                />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-secondary/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground/60 font-serif">Coming soon</span>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-serif text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {r.title}
              </h3>
              {r.totalTime ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{r.totalTime}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
