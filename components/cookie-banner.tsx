"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Reserve space so the fixed banner never covers the page content
    // (mobile CTA was hidden under it — audit 2026-08-08 Critical).
    document.body.classList.add("cookie-banner-open")
    const stored = localStorage.getItem("cookie-consent")
    if (!stored) {
      setVisible(true)
    } else {
      document.body.classList.remove("cookie-banner-open")
    }
    return () => {
      document.body.classList.remove("cookie-banner-open")
    }
  }, [])

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted")
    setVisible(false)
    document.body.classList.toggle("cookie-banner-open", false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use cookies to analyze traffic and serve personalized ads.{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline hover:text-primary/80"
          >
            Read our Privacy Policy
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
