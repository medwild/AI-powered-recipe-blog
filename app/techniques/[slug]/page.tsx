import type { Metadata } from "next"
import { getPublishedArticles, getArticleBySlug } from "@/lib/public-data"
import { articleMetadata, ArticleDetail } from "@/components/article-detail"

export const dynamicParams = true

export async function generateStaticParams() {
  const articles = await getPublishedArticles()
  return articles
    .filter((a) => a.category === "techniques")
    .map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published") return { title: "Article not found" }
  return articleMetadata(article, "techniques")
}

export default async function TechniquesArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <ArticleDetail slug={slug} />
}
