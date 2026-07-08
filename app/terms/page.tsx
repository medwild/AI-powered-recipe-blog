import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Terms & Disclaimer",
  description: "Terms of use and disclaimer for Chef Augustin recipes.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Terms & Disclaimer", href: "/terms" },
          ]}
        />
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-3xl text-foreground">Terms &amp; Disclaimer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 8, 2026
          </p>

          <div className="mt-8 prose prose-neutral max-w-none text-foreground leading-relaxed space-y-6">
            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">1. Informational Purposes Only</h2>
              <p>
                The recipes, techniques, and content on Chef Augustin are provided for informational and
                educational purposes only. They do not constitute professional nutritional, medical, or
                dietary advice.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">2. Recipe Results May Vary</h2>
              <p>
                Cooking results depend on many factors including ingredient quality, equipment, altitude,
                humidity, and individual skill. We cannot guarantee that your results will match the
                descriptions or photos on this site.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">3. Allergen Warning</h2>
              <p>
                Always check ingredient labels for allergens. Our recipes may contain or come into contact
                with common allergens including wheat, dairy, eggs, nuts, soy, and shellfish. If you have
                food allergies, consult the ingredient manufacturer and your healthcare provider.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">4. Nutritional Information</h2>
              <p>
                Any nutritional information provided is an estimate calculated using standard ingredient
                databases. Values may vary based on specific brands, preparation methods, and portion sizes.
                Do not rely on this information for medical or dietary decisions.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">5. AI-Assisted Content</h2>
              <p>
                Some content on this site is generated or assisted by artificial intelligence and reviewed
                by our editorial team. While we strive for accuracy, occasional errors may occur. If you
                spot an error, please let us know via our Contact page.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">6. Affiliate Disclosure</h2>
              <p>
                Chef Augustin may participate in affiliate marketing programs. If you click on an affiliate
                link and make a purchase, we may earn a small commission at no additional cost to you.
                Affiliate links will be clearly identified where present.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">7. Intellectual Property</h2>
              <p>
                All original content, including recipes, photographs, and articles, is protected by copyright.
                You may share links to our content and use our photos with proper attribution and a link back
                to the original recipe page. You may not republish our recipes in full without permission.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">8. Limitation of Liability</h2>
              <p>
                Chef Augustin and its contributors shall not be held liable for any damages, losses, or
                injuries arising from the use of information or recipes provided on this site. Use of this
                site is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">9. Contact</h2>
              <p>
                For questions about these Terms, please visit our{" "}
                <a href="/contact" className="text-primary underline hover:text-primary/80">Contact page</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
