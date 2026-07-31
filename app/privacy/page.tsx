import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Chef Augustin collects and uses your data.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Privacy Policy", href: "/privacy" },
          ]}
        />
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-3xl text-foreground">Privacy Policy &amp; Data Protection</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 8, 2026
          </p>

          <div className="mt-8 prose prose-neutral max-w-none text-foreground leading-relaxed space-y-6">
            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">1. Information We Collect</h2>
              <p>
                Chef Augustin (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the website
                chefaugustin.com (the &ldquo;Site&rdquo;). We collect minimal information to provide and
                improve our service.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><b>Usage Data:</b> Pages visited, time spent, referring URLs, browser type. Collected automatically via Google Analytics.</li>
                <li><b>Cookies:</b> Small data files stored on your device. See Section 3.</li>
                <li>Contact Information: If you email us, we receive your email address and any information you choose to share.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">2. How We Use Your Information</h2>
              <p>We use the collected information to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Analyze site traffic and improve content</li>
                <li>Display relevant advertisements via Google AdSense</li>
                <li>Respond to your inquiries</li>
                <li>Maintain site security</li>
              </ul>
              <p className="mt-3">We do not sell, rent, or share your personal information with third parties except as described in this policy.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">3. Cookies</h2>
              <p>We use cookies for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Essential Cookies: Required for site functionality (theme preference, cookie consent).</li>
                <li>Analytics Cookies: Google Analytics helps us understand how visitors use the site.</li>
                <li>Advertising Cookies: Google AdSense may use cookies to show personalized ads based on your browsing history.</li>
              </ul>
              <p className="mt-3">
                You can disable cookies in your browser settings. Please note that disabling cookies may affect site functionality.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">4. Third-Party Services</h2>
              <p>We use the following third-party services that may collect data:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Google AdSense: Displays advertisements. Google uses cookies to serve ads based on your prior visits to our site and other sites. You can opt out of personalized advertising by visiting{" "}
                  <a href="https://adssettings.google.com" className="text-primary underline hover:text-primary/80">Google Ads Settings</a>.
                </li>
                <li>Google Analytics: Tracks site usage. Data is anonymized where possible.</li>
                <li>Cloudinary: Hosts our images. May collect technical data for content delivery.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">5. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Access the personal data we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="mt-3">To exercise these rights, contact us at the email listed on our Contact page.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">6. Data Retention</h2>
              <p>
                We retain usage data for as long as necessary to fulfill the purposes outlined in this policy.
                Cookie data is retained according to each cookie&apos;s expiration period.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">7. Children&apos;s Privacy</h2>
              <p>
                Our site is intended for a general audience and is not directed at children under the age
                of 13. We do not knowingly collect personal information from children under 13. If you
                believe a child has provided us with personal data, please contact us immediately and we
                will take steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country
                of residence. These countries may have data protection laws that differ from yours. By
                using our site, you consent to such transfers. We take reasonable steps to ensure your
                data is treated securely and in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices
                or for operational, legal, or regulatory reasons. Changes will be posted on this page
                with an updated &ldquo;Last updated&rdquo; date. We encourage you to review this policy
                periodically.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">10. Contact</h2>
              <p>
                For questions about this Privacy Policy, please visit our{" "}
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
