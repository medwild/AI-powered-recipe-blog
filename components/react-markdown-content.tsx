// Server component (2026-08-06, P2 Semrush audit) — le rendu markdown est
// purement statique : react-markdown + remark-gfm sont exécutés au build, le
// parseur (~200-300 KB) ne part plus au client. Les wrappers (recipe-article-body,
// markdown-renderer) sont des server components — aucun client ne l'importe.
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Image from "next/image"
import { sanitizeMarkdown } from "@/lib/utils/sanitize"
import { cloudinaryUrl } from "@/lib/cloudinary-url"

const DISALLOWED = ["script", "style", "meta", "link", "head", "html", "body"]

const BASE_COMPONENTS = {
  h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
    <h2 className="font-serif text-2xl font-bold mt-10 mb-5 text-foreground" {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
    <h3 className="font-serif text-xl font-bold mt-8 mb-4 text-foreground" {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<"p">) => (
    <p className="text-base leading-relaxed my-4 text-foreground" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="my-4 list-disc pl-6 space-y-2" role="list" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="my-4 list-decimal pl-6 space-y-2" role="list" {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<"li">) => (
    <li className="text-foreground leading-relaxed" {...props} />
  ),
  strong: (props: React.ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: React.ComponentPropsWithoutRef<"em">) => (
    <em className="italic text-foreground" {...props} />
  ),
  a: (props: React.ComponentPropsWithoutRef<"a">) => (
    <a className="text-primary underline hover:text-primary/80" {...props} />
  ),
  // Images from the site's own Cloudinary CDN only — blocks any other src
  // (LLM content could otherwise inject a tracking pixel or off-site image).
  img: (props: React.ComponentPropsWithoutRef<"img">) => {
    const src = typeof props.src === "string" ? props.src : ""
    if (!src.startsWith("https://res.cloudinary.com/")) return null
    return (
      <span className="relative my-6 block aspect-[2/3] w-full max-w-[420px] overflow-hidden rounded-2xl">
        <Image
          src={cloudinaryUrl(src, 900)}
          alt={props.alt ?? ""}
          fill
          sizes="(max-width: 640px) 100vw, 420px"
          className="object-cover"
        />
      </span>
    )
  },
  blockquote: (props: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-4 border-primary/40 pl-5 italic my-4 text-muted-foreground" {...props} />
  ),
}

export function ReactMarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      disallowedElements={DISALLOWED}
      components={BASE_COMPONENTS}
    >
      {sanitizeMarkdown(children)}
    </ReactMarkdown>
  )
}
