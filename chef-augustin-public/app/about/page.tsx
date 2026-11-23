import type { Metadata } from "next"
import Link from "next/link"
import { ChefHat } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "About the Chef Behind the Recipes",
  description:
    "French-trained chef sharing practical small-batch dinner recipes for two. Professional technique, tested recipes, no food fads.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About the Chef Behind the Recipes",
    description:
      "French-trained chef sharing practical small-batch dinner recipes for two.",
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
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10">
              <ChefHat className="h-14 w-14 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-serif text-4xl">Chef Augustin Lefèvre</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                The house persona behind Easy Weeknight Dinners for Two — practical,
                tested small-batch cooking grounded in classic French technique.
              </p>
            </div>
          </header>

          <section className="mt-12 space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>
              <strong>Chef Augustin Lefèvre</strong> is the house persona of Easy Weeknight
              Dinners for Two — a voice built on classic French technique and practical
              small-batch cooking. The recipes here are developed and tested at
              two-serving scale: the right pan size, the right timing, the right
              ingredient quantities. Two plates. One pan when possible.
              No leftovers that die in the back of the fridge.
            </p>

            <p>
              My focus is simple: teaching home cooks how to make practical
              dinners for two that actually work. Not recipes that look
              impressive on Instagram but fail on your plate. Recipes that
              hold up. Recipes you can nail the first time and perfect the
              fifth — the ones that become your Wednesday go-to, the ones
              you text to a friend.
            </p>

            <p>
              Every recipe on Chef Augustin is developed with professional
              technique and tested against the mistakes that trip up home
              cooks. I study what goes wrong — chicken that steams instead
              of sears, sauces that break, pasta that clumps, the five
              minutes of overcooking that turn a perfect dinner into a
              apology — so my recipes catch you before you fall. The
              techniques are grounded in culinary science and the craft
              of classic French cooking, applied to the ingredients and
              equipment you actually have.
            </p>

            <p>
              When I&apos;m not cooking, you&apos;ll find me at the
              farmer&apos;s market arguing with vegetable vendors about
              the correct ripeness of a tomato, or teaching my kids that
              patience is the most underrated ingredient in any kitchen.
            </p>
          </section>

          <section className="mt-12 rounded-xl border border-border bg-card p-8">
            <h2 className="font-serif text-2xl">Why Trust These Recipes?</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                ✅ <strong>French-trained</strong> in classic French cooking
                technique
              </li>
              <li>
                ✅ Recipes developed with <strong>professional precision</strong>
                — every temperature, ratio, and technique explained
              </li>
              <li>
                ✅ Every article passes a <strong>7-point quality gate</strong>:
                food-safety temperatures, minimum word count, no banned health
                claims, title length, heading structure, Recipe schema validity,
                and no keyword-stuffing repetition
              </li>
              <li>
                ✅ <strong>Science-backed</strong> — techniques grounded in
                practical kitchen science, not food fads
              </li>
              <li>
                ✅ <strong>No fake reviews, no bought ratings</strong> — just
                honest recipes, clearly presented
              </li>
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-2xl">What to Expect</h2>
            <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
              <p>
                New recipes are published regularly, with a focus on seasonal ingredients
                and practical weeknight cooking. You&apos;ll find everything from 15-minute
                pantry dinners to slow-cooked weekend projects — all scaled for two.
                Each recipe includes clear step-by-step instructions, ingredient notes,
                and tips for avoiding the most common mistakes.
              </p>
              <p>
                Beyond recipes, the site covers cooking techniques, equipment guides,
                and the occasional deep dive into food science. The goal is simple:
                help you become a more confident cook, one dinner at a time, without
                the waste and stress that comes with cooking for a crowd.
              </p>
            </div>
          </section>

          <section className="mt-12 rounded-xl border border-muted bg-muted/30 p-6">
            <h2 className="font-serif text-lg">About Our Content</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Chef Augustin is a culinary brand persona — a voice that brings
              together AI-assisted research, professional recipe development,
              and editorial expertise. Every recipe is generated with careful
              attention to culinary science, food safety, and real-world
              practicality. Our process combines structured knowledge (USDA
              guidelines, food science from Harold McGee and Modernist Cuisine,
              professional testing protocols) with editorial review to ensure
              each recipe is clear, accurate, and genuinely useful. We believe
              in transparency: great recipes come from great technique, not
              from pretending a persona is a person.
            </p>
          </section>

          <section className="mt-12 text-center">
            <Button
              render={<Link href="/recipes" />}
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
            url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com",
            description:
              "Practical small-batch dinner recipes for two, grounded in French cooking technique and real-world kitchen experience.",
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
