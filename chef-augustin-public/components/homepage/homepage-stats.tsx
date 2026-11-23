import { Clock, ChefHat, Sparkles } from "lucide-react"

export function HomepageStats() {
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-3">
        <dl className="flex items-center gap-3">
          <dt className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ChefHat className="h-5 w-5 text-primary" aria-hidden="true" />
          </dt>
          <dd className="not-italic">
            <span className="text-2xl font-bold block">Small-batch</span>
            <span className="text-xs text-muted-foreground block">Recipes for two</span>
          </dd>
        </dl>
        <dl className="flex items-center gap-3">
          <dt className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
          </dt>
          <dd className="not-italic">
            <span className="text-2xl font-bold block">~30 min</span>
            <span className="text-xs text-muted-foreground block">Start to table</span>
          </dd>
        </dl>
        <dl className="flex items-center gap-3">
          <dt className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </dt>
          <dd className="not-italic">
            <span className="text-2xl font-bold block">Tested</span>
            <span className="text-xs text-muted-foreground block">French technique</span>
          </dd>
        </dl>
      </div>
    </section>
  )
}
