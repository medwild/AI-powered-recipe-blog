import { ArticleCard } from "@/components/article-card"
import type { ArticleCardData } from "@/lib/types"

export function HomepageArticles({ articles }: { articles: ArticleCardData[] }) {
  if (!articles.length) return null

  return (
    <section className="border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="mb-8">
          <h2 className="font-serif text-3xl">Quick &amp; Practical</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tips for smarter weeknight cooking — not culinary school lectures.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}
