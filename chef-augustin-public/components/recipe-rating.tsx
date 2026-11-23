import { Star } from "lucide-react"

interface Props {
  recipeId: number
  initialAvg: number
  initialCount: number
}

/**
 * Read-only historical rating component for static export.
 * Displays validated community ratings without interactive writes or mock votes.
 */
export function RecipeRating({ initialAvg, initialCount }: Props) {
  const hasRatings = initialCount > 0
  const roundedAvg = Math.round(initialAvg)

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground">Community Rating</p>

      {/* Stars (Read-only) */}
      <div className="flex items-center gap-1" aria-label={`Rating: ${initialAvg} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = hasRatings && value <= roundedAvg
          return (
            <Star
              key={value}
              className={`h-6 w-6 ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
              aria-hidden="true"
            />
          )
        })}
      </div>

      {/* Label */}
      <p className="text-sm text-muted-foreground">
        {hasRatings
          ? `${initialAvg.toFixed(1)} · ${initialCount} review${initialCount !== 1 ? "s" : ""}`
          : "No ratings yet"}
      </p>
    </div>
  )
}
