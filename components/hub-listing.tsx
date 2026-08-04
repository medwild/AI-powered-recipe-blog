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
      url: `https://www.chefaugustin.com/recettes/${r.slug}`,
      name: r.title,
    })),
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{hub.title}</h1>
      {hub.intro.map((p, i) => (
        <p key={i} className="mt-4 text-gray-600">{p}</p>
      ))}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {curated.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
    </article>
  )
}
