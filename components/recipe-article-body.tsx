import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Supprime les balises HTML dangereuses ou non desirables (<script>, <style>)
 * que le LLM peut inserer dans contentMarkdown (ex : JSON-LD genere par erreur).
 * Le JSON-LD est deja genere separement par le composant RecipeJsonLd.
 */
function sanitizeMarkdown(md: string): string {
  return md
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?meta\s[^>]*\/?>/gi, "")
    .replace(/<\/?link\s[^>]*\/?>/gi, "")
    .replace(/<img\s[^>]*\/?>/gi, "")
    .replace(/<(?:br|hr|input|source|col|area|base|embed|wbr)\s*\/?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function RecipeArticleBody({
  contentMarkdown,
}: {
  contentMarkdown: string | null
}) {
  if (!contentMarkdown) return null

  return (
    <section
      aria-labelledby="article-body-heading"
      className="mx-auto max-w-3xl px-4 pt-12"
    >
      <h2 id="article-body-heading" className="sr-only">
        Article and tips
      </h2>
      <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-base prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-strong:font-semibold prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          disallowedElements={[
            "script",
            "style",
            "meta",
            "link",
            "img",
            "head",
            "html",
            "body",
          ]}
          components={{
            h2: ({ node: _node, ...props }) => (
              <h2
                className="font-serif text-2xl font-bold mt-10 mb-5 text-foreground"
                {...props}
              />
            ),
            h3: ({ node: _node, ...props }) => (
              <h3
                className="font-serif text-xl font-bold mt-8 mb-4 text-foreground"
                {...props}
              />
            ),
            p: ({ node: _node, ...props }) => (
              <p
                className="text-base leading-relaxed my-4 text-foreground"
                {...props}
              />
            ),
            ul: ({ node: _node, ...props }) => (
              <ul
                className="my-4 list-disc pl-6 space-y-2"
                role="list"
                {...props}
              />
            ),
            ol: ({ node: _node, ...props }) => (
              <ol
                className="my-4 list-decimal pl-6 space-y-2"
                role="list"
                {...props}
              />
            ),
            li: ({ node: _node, ...props }) => (
              <li className="text-foreground leading-relaxed" {...props} />
            ),
            strong: ({ node: _node, ...props }) => (
              <strong className="font-semibold text-foreground" {...props} />
            ),
            em: ({ node: _node, ...props }) => (
              <em className="italic text-foreground" {...props} />
            ),
            a: ({ node: _node, ...props }) => (
              <a
                className="text-primary underline hover:text-primary/80"
                {...props}
              />
            ),
            blockquote: ({ node: _node, ...props }) => (
              <blockquote
                className="border-l-4 border-primary/40 pl-5 italic my-4 text-muted-foreground"
                {...props}
              />
            ),
          }}
        >
          {sanitizeMarkdown(contentMarkdown)}
        </ReactMarkdown>
      </div>
    </section>
  )
}
