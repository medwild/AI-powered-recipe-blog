import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPublishedArticles, getArticleBySlug } from "@/lib/public-data"
import { articleMetadata, ArticleDetail } from "@/components/article-detail"
import { getHubBySlug, HUBS } from "@/lib/hub-content"
import { HubListing } from "@/components/hub-listing"

export const dynamicParams = false

export async function generateStaticParams() {
  const articles = await getPublishedArticles()
  const articleSlugs = articles
    .filter((a) => a.category === "idees")
    .map((a) => ({ slug: a.slug }))
  const hubSlugs = HUBS
    .filter((h) => h.category === "idees")
    .map((h) => ({ slug: h.slug }))

  const combined = new Set<string>()
  const params: { slug: string }[] = []
  for (const item of [...articleSlugs, ...hubSlugs]) {
    if (!combined.has(item.slug)) {
      combined.add(item.slug)
      params.push(item)
    }
  }
  return params
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const hub = getHubBySlug(slug)
  if (hub && hub.category === "idees") {
    return {
      title: hub.metaTitle,
      description: hub.metaDescription,
      alternates: { canonical: `/idees/${slug}` },
      openGraph: {
        title: hub.metaTitle,
        description: hub.metaDescription,
        type: "website",
        url: `/idees/${slug}`,
      },
    }
  }
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published" || article.category !== "idees") {
    notFound()
  }
  return articleMetadata(article, "idees")
}

export default async function IdeesArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hub = getHubBySlug(slug)
  if (hub && hub.category === "idees") return <HubListing slug={slug} />
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published" || article.category !== "idees") {
    notFound()
  }
  return <ArticleDetail slug={slug} />
}
