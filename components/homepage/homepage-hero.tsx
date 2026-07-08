import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils"

export function HomepageHero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Small-batch dinner recipes for two
          </span>
          <h1 className="font-serif text-4xl leading-tight text-balance md:text-5xl">
            Easy Weeknight Dinners for Two
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            Simple small-batch dinner recipes made for real weeknights. Find
            practical meals for two people, from one-pan dinners to mini slow
            cooker recipes — without wasting ingredients or cooking oversized
            family portions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              render={<Link href="/recettes" />}
              nativeButton={false}
              size="lg"
            >
              Browse recipes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10 aspect-[2/3]">
          <Image
            src="/hero-kitchen.png"
            alt="Kitchen counter with fresh ingredients"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={FOOD_BLUR_PLACEHOLDER}
          />
        </div>
      </div>
    </section>
  )
}
