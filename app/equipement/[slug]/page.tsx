import type { Metadata } from "next"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { getArticleBySlug } from "@/lib/queries"
import { articleMetadata, ArticleDetail } from "@/components/article-detail"


export const dynamicParams = true

export async function generateStaticParams() {
  const articles = await db
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(
      and(
        eq(recipes.content_type, "article"),
        eq(recipes.category, "equipement"),
        eq(recipes.status, "published"),
      ),
    )
  return articles.map((a) => ({ slug: a.slug }))
}

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
