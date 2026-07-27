import { getArticleBySlug } from "@/lib/queries"
import { CATEGORY_LABELS } from "@/components/category-listing"

type ArticleData = NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>

export function ArticleJsonLd({ article }: { article: ArticleData }) {
  const base = (article.jsonLd as Record<string, unknown>) ?? {}
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"
  const categoryLabel = CATEGORY_LABELS[article.category ?? ""] ?? article.category ?? "Blog"

  if (base["@graph"] && Array.isArray(base["@graph"])) {
    const graph = base["@graph"] as Record<string, unknown>[]

    const enrichedGraph = graph.map((node) => {
      const type = node["@type"] as string | undefined
      if (type === "Article" || type === "BlogPosting") {
        return {
          ...node,
          headline: article.title,
          description: article.metaDescription || article.excerpt || node.description,
          image: article.heroImageUrl || node.image,
          datePublished: article.publishedAt?.toISOString() || node.datePublished,
          dateModified: article.updatedAt?.toISOString() || node.dateModified,
          author: node.author ?? { "@type": "Person", name: "Chef Augustin Lefevre" },
          publisher: node.publisher ?? { "@type": "Organization", name: "Chef Augustin", url: SITE },
        }
      }
      return node
    })

    const hasBreadcrumb = enrichedGraph.some((n) => n["@type"] === "BreadcrumbList")
    const finalGraph = hasBreadcrumb
      ? enrichedGraph
      : [
          ...enrichedGraph,
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: categoryLabel, item: `${SITE}/${article.category}` },
              { "@type": "ListItem", position: 3, name: article.title },
            ],
          },
        ]

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ "@context": "https://schema.org", "@graph": finalGraph }),
        }}
      />
    )
  }

  // Legacy fallback
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: article.title,
              description: article.metaDescription || article.excerpt,
              author: { "@type": "Person", name: "Chef Augustin Lefevre" },
              datePublished: article.publishedAt?.toISOString(),
              image: article.heroImageUrl,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                { "@type": "ListItem", position: 2, name: categoryLabel, item: `${SITE}/${article.category}` },
                { "@type": "ListItem", position: 3, name: article.title },
              ],
            },
          ],
        }),
      }}
    />
  )
}
