"use client"

import { useState, useTransition, useOptimistic } from "react"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { rateRecipe } from "@/app/actions/recipes"

interface Props {
  recipeId: number
  initialAvg: number
  initialCount: number
}

export function RecipeRating({ recipeId, initialAvg, initialCount }: Props) {
  const [avg, setAvg] = useState(initialAvg)
  const [count, setCount] = useState(initialCount)
  const [hovered, setHovered] = useState(0)
  const [pending, startTransition] = useTransition()

  const hasRatings = count > 0

  function handleRate(value: number) {
    if (pending) return
    startTransition(async () => {
      // Optimistic update
      const prevAvg = avg
      const prevCount = count
      setHovered(0)

      // Crude optimistic: assume this rating moves avg proportionally
      const newCount = prevCount + 1
      const newAvg = prevCount === 0 ? value : parseFloat(((prevAvg * prevCount + value) / newCount).toFixed(1))
      setAvg(newAvg)
      setCount(newCount)

      const result = await rateRecipe(recipeId, value)
      if (!result.ok) {
        // Rollback
        setAvg(prevAvg)
        setCount(prevCount)
        toast.error(result.error ?? "Could not save rating")
        return
      }
      setAvg(result.avg)
      setCount(result.count)
      toast.success("Thanks for your rating!")
    })
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground">Rate this recipe</p>

      {/* Stars */}
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = hovered ? value <= hovered : value <= Math.round(avg)
          return (
            <button
              key={value}
              type="button"
              disabled={pending}
              aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
              className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
              onClick={() => handleRate(value)}
              onMouseEnter={() => setHovered(value)}
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Label */}
      <p className="text-sm text-muted-foreground">
        {hasRatings
          ? `${avg} · ${count} rating${count !== 1 ? "s" : ""}`
          : "Be the first to rate"}
      </p>
    </div>
  )
}
