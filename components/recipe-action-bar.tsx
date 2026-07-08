"use client"

import { ArrowDown, Printer, Share2 } from "lucide-react"
import { toast } from "sonner"
import { PinterestIcon } from "@/components/ui/social-icons"

export function RecipeActionBar({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="flex flex-wrap gap-3">
        {/* Jump to Recipe */}
        <a
          href="#ingredients-section"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30"
        >
          Jump to Recipe
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>

        {/* Jump to Tips & FAQ */}
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
            if (navigator.share) {
              navigator.share({ title, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
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
          href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
            typeof window !== "undefined" ? window.location.href : ""
          )}&description=${encodeURIComponent(title)}`}
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
