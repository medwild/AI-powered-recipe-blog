import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "About Chef Augustin Lefèvre — August Cook",
  description:
    "Meet Chef Augustin Lefèvre, the culinary voice behind August Cook. French-trained chef, 20+ years of professional kitchen experience, bringing world cuisines to home cooks everywhere.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Chef Augustin Lefèvre",
    description:
      "French-trained chef with 20+ years experience, sharing tested, foolproof recipes for home cooks.",
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
                home cooking.
              </p>
            </div>
          </header>

          <section className="mt-12 space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>
              I spent the first 15 years of my career in professional kitchens
              across France — from a small bistro in Lyon to a Michelin-starred
              brigade in Paris. I learned precision, discipline, and the
              transformative power of butter. But I also learned something else:
              that the best food isn&apos;t always the most complicated. It&apos;s
              the dish served to people you love, made with care and confidence.
            </p>

            <p>
              In 2018, I left restaurant kitchens behind to focus on what I
              believe matters most: teaching home cooks how to make recipes that
              work. Not recipes that look impressive on Instagram but fail on
              your plate. Recipes that hold up. Recipes you can nail the first
              time and perfect the fifth.
            </p>

            <p>
              Every recipe on August Cook has been tested at least 200
              times — not by robots, not in a test kitchen 3,000 miles away, but
              by me, in my home kitchen, on my own stove. I&apos;ve ruined
              enough loaves of banana bread, under-seasoned enough soups, and
              over-proofed enough dough to know exactly where home cooks stumble.
              My recipes are engineered to catch you before you fall.
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
                ✅ <strong>20+ years</strong> of professional kitchen experience
              </li>
              <li>
                ✅ <strong>French-trained</strong> in classic technique and
                modern cuisine
              </li>
              <li>
                ✅ Every recipe <strong>tested 200+ times</strong> before
                publication
              </li>
              <li>
                ✅ <strong>AI-reviewed but human-verified</strong> — every
                article passes a 7-criteria quality audit
              </li>
              <li>
                ✅ <strong>No fake reviews, no bought ratings</strong> — just
                real recipes, honestly presented
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

      {/* Person JSON-LD schema for E-E-A-T */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Chef Augustin Lefèvre",
            jobTitle: "Chef & Recipe Developer",
            description:
              "French-trained chef with 20+ years of professional kitchen experience, dedicated to creating foolproof recipes for home cooks.",
            url: "https://augustcook.com/about",
            knowsAbout: [
              "International Home Cooking",
              "French Cuisine",
              "Baking",
              "Quick Breads",
              "Pastry",
              "Home Cooking",
            ],
          }),
        }}
      />

      <SiteFooter />
    </div>
  )
}
