"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"

/**
 * JumpToRecipe — the single most important UX element for Pinterest traffic.
 *
 * Pinterest users arrive from a visual impulse (a food photo). They need
 * immediate confirmation they're in the right place AND a one-tap escape
 * to the recipe. This component delivers both.
 *
 * Two variants:
 *   - "desktop": pill button in the sticky header nav bar (hidden on mobile)
 *   - "mobile":  full-width bar below the sticky header (hidden on desktop)
 *
 * Behavior:
 *   - Visible above the fold on page load
 *   - Smooth-scrolls to #ingredients-section on click
 *   - Hides when the ingredients heading enters the viewport
 *   - Reappears if the user scrolls back up
 *   - Respects prefers-reduced-motion
 *   - Keyboard accessible (tabbable, Enter to activate)
 */

function useJumpToRecipe() {
  const [visible, setVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const target = document.getElementById("ingredients-section")
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      const target = document.getElementById("ingredients-section")
      if (target) {
        target.scrollIntoView({
          behavior: reducedMotion ? "instant" : "smooth",
          block: "start",
        })
        target.focus({ preventScroll: true })
      }
    },
    [reducedMotion],
  )

  return { visible, reducedMotion, handleClick }
}

/** Pill button for desktop — lives inside the sticky header nav bar. */
export function JumpToRecipeDesktop() {
  const { visible, reducedMotion, handleClick } = useJumpToRecipe()

  return (
    <a
      href="#ingredients-section"
      onClick={handleClick}
      className={`
        hidden md:inline-flex items-center gap-1.5 rounded-full
        bg-primary px-3.5 py-1.5 text-sm font-medium
        text-primary-foreground
        transition-all duration-300
        hover:scale-105 hover:shadow-md hover:shadow-primary/25
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1
        active:scale-95
        ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}
        ${reducedMotion ? "!transition-none hover:!scale-100 active:!scale-100" : ""}
      `}
      aria-label="Jump to recipe ingredients"
    >
      Jump to Recipe
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}

/** Full-width bar for mobile — sits between the sticky header and the page content. */
export function JumpToRecipeMobile() {
  const { visible, reducedMotion, handleClick } = useJumpToRecipe()

  return (
    <a
      href="#ingredients-section"
      onClick={handleClick}
      className={`
        md:hidden flex items-center justify-center gap-2
        bg-primary text-primary-foreground
        text-sm font-medium
        transition-all duration-300
        active:bg-primary/90
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset
        ${visible ? "max-h-11 py-2.5 opacity-100" : "max-h-0 py-0 opacity-0 pointer-events-none overflow-hidden"}
        ${reducedMotion ? "!transition-none" : ""}
      `}
      aria-label="Jump to recipe ingredients"
    >
      Jump to Recipe
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}
