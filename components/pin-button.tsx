"use client"

import { PinterestIcon } from "@/components/ui/social-icons"

/**
 * Bouton "Save to Pinterest" toujours visible sur les photos du blog.
 * Stratégie PTRA : chaque photo doit permettre le Pin direct.
 * Couleurs officielles Pinterest : rouge #E60023 + blanc.
 */
export function PinButton({
  imageUrl,
  pageUrl,
  title,
}: {
  imageUrl: string
  pageUrl: string
  title: string
}) {
  const pinUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
    pageUrl
  )}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(title)}`

  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(pinUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <button
      type="button"
      onClick={handlePin}
      className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#E60023] px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#E60023]/25 transition-all duration-200 hover:bg-[#BD081C] hover:scale-105 hover:shadow-xl hover:shadow-[#E60023]/30"
      aria-label={`Save "${title}" to Pinterest`}
    >
      <PinterestIcon className="h-3.5 w-3.5" />
      Save
    </button>
  )
}
