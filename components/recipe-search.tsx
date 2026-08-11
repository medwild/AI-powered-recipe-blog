"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, X } from "lucide-react"

const VISIBLE_CATEGORIES = 12

export function RecipeSearch({
  categories,
  currentSearch,
  currentCategory,
}: {
  categories: string[]
  currentSearch: string
  currentCategory: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)
  // La catégorie active vient de l'URL (filtre client) — le prop serveur est toujours vide
  const activeCategory = searchParams.get("cat") ?? currentCategory

  const visibleCategories = showAll
    ? categories
    : categories.slice(0, VISIBLE_CATEGORIES)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams],
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Search bar — prominent */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder='Search by ingredient, meal, or keyword…'
          defaultValue={searchParams.get("q") ?? currentSearch}
          onChange={(e) => {
            startTransition(() => {
              router.push(
                `${pathname}?${createQueryString("q", e.target.value)}`,
                { scroll: false },
              )
            })
          }}
          className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-label="Search recipes"
        />
        {searchParams.get("q") ?? currentSearch ? (
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push(
                  `${pathname}?${createQueryString("q", "")}`,
                  { scroll: false },
                )
              })
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Category pills — limited + expandable */}
      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push(
                  `${pathname}?${createQueryString("cat", "")}`,
                  { scroll: false },
                )
              })
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                startTransition(() => {
                  router.push(
                    `${pathname}?${createQueryString(
                      "cat",
                      cat === activeCategory ? "" : cat,
                    )}`,
                    { scroll: false },
                  )
                })
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                cat === activeCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
          {categories.length > VISIBLE_CATEGORIES && !showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              +{categories.length - VISIBLE_CATEGORIES} more filters
            </button>
          ) : null}
          {showAll && categories.length > VISIBLE_CATEGORIES ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
