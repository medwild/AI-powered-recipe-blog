"use client"

import { useSearchParams } from "next/navigation"
import { RecipeCard } from "@/components/recipe-card"
import type { RecipeCardData } from "@/lib/types"

/**
 * Grille filtrante client-side pour /recipes.
 * Lit ?q= et ?cat= (posés par RecipeSearch) et filtre la liste reçue du serveur.
 * La page reste force-static : 0 requête DB par visite, filtre instantané.
 * Sémantique alignée sur l'ancien filtre serveur (title/keyword/excerpt + tags).
 */

/** Filtre pur (testable) — q: title+tags, cat: tags. */
export function filterRecipes(recipes: RecipeCardData[], q: string, cat: string): RecipeCardData[] {
  const query = q.trim().toLowerCase()
  const category = cat.trim().toLowerCase()
  return recipes.filter((r) => {
    const tags = (r.tags ?? []).map((t) => t.toLowerCase())
    const matchesCat = !category || tags.some((t) => t.includes(category))
    const matchesQ =
      !query || r.title.toLowerCase().includes(query) || tags.some((t) => t.includes(query))
    return matchesCat && matchesQ
  })
}

export function RecipeGrid({ recipes }: { recipes: RecipeCardData[] }) {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const cat = searchParams.get("cat") ?? ""

  const filtered = filterRecipes(recipes, q, cat)

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          No recipes match your filters. Try a different category or search.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} aspectRatio="4/3" />
      ))}
    </div>
  )
}
