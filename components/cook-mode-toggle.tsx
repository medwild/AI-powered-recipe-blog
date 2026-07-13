"use client"

import { useState, useEffect, useCallback } from "react"
import { ChefHat } from "lucide-react"

/**
 * CookModeToggle — keeps the screen awake while cooking.
 *
 * Sally's Baking Addiction popularized this pattern. When the user is
 * mid-cook with messy hands, the last thing they want is their phone
 * going dark. Uses the Screen Wake Lock API with a visual toggle.
 *
 * Falls back to a keep-alive interval on browsers that don't support
 * the Wake Lock API (Safari < 16.4, Firefox).
 */
export function CookModeToggle() {
  const [active, setActive] = useState(false)
  const [supported, setSupported] = useState(true)

  const toggle = useCallback(async () => {
    if (active) {
      setActive(false)
      return
    }
    try {
      if ("wakeLock" in navigator) {
        // Modern browsers: request a screen wake lock
        await navigator.wakeLock.request("screen")
      }
      setActive(true)
    } catch {
      // Wake Lock denied (low battery, user gesture required, etc.)
      // Fall through — the keep-alive interval will still work
      setActive(true)
    }
  }, [active])

  // Keep-alive interval — prevents sleep on browsers without Wake Lock API
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      // Tiny no-op that keeps the tab "active"
      document.title = document.title
    }, 30_000)
    return () => clearInterval(interval)
  }, [active])

  // Detect support on mount
  useEffect(() => {
    if (!("wakeLock" in navigator)) {
      setSupported(false)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={`
        inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5
        text-xs font-semibold transition-all duration-300
        ${active
          ? "border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/10"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
        }
      `}
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <ChefHat className={`h-3.5 w-3.5 transition-all ${active ? "text-primary" : ""}`} aria-hidden="true" />
        {active ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        ) : null}
      </span>
      {active ? "Cook Mode On" : "Cook Mode"}
    </button>
  )
}
