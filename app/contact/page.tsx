import type { Metadata } from "next"
import { Mail, Clock, MessageCircle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Contact Chef Augustin",
  description: "Get in touch with Chef Augustin — recipe questions, feedback, corrections, partnership inquiries, or just to say hello.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Contact", href: "/contact" },
          ]}
        />
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-3xl text-foreground">Get in Touch with Chef Augustin</h1>
          <p className="mt-3 max-w-lg text-muted-foreground leading-relaxed">
            <strong>Get in Touch with Chef Augustin</strong> — questions about a recipe?
            Found an error? Have a suggestion? We&apos;d love to hear from you. Whether you
            tried a dish and want to share how it turned out, spotted a typo in an ingredient
            list, or have an idea for a recipe you&apos;d like to see, your feedback shapes
            what we cook next.
          </p>

          {/* Email */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-serif text-xl text-foreground">Email</h2>
            </div>
            <a
              href="mailto:hello@chefaugustin.com"
              className="text-lg font-medium text-primary underline hover:text-primary/80"
            >
              hello@chefaugustin.com
            </a>
            <div className="mt-4 flex items-start gap-3 text-sm text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p>
                We read every message and typically respond within 1&ndash;2 business days.
                If your question is about a specific recipe, please include the recipe name or
                URL so we can help you faster. For urgent recipe troubleshooting, check the tips
                and FAQ sections on the recipe page first — your answer might already be there.
              </p>
            </div>
          </div>

          {/* What to Contact Us About */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl text-foreground mb-4">What to Contact Us About</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span><strong>Recipe questions:</strong> Substitutions, technique clarifications, or troubleshooting when a dish didn&apos;t turn out as expected.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span><strong>Corrections:</strong> Found a typo, wrong measurement, or unclear instruction? Tell us — we fix errors fast.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span><strong>Recipe requests:</strong> Have a dish you&apos;d love to see scaled for two? We take requests seriously and prioritize the most-asked dishes.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span><strong>Partnerships and media:</strong> Brand collaborations, media inquiries, recipe development, or syndication opportunities.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span><strong>Privacy requests:</strong> Access, correction, or deletion of personal data under GDPR, CCPA, or other privacy regulations.</span>
              </li>
            </ul>
          </div>

          {/* FAQ */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-serif text-xl text-foreground">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground">Can I scale a recipe up for more people?</h3>
                <p className="mt-1">
                  Yes — every recipe includes scaling notes in the tips section. For most recipes,
                  doubling works smoothly. For baking and slow-cooker recipes, check the notes as
                  pan sizes and cook times may need adjustment.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Do you take sponsored content or guest posts?</h3>
                <p className="mt-1">
                  We consider sponsored partnerships with brands that align with our focus on practical
                  home cooking. We do not accept guest posts or unsolicited content. Reach out via email
                  with your proposal.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Can I use your photos or recipes on my site?</h3>
                <p className="mt-1">
                  All content on Chef Augustin is protected by copyright. You may use one photo with
                  a do-follow link back to the original recipe. Republishing full recipes or multiple
                  photos requires written permission — please email us.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">I tried a recipe and it didn&apos;t work. What should I do?</h3>
                <p className="mt-1">
                  First, check the recipe tips and notes section — common fixes are there. If the issue
                  persists, email us with the recipe name, what went wrong, and any substitutions you made.
                  We test every recipe multiple times, but home kitchens vary — we want to help you get it right.
                </p>
              </div>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
