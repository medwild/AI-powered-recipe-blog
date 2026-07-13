"use client"

import { useState, useCallback } from "react"
import { Check, ChefHat } from "lucide-react"
import type { Ingredient } from "@/lib/db/schema"

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const [checked, setChecked] = useState(false)

  const toggle = useCallback(() => setChecked((prev) => !prev), [])

  return (
    <li
      className="flex items-center gap-3.5 cursor-pointer select-none group border-b border-dashed border-border/40 pb-3 last:border-0 last:pb-0"
      onClick={toggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/25 group-hover:border-primary/40"
        }`}
      >
        {checked ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-transparent" />
        )}
      </span>
      <span
        className={`leading-relaxed transition-all duration-200 ${
          checked
            ? "line-through text-muted-foreground/40"
            : "text-foreground"
        }`}
      >
        {ingredient.name}
      </span>
      {ingredient.quantity ? (
        <span
          className={`ml-auto shrink-0 text-sm font-medium tabular-nums transition-all duration-200 ${
            checked
              ? "line-through text-muted-foreground/30"
              : "text-muted-foreground"
          }`}
        >
          {ingredient.quantity}
        </span>
      ) : null}
    </li>
  )
}

export function RecipeIngredients({
  ingredients,
}: {
  ingredients: Ingredient[]
}) {
  if (!ingredients || ingredients.length === 0) return null

  return (
    <section
      id="ingredients-section"
      aria-labelledby="ingredients-heading"
      className="mx-auto max-w-3xl px-4 pt-12 scroll-mt-20"
    >
      <div
        className="rounded-3xl border border-border/80 p-6 sm:p-8 bg-card relative overflow-hidden"
      >
        {/* Lined paper texture — visible in both light and dark mode */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
          aria-hidden="true"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 28px, oklch(0.55 0.01 90 / 0.07) 28px, oklch(0.55 0.01 90 / 0.07) 29px)`,
          }}
        />
        <div className="flex items-center gap-2 mb-6">
          <ChefHat className="h-5 w-5 text-primary/60" aria-hidden="true" />
          <h2
            id="ingredients-heading"
            className="font-serif text-2xl text-foreground"
          >
            Ingredients
          </h2>
        </div>
        <ul className="flex flex-col gap-3.5" role="list">
          {ingredients.map((ing, i) => (
            <IngredientRow key={i} ingredient={ing} />
          ))}
        </ul>
      </div>
    </section>
  )
}
