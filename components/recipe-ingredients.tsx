"use client"

import { useState, useCallback } from "react"
import { Check } from "lucide-react"
import type { Ingredient } from "@/lib/db/schema"

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const [checked, setChecked] = useState(false)

  const toggle = useCallback(() => setChecked((prev) => !prev), [])

  return (
    <li
      className="flex items-center gap-3 cursor-pointer select-none group"
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
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border group-hover:border-primary/40"
        }`}
      >
        {checked ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
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
          className={`ml-auto shrink-0 text-sm font-medium transition-all duration-200 ${
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
      className="mx-auto max-w-3xl px-4 pt-12"
    >
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2
          id="ingredients-heading"
          className="font-serif text-2xl text-foreground"
        >
          Ingredients
        </h2>
        <ul className="mt-6 flex flex-col gap-3.5" role="list">
          {ingredients.map((ing, i) => (
            <IngredientRow key={i} ingredient={ing} />
          ))}
        </ul>
      </div>
    </section>
  )
}
