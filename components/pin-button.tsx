"use client"

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  )
}

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
