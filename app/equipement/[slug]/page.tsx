import type { Metadata } from "next"
import { getArticleBySlug } from "@/lib/queries"
import { articleMetadata, ArticleDetail } from "@/components/article-detail"

export const revalidate = 300
export const dynamicParams = true

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article || article.status !== "published") return { title: "Article not found" }
  return articleMetadata(article, "equipement")
}

export default async function EquipementArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <ArticleDetail slug={slug} />
}
