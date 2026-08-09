import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Clock, ChefHat, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils/cn"
import { cloudinaryUrl } from "@/lib/cloudinary-url"

/**
 * HomepageHero — redesigned following 2025-2026 food blog best practices.
 *
 * Key principles:
 *   - Image-first on mobile (food photography sells before words)
 *   - Badge icon-led for visual scannability
 *   - Trust signals as compact metadata pills
 *   - Clean editorial typography
 *   - Single clear CTA
 */
export function HomepageHero({
  heroImage,
  heroAlt,
}: {
  heroImage?: string
  heroAlt?: string
}) {
  // LCP homepage — image servie au plus léger possible :
  //  - recette héro : source Cloudinary + w_ (edge), crop 16:9 côté Cloudinary
  //  - fallback : hero-kitchen Cloudinary (crop 16:9, 39KB @w_640 vs 233KB PNG)
  const imageSrc = heroImage
    ? cloudinaryUrl(heroImage, 1200)
    : "https://res.cloudinary.com/dpgm5gata/image/upload/f_auto,q_auto/ar_16:9,c_fill/v1786283654/recipes/hero-kitchen.png"
  const imageAlt = heroAlt || "Kitchen counter with fresh ingredients"

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        {/* ── Mobile-first: image on top, then text ── */}
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">

          {/* Image column — first in DOM, visually dominant */}
          <div className="relative order-first md:order-last">
            <div className="relative overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10 aspect-[16/9] md:aspect-[3/2]">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                className="object-cover"
                priority
                fetchPriority="high"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={FOOD_BLUR_PLACEHOLDER}
              />
            </div>
            {/* Ambient glow behind image — subtle, non-distracting */}
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/5 blur-3xl" aria-hidden="true" />
          </div>

          {/* Text column */}
          <div className="flex flex-col gap-5 md:order-first">
            {/* Badge */}
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <ChefHat className="h-3.5 w-3.5" aria-hidden="true" />
              Small-batch recipes for two
            </span>

            {/* Headline — distinct from the <title> (Semrush flagged identical
                h1/title as duplicate content 2026-08-06) */}
            <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-tight text-balance text-foreground">
              Easy Dinners,{" "}
              <span className="block text-primary/80">Made for Two</span>
            </h1>

            {/* Description */}
            <p className="text-base leading-relaxed text-muted-foreground text-pretty max-w-prose">
              Practical meals scaled for two people — one-pan dinners, quick
              pastas, and mini slow cooker recipes. No wasted ingredients,
              no oversized portions, no stress.
            </p>

            {/* Trust signal pills */}
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur px-3 py-2 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                ~30 min to table
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur px-3 py-2 text-xs font-medium text-foreground">
                <Users className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                Scaled for 2
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur px-3 py-2 text-xs font-medium text-foreground">
                <ChefHat className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                French technique
              </span>
            </div>

            {/* CTA */}
            <div className="mt-2">
              <Button
                render={<Link href="/recipes" />}
                nativeButton={false}
                size="lg"
                className="group"
              >
                Browse all recipes
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
