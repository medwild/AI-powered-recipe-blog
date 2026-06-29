"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, X } from "lucide-react"

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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search for a recipe..."
          defaultValue={currentSearch}
          onChange={(e) => {
            startTransition(() => {
              router.push(`${pathname}?${createQueryString("q", e.target.value)}`, { scroll: false })
            })
          }}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Search for a recipe"
        />
        {currentSearch ? (
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push(`${pathname}?${createQueryString("q", "")}`, { scroll: false })
              })
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push(`${pathname}?${createQueryString("cat", "")}`, { scroll: false })
              })
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !currentCategory
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                startTransition(() => {
                  router.push(`${pathname}?${createQueryString("cat", cat === currentCategory ? "" : cat)}`, { scroll: false })
                })
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                cat === currentCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}