import { Clock, Flame, Users, Soup } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"
import { toIsoDuration } from "@/lib/utils/duration"

function MetaPill({
  icon: Icon,
  label,
  value,
  datetime,
}: {
  icon: typeof Clock
  label: string
  value: string
  datetime?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur px-4 py-3.5">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold text-foreground truncate">
          {datetime ? <time dateTime={datetime}>{value}</time> : value}
        </p>
      </div>
    </div>
  )
}

export function RecipeMetaBar({ recipe }: { recipe: Recipe }) {
  const items: {
    icon: typeof Clock
    label: string
    value: string
    datetime?: string
  }[] = []

  if (recipe.prepTime) {
    items.push({
      icon: Clock,
      label: "Prep",
      value: recipe.prepTime,
      datetime: toIsoDuration(recipe.prepTime),
    })
  }
  if (recipe.cookTime) {
    items.push({
      icon: Flame,
      label: "Cook",
      value: recipe.cookTime,
      datetime: toIsoDuration(recipe.cookTime),
    })
  }
  if (recipe.servings) {
    items.push({ icon: Users, label: "Servings", value: recipe.servings })
  }
  if (recipe.difficulty) {
    items.push({ icon: Soup, label: "Difficulty", value: recipe.difficulty })
  }

  if (items.length === 0) return null

  return (
    <section
      aria-label="Recipe information"
      className="mx-auto max-w-3xl px-4 pt-8"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <MetaPill key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}
