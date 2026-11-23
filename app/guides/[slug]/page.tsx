import type { Metadata } from "next"
import { getPublishedArticles, getArticleBySlug } from "@/lib/public-data"
import { articleMetadata, ArticleDetail } from "@/components/article-detail"
import { getHubBySlug } from "@/lib/hub-content"
import { HubListing } from "@/components/hub-listing"

export const dynamicParams = true

export async function generateStaticParams() {
  const articles = await getPublishedArticles()
  return articles
    .filter((a) => a.category === "guides")
    .map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const hub = getHubBySlug(slug)
  if (hub) {
    return {
      title: hub.metaTitle,
      description: hub.metaDescription,
      alternates: { canonical: `/guides/${slug}` },
      openGraph: {
        title: hub.metaTitle,
        description: hub.metaDescription,
        type: "website",
        url: `/guides/${slug}`,
      },
    }
  }
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published") return { title: "Article not found" }
  return articleMetadata(article, "guides")
}

export default async function GuidesArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hub = getHubBySlug(slug)
  if (hub) return <HubListing slug={slug} />
  return <ArticleDetail slug={slug} />
}
