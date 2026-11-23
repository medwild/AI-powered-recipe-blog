import type { Metadata } from "next"
import { getPublishedArticles, getArticleBySlug } from "@/lib/public-data"
import { articleMetadata, ArticleDetail } from "@/components/article-detail"

export const dynamicParams = true

export async function generateStaticParams() {
  const articles = await getPublishedArticles()
  return articles
    .filter((a) => a.category === "histoire")
    .map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published") return { title: "Article not found" }
  return articleMetadata(article, "histoire")
}

export default async function HistoireArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <ArticleDetail slug={slug} />
}
