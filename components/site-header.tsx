"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChefHat, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV_LINKS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/techniques", label: "Techniques" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
]

export function SiteHeader({ actions }: { actions?: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={close}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">
            Chef Augustin
          </span>
        </Link>

        {/* Desktop nav — unchanged */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Studio
          </Link>
          {actions}
          <ThemeToggle />
        </nav>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open ? (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-black/20"
            onClick={close}
            aria-hidden="true"
          />
          {/* Menu */}
          <nav className="md:hidden absolute top-16 left-0 right-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="block px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="mx-4 my-2 border-t border-border" />
            <Link
              href="/dashboard"
              onClick={close}
              className="block px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Studio
            </Link>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-base font-medium text-foreground">Dark mode</span>
              <ThemeToggle />
            </div>
          </nav>
        </>
      ) : null}
    </header>
  )
}
