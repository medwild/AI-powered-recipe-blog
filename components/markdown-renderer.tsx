import dynamic from "next/dynamic"

const ReactMarkdownContent = dynamic(
  () => import("@/components/react-markdown-content").then((m) => m.ReactMarkdownContent),
)

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-base prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-strong:font-semibold prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80">
      <ReactMarkdownContent>
        {content}
      </ReactMarkdownContent>
    </div>
  )
}
