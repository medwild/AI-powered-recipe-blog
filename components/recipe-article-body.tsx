import dynamic from "next/dynamic"
import type { Ingredient, Instruction } from "@/lib/db/schema"

const ReactMarkdownContent = dynamic(
  () => import("@/components/react-markdown-content").then((m) => m.ReactMarkdownContent),
)

/** Sections already handled by dedicated components — strip from article body
 *  ONLY when the corresponding structured data is present (non-empty).
 *  Matches any heading level (#..######) — generated bodies sometimes use
 *  H3 for these (e.g. dessert-for-2), which the hero still renders as H2. */
const DUPLICATE_HEADINGS = [
  /^#{1,6}\s+Ingredients?\b/i,
  /^#{1,6}\s+Instructions?\b/i,
  /^#{1,6}\s+Directions?\b/i,
  /^#{1,6}\s+Method\b/i,
  /^#{1,6}\s+Steps?\b/i,
]

/** Strip excessive bold formatting: spans > 120 chars or duplicate bold text. */
function sanitizeBold(md: string): string {
  const seen = new Set<string>()
  return md.replace(/\*\*(.+?)\*\*/g, (match, content: string) => {
    // Too long: strip bold from very long spans (likely an LLM formatting error)
    if (content.length > 120) return content
    // Duplicate: same bold text appearing more than once
    const key = content.toLowerCase().trim()
    if (seen.has(key)) return content
    seen.add(key)
    return match
  })
}

function stripDuplicateSections(
  md: string,
  hasIngredients: boolean,
  hasInstructions: boolean,
  recipeTitle?: string,
): string {
  const lines = md.split("\n")
  const result: string[] = []
  let skipping = false
  const seenH = new Set<string>()

  for (const line of lines) {
    // Always strip H1 headings — the title is rendered by RecipeHero.
    // A duplicate H1 in the markdown body causes "Too many H1 headings" SEO warnings.
    if (/^#\s+/.test(line) && !/^#{2,6}\s+/.test(line)) continue

    // Any heading level (H2-H6) — dedupe + skip hero-covered sections.
    if (/^#{2,6}\s+/.test(line)) {
      const hText = line.replace(/^#{2,6}\s+/, "").trim().toLowerCase()

      // Skip if this heading matches the recipe title (avoids H1/H2 duplicate)
      if (recipeTitle && hText === recipeTitle.toLowerCase()) continue

      // Skip duplicate headings (same text appearing twice)
      if (seenH.has(hText)) continue
      seenH.add(hText)

      const isIngredientHeading = DUPLICATE_HEADINGS[0]!.test(line) || DUPLICATE_HEADINGS[1]!.test(line)
      const isInstructionHeading = DUPLICATE_HEADINGS.slice(2).some(r => r.test(line))
      skipping = (isIngredientHeading && hasIngredients) || (isInstructionHeading && hasInstructions)
    }
    if (!skipping) result.push(line)
  }

  const out = sanitizeBold(result.join("\n").trim())
  return out.length > 100 ? out : md
}

export function RecipeArticleBody({
  contentMarkdown,
  ingredients,
  instructions,
  title,
}: {
  contentMarkdown: string | null
  ingredients?: Ingredient[] | null
  instructions?: Instruction[] | null
  title?: string
}) {
  if (!contentMarkdown) return null

  const hasIngredients = (ingredients?.length ?? 0) > 0
  const hasInstructions = (instructions?.length ?? 0) > 0
  const bodyContent = stripDuplicateSections(contentMarkdown, hasIngredients, hasInstructions, title)

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
