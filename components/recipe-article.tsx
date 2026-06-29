"use client"

import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Clock, Flame, Users, Soup, Printer, Share2 } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"

/** Convertit un texte de durée ("15 min", "1h 30 min") en ISO 8601 ("PT15M", "PT1H30M") */
function toIsoDuration(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const hours = text.match(/(\d+)\s*h/)?.[1]
  const minutes = text.match(/(\d+)\s*min/)?.[1]
  if (!hours && !minutes) return undefined
  const h = hours ? parseInt(hours) : 0
  const m = minutes ? parseInt(minutes) : 0
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}`
}

function MetaItem({
  icon: Icon,
  label,
  value,
  datetime,
}: {
  icon: typeof Clock
  label: string
  value: string
  datetime?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-medium">
          {datetime ? <time dateTime={datetime}>{value}</time> : value}
        </p>
      </div>
    </div>
  )
}

/**
 * Supprime les balises HTML dangereuses ou non désirées (<script>, <style>)
 * que le LLM peut insérer dans contentMarkdown (ex : JSON-LD généré par erreur).
 * Le JSON-LD est déjà généré séparément par le composant RecipeJsonLd.
 */
function sanitizeMarkdown(md: string): string {
  return md
    // Remove <script> and <style> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove all HTML meta/link tags (LLM sometimes generates OG meta tags)
    .replace(/<\/?meta\s[^>]*\/?>/gi, "")
    .replace(/<\/?link\s[^>]*\/?>/gi, "")
    // Remove standalone <img> tags (hero image is already rendered separately)
    .replace(/<img\s[^>]*\/?>/gi, "")
    // Remove any remaining void/self-closing HTML tags like <br>, <hr>
    .replace(/<(?:br|hr|input|source|col|area|base|embed|wbr)\s*\/?>/gi, "")
    // Clean up leftover empty lines from tag removal
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function RecipeArticle({ recipe }: { recipe: Recipe }) {
  const ingredients = recipe.ingredients ?? []
  const instructions = recipe.instructions ?? []
  const tags = recipe.tags ?? []

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <header className="flex flex-col gap-5">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2" aria-label="Recipe tags">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="font-serif text-4xl leading-tight text-balance md:text-5xl">
          {recipe.title}
        </h1>
        {recipe.excerpt ? (
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            {recipe.excerpt}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            By{" "}
            <a
              href="/about"
              className="font-medium text-foreground underline decoration-primary/40 hover:decoration-primary"
            >
              Chef Augustin Lefèvre
            </a>
          </span>
          {recipe.publishedAt ? (
            <span>
              Updated:{" "}
              <time dateTime={recipe.publishedAt.toISOString().split("T")[0]}>
                {recipe.publishedAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Tested 200+ times
          </span>
        </div>
      </header>

      {recipe.heroImageUrl ? (
        <figure className="mt-8 overflow-hidden rounded-2xl border border-border relative aspect-[16/9]">
          <Image
            src={recipe.heroImageUrl || "/placeholder.svg"}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
          <figcaption className="sr-only">
            Photo: {recipe.title}
          </figcaption>
        </figure>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </button>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: recipe.title, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
      </div>

      <div className="mt-4">
        <a
          href="#ingredients-title"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Jump to Recipe
          <span aria-hidden="true">↓</span>
        </a>
      </div>

      <div
        className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        role="list"
        aria-label="Informations sur la recette"
      >
        {recipe.prepTime ? (
          <div role="listitem">
            <MetaItem icon={Clock} label="Prep time" value={recipe.prepTime} datetime={toIsoDuration(recipe.prepTime)} />
          </div>
        ) : null}
        {recipe.cookTime ? (
          <div role="listitem">
            <MetaItem icon={Flame} label="Cook time" value={recipe.cookTime} datetime={toIsoDuration(recipe.cookTime)} />
          </div>
        ) : null}
        {recipe.servings ? (
          <div role="listitem">
            <MetaItem icon={Users} label="Servings" value={recipe.servings} />
          </div>
        ) : null}
        {recipe.difficulty ? (
          <div role="listitem">
            <MetaItem icon={Soup} label="Difficulty" value={recipe.difficulty} />
          </div>
        ) : null}
      </div>

      {ingredients.length > 0 ? (
        <section
          aria-labelledby="ingredients-title"
          className="mt-12 rounded-2xl border border-border bg-card p-6"
        >
          <h2 id="ingredients-title" className="font-serif text-2xl">
            Ingredients
          </h2>
          <ul className="mt-4 flex flex-col gap-2" role="list">
            {ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
              >
                <span>{ing.name}</span>
                {ing.quantity ? (
                  <span className="shrink-0 font-medium text-muted-foreground">
                    {ing.quantity}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {instructions.length > 0 ? (
        <section
          aria-labelledby="instructions-title"
          className="mt-10"
        >
          <h2 id="instructions-title" className="font-serif text-2xl">
            Instructions
          </h2>
          <ol className="mt-4 flex flex-col gap-5" role="list">
            {instructions.map((step) => (
              <li key={step.step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground">
                  {step.step}
                </span>
                <p className="pt-1 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {recipe.contentMarkdown ? (
        <section
          aria-labelledby="content-title"
          className="mt-12"
        >
          <h2 id="content-title" className="sr-only">
            Article and tips
          </h2>
          <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-base prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-strong:font-semibold prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={["script", "style", "meta", "link", "img", "head", "html", "body"]}
              components={{
                h2: ({ node: _node, ...props }) => (
                  <h2
                    className="font-serif text-2xl font-bold mt-8 mb-4 text-foreground"
                    {...props}
                  />
                ),
                h3: ({ node: _node, ...props }) => (
                  <h3
                    className="font-serif text-xl font-bold mt-6 mb-3 text-foreground"
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
                  <li
                    className="text-foreground leading-relaxed"
                    {...props}
                  />
                ),
                strong: ({ node: _node, ...props }) => (
                  <strong
                    className="font-semibold text-foreground"
                    {...props}
                  />
                ),
                em: ({ node: _node, ...props }) => (
                  <em
                    className="italic text-foreground"
                    {...props}
                  />
                ),
                a: ({ node: _node, ...props }) => (
                  <a
                    className="text-primary underline hover:text-primary/80"
                    {...props}
                  />
                ),
                blockquote: ({ node: _node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
                    {...props}
                  />
                ),
              }}
            >
              {sanitizeMarkdown(recipe.contentMarkdown)}
            </ReactMarkdown>
          </div>
        </section>
      ) : null}
    </article>
  )
}
