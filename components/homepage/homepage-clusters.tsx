import Link from "next/link"
import type { ResolvedCluster } from "@/lib/cluster-resolver"

/**
 * Homepage "Collections" section — links to the 6 topical cluster hubs.
 * The homepage previously linked to zero clusters (hub-spoke gap flagged in
 * the 2026-08-05 audit); these are the site's money landing pages and deserve
 * direct homepage equity.
 */
export function HomepageClusters({ clusters }: { clusters: ResolvedCluster[] }) {
  if (!clusters.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <h2 className="mb-2 font-serif text-2xl">Collections for Two</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Curated collections built around the way you actually cook.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clusters.map((c) => (
          <Link
            key={c.id}
            href={`/recipes/cluster/${c.id}`}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
          >
            <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
              {c.name}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {c.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
