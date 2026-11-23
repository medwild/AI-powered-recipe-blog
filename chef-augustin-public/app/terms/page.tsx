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
          <h1 className="font-serif text-3xl text-foreground">Terms of Use &amp; Disclaimer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 8, 2026
          </p>

          <p className="text-muted-foreground leading-relaxed mb-6">
            Please read these terms carefully before using Chef Augustin. By accessing or using this
            website, you agree to be bound by these terms. If you do not agree with any part of these
            terms, please do not use this site.
          </p>

          <div className="mt-4 prose prose-neutral max-w-none text-foreground leading-relaxed space-y-6">
            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">1. Informational Purposes Only</h2>
              <p>
                The recipes, techniques, and content on Chef Augustin are provided for informational and
                educational purposes only. They do not constitute professional nutritional, medical, or
                dietary advice. Always consult a qualified professional for advice specific to your health,
                dietary needs, or medical conditions.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">2. Recipe Results May Vary</h2>
              <p>
                Cooking results depend on many factors including ingredient quality, equipment, altitude,
                humidity, and individual skill. We test every recipe multiple times, but we cannot guarantee
                that your results will match the descriptions or photos on this site. Home kitchens, ovens,
                and ingredients vary — that&apos;s part of what makes cooking personal.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">3. Food Safety</h2>
              <p>
                Safe food handling is your responsibility. Always follow USDA guidelines for minimum
                internal cooking temperatures, refrigeration, and cross-contamination prevention. Our
                recipes include recommended cooking times and temperatures, but individual equipment
                and ingredients may require adjustments. When in doubt, use a food thermometer.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">4. Allergen Warning</h2>
              <p>
                Always check ingredient labels for allergens. Our recipes may contain or come into contact
                with common allergens including wheat, dairy, eggs, nuts, soy, and shellfish. Recipe
                ingredient lists are starting points — different brands process ingredients differently.
                If you have food allergies, consult the ingredient manufacturer and your healthcare provider
                before trying any recipe.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">5. Nutritional Information</h2>
              <p>
                Any nutritional information provided is an estimate calculated using standard ingredient
                databases. Values may vary based on specific brands, preparation methods, and portion sizes.
                Do not rely on this information for medical or dietary decisions. We do not represent
                ourselves as nutritionists or dietitians.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">6. AI-Assisted Content</h2>
              <p>
                Some content on this site is generated or assisted by artificial intelligence and reviewed
                by our editorial team before publication. While we strive for accuracy, occasional errors
                may occur. If you spot something that doesn&apos;t look right — a measurement, a technique,
                or a fact — please let us know via our Contact page. We correct verified errors promptly.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">7. Affiliate Disclosure</h2>
              <p>
                Chef Augustin may participate in affiliate marketing programs, including but not limited
                to the Amazon Associates Program. If you click on an affiliate link and make a purchase,
                we may earn a small commission at no additional cost to you. Affiliate links will be
                clearly identified where present. Our recommendations are based on products we genuinely
                use and believe in — affiliate relationships never influence our editorial content.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">8. Third-Party Links</h2>
              <p>
                This site may contain links to third-party websites, products, or services. We do not
                control, endorse, or assume responsibility for the content, privacy policies, or practices
                of any third-party sites. You access third-party links at your own risk.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">9. Intellectual Property</h2>
              <p>
                All original content, including recipes, photographs, and articles, is protected by copyright.
                You may share links to our content and use one photo per article with proper attribution and
                a do-follow link back to the original recipe page. Republishing full recipes, multiple photos,
                or substantial portions of our content requires prior written permission. Contact us for
                syndication inquiries.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">10. Limitation of Liability</h2>
              <p>
                Chef Augustin and its contributors shall not be held liable for any damages, losses, or
                injuries — including but not limited to allergic reactions, foodborne illness, or kitchen
                accidents — arising from the use of information or recipes provided on this site. Use of
                this site and its content is at your own risk. You are responsible for using safe kitchen
                practices and exercising good judgment.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">11. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. Changes will be posted on this page with
                an updated date. Continued use of the site after changes constitutes acceptance of the
                revised terms. We recommend checking this page periodically.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">12. Contact</h2>
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
