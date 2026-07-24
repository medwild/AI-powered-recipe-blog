import dynamic from "next/dynamic"
import type { Ingredient, Instruction } from "@/lib/db/schema"

const ReactMarkdownContent = dynamic(
  () => import("@/components/react-markdown-content").then((m) => m.ReactMarkdownContent),
)

/** Sections already handled by dedicated components — strip from article body
 *  ONLY when the corresponding structured data is present (non-empty). */
const DUPLICATE_HEADINGS = [
  /^##\s+Ingredients?\b/i,
  /^##\s+Instructions?\b/i,
  /^##\s+Directions?\b/i,
  /^##\s+Method\b/i,
  /^##\s+Steps?\b/i,
]

function stripDuplicateSections(
  md: string,
  hasIngredients: boolean,
  hasInstructions: boolean,
): string {
  if (!hasIngredients && !hasInstructions) return md

  const lines = md.split("\n")
  const result: string[] = []
  let skipping = false

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      const isIngredientHeading = DUPLICATE_HEADINGS[0]!.test(line) || DUPLICATE_HEADINGS[1]!.test(line)
      const isInstructionHeading = DUPLICATE_HEADINGS.slice(2).some(r => r.test(line))
      skipping = (isIngredientHeading && hasIngredients) || (isInstructionHeading && hasInstructions)
    }
    if (!skipping) result.push(line)
  }

  const out = result.join("\n").trim()
  return out.length > 100 ? out : md
}

export function RecipeArticleBody({
  contentMarkdown,
  ingredients,
  instructions,
}: {
  contentMarkdown: string | null
  ingredients?: Ingredient[] | null
  instructions?: Instruction[] | null
}) {
  if (!contentMarkdown) return null

  const hasIngredients = (ingredients?.length ?? 0) > 0
  const hasInstructions = (instructions?.length ?? 0) > 0
  const bodyContent = stripDuplicateSections(contentMarkdown, hasIngredients, hasInstructions)

  if (bodyContent.length < 50) return null

  return (
    <section
      id="article-body"
      aria-labelledby="article-body-heading"
      className="mx-auto max-w-3xl px-4 pt-12 scroll-mt-20"
    >
      <h2 id="article-body-heading" className="sr-only">
        Article and tips
      </h2>
      <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-base prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-strong:font-semibold prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80">
        <ReactMarkdownContent>
          {bodyContent}
        </ReactMarkdownContent>
      </div>
    </section>
  )
}
