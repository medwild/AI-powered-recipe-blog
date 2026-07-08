import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Chef Augustin — questions, feedback, or recipe requests.",
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
          <h1 className="font-serif text-3xl text-foreground">Get in Touch</h1>
          <p className="mt-3 max-w-lg text-muted-foreground leading-relaxed">
            Questions about a recipe? Found an error? Have a suggestion? We&apos;d love to
            hear from you.
          </p>

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
            <p className="mt-3 text-sm text-muted-foreground">
              We typically respond within 2&ndash;3 business days. Please include the recipe
              name or URL if your message is about a specific recipe.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl text-foreground mb-4">What to Contact Us About</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span>Recipe questions or troubleshooting</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span>Factual errors or typos in recipes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span>Recipe requests or content suggestions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span>Partnership or media inquiries</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span>Privacy or data requests</span>
              </li>
            </ul>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
