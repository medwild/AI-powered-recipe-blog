// components/hub-listing.tsx
// Renders a topical hub: editorial intro + cards of curated existing recipes
// (deterministic, from DB tags — no hallucinated links) + ItemList JSON-LD.
import { getHubBySlug } from "@/lib/hub-content"
import { getPublishedRecipes } from "@/lib/queries"
import { RecipeCard } from "@/components/recipe-card"

export async function HubListing({ slug }: { slug: string }) {
  const hub = getHubBySlug(slug)
  if (!hub) return null

  const recipes = await getPublishedRecipes()
  const curated = recipes.filter((r) =>
    hub.curateTags.some((t) => (r.tags ?? []).includes(t)),
  )

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.title,
    numberOfItems: curated.length,
    itemListElement: curated.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.chefaugustin.com/recipes/${r.slug}`,
      name: r.title,
    })),
  }

  // BreadcrumbList — hubs were the only page type without one (audit 2026-08-08 P2-12)
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.chefaugustin.com/" },
      { "@type": "ListItem", position: 2, name: hub.title, item: `https://www.chefaugustin.com/${hub.category}/${hub.slug}` },
    ],
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{hub.title}</h1>
      {hub.intro.map((p, i) => (
        <p key={i} className="mt-4 text-gray-600">{p}</p>
      ))}
      {/* H2 before the card grid — keeps heading hierarchy H1→H2→H3
          (cards render their titles in H3, no structural jump). */}
      <h2 className="mt-10 text-2xl font-semibold">Recipes in this collection</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {curated.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </article>
  )
}
