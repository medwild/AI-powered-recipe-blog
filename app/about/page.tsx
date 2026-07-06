import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "About Chef Augustin Lefèvre — Chef Augustin",
  description:
    "Meet Chef Augustin Lefèvre, the culinary voice behind Chef Augustin. French-trained baker dedicated to bringing artisan sourdough techniques to home bakers everywhere.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Chef Augustin Lefèvre",
    description:
      "French-trained baker sharing tested sourdough recipes and techniques for home bakers.",
    type: "profile",
  },
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <header className="flex flex-col items-center gap-6 text-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-primary/20 bg-secondary">
              <Image
                src="/hero-kitchen.png"
                alt="Chef Augustin Lefèvre"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="font-serif text-4xl">Chef Augustin Lefèvre</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                French-trained chef, cookbook author, and advocate for foolproof
                sourdough baking at home.
              </p>
            </div>
          </header>

          <section className="mt-12 space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>
              I spent years learning the craft of artisan bread — from the
              precise techniques of French boulangeries to the rhythms of home
              baking. I learned that the best bread isn&apos;t always the most
              complicated. It&apos;s the loaf you make with care, baked in your
              own oven, shared with people you love.
            </p>

            <p>
              My focus is simple: teaching home bakers how to make sourdough
              recipes that work. Not recipes that look impressive on Instagram
              but fail on your plate. Recipes that hold up. Recipes you can nail
              the first time and perfect the fifth.
            </p>

            <p>
              Every recipe on Chef Augustin is developed with professional
              technique and tested against the common mistakes that trip up home
              bakers. I study what goes wrong — over-proofed dough, under-seasoned
              loaves, starters that won&apos;t rise — so my recipes catch you
              before you fall. The techniques are grounded in the science of
              fermentation and the craft of artisan baking.
            </p>

            <p>
              When I&apos;m not cooking, you&apos;ll find me at the farmer&apos;s
              market arguing with vegetable vendors about the correct ripeness of
              a tomato, or teaching my kids that patience is the most
              underrated ingredient in any kitchen.
            </p>
          </section>

          <section className="mt-12 rounded-xl border border-border bg-card p-8">
            <h2 className="font-serif text-2xl">Why Trust These Recipes?</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                ✅ <strong>French-trained</strong> in classic artisan baking
                technique
              </li>
              <li>
                ✅ Recipes developed with <strong>professional precision</strong>
                — every temperature, ratio, and technique explained
              </li>
              <li>
                ✅ Every article passes a <strong>7-criteria quality audit</strong>
                covering food safety, technique accuracy, and clarity
              </li>
              <li>
                ✅ <strong>Science-backed</strong> — techniques grounded in
                fermentation science, not kitchen myths
              </li>
              <li>
                ✅ <strong>No fake reviews, no bought ratings</strong> — just
                honest recipes, clearly presented
              </li>
            </ul>
          </section>

          <section className="mt-12 text-center">
            <Button
              render={<Link href="/recettes" />}
              nativeButton={false}
              size="lg"
            >
              Browse all recipes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </section>
        </div>
      </main>

      {/* Organization + Author JSON-LD schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Chef Augustin",
            url: "https://chefaugustin.com",
            description:
              "Artisan sourdough recipes and techniques for home bakers, grounded in fermentation science and professional baking craft.",
            founder: {
              "@type": "Person",
              name: "Chef Augustin Lefèvre",
              jobTitle: "Baker & Recipe Developer",
            },
          }),
        }}
      />

      <SiteFooter />
    </div>
  )
}
