import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HomepageCTA() {
  return (
    <section className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h2 className="font-serif text-3xl text-balance">
          Find your next dinner tonight
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Simple recipes, real ingredients, scaled for two. No leftovers, no
          waste, no stress.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            render={<Link href="/recettes" />}
            nativeButton={false}
            size="lg"
          >
            Browse all recipes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  )
}
