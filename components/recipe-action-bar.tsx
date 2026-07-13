"use client"

import { useState, useEffect } from "react"
import { ArrowDown, Printer, Share2 } from "lucide-react"
import { toast } from "sonner"
import { PinterestIcon } from "@/components/ui/social-icons"

/**
 * RecipeActionBar — secondary actions for the recipe page.
 *
 * Sits between the recipe content (ingredients + instructions) and the
 * article body (FAQ, tips). The primary "Jump to Recipe" action lives
 * in the sticky header via JumpToRecipe — no need to duplicate it here.
 */
export function RecipeActionBar({ title }: { title: string }) {
  const [pageUrl, setPageUrl] = useState("")

  // Resolve URL on mount only — avoids SSR hydration mismatch
  useEffect(() => {
    setPageUrl(window.location.href)
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="flex flex-wrap gap-3">
        {/* Tips & FAQ — anchor to article body */}
        <a
          href="#article-body"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          Tips &amp; FAQ
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>

        {/* Print */}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() => {
            const url = pageUrl || window.location.href
            if (navigator.share) {
              navigator.share({ title, url })
            } else {
              navigator.clipboard.writeText(url)
              toast.success("Link copied to clipboard")
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>

        {/* Save to Pinterest */}
        <a
          href={pageUrl ? `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&description=${encodeURIComponent(title)}` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          <PinterestIcon className="h-4 w-4" />
          Save
        </a>
      </div>
    </div>
  )
}
